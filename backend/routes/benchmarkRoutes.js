const express = require('express');
const router = express.Router();
const {
    calculateBenchmarksForSession,
    getBenchmarks,
    getBenchmarkById,
} = require('../controllers/benchmarkController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { userRoles } = require('../models/UserModel');

// Define roles that can trigger benchmark calculations
const benchmarkCalculatorRoles = [userRoles[0], userRoles[1], userRoles[2]]; // SuperAdmin, SystemAdmin, ProgramAdmin

/**
 * @swagger
 * tags:
 *   name: Benchmarks
 *   description: Benchmark calculation and retrieval operations.
 * components:
 *   schemas:
 *     Benchmark:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the benchmark.
 *         sessionId:
 *           type: string
 *           description: ID of the session this benchmark belongs to.
 *         assessmentId:
 *           type: string
 *           description: ID of the assessment template.
 *         parameterId:
 *           type: string
 *           description: ID of the specific parameter within the assessment.
 *         parameterName:
 *           type: string
 *           description: Denormalized name of the parameter.
 *         ageGroup:
 *           type: string
 *           nullable: true
 *           description: Age group for which this benchmark is specific (if any).
 *         gender:
 *           type: string
 *           nullable: true
 *           description: Gender for which this benchmark is specific (if any).
 *         mean:
 *           type: number
 *           format: float
 *         stdDev:
 *           type: number
 *           format: float
 *         percentiles:
 *           type: object
 *           properties:
 *             p10:
 *               type: number
 *               format: float
 *             p25:
 *               type: number
 *               format: float
 *             p50:
 *               type: number
 *               format: float
 *             p75:
 *               type: number
 *               format: float
 *             p90:
 *               type: number
 *               format: float
 *         count:
 *           type: integer
 *           description: Number of data points used for this calculation.
 *         minObservedValue:
 *           type: number
 *           format: float
 *         maxObservedValue:
 *           type: number
 *           format: float
 *         lastCalculated:
 *           type: string
 *           format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /benchmarks/calculate/session/{sessionId}:
 *   post:
 *     summary: Trigger benchmark calculation for a session.
 *     tags: [Benchmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the session.
 *     requestBody:
 *       description: Optional filters for calculation.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assessmentIdFilter:
 *                 type: string
 *                 description: ID of a specific assessment to calculate benchmarks for.
 *               ageGroupFilter:
 *                 type: string
 *                 description: Specific age group to filter entries by.
 *               genderFilter:
 *                 type: string
 *                 description: Specific gender to filter entries by.
 *     responses:
 *       200:
 *         description: Benchmark calculation process completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 created: { type: integer }
 *                 updated: { type: integer }
 *       400: { description: "Invalid input or no assessment data found." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 *       404: { description: "Session not found." }
 */
router.post('/calculate/session/:sessionId', protect, authorize(benchmarkCalculatorRoles), calculateBenchmarksForSession);

/**
 * @swagger
 * /benchmarks:
 *   get:
 *     summary: Get benchmark data based on query parameters.
 *     tags: [Benchmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema: { type: string }
 *       - in: query
 *         name: assessmentId
 *         schema: { type: string }
 *       - in: query
 *         name: parameterId
 *         schema: { type: string }
 *       - in: query
 *         name: ageGroup
 *         schema: { type: string, nullable: true }
 *       - in: query
 *         name: gender
 *         schema: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: A list of benchmarks.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Benchmark'
 *       401: { description: "Not authorized." }
 */
router.get('/', protect, getBenchmarks);

/**
 * @swagger
 * /benchmarks/{benchmarkId}:
 *   get:
 *     summary: Get a specific benchmark by its ID.
 *     tags: [Benchmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: benchmarkId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the benchmark.
 *     responses:
 *       200:
 *         description: Benchmark data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Benchmark'
 *       401: { description: "Not authorized." }
 *       404: { description: "Benchmark not found." }
 */
router.get('/:benchmarkId', protect, getBenchmarkById);

module.exports = router;
