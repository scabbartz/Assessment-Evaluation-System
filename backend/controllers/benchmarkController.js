const Benchmark = require('../models/BenchmarkModel');
const AssessmentEntry = require('../models/AssessmentEntryModel');
const Session = require('../models/SessionModel');
const Assessment = require('../models/AssessmentModel');
const mongoose = require('mongoose');

// --- Helper Functions (Actual calculation logic will be more complex in Phase 2) ---

// Placeholder for percentile calculation (e.g., using a library or custom algorithm)
const calculatePercentiles = (sortedValues, pRanks = [10, 25, 50, 75, 90]) => {
    const percentiles = {};
    if (!sortedValues || sortedValues.length === 0) {
        pRanks.forEach(p => percentiles[`p${p}`] = null);
        return percentiles;
    }
    // Simplified percentile calculation (linear interpolation)
    pRanks.forEach(p => {
        const x = (p / 100) * (sortedValues.length - 1) + 1;
        const intX = Math.floor(x);
        const fracX = x - intX;
        if (intX -1 < 0) percentiles[`p${p}`] = sortedValues[0]; // if only one value
        else if (intX >= sortedValues.length) percentiles[`p${p}`] = sortedValues[sortedValues.length -1];
        else {
             percentiles[`p${p}`] = sortedValues[intX - 1] + fracX * (sortedValues[intX] - sortedValues[intX - 1]);
        }
         // Ensure two decimal places for numbers
        if (typeof percentiles[`p${p}`] === 'number') {
            percentiles[`p${p}`] = parseFloat(percentiles[`p${p}`].toFixed(2));
        }
    });
    return percentiles;
};

// Placeholder for mean and standard deviation (population)
const calculateMeanStdDev = (values) => {
    if (!values || values.length === 0) return { mean: null, stdDev: null, count: 0, min: null, max: null };

    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    if (numericValues.length === 0) return { mean: null, stdDev: null, count: 0, min: null, max: null };

    const count = numericValues.length;
    const mean = numericValues.reduce((sum, val) => sum + val, 0) / count;
    const stdDev = Math.sqrt(numericValues.reduce((sqDiffSum, val) => sqDiffSum + Math.pow(val - mean, 2), 0) / count); // Population SD
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);

    return {
        mean: parseFloat(mean.toFixed(2)),
        stdDev: parseFloat(stdDev.toFixed(2)),
        count,
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2))
    };
};


// --- Controller Methods ---

// @desc    Trigger benchmark calculation for a session (or specific assessment/batch within it)
// @route   POST /api/benchmarks/calculate/session/:sessionId
// @access  Private (TODO: Add auth, e.g., ProgramAdmin)
const calculateBenchmarksForSession = async (req, res) => {
    const { sessionId } = req.params;
    // Optional body params for more granular calculation: assessmentId, ageGroupFilter, genderFilter
    const { assessmentIdFilter, ageGroupFilter, genderFilter } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ message: 'Invalid Session ID format.' });
    }

    try {
        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found.' });

        // 1. Find all unique assessment templates used in this session via AssessmentEntries or Batches
        // For simplicity, let's assume we might iterate through batches or a predefined list of assessments for the session.
        // If assessmentIdFilter is provided, only calculate for that assessment.

        const distinctAssessments = await AssessmentEntry.distinct('assessmentId', { sessionId });
        let assessmentsToProcess = assessmentIdFilter ? [new mongoose.Types.ObjectId(assessmentIdFilter)] : distinctAssessments;

        if (assessmentsToProcess.length === 0) {
            return res.status(400).json({ message: 'No assessment data found in this session or for the specified assessment filter to calculate benchmarks.' });
        }

        let benchmarksCreatedCount = 0;
        let benchmarksUpdatedCount = 0;

        for (const assessmentId of assessmentsToProcess) {
            const assessment = await Assessment.findById(assessmentId).select('parameters');
            if (!assessment || !assessment.parameters || assessment.parameters.length === 0) continue;

            for (const param of assessment.parameters) {
                if (param.type !== 'numeric' && param.type !== 'time' && param.type !== 'rating') { // Only calculate for quantifiable types
                    console.log(`Skipping benchmark for non-numeric parameter: ${param.name}`);
                    continue;
                }

                // Construct query for entries
                const entryQuery = {
                    sessionId,
                    assessmentId,
                    'data.parameterId': param._id,
                    'data.value': { $ne: null, $exists: true } // Only entries with a value for this param
                };
                if (ageGroupFilter) entryQuery.athleteAgeGroup = ageGroupFilter; // Assuming age group is stored on entry or can be derived
                if (genderFilter) entryQuery.athleteGender = genderFilter;

                const entries = await AssessmentEntry.find(entryQuery).select('data athleteAge athleteGender');

                const valuesForParam = entries
                    .flatMap(e => e.data)
                    .filter(d => d.parameterId.equals(param._id) && d.value !== null && d.value !== undefined)
                    .map(d => parseFloat(d.value)) // Ensure numeric conversion, handle time conversion if stored as string
                    .filter(v => !isNaN(v));

                if (valuesForParam.length < 2) { // Need at least 2 data points for meaningful stdDev
                    console.log(`Skipping benchmark for ${param.name} in session ${sessionId}: Not enough data points (${valuesForParam.length}).`);
                    continue;
                }

                const { mean, stdDev, count, min, max } = calculateMeanStdDev(valuesForParam);
                if (mean === null || stdDev === null) continue;

                const sortedValues = [...valuesForParam].sort((a, b) => a - b);
                const percentiles = calculatePercentiles(sortedValues);

                const benchmarkData = {
                    sessionId,
                    assessmentId,
                    parameterId: param._id,
                    parameterName: param.name,
                    ageGroup: ageGroupFilter || null, // Store the filter used, or null if general
                    gender: genderFilter || null,   // Store the filter used, or null if general
                    mean,
                    stdDev,
                    percentiles,
                    count,
                    minObservedValue: min,
                    maxObservedValue: max,
                    lastCalculated: new Date()
                };

                // Upsert benchmark
                const updatedBenchmark = await Benchmark.findOneAndUpdate(
                    { sessionId, assessmentId, parameterId: param._id, ageGroup: ageGroupFilter || null, gender: genderFilter || null },
                    benchmarkData,
                    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
                );

                if(updatedBenchmark.createdAt.getTime() === updatedBenchmark.updatedAt.getTime()){
                    benchmarksCreatedCount++;
                } else {
                    benchmarksUpdatedCount++;
                }
            }
        }

        res.status(200).json({
            message: 'Benchmark calculation process completed.',
            created: benchmarksCreatedCount,
            updated: benchmarksUpdatedCount,
            // TODO: Include details of which benchmarks were processed
        });

    } catch (error) {
        console.error("Error calculating benchmarks for session:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


// @desc    Get benchmark data
// @route   GET /api/benchmarks
// @access  Public or Private (TODO: Add auth)
const getBenchmarks = async (req, res) => {
    // Query params: sessionId, assessmentId, parameterId, ageGroup, gender
    const { sessionId, assessmentId, parameterId, ageGroup, gender } = req.query;
    const query = {};

    if (sessionId) query.sessionId = sessionId;
    if (assessmentId) query.assessmentId = assessmentId;
    if (parameterId) query.parameterId = parameterId;
    if (ageGroup) query.ageGroup = ageGroup; else query.ageGroup = null; // Default to general if not specified
    if (gender) query.gender = gender; else query.gender = null; // Default to general if not specified

    try {
        const benchmarks = await Benchmark.find(query)
            .populate('sessionId', 'name year term')
            .populate('assessmentId', 'name sport')
            // .populate('parameterId') // parameterId is just an ObjectId, name is denormalized
            .sort({ lastCalculated: -1 });

        if (!benchmarks || benchmarks.length === 0) {
            // It's not necessarily an error if no benchmarks match, could be empty results
            return res.status(200).json([]);
        }
        res.status(200).json(benchmarks);
    } catch (error) {
        console.error("Error fetching benchmarks:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


// @desc    Get a single benchmark by its specific ID
// @route   GET /api/benchmarks/:benchmarkId
// @access  Public or Private
const getBenchmarkById = async (req, res) => {
    const { benchmarkId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(benchmarkId)) {
        return res.status(400).json({ message: 'Invalid Benchmark ID format.' });
    }
    try {
        const benchmark = await Benchmark.findById(benchmarkId)
            .populate('sessionId', 'name year term')
            .populate('assessmentId', 'name sport');

        if (!benchmark) {
            return res.status(404).json({ message: 'Benchmark not found.' });
        }
        res.status(200).json(benchmark);
    } catch (error) {
        console.error("Error fetching benchmark by ID:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

// TODO: Add DELETE endpoint for benchmarks if needed, e.g., for recalculation or cleanup.
// const deleteBenchmark = async (req, res) => { ... }


module.exports = {
    calculateBenchmarksForSession,
    getBenchmarks,
    getBenchmarkById,
    // deleteBenchmark (if implemented)
};
