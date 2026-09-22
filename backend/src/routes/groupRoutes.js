const express = require('express');
const {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
} = require('../controllers/groupController');

const router = express.Router();

router.post('/groups', createGroup);
router.get('/groups', getAllGroups);
router.get('/groups/:id', getGroupById);
router.put('/groups/:id', updateGroup);
router.delete('/groups/:id', deleteGroup);

module.exports = router;
