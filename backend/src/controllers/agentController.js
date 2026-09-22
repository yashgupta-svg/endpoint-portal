const { registerAgentRecord, getAllAgentRecords, getAgentRecordById } = require('../services/agentService');
const { assignAgentGroupRecord } = require('../services/groupService');

function safeAgent(agent) {
  const result = { ...agent };
  delete result.id;
  return result;
}

async function registerAgent(req, res) {
  try {
    const result = await registerAgentRecord(req.body || {});

    return res.status(result.created ? 201 : 200).json({
      success: true,
      message: result.message,
      agent: safeAgent(result.agent),
    });
  } catch (error) {
    console.error('Register agent error:', error.message);

    const statusCode = error.statusCode || 500;
    const message = statusCode === 500
      ? 'Internal server error'
      : error.message;

    return res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
}

async function getAllAgents(req, res) {
  try {
    const agents = await getAllAgentRecords();

    return res.status(200).json({
      success: true,
      agents: agents.map(safeAgent),
    });
  } catch (error) {
    console.error('Get all agents error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

async function getAgentById(req, res) {
  try {
    const { agent_id } = req.params;
    const agent = await getAgentRecordById(agent_id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    return res.status(200).json({
      success: true,
      agent: safeAgent(agent),
    });
  } catch (error) {
    console.error('Get agent by ID error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

async function assignAgentGroup(req, res) {
  try {
    const body = req.body || {};
    if (!Object.prototype.hasOwnProperty.call(body, 'group_id')) {
      return res.status(400).json({ success: false, error: 'group_id is required' });
    }

    const agent = await assignAgentGroupRecord(req.params.agent_id, body.group_id);
    return res.status(200).json({ success: true, agent: safeAgent(agent) });
  } catch (error) {
    console.error('Assign agent group error:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? 'Internal server error' : error.message,
    });
  }
}

module.exports = {
  registerAgent,
  getAllAgents,
  getAgentById,
  assignAgentGroup,
};
