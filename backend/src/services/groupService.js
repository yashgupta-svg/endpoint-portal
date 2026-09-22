const { pool } = require('../db/postgres');

function parseGroupId(value) {
  const groupId = Number(value);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    const error = new Error('Group ID must be a positive integer');
    error.statusCode = 400;
    throw error;
  }
  return groupId;
}

function validateGroupName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    const error = new Error('Group name is required');
    error.statusCode = 400;
    throw error;
  }
  return name.trim();
}

function isDuplicateError(error) {
  return error.code === '23505';
}

async function createGroupRecord(payload) {
  const name = validateGroupName(payload.name);
  const description = payload.description === undefined || payload.description === null
    ? null
    : String(payload.description).trim();

  try {
    const result = await pool.query(
      `INSERT INTO groups (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at, updated_at;`,
      [name, description]
    );
    return { ...result.rows[0], agent_count: 0 };
  } catch (error) {
    if (isDuplicateError(error)) {
      const duplicateError = new Error('A group with that name already exists');
      duplicateError.statusCode = 409;
      throw duplicateError;
    }
    throw error;
  }
}

async function getAllGroupRecords() {
  const result = await pool.query(
    `SELECT g.id, g.name, g.description, g.created_at, g.updated_at,
            COUNT(a.id)::int AS agent_count
     FROM groups g
     LEFT JOIN agents a ON a.group_id = g.id
     GROUP BY g.id
     ORDER BY g.name ASC;`
  );
  return result.rows;
}

async function getGroupRecordById(value) {
  const groupId = parseGroupId(value);
  const groupResult = await pool.query(
    `SELECT g.id, g.name, g.description, g.created_at, g.updated_at,
            COUNT(a.id)::int AS agent_count
     FROM groups g
     LEFT JOIN agents a ON a.group_id = g.id
     WHERE g.id = $1
     GROUP BY g.id;`,
    [groupId]
  );

  if (groupResult.rows.length === 0) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }

  const agentsResult = await pool.query(
    `SELECT agent_id, hostname, ip_address, os, status, last_seen
     FROM agents
     WHERE group_id = $1
     ORDER BY hostname ASC, agent_id ASC;`,
    [groupId]
  );

  return { ...groupResult.rows[0], agents: agentsResult.rows };
}

async function updateGroupRecord(value, payload) {
  const groupId = parseGroupId(value);
  const hasName = Object.prototype.hasOwnProperty.call(payload, 'name');
  const hasDescription = Object.prototype.hasOwnProperty.call(payload, 'description');
  const name = hasName ? validateGroupName(payload.name) : null;
  const description = hasDescription && payload.description !== null
    ? String(payload.description).trim()
    : payload.description;

  if (!hasName && !hasDescription) {
    const error = new Error('At least one group field is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const result = await pool.query(
      `UPDATE groups
       SET name = CASE WHEN $2 THEN $1 ELSE name END,
           description = CASE WHEN $3 THEN $4 ELSE description END,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, description, created_at, updated_at;`,
      [name, hasName, hasDescription, description, groupId]
    );

    if (result.rows.length === 0) {
      const error = new Error('Group not found');
      error.statusCode = 404;
      throw error;
    }
    return getGroupRecordById(groupId);
  } catch (error) {
    if (isDuplicateError(error)) {
      const duplicateError = new Error('A group with that name already exists');
      duplicateError.statusCode = 409;
      throw duplicateError;
    }
    throw error;
  }
}

async function deleteGroupRecord(value) {
  const groupId = parseGroupId(value);
  const result = await pool.query('DELETE FROM groups WHERE id = $1 RETURNING id', [groupId]);
  if (result.rows.length === 0) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }
}

async function assignAgentGroupRecord(agentId, value) {
  const groupId = value === null || value === undefined ? null : parseGroupId(value);
  const agentResult = await pool.query('SELECT id FROM agents WHERE agent_id = $1 LIMIT 1', [agentId]);
  if (agentResult.rows.length === 0) {
    const error = new Error('Agent not found');
    error.statusCode = 404;
    throw error;
  }

  if (groupId !== null) {
    const groupResult = await pool.query('SELECT id FROM groups WHERE id = $1 LIMIT 1', [groupId]);
    if (groupResult.rows.length === 0) {
      const error = new Error('Group not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const result = await pool.query(
    `UPDATE agents
     SET group_id = $1, updated_at = NOW()
     WHERE agent_id = $2
     RETURNING agent_id, hostname, ip_address, os, os_version, username, agent_version, status, last_seen, created_at, updated_at, group_id;`,
    [groupId, agentId]
  );

  const agent = result.rows[0];
  if (agent.group_id === null) {
    agent.group = null;
  } else {
    const groupResult = await pool.query('SELECT id, name FROM groups WHERE id = $1', [agent.group_id]);
    agent.group = groupResult.rows[0] || null;
  }
  delete agent.group_id;
  return agent;
}

module.exports = {
  createGroupRecord,
  getAllGroupRecords,
  getGroupRecordById,
  updateGroupRecord,
  deleteGroupRecord,
  assignAgentGroupRecord,
};
