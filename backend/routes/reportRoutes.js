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
const { protect, authorize } = require('../middleware/authMiddleware');
const { userRoles } = require('../models/UserModel');

const reportViewerRoles = [userRoles[0], userRoles[1], userRoles[2], userRoles[3], userRoles[4], userRoles[6]];
const cohortReportViewerRoles = [userRoles[0], userRoles[1], userRoles[2], userRoles[3], userRoles[4]];

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Endpoints for generating and exporting reports.
 * components:
 *   schemas:
 *     AthleteReportEntryData:
 *       type: object
 *       properties:
 *         parameterId: { type: string }
 *         parameterName: { type: string }
 *         value: { type: "object", description: "Mixed type, actual value recorded" }
 *         unit: { type: string }
 *         rawValue: { type: "object", description: "Original value if different from processed value" }
 *         zScore: { type: "number", format: "float", nullable: true }
 *         percentile: { type: "number", format: "float", nullable: true }
 *         band: { type: string, nullable: true }
 *         notes: { type: string, nullable: true }
 *     AthleteReportEntry:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         batchId: { type: string, description: "ID of the batch" } # Assuming populated or just ID
 *         sessionId: { type: string, description: "ID of the session" } # Assuming populated or just ID
 *         assessmentId: { type: string, description: "ID of the assessment template" } # Assuming populated or just ID
 *         athleteId: { type: string }
 *         athleteName: { type: string }
 *         athleteAge: { type: "number", nullable: true }
 *         athleteGender: { type: string, nullable: true }
 *         entryDate: { type: string, format: "date-time" }
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AthleteReportEntryData'
 *         overallScore: { type: "number", format: "float", nullable: true }
 *         overallBand: { type: string, nullable: true }
 *     IndividualAthleteReport:
 *       type: object
 *       properties:
 *         athleteId: { type: string }
 *         entries:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AthleteReportEntry'
 *         sportRecommendations:
 *           type: array
 *           items: { type: string }
 *     CohortParameterStat:
 *       type: object
 *       properties:
 *         parameterName: { type: string }
 *         averageValue: { type: "number", format: "float", nullable: true }
 *         averageZScore: { type: "number", format: "float", nullable: true }
 *         values: { type: array, items: { type: "number" }, description: "(May be omitted in response)" }
 *         zScores: { type: array, items: { type: "number" }, description: "(May be omitted in response)" }
 *     CohortAnalyticsData:
 *       type: object
 *       properties:
 *         totalAthletes: { type: "integer" }
 *         totalEntries: { type: "integer" }
 *         parameterStats:
 *           type: object
 *           additionalProperties:
 *             $ref: '#/components/schemas/CohortParameterStat'
 *     CohortReport:
 *       type: object
 *       properties:
 *         session: { type: object } # Define session details if needed
 *         cohortData:
 *           $ref: '#/components/schemas/CohortAnalyticsData'
 *         message: { type: string, nullable: true }
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// --- Individual Reports ---
/**
 * @swagger
 * /reports/individual/{athleteId}:
 *   get:
 *     summary: Get data for an individual athlete's report.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: athleteId
 *         required: true
 *         schema: { type: string }
 *         description: The string identifier of the athlete.
 *     responses:
 *       200:
 *         description: Individual athlete report data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IndividualAthleteReport'
 *       400: { description: "Athlete ID is required." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 *       404: { description: "No assessment entries found for this athlete." }
 */
router.get('/individual/:athleteId', protect, authorize(reportViewerRoles), getIndividualAthleteReport);

/**
 * @swagger
 * /reports/individual/{athleteId}/export/pdf:
 *   get:
 *     summary: Export individual report as PDF (Placeholder).
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: athleteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Placeholder for PDF export." }
 */
router.get('/individual/:athleteId/export/pdf', protect, authorize(reportViewerRoles), exportIndividualReportPDF);

/**
 * @swagger
 * /reports/individual/{athleteId}/export/csv:
 *   get:
 *     summary: Export individual report as CSV (Placeholder).
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: athleteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Placeholder CSV data.
 *         content: { "text/csv": { schema: { type: string } } }
 */
router.get('/individual/:athleteId/export/csv', protect, authorize(reportViewerRoles), exportIndividualReportCSV);


// --- Cohort Analytics Reports ---
/**
 * @swagger
 * /reports/cohort/session/{sessionId}:
 *   get:
 *     summary: Get data for cohort analytics for a session.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the session.
 *     responses:
 *       200:
 *         description: Cohort analytics data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CohortReport'
 *       400: { description: "Invalid Session ID format." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 *       404: { description: "Session not found." }
 */
router.get('/cohort/session/:sessionId', protect, authorize(cohortReportViewerRoles), getCohortAnalyticsReport);

/**
 * @swagger
 * /reports/cohort/session/{sessionId}/export/pdf:
 *   get:
 *     summary: Export cohort report for a session as PDF (Placeholder).
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Placeholder for PDF export." }
 */
router.get('/cohort/session/:sessionId/export/pdf', protect, authorize(cohortReportViewerRoles), exportCohortReportPDF);

/**
 * @swagger
 * /reports/cohort/session/{sessionId}/export/csv:
 *   get:
 *     summary: Export cohort report for a session as CSV (Placeholder).
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Placeholder CSV data.
 *         content: { "text/csv": { schema: { type: string } } }
 */
router.get('/cohort/session/:sessionId/export/csv', protect, authorize(cohortReportViewerRoles), exportCohortReportCSV);


module.exports = router;
