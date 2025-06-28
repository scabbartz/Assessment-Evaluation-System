const express = require('express');
const router = express.Router();
const {
    calculateBenchmarksForSession,
    getBenchmarks,
    getBenchmarkById,
    // deleteBenchmark (if you add it to controller)
} = require('../controllers/benchmarkController');

// TODO: Add protect and authorize middleware for relevant routes
// Example: const { protect, authorize } = require('../middleware/authMiddleware');

// @route   POST /api/benchmarks/calculate/session/:sessionId
// @desc    Trigger benchmark calculation for a session (potentially filtered)
// @access  Private (e.g., ProgramAdmin, SystemAdmin)
router.post('/calculate/session/:sessionId', /* protect, authorize(['ProgramAdmin']), */ calculateBenchmarksForSession);


// @route   GET /api/benchmarks
// @desc    Get benchmark data based on query parameters (sessionId, assessmentId, parameterId, ageGroup, gender)
// @access  Public or Private (depending on data sensitivity)
router.get('/', /* protect, */ getBenchmarks);


// @route   GET /api/benchmarks/:benchmarkId
// @desc    Get a specific benchmark by its own _id
// @access  Public or Private
router.get('/:benchmarkId', /* protect, */ getBenchmarkById);


// Example for a delete route if needed:
// router.delete('/:benchmarkId', protect, authorize(['SystemAdmin']), deleteBenchmark);


module.exports = router;
