const { pool } = require('../db/postgres');

async function createUsbEvent(req, res, next) {
  try {
    const { ip_address, event_type } = req.body;

    if (!ip_address) {
      return res.status(400).json({
        error: 'ip_address is required',
      });
    }

    if (!['connected', 'disconnected'].includes(event_type)) {
      return res.status(400).json({
        error: 'event_type must be connected or disconnected',
      });
    }

    const result = await pool.query(
      `
      INSERT INTO usb_events (
        ip_address,
        event_type
      )
      VALUES ($1, $2)
      RETURNING
        id,
        ip_address,
        event_type,
        timestamp
      `,
      [ip_address, event_type]
    );

    res.status(201).json({
      message: 'USB event recorded successfully',
      event: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function getUsbEvents(req, res, next) {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        ip_address,
        event_type,
        timestamp
      FROM usb_events
      ORDER BY timestamp DESC
      LIMIT 500
      `
    );

    res.status(200).json({
      events: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createUsbEvent,
  getUsbEvents,
};