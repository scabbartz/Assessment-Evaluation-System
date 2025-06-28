const Batch = require('../models/BatchModel');
const Session = require('../models/SessionModel'); // To validate students against session roster
const Assessment = require('../models/AssessmentModel'); // To validate assessmentId
const AssessmentEntry = require('../models/AssessmentEntryModel'); // For processing results
const Benchmark = require('../models/BenchmarkModel'); // For fetching benchmarks
const { sendNotification } = require('../controllers/notificationController'); // Import for sending notifications
const User = require('../models/UserModel'); // May be needed to get recipient details
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

    let percentile = null;
    // Estimate percentile rank based on benchmark's P-values
    // This is an estimation. A more precise rank needs more data or complex calculation.
    // Assumes higher value is better for this basic percentile estimation.
    // TODO: Consider parameter direction (higher_is_better vs lower_is_better) for percentile logic.
    if (benchmark.percentiles) {
        if (benchmark.percentiles.p90 !== null && numericValue >= benchmark.percentiles.p90) percentile = 90;
        else if (benchmark.percentiles.p75 !== null && numericValue >= benchmark.percentiles.p75) percentile = 75;
        else if (benchmark.percentiles.p50 !== null && numericValue >= benchmark.percentiles.p50) percentile = 50;
        else if (benchmark.percentiles.p25 !== null && numericValue >= benchmark.percentiles.p25) percentile = 25;
        else if (benchmark.percentiles.p10 !== null && numericValue >= benchmark.percentiles.p10) percentile = 10;
        else if (benchmark.percentiles.p10 !== null && numericValue < benchmark.percentiles.p10) percentile = 0; // Or some value < 10
    }


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

        if (assessmentId !== undefined) {
            if (assessmentId === null || assessmentId === '') {
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

        const oldStatus = batch.status;
        if (status) batch.status = status;
        // batch.updatedBy = req.user.id; // TODO

        const updatedBatchResult = await batch.save();

        // --- Send Notification on Publish ---
        if (updatedBatchResult.status === 'Published' && oldStatus !== 'Published') {
            const sessionForNotification = await Session.findById(updatedBatchResult.sessionId).select('name');
            console.log(`Batch ${updatedBatchResult.title} published. Triggering placeholder notification.`);
            sendNotification(
                'batch_published_notification', // Template name
                {
                    batchName: updatedBatchResult.title,
                    batchDate: updatedBatchResult.date ? new Date(updatedBatchResult.date).toLocaleDateString() : 'N/A',
                    sessionName: sessionForNotification?.name || 'N/A'
                },
                { /* Recipient info placeholder */ }
            );
        }
        // --- End Notification ---

        res.status(200).json(updatedBatchResult);
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
        await AssessmentEntry.deleteMany({ batchId: batch._id }); // Also delete associated entries
        await batch.remove();
        res.status(200).json({ message: 'Batch and associated entries removed successfully.' });
    } catch (error) {
        console.error("Error deleting batch:", error);
        res.status(500).json({ message: "Server error while deleting batch." });
    }
};

// @desc    Update batch status (This is now merged into the general updateBatch, but kept if direct status update is preferred)
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

        const oldStatus = batch.status;
        batch.status = status;
        // batch.updatedBy = req.user.id; // TODO
        const updatedBatch = await batch.save();

        if (status === 'Published' && oldStatus !== 'Published') {
            const sessionForNotification = await Session.findById(updatedBatch.sessionId).select('name');
            console.log(`Batch ${updatedBatch.title} published via status update. Triggering placeholder notification.`);
            sendNotification(
                'batch_published_notification',
                {
                    batchName: updatedBatch.title,
                    batchDate: updatedBatch.date ? new Date(updatedBatch.date).toLocaleDateString() : 'N/A',
                    sessionName: sessionForNotification?.name || 'N/A'
                },
                { /* Recipient info placeholder */ }
            );
        }
        res.status(200).json({ message: `Batch status updated to ${status}`, batch: updatedBatch });
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
    const parentSession = await Session.findById(sessionId).select('students name'); // Added name for notification
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
        const batch = await Batch.findById(batchId).populate('assessmentId').populate('sessionId', 'name'); // Populate session for notification
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
        const errorsProcessing = [];

        for (const entry of entries) {
            let entryOverallScoreNum = 0;
            let entryOverallScoreDen = 0;

            for (let i = 0; i < entry.data.length; i++) {
                const paramData = entry.data[i];
                if (paramData.rawValue === undefined && paramData.value !== undefined) {
                    paramData.rawValue = paramData.value;
                }
                if (paramData.value === null || paramData.value === undefined) continue;

                const assessmentParamDetail = batch.assessmentId.parameters.find(p => p._id.equals(paramData.parameterId));
                if (!assessmentParamDetail || (assessmentParamDetail.type !== 'numeric' && assessmentParamDetail.type !== 'time' && assessmentParamDetail.type !== 'rating')) {
                    continue;
                }

                const benchmark = await Benchmark.findOne({
                    sessionId: batch.sessionId._id, // Use ID from populated session
                    assessmentId: batch.assessmentId._id,
                    parameterId: paramData.parameterId,
                    ageGroup: null,
                    gender: null
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

                if (scores.zScore !== null) {
                    const weight = assessmentParamDetail.scoringDetails?.weight || 1;
                    entryOverallScoreNum += (scores.zScore * weight);
                    entryOverallScoreDen += weight;
                }
            }

            if (entryOverallScoreDen > 0) {
                entry.overallScore = parseFloat((entryOverallScoreNum / entryOverallScoreDen).toFixed(2));
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

        const oldStatus = batch.status;
        if (batch.status === "In Progress" || batch.status === "Finished") {
            batch.status = "Finished";
            await batch.save();
        }

        // Send notification if status changed to Published as a result of processing or was already Finished
        // This logic might be better if "Publish" is an explicit separate action/status.
        // For now, let's assume "Finished" means results are ready and might warrant a notification.
        if (batch.status === "Finished" && (oldStatus === "In Progress" || oldStatus === "Finished")) { // If it became or remained Finished
             console.log(`Batch ${batch.title} results processed (status: Finished). Triggering placeholder notification.`);
             sendNotification(
                'batch_results_processed_notification', // A new template for this
                {
                    batchName: batch.title,
                    batchDate: batch.date ? new Date(batch.date).toLocaleDateString() : 'N/A',
                    sessionName: batch.sessionId.name // Populated session name
                },
                { /* Recipient info placeholder */ }
            );
        }


        res.status(200).json({
            message: `Processed results for ${processedCount} entries.`,
            processedCount,
            errors: errorsProcessing.length > 0 ? errorsProcessing : undefined
        });

    } catch (error) {
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
