const { pool } = require('../db/postgres');

const metricFields = [
  'agent_id',
  'cpu_usage',
  'ram_usage',
  'disk_usage',
  'network_download',
  'network_upload',
];

function validateMetricPayload(payload) {
  for (const field of metricFields) {
    if (!(field in payload) || payload[field] === null || payload[field] === '') {
      const error = new Error(`Missing field: ${field}`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (typeof payload.agent_id !== 'string' || payload.agent_id.trim() === '') {
    const error = new Error('agent_id must be a non-empty string');
    error.statusCode = 400;
    throw error;
  }

  const boundedFields = ['cpu_usage', 'ram_usage', 'disk_usage'];
  const nonNegativeFields = ['network_download', 'network_upload'];

  for (const field of [...boundedFields, ...nonNegativeFields]) {
    if (typeof payload[field] !== 'number' || !Number.isFinite(payload[field])) {
      const error = new Error(`${field} must be a number`);
      error.statusCode = 400;
      throw error;
    }
  }

  for (const field of boundedFields) {
    if (payload[field] < 0 || payload[field] > 100) {
      const error = new Error(`${field} must be between 0 and 100`);
      error.statusCode = 400;
      throw error;
    }
  }

  for (const field of nonNegativeFields) {
    if (payload[field] < 0) {
      const error = new Error(`${field} must be greater than or equal to 0`);
      error.statusCode = 400;
      throw error;
    }
  }
}

async function findAgentId(agentId, client = pool) {
  const result = await client.query(
    'SELECT id FROM agents WHERE agent_id = $1 LIMIT 1',
    [agentId]
  );

  return result.rows[0] || null;
}

async function createMetricRecord(payload) {
  validateMetricPayload(payload);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const agent = await findAgentId(payload.agent_id, client);
    if (!agent) {
      const error = new Error('Agent not found');
      error.statusCode = 404;
      throw error;
    }

    const metricResult = await client.query(
      `INSERT INTO metrics (
        agent_id,
        cpu_usage,
        ram_usage,
        disk_usage,
        network_download,
        network_upload
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, timestamp, cpu_usage, ram_usage, disk_usage, network_download, network_upload;`,
      [
        agent.id,
        payload.cpu_usage,
        payload.ram_usage,
        payload.disk_usage,
        payload.network_download,
        payload.network_upload,
      ]
    );

    await client.query(
      `UPDATE agents
       SET status = 'online', last_seen = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [agent.id]
    );

    await client.query('COMMIT');

    return {
      agentId: payload.agent_id,
      metric: metricResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getAgentMetricsRecords(agentId) {
  if (typeof agentId !== 'string' || agentId.trim() === '') {
    const error = new Error('agent_id must be a non-empty string');
    error.statusCode = 400;
    throw error;
  }

  const agent = await findAgentId(agentId);
  if (!agent) {
    const error = new Error('Agent not found');
    error.statusCode = 404;
    throw error;
  }

  const result = await pool.query(
    `SELECT id, timestamp, cpu_usage, ram_usage, disk_usage, network_download, network_upload
     FROM metrics
     WHERE agent_id = $1
     ORDER BY timestamp DESC
     LIMIT $2`,
    [agent.id, 100]
  );

  return result.rows;
}

module.exports = {
  createMetricRecord,
  getAgentMetricsRecords,
};
