const { pool } = require('../db/postgres');

const ACTIONS = new Set(['allow', 'block']);
const SUPPORTED_EXTENSIONS = new Set(['.zip', '.rar', '.exe', '.msi', '.deb']);

function errorWithStatus(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parsePolicyId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw errorWithStatus('Policy ID must be a positive integer', 400);
  return id;
}

function normalizePayload(payload, partial = false) {
  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'name')) {
    if (typeof payload.name !== 'string' || payload.name.trim() === '') throw errorWithStatus('Policy name is required', 400);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'extension')) {
    if (typeof payload.extension !== 'string' || payload.extension.trim() === '') throw errorWithStatus('Extension is required', 400);
    const extension = payload.extension.trim().toLowerCase();
    if (!extension.startsWith('.') || extension.length < 2 || !SUPPORTED_EXTENSIONS.has(extension)) {
      throw errorWithStatus('Extension must be one of: .zip, .rar, .exe, .msi, .deb', 400);
    }
  }
  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'action')) {
    if (typeof payload.action !== 'string' || !ACTIONS.has(payload.action.trim().toLowerCase())) {
      throw errorWithStatus('Action must be allow or block', 400);
    }
  }
  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'enabled')) {
    if (typeof payload.enabled !== 'boolean') throw errorWithStatus('enabled must be boolean', 400);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'group_id') && payload.group_id !== null) {
    const groupId = Number(payload.group_id);
    if (!Number.isInteger(groupId) || groupId <= 0) throw errorWithStatus('group_id must be a positive integer or null', 400);
  }

  return {
    ...(Object.prototype.hasOwnProperty.call(payload, 'name') ? { name: payload.name.trim() } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, 'description') ? { description: payload.description === null ? null : String(payload.description).trim() } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, 'extension') ? { extension: payload.extension.trim().toLowerCase() } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, 'action') ? { action: payload.action.trim().toLowerCase() } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, 'enabled') ? { enabled: payload.enabled } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, 'group_id') ? { group_id: payload.group_id === null ? null : Number(payload.group_id) } : {}),
  };
}

async function assertGroup(groupId) {
  if (groupId === null || groupId === undefined) return;
  const result = await pool.query('SELECT id FROM groups WHERE id = $1', [groupId]);
  if (result.rows.length === 0) throw errorWithStatus('Group not found', 404);
}

function duplicateError(error) {
  if (error.code === '23505') return errorWithStatus('A policy with the same scope, extension, and action already exists', 409);
  return error;
}

const policySelect = `
  SELECT fp.id, fp.name, fp.description, fp.extension, fp.action, fp.enabled,
         fp.group_id, g.name AS group_name, fp.created_at, fp.updated_at
  FROM file_policies fp
  LEFT JOIN groups g ON g.id = fp.group_id
`;

async function createPolicyRecord(payload) {
  const data = normalizePayload(payload);
  await assertGroup(data.group_id);
  try {
    const result = await pool.query(
      `INSERT INTO file_policies (name, description, extension, action, enabled, group_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, extension, action, enabled, group_id, created_at, updated_at;`,
      [data.name, data.description || null, data.extension, data.action, data.enabled, data.group_id ?? null]
    );
    return getPolicyRecordById(result.rows[0].id);
  } catch (error) {
    throw duplicateError(error);
  }
}

async function getPolicyRecords() {
  const result = await pool.query(`${policySelect} ORDER BY fp.created_at DESC, fp.id DESC`);
  return result.rows;
}

async function getPolicyRecordById(value) {
  const id = parsePolicyId(value);
  const result = await pool.query(`${policySelect} WHERE fp.id = $1`, [id]);
  if (result.rows.length === 0) throw errorWithStatus('Policy not found', 404);
  return result.rows[0];
}

async function updatePolicyRecord(value, payload) {
  const id = parsePolicyId(value);
  const data = normalizePayload(payload, true);
  if (Object.keys(data).length === 0) throw errorWithStatus('At least one policy field is required', 400);
  await assertGroup(data.group_id);
  const fields = [];
  const values = [];
  for (const field of ['name', 'description', 'extension', 'action', 'enabled', 'group_id']) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      values.push(data[field]);
      fields.push(`${field} = $${values.length}`);
    }
  }
  values.push(id);
  try {
    const result = await pool.query(
      `UPDATE file_policies SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length} RETURNING id;`,
      values
    );
    if (result.rows.length === 0) throw errorWithStatus('Policy not found', 404);
    return getPolicyRecordById(id);
  } catch (error) {
    throw duplicateError(error);
  }
}

async function deletePolicyRecord(value) {
  const id = parsePolicyId(value);
  const result = await pool.query('DELETE FROM file_policies WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) throw errorWithStatus('Policy not found', 404);
}

async function getAgentPolicies(agentId) {
  const agent = await pool.query('SELECT id, group_id FROM agents WHERE agent_id = $1', [agentId]);
  if (agent.rows.length === 0) throw errorWithStatus('Agent not found', 404);
  const result = await pool.query(
    `SELECT id, name, description, extension, action, enabled, group_id
     FROM file_policies
     WHERE enabled = TRUE AND (group_id IS NULL OR group_id = $1)
     ORDER BY CASE WHEN group_id IS NULL THEN 1 ELSE 0 END, extension, id`,
    [agent.rows[0].group_id]
  );
  const byExtension = new Map();
  for (const policy of result.rows) {
    if (!byExtension.has(policy.extension)) byExtension.set(policy.extension, policy);
  }
  return [...byExtension.values()].map((policy) => {
    const safe = { ...policy };
    delete safe.description;
    delete safe.group_id;
    return safe;
  });
}

async function evaluatePolicy(agentId, extension) {
  const policies = await getAgentPolicies(agentId);
  return policies.find((policy) => policy.extension === extension) || null;
}

module.exports = {
  createPolicyRecord,
  getPolicyRecords,
  getPolicyRecordById,
  updatePolicyRecord,
  deletePolicyRecord,
  getAgentPolicies,
  evaluatePolicy,
};
