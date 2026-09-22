const express = require('express');
const {
  createPolicy,
  getPolicies,
  getPolicy,
  updatePolicy,
  deletePolicy,
  getAgentPoliciesForAgent,
} = require('../controllers/filePolicyController');

const router = express.Router();

router.post('/file-policies', createPolicy);
router.get('/file-policies', getPolicies);
router.get('/file-policies/:id', getPolicy);
router.put('/file-policies/:id', updatePolicy);
router.delete('/file-policies/:id', deletePolicy);
router.get('/agents/:agent_id/file-policies', getAgentPoliciesForAgent);

module.exports = router;
