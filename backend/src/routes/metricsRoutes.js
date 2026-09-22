const express = require('express');
const {
  createMetric,
  getAgentMetrics,
} = require('../controllers/metricsController');

const router = express.Router();

router.post('/metrics', createMetric);
router.get('/agents/:agent_id/metrics', getAgentMetrics);

module.exports = router;
