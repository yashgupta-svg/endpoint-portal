const {
  createGroupRecord,
  getAllGroupRecords,
  getGroupRecordById,
  updateGroupRecord,
  deleteGroupRecord,
} = require('../services/groupService');

function errorResponse(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal server error' : error.message,
  });
}

async function createGroup(req, res) {
  try {
    const group = await createGroupRecord(req.body || {});
    return res.status(201).json({ success: true, group });
  } catch (error) {
    console.error('Create group error:', error.message);
    return errorResponse(res, error);
  }
}

async function getAllGroups(req, res) {
  try {
    const groups = await getAllGroupRecords();
    return res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error('Get groups error:', error.message);
    return errorResponse(res, error);
  }
}

async function getGroupById(req, res) {
  try {
    const group = await getGroupRecordById(req.params.id);
    return res.status(200).json({ success: true, group });
  } catch (error) {
    console.error('Get group error:', error.message);
    return errorResponse(res, error);
  }
}

async function updateGroup(req, res) {
  try {
    const group = await updateGroupRecord(req.params.id, req.body || {});
    return res.status(200).json({ success: true, group });
  } catch (error) {
    console.error('Update group error:', error.message);
    return errorResponse(res, error);
  }
}

async function deleteGroup(req, res) {
  try {
    await deleteGroupRecord(req.params.id);
    return res.status(200).json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error.message);
    return errorResponse(res, error);
  }
}

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
};
