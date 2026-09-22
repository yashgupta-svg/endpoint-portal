const { pool } = require('../db/postgres');

const RANGE_HOURS = {
  '1h': 1,
  '6h': 6,
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

const VALID_SCOPES = new Set(['all', 'group', 'agent']);

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest(`${label} must be a positive integer`);
  }
  return parsed;
}

async function resolveScope(scope, groupIdValue, agentIdValue) {
  if (!VALID_SCOPES.has(scope)) {
    throw badRequest('scope must be one of: all, group, agent');
  }

  if (scope === 'group') {
    if (groupIdValue === undefined) throw badRequest('group_id is required for group reports');
    const groupId = parsePositiveInteger(groupIdValue, 'group_id');
    const result = await pool.query('SELECT id, name FROM groups WHERE id = $1', [groupId]);
    if (result.rows.length === 0) throw notFound('Group not found');
    return { groupId, group: result.rows[0] };
  }

  if (scope === 'agent') {
    if (typeof agentIdValue !== 'string' || agentIdValue.trim() === '') {
      throw badRequest('agent_id is required for agent reports');
    }
    const result = await pool.query(
      `SELECT agent_id, hostname FROM agents WHERE agent_id = $1 LIMIT 1`,
      [agentIdValue.trim()]
    );
    if (result.rows.length === 0) throw notFound('Agent not found');
    return { agentId: agentIdValue.trim(), agent: result.rows[0] };
  }

  return {};
}

async function generateReport(query) {
  const scope = query.scope || 'all';
  const range = query.range || '24h';
  if (!Object.prototype.hasOwnProperty.call(RANGE_HOURS, range)) {
    throw badRequest('range must be one of: 1h, 6h, 24h, 7d, 30d');
  }

  const resolved = await resolveScope(scope, query.group_id, query.agent_id);
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - (RANGE_HOURS[range] * 60 * 60 * 1000));

  const parameters = [startTime, endTime];
  const filters = [];
  if (resolved.groupId) {
    parameters.push(resolved.groupId);
    filters.push(`a.group_id = $${parameters.length}`);
  }
  if (resolved.agentId) {
    parameters.push(resolved.agentId);
    filters.push(`a.agent_id = $${parameters.length}`);
  }

  const result = await pool.query(
    `SELECT a.agent_id, a.hostname, a.ip_address, a.os, a.username,
            a.status, a.last_seen,
            g.name AS group_name,
            AVG(m.cpu_usage)::float8 AS average_cpu,
            MAX(m.cpu_usage)::float8 AS maximum_cpu,
            AVG(m.ram_usage)::float8 AS average_ram,
            MAX(m.ram_usage)::float8 AS maximum_ram,
            AVG(m.disk_usage)::float8 AS average_disk,
            MAX(m.disk_usage)::float8 AS maximum_disk,
            AVG(m.network_download)::float8 AS average_download,
            MAX(m.network_download)::float8 AS maximum_download,
            AVG(m.network_upload)::float8 AS average_upload,
            MAX(m.network_upload)::float8 AS maximum_upload,
            COUNT(m.id)::int AS metric_count
     FROM agents a
     LEFT JOIN groups g ON g.id = a.group_id
     LEFT JOIN metrics m
       ON m.agent_id = a.id
      AND m.timestamp >= $1
      AND m.timestamp <= $2
     ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''}
     GROUP BY a.id, g.id
     ORDER BY a.agent_id ASC;`,
    parameters
  );

  const endpoints = result.rows.map((row) => ({
    agent_id: row.agent_id,
    hostname: row.hostname,
    ip_address: row.ip_address,
    os: row.os,
    username: row.username,
    group: row.group_name,
    status: row.status,
    last_seen: row.last_seen,
    metrics: {
      average_cpu: row.average_cpu,
      maximum_cpu: row.maximum_cpu,
      average_ram: row.average_ram,
      maximum_ram: row.maximum_ram,
      average_disk: row.average_disk,
      maximum_disk: row.maximum_disk,
      average_download: row.average_download,
      maximum_download: row.maximum_download,
      average_upload: row.average_upload,
      maximum_upload: row.maximum_upload,
      metric_count: row.metric_count,
    },
  }));

  const metricRecords = endpoints.reduce((total, endpoint) => total + endpoint.metrics.metric_count, 0);
  return {
    scope,
    range,
    start_time: startTime,
    end_time: endTime,
    generated_at: new Date(),
    ...(resolved.group ? { group: resolved.group } : {}),
    ...(resolved.agent ? { agent: resolved.agent } : {}),
    summary: {
      total_endpoints: endpoints.length,
      online_endpoints: endpoints.filter((endpoint) => endpoint.status === 'online').length,
      offline_endpoints: endpoints.filter((endpoint) => endpoint.status !== 'online').length,
      metric_records: metricRecords,
    },
    endpoints,
  };
}

module.exports = {
  generateReport,
};
