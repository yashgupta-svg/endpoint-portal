const { generateReport } = require('../services/reportService');

async function getReport(req, res) {
  try {
    const report = await generateReport(req.query);
    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Generate report error:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? 'Internal server error' : error.message,
    });
  }
}

module.exports = {
  getReport,
};
