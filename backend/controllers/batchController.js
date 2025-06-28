const Batch = require('../models/BatchModel');
const Session = require('../models/SessionModel'); // To validate students against session roster
const Assessment = require('../models/AssessmentModel'); // To validate assessmentId
const AssessmentEntry = require('../models/AssessmentEntryModel'); // For processing results
const Benchmark = require('../models/BenchmarkModel'); // For fetching benchmarks
const mongoose = require('mongoose');

// --- Helper for Scoring (Actual logic can be more sophisticated) ---
const calculateScoresForParameter = (value, benchmark) => {
    if (value === null || value === undefined || !benchmark || benchmark.mean === null || benchmark.stdDev === null || benchmark.stdDev === 0) {
        return { zScore: null, percentile: null, band: null };
    }

    const numericValue = Number(value);
    if (isNaN(numericValue)) {
         return { zScore: null, percentile: null, band: null };
    }

    const zScore = parseFloat(((numericValue - benchmark.mean) / benchmark.stdDev).toFixed(2));

    // Placeholder for percentile rank - this is complex.
    // A true percentile rank requires knowing the distribution or having many data points.
    // For now, we can use the benchmark's pre-calculated percentiles as a rough guide or leave it null.
    // Example: if zScore is close to a certain percentile's typical Z value.
    // Or, if benchmark.percentiles.p50 (median) is available, compare against it.
    let percentile = null; // TODO: Implement more robust percentile calculation or lookup in Phase 2/Report generation

    let band = 'Needs Improvement'; // Default band
    // Determine band based on Z-score thresholds (as per plan 5.3)
    if (zScore > 1) band = 'Excellent';
    else if (zScore > 0) band = 'Above Average'; // 0 < z <= 1
    else if (zScore > -1) band = 'Below Average'; // -1 < z <= 0
    // else z <= -1 remains 'Needs Improvement'

    return { zScore, percentile, band };
};


// @desc    Create a new batch within a session
// @route   POST /api/sessions/:sessionId/batches
// @access  Private (TODO: Add auth middleware)
const createBatch = async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: 'Invalid Session ID format.' });
        }

        const parentSession = await Session.findById(sessionId);
        if (!parentSession) {
            return res.status(404).json({ message: 'Parent session not found.' });
        }

        const {
            title, assessmentId, maxStudents, venue, date, startTime, endTime,
            instructors, students, status
        } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Batch title is required.' });
        }

        if (assessmentId && !mongoose.Types.ObjectId.isValid(assessmentId)) {
             return res.status(400).json({ message: 'Invalid Assessment ID format.' });
        }
        if (assessmentId) {
            const assessmentExists = await Assessment.findById(assessmentId);
            if (!assessmentExists) {
                return res.status(404).json({ message: 'Selected assessment template not found.' });
            }
        }

        if (students && students.length > 0) {
            const sessionStudentIds = new Set(parentSession.students.map(s => s.studentId));
            for (const stud of students) {
                if (!stud.studentId || !stud.name) {
                     return res.status(400).json({ message: 'Each student in batch must have studentId and name.' });
                }
                if (!sessionStudentIds.has(stud.studentId)) {
                    return res.status(400).json({ message: `Student ${stud.name} (ID: ${stud.studentId}) is not in the parent session's roster.` });
                }
            }
        }

        if (instructors && instructors.length > 0) {
            for (const inst of instructors) {
                if(!inst.instructorId || !inst.name) {
                    return res.status(400).json({ message: 'Each instructor must have an instructorId and name.' });
                }
            }
        }

        const newBatch = new Batch({
            sessionId, title, assessmentId, maxStudents, venue, date, startTime, endTime,
            instructors: instructors || [], students: students || [], status: status || 'Draft',
            // createdBy: req.user.id // TODO
        });

        const createdBatch = await newBatch.save();
        res.status(201).json(createdBatch);

    } catch (error) {
        console.error("Error creating batch:", error);
        if (error.name === 'ValidationError') return res.status(400).json({ message: "Validation Error", errors: error.errors });
        if (error.code === 11000) return res.status(400).json({ message: "A batch with this title already exists for this session." });
        res.status(500).json({ message: "Server error while creating batch." });
    }
};

// @desc    Get all batches for a specific session
// @route   GET /api/sessions/:sessionId/batches
// @access  Private (TODO: Add auth)
const getBatchesForSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).json({ message: 'Invalid Session ID format.' });
        const parentSession = await Session.findById(sessionId);
        if (!parentSession) return res.status(404).json({ message: 'Parent session not found.' });
        const batches = await Batch.find({ sessionId }).populate('assessmentId', 'name sport').sort({ date: 1, title: 1 });
        res.status(200).json(batches);
    } catch (error) {
        console.error("Error fetching batches:", error);
        res.status(500).json({ message: "Server error while fetching batches." });
    }
};

// @desc    Get a single batch by its ID
// @route   GET /api/batches/:batchId
// @access  Private (TODO: Add auth)
const getBatchById = async (req, res) => {
    try {
        const { batchId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(batchId)) return res.status(400).json({ message: 'Invalid Batch ID format.' });
        const batch = await Batch.findById(batchId).populate('sessionId', 'name year term').populate('assessmentId', 'name sport parameters');
        if (!batch) return res.status(404).json({ message: 'Batch not found.' });
        res.status(200).json(batch);
    } catch (error) {
        console.error("Error fetching batch by ID:", error);
        res.status(500).json({ message: "Server error while fetching batch." });
    }
};

// @desc    Update a batch
// @route   PUT /api/batches/:batchId
// @access  Private (TODO: Add auth)
const updateBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(batchId)) return res.status(400).json({ message: 'Invalid Batch ID format.' });
        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found.' });

        const { title, assessmentId, maxStudents, venue, date, startTime, endTime, instructors, students, status } = req.body;

        if (assessmentId !== undefined) { // Check if assessmentId is part of request
            if (assessmentId === null || assessmentId === '') { // Allow unsetting
                 batch.assessmentId = undefined;
            } else if (mongoose.Types.ObjectId.isValid(assessmentId)) {
                const assessmentExists = await Assessment.findById(assessmentId);
                if (!assessmentExists) return res.status(404).json({ message: 'Selected assessment template not found for update.' });
                batch.assessmentId = assessmentId;
            } else {
                return res.status(400).json({ message: 'Invalid Assessment ID format for update.' });
            }
        }

        if (students) {
            const parentSession = await Session.findById(batch.sessionId);
            if (!parentSession) return res.status(404).json({ message: 'Parent session for validation not found.'});
            const sessionStudentIds = new Set(parentSession.students.map(s => s.studentId));
            for (const stud of students) {
                 if (!stud.studentId || !stud.name) return res.status(400).json({ message: 'Each student in batch must have studentId and name.' });
                if (!sessionStudentIds.has(stud.studentId)) return res.status(400).json({ message: `Student ${stud.name} (ID: ${stud.studentId}) is not in the parent session's roster.` });
            }
            batch.students = students;
        }

        if (instructors) {
             for (const inst of instructors) {
                if(!inst.instructorId || !inst.name) return res.status(400).json({ message: 'Each instructor must have an instructorId and name.' });
            }
            batch.instructors = instructors;
        }

        if (title) batch.title = title;
        if (maxStudents !== undefined) batch.maxStudents = maxStudents;
        if (venue !== undefined) batch.venue = venue;
        if (date !== undefined) batch.date = date;
        if (startTime !== undefined) batch.startTime = startTime;
        if (endTime !== undefined) batch.endTime = endTime;
        if (status) batch.status = status;
        // batch.updatedBy = req.user.id; // TODO

        const updatedBatch = await batch.save();
        res.status(200).json(updatedBatch);
    } catch (error) {
        console.error("Error updating batch:", error);
        if (error.name === 'ValidationError') return res.status(400).json({ message: "Validation Error", errors: error.errors });
        if (error.code === 11000) return res.status(400).json({ message: "Update failed. A batch with this title might already exist for this session." });
        res.status(500).json({ message: "Server error while updating batch." });
    }
};

// @desc    Delete a batch
// @route   DELETE /api/batches/:batchId
// @access  Private (TODO: Add auth)
const deleteBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(batchId)) return res.status(400).json({ message: 'Invalid Batch ID format.' });
        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found.' });
        // TODO: Delete associated assessment entries: await AssessmentEntry.deleteMany({ batchId: batch._id });
        await batch.remove();
        res.status(200).json({ message: 'Batch removed successfully.' });
    } catch (error) {
        console.error("Error deleting batch:", error);
        res.status(500).json({ message: "Server error while deleting batch." });
    }
};

// @desc    Update batch status
// @route   PATCH /api/batches/:batchId/status
// @access  Private (TODO: Add auth)
const updateBatchStatus = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { status } = req.body;
        if (!mongoose.Types.ObjectId.isValid(batchId)) return res.status(400).json({ message: 'Invalid Batch ID format.' });
        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found.' });
        const allowedStatuses = ['Draft', 'In Progress', 'Finished', 'Published', 'Cancelled'];
        if (!status || !allowedStatuses.includes(status)) return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
        batch.status = status;
        // batch.updatedBy = req.user.id; // TODO
        await batch.save();
        res.status(200).json({ message: `Batch status updated to ${status}`, batch });
    } catch (error) {
        console.error("Error updating batch status:", error);
        res.status(500).json({ message: "Server error while updating batch status." });
    }
};

// @desc    Create multiple batches by random partitioning
// @route   POST /api/sessions/:sessionId/create-random-batches
// @access  Private (TODO: Add auth)
const createRandomBatches = async (req, res) => {
    const { sessionId } = req.params;
    const { numberOfBatches, maxStudentsPerBatch, defaultBatchTitlePrefix, defaultVenue, defaultDate, defaultAssessmentId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).json({ message: 'Invalid Session ID format.' });
    const parentSession = await Session.findById(sessionId).select('students');
    if (!parentSession) return res.status(404).json({ message: 'Parent session not found.' });
    if (!parentSession.students || parentSession.students.length === 0) return res.status(400).json({ message: 'Session has no students to partition.' });
    if ((!numberOfBatches && !maxStudentsPerBatch) || (numberOfBatches && maxStudentsPerBatch)) return res.status(400).json({ message: 'Specify either numberOfBatches OR maxStudentsPerBatch.' });

    let numBatches = 0;
    if (numberOfBatches) {
        numBatches = parseInt(numberOfBatches, 10);
        if (isNaN(numBatches) || numBatches <= 0) return res.status(400).json({ message: 'Invalid numberOfBatches.' });
    } else {
        const maxStud = parseInt(maxStudentsPerBatch, 10);
        if (isNaN(maxStud) || maxStud <= 0) return res.status(400).json({ message: 'Invalid maxStudentsPerBatch.' });
        numBatches = Math.ceil(parentSession.students.length / maxStud);
    }
    if (numBatches === 0 && parentSession.students.length > 0) numBatches = 1;

    let shuffledStudents = [...parentSession.students].sort(() => 0.5 - Math.random());
    const createdBatches = [];
    for (let i = 0; i < numBatches; i++) {
        const batchTitle = `${defaultBatchTitlePrefix || 'Batch'} ${i + 1}`;
        const studentsForBatch = shuffledStudents.splice(0, maxStudentsPerBatch || Math.ceil(parentSession.students.length / numBatches));
        if (studentsForBatch.length === 0 && i > 0) continue;
        const newBatch = new Batch({
            sessionId, title: batchTitle, assessmentId: defaultAssessmentId || undefined,
            maxStudents: maxStudentsPerBatch || studentsForBatch.length,
            venue: defaultVenue || '', date: defaultDate || new Date(),
            students: studentsForBatch, status: 'Draft',
        });
        try {
            const savedBatch = await newBatch.save();
            createdBatches.push(savedBatch);
        } catch (saveError) {
            console.error(`Error saving random batch ${batchTitle}:`, saveError);
            return res.status(500).json({ message: `Failed to create batch ${batchTitle}. ${saveError.message}`, createdBatches });
        }
    }
    res.status(201).json({ message: `${createdBatches.length} batches created randomly.`, batches: createdBatches });
};

// @desc    Process results for all entries in a batch (calculate Z-scores, percentiles, bands)
// @route   POST /api/batches/:batchId/process-results
// @access  Private (TODO: Add auth)
const processBatchResults = async (req, res) => {
    const { batchId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
        return res.status(400).json({ message: 'Invalid Batch ID format.' });
    }

    try {
        const batch = await Batch.findById(batchId).populate('assessmentId'); // Populate assessment to get its parameters
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
        if (!batch.assessmentId || !batch.assessmentId.parameters || batch.assessmentId.parameters.length === 0) {
            return res.status(400).json({ message: 'Batch has no assessment or assessment has no parameters. Cannot process results.' });
        }

        const entries = await AssessmentEntry.find({ batchId });
        if (!entries || entries.length === 0) {
            return res.status(200).json({ message: 'No entries found in this batch to process.', processedCount: 0 });
        }

        let processedCount = 0;
        const errorsProcessing = []; // Renamed to avoid conflict with outer scope 'error'

        for (const entry of entries) {
            let entryOverallScoreNum = 0; // Numerator for weighted average Z-score
            let entryOverallScoreDen = 0; // Denominator (sum of weights)

            for (let i = 0; i < entry.data.length; i++) {
                const paramData = entry.data[i];
                // Ensure rawValue is populated if not already (might have been set on entry creation)
                if (paramData.rawValue === undefined && paramData.value !== undefined) {
                    paramData.rawValue = paramData.value;
                }

                if (paramData.value === null || paramData.value === undefined) continue;

                const assessmentParamDetail = batch.assessmentId.parameters.find(p => p._id.equals(paramData.parameterId));
                if (!assessmentParamDetail || (assessmentParamDetail.type !== 'numeric' && assessmentParamDetail.type !== 'time' && assessmentParamDetail.type !== 'rating')) {
                    continue;
                }

                // TODO: Enhance benchmark query with ageGroup/gender from entry if benchmarks are stratified and entry has this info
                const benchmark = await Benchmark.findOne({
                    sessionId: batch.sessionId,
                    assessmentId: batch.assessmentId._id,
                    parameterId: paramData.parameterId,
                    ageGroup: null, // For now, assuming general benchmarks
                    gender: null    // For now, assuming general benchmarks
                });

                if (!benchmark) {
                    paramData.zScore = null;
                    paramData.percentile = null;
                    paramData.band = 'N/A (No Benchmark)';
                    continue;
                }

                const scores = calculateScoresForParameter(paramData.value, benchmark);
                paramData.zScore = scores.zScore;
                paramData.percentile = scores.percentile;
                paramData.band = scores.band;

                // For overall score calculation using Z-scores
                if (scores.zScore !== null) {
                    const weight = assessmentParamDetail.scoringDetails?.weight || 1;
                    entryOverallScoreNum += (scores.zScore * weight);
                    entryOverallScoreDen += weight;
                }
            }

            if (entryOverallScoreDen > 0) {
                entry.overallScore = parseFloat((entryOverallScoreNum / entryOverallScoreDen).toFixed(2));
                // Determine overall band based on overallScore
                if (entry.overallScore > 1) entry.overallBand = 'Excellent';
                else if (entry.overallScore > 0) entry.overallBand = 'Above Average';
                else if (entry.overallScore > -1) entry.overallBand = 'Below Average';
                else entry.overallBand = 'Needs Improvement';
            } else {
                entry.overallScore = null;
                entry.overallBand = 'N/A';
            }

            try {
                await entry.save();
                processedCount++;
            } catch (saveError) {
                errorsProcessing.push(`Failed to save processed entry ${entry._id}: ${saveError.message}`);
            }
        }

        if (batch.status === "In Progress" || batch.status === "Finished") {
            batch.status = "Finished"; // Or a new status like "ResultsProcessed"
            // batch.resultsCalculated = true; // If using such a flag
            await batch.save();
        }

        res.status(200).json({
            message: `Processed results for ${processedCount} entries.`,
            processedCount,
            errors: errorsProcessing.length > 0 ? errorsProcessing : undefined
        });

    } catch (error) { // Catch errors from main try block (e.g., finding batch, entries)
        console.error("Error processing batch results:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


module.exports = {
    createBatch,
    getBatchesForSession,
    getBatchById,
    updateBatch,
    deleteBatch,
    updateBatchStatus,
    createRandomBatches,
    processBatchResults,
};
