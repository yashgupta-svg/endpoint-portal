const express = require('express');

const {
  createThreatEvent,
  getThreatEvents,
  getThreatEventById,
  updateThreatStatus,
} = require('../controllers/threatEventController');

const router = express.Router();

router.post(
  '/threat-events',
  createThreatEvent
);

router.get(
  '/threat-events',
  getThreatEvents
);

router.get(
  '/threat-events/:id',
  getThreatEventById
);

router.patch(
  '/threat-events/:id/status',
  updateThreatStatus
);

module.exports = router;