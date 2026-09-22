const express = require('express');
const { createFileEvent, getFileEvents } = require('../controllers/fileEventController');

const router = express.Router();

router.post('/file-events', createFileEvent);
router.get('/agents/:agent_id/file-events', getFileEvents);

module.exports = router;
