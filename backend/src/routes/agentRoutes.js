const express = require('express');
const {
  registerAgent,
  getAllAgents,
  getAgentById,
  assignAgentGroup,
} = require('../controllers/agentController');

const router = express.Router();

router.post('/agents/register', registerAgent);
router.get('/agents', getAllAgents);
router.get('/agents/:agent_id', getAgentById);
router.put('/agents/:agent_id/group', assignAgentGroup);

module.exports = router;
