const { pool } = require('../db/postgres');

/*
 * =====================================================
 * CREATE THREAT EVENT
 * =====================================================
 */

async function createThreatEvent(req, res, next) {
  try {
    const {
      agent_id,
      threat_type,
      severity,
      title,
      description,
      file_name,
      file_path,
      process_name,
      command_line,
      username,
      ip_address,
      sha256,
      status,
      detected_at,
    } = req.body;

    if (
      !agent_id ||
      !threat_type ||
      !severity ||
      !title
    ) {
      return res.status(400).json({
        error:
          'agent_id, threat_type, severity and title are required',
      });
    }

    const allowedSeverity = [
      'low',
      'medium',
      'high',
      'critical',
    ];

    if (!allowedSeverity.includes(severity)) {
      return res.status(400).json({
        error:
          'Invalid severity. Use low, medium, high or critical',
      });
    }

    const allowedStatus = [
      'open',
      'investigating',
      'resolved',
    ];

    const finalStatus = status || 'open';

    if (!allowedStatus.includes(finalStatus)) {
      return res.status(400).json({
        error:
          'Invalid status. Use open, investigating or resolved',
      });
    }

    const result = await pool.query(
      `
      INSERT INTO threat_events (
        agent_id,
        threat_type,
        severity,
        title,
        description,
        file_name,
        file_path,
        process_name,
        command_line,
        username,
        ip_address,
        sha256,
        status,
        detected_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        COALESCE($14, NOW())
      )
      RETURNING *;
      `,
      [
        agent_id,
        threat_type,
        severity,
        title,
        description || null,
        file_name || null,
        file_path || null,
        process_name || null,
        command_line || null,
        username || null,
        ip_address || null,
        sha256 || null,
        finalStatus,
        detected_at || null,
      ]
    );

    return res.status(201).json({
      message: 'Threat event created',
      threat: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/*
 * =====================================================
 * GET ALL THREAT EVENTS
 * =====================================================
 */

async function getThreatEvents(req, res, next) {
  try {
    const {
      agent_id,
      severity,
      status,
      limit,
    } = req.query;

    const values = [];
    const conditions = [];

    if (agent_id) {
      values.push(agent_id);
      conditions.push(
        `agent_id = $${values.length}`
      );
    }

    if (severity) {
      values.push(severity);
      conditions.push(
        `severity = $${values.length}`
      );
    }

    if (status) {
      values.push(status);
      conditions.push(
        `status = $${values.length}`
      );
    }

    let query = `
      SELECT *
      FROM threat_events
    `;

    if (conditions.length > 0) {
      query += `
        WHERE ${conditions.join(' AND ')}
      `;
    }

    values.push(
      Math.min(
        Math.max(
          Number(limit) || 100,
          1
        ),
        500
      )
    );

    query += `
      ORDER BY detected_at DESC
      LIMIT $${values.length};
    `;

    const result = await pool.query(
      query,
      values
    );

    return res.status(200).json({
      count: result.rows.length,
      threats: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

/*
 * =====================================================
 * GET SINGLE THREAT EVENT
 * =====================================================
 */

async function getThreatEventById(
  req,
  res,
  next
) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM threat_events
      WHERE id = $1
      LIMIT 1;
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Threat event not found',
      });
    }

    return res.status(200).json({
      threat: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/*
 * =====================================================
 * UPDATE THREAT STATUS
 * =====================================================
 */

async function updateThreatStatus(
  req,
  res,
  next
) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = [
      'open',
      'investigating',
      'resolved',
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        error:
          'Invalid status. Use open, investigating or resolved',
      });
    }

    const result = await pool.query(
      `
      UPDATE threat_events
      SET status = $1
      WHERE id = $2
      RETURNING *;
      `,
      [
        status,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Threat event not found',
      });
    }

    return res.status(200).json({
      message: 'Threat status updated',
      threat: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  createThreatEvent,
  getThreatEvents,
  getThreatEventById,
  updateThreatStatus,
};