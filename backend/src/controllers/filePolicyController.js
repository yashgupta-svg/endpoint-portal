const {
  createPolicyRecord,
  getPolicyRecords,
  getPolicyRecordById,
  updatePolicyRecord,
  deletePolicyRecord,
  getAgentPolicies,
} = require('../services/filePolicyService');

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ success: false, error: statusCode === 500 ? 'Internal server error' : error.message });
}

async function createPolicy(req, res) {
  try { return res.status(201).json({ success: true, policy: await createPolicyRecord(req.body || {}) }); } catch (error) { console.error('Create policy error:', error.message); return sendError(res, error); }
}
async function getPolicies(req, res) {
  try { return res.status(200).json({ success: true, policies: await getPolicyRecords() }); } catch (error) { console.error('Get policies error:', error.message); return sendError(res, error); }
}
async function getPolicy(req, res) {
  try { return res.status(200).json({ success: true, policy: await getPolicyRecordById(req.params.id) }); } catch (error) { console.error('Get policy error:', error.message); return sendError(res, error); }
}
async function updatePolicy(req, res) {
  try { return res.status(200).json({ success: true, policy: await updatePolicyRecord(req.params.id, req.body || {}) }); } catch (error) { console.error('Update policy error:', error.message); return sendError(res, error); }
}
async function deletePolicy(req, res) {
  try { await deletePolicyRecord(req.params.id); return res.status(204).send(); } catch (error) { console.error('Delete policy error:', error.message); return sendError(res, error); }
}
async function getAgentPoliciesForAgent(req, res) {
  try { return res.status(200).json({ success: true, agent_id: req.params.agent_id, policies: await getAgentPolicies(req.params.agent_id) }); } catch (error) { console.error('Get agent policies error:', error.message); return sendError(res, error); }
}

module.exports = { createPolicy, getPolicies, getPolicy, updatePolicy, deletePolicy, getAgentPoliciesForAgent };
