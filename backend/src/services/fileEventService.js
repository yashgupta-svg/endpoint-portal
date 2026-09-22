const { pool } = require('../db/postgres');
const { evaluatePolicy } = require('./filePolicyService');

const SUPPORTED_EXTENSIONS = new Set(['.zip', '.rar', '.exe', '.msi', '.deb']);
const EVENT_TYPES = new Set(['created', 'modified', 'deleted']);
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function validateEventPayload(payload) {
  const requiredFields = ['agent_id', 'file_name', 'file_path', 'file_extension', 'event_type'];
  for (const field of requiredFields) {
    if (typeof payload[field] !== 'string' || payload[field].trim() === '') {
      throw validationError(`${field} is required`);
    }
  }

  const extension = payload.file_extension.trim().toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw validationError('file_extension is not supported');
  }

  const eventType = payload.event_type.trim().toLowerCase();
  if (!EVENT_TYPES.has(eventType)) {
    throw validationError('event_type must be created, modified, or deleted');
  }

  let fileSize = payload.file_size;
  if (fileSize !== null && fileSize !== undefined) {
    if (!Number.isInteger(fileSize) || fileSize < 0) {
      throw validationError('file_size must be a non-negative integer or null');
    }
  } else {
    fileSize = null;
  }

  const username = payload.username === null || payload.username === undefined
    ? null
    : String(payload.username).trim() || null;

  return {
    agentId: payload.agent_id.trim(),
    fileName: payload.file_name.trim(),
    filePath: payload.file_path.trim(),
    fileExtension: extension,
    eventType,
    fileSize,
    username,
  };
}

async function assertAgentExists(agentId) {
  const result = await pool.query('SELECT id FROM agents WHERE agent_id = $1 LIMIT 1', [agentId]);
  if (result.rows.length === 0) {
    const error = new Error('Agent not found');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0].id;
}

async function createFileEventRecord(payload) {
  const normalized = validateEventPayload(payload);
  const agentDatabaseId = await assertAgentExists(normalized.agentId);
  const policy = await evaluatePolicy(normalized.agentId, normalized.fileExtension);
  const result = await pool.query(
    `INSERT INTO file_events (
      agent_id, file_name, file_path, file_extension, event_type, file_size, username,
      policy_id, policy_action, policy_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, file_name, file_path, file_extension, event_type, file_size, username,
              policy_id, policy_action, policy_name, timestamp;`,
    [
      agentDatabaseId,
      normalized.fileName,
      normalized.filePath,
      normalized.fileExtension,
      normalized.eventType,
      normalized.fileSize,
      normalized.username,
      policy?.id || null,
      policy?.action || null,
      policy?.name || null,
    ]
  );

  return { agent_id: normalized.agentId, ...result.rows[0], policy: policy || null };
}

function parseLimit(value) {
  if (value === undefined) return DEFAULT_LIMIT;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_LIMIT) {
    throw validationError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}

async function getAgentFileEvents(agentId, limitValue) {
  if (typeof agentId !== 'string' || agentId.trim() === '') {
    throw validationError('agent_id is required');
  }
  await assertAgentExists(agentId.trim());
  const limit = parseLimit(limitValue);
  const result = await pool.query(
    `SELECT fe.id, a.agent_id, fe.file_name, fe.file_path, fe.file_extension,
            fe.event_type, fe.file_size, fe.username, fe.policy_id,
            fe.policy_action, fe.policy_name, fe.timestamp
     FROM file_events fe
     JOIN agents a ON a.id = fe.agent_id
     WHERE a.agent_id = $1
     ORDER BY fe.timestamp DESC, fe.id DESC
     LIMIT $2;`,
    [agentId.trim(), limit]
  );
  return result.rows;
}

module.exports = {
  createFileEventRecord,
  getAgentFileEvents,
};
