const express = require('express');

const {
  createUsbEvent,
  getUsbEvents,
} = require('../controllers/usbEventController');

const router = express.Router();

router.post('/usb-events', createUsbEvent);

router.get('/usb-events', getUsbEvents);

module.exports = router;