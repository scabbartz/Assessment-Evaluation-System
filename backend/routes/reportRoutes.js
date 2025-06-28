const express = require('express');
const router = express.Router();
const {
    getIndividualAthleteReport,
    getCohortAnalyticsReport,
    exportIndividualReportPDF,
    exportIndividualReportCSV,
    exportCohortReportPDF,
    exportCohortReportCSV,
} = require('../controllers/reportController');

// TODO: Add protect and authorize middleware where appropriate

// --- Individual Reports ---
// @route   GET /api/reports/individual/:athleteId
// @desc    Get data for an individual athlete's report
router.get('/individual/:athleteId', getIndividualAthleteReport);

// @route   GET /api/reports/individual/:athleteId/export/pdf
// @desc    Export individual report as PDF (Placeholder)
router.get('/individual/:athleteId/export/pdf', exportIndividualReportPDF);

// @route   GET /api/reports/individual/:athleteId/export/csv
// @desc    Export individual report as CSV (Placeholder)
router.get('/individual/:athleteId/export/csv', exportIndividualReportCSV);


// --- Cohort Analytics Reports ---
// @route   GET /api/reports/cohort/session/:sessionId
// @desc    Get data for cohort analytics for a session
router.get('/cohort/session/:sessionId', getCohortAnalyticsReport);
// TODO: Could add /api/reports/cohort/batch/:batchId if needed

// @route   GET /api/reports/cohort/session/:sessionId/export/pdf
// @desc    Export cohort report for a session as PDF (Placeholder)
router.get('/cohort/session/:sessionId/export/pdf', exportCohortReportPDF);

// @route   GET /api/reports/cohort/session/:sessionId/export/csv
// @desc    Export cohort report for a session as CSV (Placeholder)
router.get('/cohort/session/:sessionId/export/csv', exportCohortReportCSV);


module.exports = router;
