const { pool } = require('../db/postgres');

function normalizeAgentPayload(payload) {
  return {
    agent_id: String(payload.agent_id || '').trim(),
    hostname: String(payload.hostname || '').trim(),
    ip_address: String(payload.ip_address || '').trim(),
    os: String(payload.os || '').trim(),
    os_version: String(payload.os_version || '').trim(),
    username: String(payload.username || '').trim(),
    agent_version: String(payload.agent_version || '').trim(),
  };
}

function validateAgentPayload(payload) {
  const requiredFields = [
    'agent_id',
    'hostname',
    'ip_address',
    'os',
    'os_version',
    'username',
    'agent_version',
  ];

  for (const field of requiredFields) {
    if (!payload[field] || String(payload[field]).trim() === '') {
      return { valid: false, field };
    }
  }

  return { valid: true };
}

async function findAgentByAgentId(agentId) {
  const result = await pool.query(
    'SELECT * FROM agents WHERE agent_id = $1 LIMIT 1',
    [agentId]
  );

  return result.rows[0] || null;
}

async function registerAgentRecord(payload) {
  const normalized = normalizeAgentPayload(payload);
  const validation = validateAgentPayload(normalized);

  if (!validation.valid) {
    const error = new Error(`Missing or invalid field: ${validation.field}`);
    error.statusCode = 400;
    throw error;
  }

  const existing = await findAgentByAgentId(normalized.agent_id);

  if (existing) {
    const updateResult = await pool.query(
      `UPDATE agents
       SET hostname = $1,
           ip_address = $2,
           os = $3,
           os_version = $4,
           username = $5,
           agent_version = $6,
           status = 'online',
           last_seen = NOW(),
           updated_at = NOW()
       WHERE agent_id = $7
       RETURNING id, agent_id, hostname, ip_address, os, os_version, username, agent_version, status, last_seen, created_at, updated_at;`,
      [
        normalized.hostname,
        normalized.ip_address,
        normalized.os,
        normalized.os_version,
        normalized.username,
        normalized.agent_version,
        normalized.agent_id,
      ]
    );

    return {
      created: false,
      agent: updateResult.rows[0],
      message: 'Agent updated successfully',
    };
  }

  const insertResult = await pool.query(
    `INSERT INTO agents (
      agent_id,
      hostname,
      ip_address,
      os,
      os_version,
      username,
      agent_version,
      status,
      last_seen,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'online', NOW(), NOW(), NOW())
    RETURNING id, agent_id, hostname, ip_address, os, os_version, username, agent_version, status, last_seen, created_at, updated_at;`,
    [
      normalized.agent_id,
      normalized.hostname,
      normalized.ip_address,
      normalized.os,
      normalized.os_version,
      normalized.username,
      normalized.agent_version,
    ]
  );

  return {
    created: true,
    agent: insertResult.rows[0],
    message: 'Agent registered successfully',
  };
}

async function getAllAgentRecords() {
  const result = await pool.query(
    `SELECT a.id, a.agent_id, a.hostname, a.ip_address, a.os, a.os_version, a.username, a.agent_version, a.status, a.last_seen, a.created_at, a.updated_at,
            g.id AS group_id, g.name AS group_name
     FROM agents a
     LEFT JOIN groups g ON g.id = a.group_id
     ORDER BY a.last_seen DESC NULLS LAST, a.created_at DESC;`
  );

  return result.rows.map(addGroupToAgent);
}

async function getAgentRecordById(agentId) {
  const result = await pool.query(
    `SELECT a.id, a.agent_id, a.hostname, a.ip_address, a.os, a.os_version, a.username, a.agent_version, a.status, a.last_seen, a.created_at, a.updated_at,
            g.id AS group_id, g.name AS group_name
     FROM agents a
     LEFT JOIN groups g ON g.id = a.group_id
     WHERE a.agent_id = $1
     LIMIT 1;`,
    [agentId]
  );

  return result.rows[0] ? addGroupToAgent(result.rows[0]) : null;
}

function addGroupToAgent(agent) {
  const result = { ...agent };
  delete result.group_id;
  result.group = agent.group_id
    ? { id: agent.group_id, name: agent.group_name }
    : null;
  delete result.group_name;
  return result;
}

module.exports = {
  registerAgentRecord,
  getAllAgentRecords,
  getAgentRecordById,
  addGroupToAgent,
};
