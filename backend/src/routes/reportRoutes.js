const express = require('express');
const { getReport } = require('../controllers/reportController');

const router = express.Router();

router.get('/reports', getReport);

module.exports = router;
