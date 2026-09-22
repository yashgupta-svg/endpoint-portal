const { createFileEventRecord, getAgentFileEvents } = require('../services/fileEventService');

function errorResponse(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal server error' : error.message,
  });
}

async function createFileEvent(req, res) {
  try {
    const event = await createFileEventRecord(req.body || {});
    return res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Create file event error:', error.message);
    return errorResponse(res, error);
  }
}

async function getFileEvents(req, res) {
  try {
    const events = await getAgentFileEvents(req.params.agent_id, req.query.limit);
    return res.status(200).json({
      success: true,
      agent_id: req.params.agent_id,
      events,
    });
  } catch (error) {
    console.error('Get file events error:', error.message);
    return errorResponse(res, error);
  }
}

module.exports = {
  createFileEvent,
  getFileEvents,
};
