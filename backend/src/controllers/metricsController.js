const {
  createMetricRecord,
  getAgentMetricsRecords,
} = require('../services/metricsService');

async function createMetric(req, res) {
  try {
    const result = await createMetricRecord(req.body || {});
console.log('METRIC RECEIVED:', req.body);
    return res.status(201).json({
      success: true,
      message: 'Metric recorded successfully',
      metric: {
        id: result.metric.id,
        agent_id: result.agentId,
        timestamp: result.metric.timestamp,
        cpu_usage: result.metric.cpu_usage,
        ram_usage: result.metric.ram_usage,
        disk_usage: result.metric.disk_usage,
        network_download: result.metric.network_download,
        network_upload: result.metric.network_upload,
      },
    });
  } catch (error) {
    console.error('Create metric error:', error.message);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? 'Internal server error' : error.message,
    });
  }
}

async function getAgentMetrics(req, res) {
  try {
    const { agent_id } = req.params;
    const result = await getAgentMetricsRecords(agent_id);

    return res.status(200).json({
      success: true,
      agent_id,
      metrics: result.map((metric) => ({
        id: metric.id,
        timestamp: metric.timestamp,
        cpu_usage: metric.cpu_usage,
        ram_usage: metric.ram_usage,
        disk_usage: metric.disk_usage,
        network_download: metric.network_download,
        network_upload: metric.network_upload,
      })),
    });
  } catch (error) {
    console.error('Get agent metrics error:', error.message);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? 'Internal server error' : error.message,
    });
  }
}

module.exports = {
  createMetric,
  getAgentMetrics,
};
