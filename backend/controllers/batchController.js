const Batch = require('../models/BatchModel');
const Session = require('../models/SessionModel'); // To validate students against session roster
const Assessment = require('../models/AssessmentModel'); // To validate assessmentId
const mongoose = require('mongoose');

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

        // Validate students if provided: ensure they are part of the parent session's roster
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

        // Validate instructors if provided
        if (instructors && instructors.length > 0) {
            for (const inst of instructors) {
                if(!inst.instructorId || !inst.name) {
                    return res.status(400).json({ message: 'Each instructor must have an instructorId and name.' });
                }
            }
        }


        const newBatch = new Batch({
            sessionId,
            title,
            assessmentId,
            maxStudents,
            venue,
            date,
            startTime,
            endTime,
            instructors: instructors || [],
            students: students || [],
            status: status || 'Draft', // Default to Draft
            // createdBy: req.user.id // TODO
        });

        const createdBatch = await newBatch.save();
        res.status(201).json(createdBatch);

    } catch (error) {
        console.error("Error creating batch:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        if (error.code === 11000) {
             return res.status(400).json({ message: "A batch with this title already exists for this session." });
        }
        res.status(500).json({ message: "Server error while creating batch." });
    }
};

// @desc    Get all batches for a specific session
// @route   GET /api/sessions/:sessionId/batches
// @access  Private (TODO: Add auth)
const getBatchesForSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: 'Invalid Session ID format.' });
        }

        const parentSession = await Session.findById(sessionId);
        if (!parentSession) {
            return res.status(404).json({ message: 'Parent session not found.' });
        }

        const batches = await Batch.find({ sessionId })
            .populate('assessmentId', 'name sport') // Populate basic assessment info
            .sort({ date: 1, title: 1 });
        res.status(200).json(batches);
    } catch (error) {
        console.error("Error fetching batches:", error);
        res.status(500).json({ message: "Server error while fetching batches." });
    }
};

// @desc    Get a single batch by its ID
// @route   GET /api/batches/:batchId  (Note: not nested under session for direct access if needed)
//          Alternative: GET /api/sessions/:sessionId/batches/:batchId
// @access  Private (TODO: Add auth)
const getBatchById = async (req, res) => {
    try {
        const { batchId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).json({ message: 'Invalid Batch ID format.' });
        }

        const batch = await Batch.findById(batchId)
            .populate('sessionId', 'name year term')
            .populate('assessmentId', 'name sport parameters'); // Populate more assessment details

        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }
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
        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).json({ message: 'Invalid Batch ID format.' });
        }

        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }

        // Prevent updates if batch is 'Published' and results are locked (as per 2.4)
        if (batch.status === 'Published' && req.body.status !== 'Published') { // allow republishing
             // More granular checks might be needed, e.g. allow changing venue but not students.
            // For now, simple lock:
            // return res.status(400).json({ message: 'Cannot update a Published batch. Consider creating a new version or unpublishing first (if allowed).' });
        }


        const { title, assessmentId, maxStudents, venue, date, startTime, endTime, instructors, students, status } = req.body;

        if (assessmentId && !mongoose.Types.ObjectId.isValid(assessmentId)) {
             return res.status(400).json({ message: 'Invalid Assessment ID format for update.' });
        }
        if (assessmentId) {
            const assessmentExists = await Assessment.findById(assessmentId);
            if (!assessmentExists) {
                return res.status(404).json({ message: 'Selected assessment template not found for update.' });
            }
            batch.assessmentId = assessmentId;
        } else if (assessmentId === null || assessmentId === '') { // Allow unsetting assessment
            batch.assessmentId = undefined;
        }


        // Validate students if provided: ensure they are part of the parent session's roster
        if (students) {
            const parentSession = await Session.findById(batch.sessionId);
            if (!parentSession) return res.status(404).json({ message: 'Parent session for validation not found.'});
            const sessionStudentIds = new Set(parentSession.students.map(s => s.studentId));
            for (const stud of students) {
                 if (!stud.studentId || !stud.name) {
                     return res.status(400).json({ message: 'Each student in batch must have studentId and name.' });
                }
                if (!sessionStudentIds.has(stud.studentId)) {
                    return res.status(400).json({ message: `Student ${stud.name} (ID: ${stud.studentId}) is not in the parent session's roster.` });
                }
            }
            batch.students = students;
        }

        if (instructors) {
             for (const inst of instructors) {
                if(!inst.instructorId || !inst.name) {
                    return res.status(400).json({ message: 'Each instructor must have an instructorId and name.' });
                }
            }
            batch.instructors = instructors;
        }


        batch.title = title || batch.title;
        batch.maxStudents = maxStudents === undefined ? batch.maxStudents : maxStudents;
        batch.venue = venue === undefined ? batch.venue : venue;
        batch.date = date === undefined ? batch.date : date;
        batch.startTime = startTime === undefined ? batch.startTime : startTime;
        batch.endTime = endTime === undefined ? batch.endTime : endTime;
        batch.status = status || batch.status;
        // batch.updatedBy = req.user.id; // TODO

        const updatedBatch = await batch.save();
        res.status(200).json(updatedBatch);

    } catch (error) {
        console.error("Error updating batch:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
         if (error.code === 11000) {
             return res.status(400).json({ message: "Update failed. A batch with this title might already exist for this session." });
        }
        res.status(500).json({ message: "Server error while updating batch." });
    }
};

// @desc    Delete a batch
// @route   DELETE /api/batches/:batchId
// @access  Private (TODO: Add auth)
const deleteBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).json({ message: 'Invalid Batch ID format.' });
        }

        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }

        // Add checks: e.g., cannot delete if status is 'Published' or 'In Progress' and has data
        if (['In Progress', 'Finished', 'Published'].includes(batch.status)) {
             // TODO: Check if actual assessment data exists for this batch.
             // For now, a simple status check.
            // return res.status(400).json({ message: `Cannot delete batch with status '${batch.status}'. Consider cancelling or archiving.` });
        }

        // TODO: Delete associated assessment entries if any.
        // await AssessmentEntry.deleteMany({ batchId: batch._id });

        await batch.remove();
        res.status(200).json({ message: 'Batch removed successfully.' });

    } catch (error) {
        console.error("Error deleting batch:", error);
        res.status(500).json({ message: "Server error while deleting batch." });
    }
};


// --- Batch Workflow Actions (as per 2.5) ---

// @desc    Update batch status (e.g., Draft -> In Progress, In Progress -> Finished, Finished -> Published)
// @route   PATCH /api/batches/:batchId/status
// @access  Private (TODO: Add auth)
const updateBatchStatus = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { status } = req.body; // Expecting { status: "NewStatus" }

        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).json({ message: 'Invalid Batch ID format.' });
        }

        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found.' });
        }

        const allowedStatuses = ['Draft', 'In Progress', 'Finished', 'Published', 'Cancelled'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
        }

        // TODO: Implement more rigid workflow transition logic if needed
        // E.g., Draft can only go to In Progress or Cancelled.
        // E.g., To move to 'Published', 'resultsCalculated' must be true.

        // As per 2.4: lock instructor assignment once published.
        // This is handled in updateBatch, but if status is changed directly, ensure consistency.
        if (batch.status !== 'Published' && status === 'Published') {
            // Potentially lock other fields too.
            // batch.publishedAt = new Date(); // TODO: Add this field to model
        }

        // If moving from Published to another state (e.g. unpublishing), consider implications.
        // if (batch.status === 'Published' && status !== 'Published') {
        //    batch.publishedAt = null;
        // }


        batch.status = status;
        // batch.updatedBy = req.user.id; // TODO
        await batch.save();
        res.status(200).json({ message: `Batch status updated to ${status}`, batch });

    } catch (error) {
        console.error("Error updating batch status:", error);
        res.status(500).json({ message: "Server error while updating batch status." });
    }
};

// TODO: Implement "Calculate Results" endpoint (as per 2.5) - This will be part of Section 4 & 5.
// For now, it's a placeholder concept.
// POST /api/batches/:batchId/calculate-results

// TODO: Implement "Publish" action endpoint (as per 2.5) - This might just be a status update.
// POST /api/batches/:batchId/publish (could be same as PATCH status to 'Published')


// --- Batch Creation Methods (as per 2.3) ---

// @desc    Create multiple batches by random partitioning (placeholder logic)
// @route   POST /api/sessions/:sessionId/create-random-batches
// @access  Private (TODO: Add auth)
const createRandomBatches = async (req, res) => {
    const { sessionId } = req.params;
    const { numberOfBatches, maxStudentsPerBatch, defaultBatchTitlePrefix, defaultVenue, defaultDate, defaultAssessmentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ message: 'Invalid Session ID format.' });
    }
    const parentSession = await Session.findById(sessionId).select('students');
    if (!parentSession) {
        return res.status(404).json({ message: 'Parent session not found.' });
    }
    if (!parentSession.students || parentSession.students.length === 0) {
        return res.status(400).json({ message: 'Session has no students to partition.' });
    }

    if ((!numberOfBatches && !maxStudentsPerBatch) || (numberOfBatches && maxStudentsPerBatch)) {
        return res.status(400).json({ message: 'Specify either numberOfBatches OR maxStudentsPerBatch.' });
    }

    let numBatches = 0;
    if (numberOfBatches) {
        numBatches = parseInt(numberOfBatches, 10);
        if (isNaN(numBatches) || numBatches <= 0) {
            return res.status(400).json({ message: 'Invalid numberOfBatches.' });
        }
    } else { // maxStudentsPerBatch is specified
        const maxStud = parseInt(maxStudentsPerBatch, 10);
        if (isNaN(maxStud) || maxStud <= 0) {
            return res.status(400).json({ message: 'Invalid maxStudentsPerBatch.' });
        }
        numBatches = Math.ceil(parentSession.students.length / maxStud);
    }

    if (numBatches === 0 && parentSession.students.length > 0) numBatches = 1;


    // Simple shuffle and partition (very basic)
    let shuffledStudents = [...parentSession.students].sort(() => 0.5 - Math.random());
    const createdBatches = [];

    for (let i = 0; i < numBatches; i++) {
        const batchTitle = `${defaultBatchTitlePrefix || 'Batch'} ${i + 1}`;
        const studentsForBatch = shuffledStudents.splice(0, maxStudentsPerBatch || Math.ceil(parentSession.students.length / numBatches));

        if (studentsForBatch.length === 0 && i > 0) continue; // Avoid creating empty batches if logic results in it

        const newBatch = new Batch({
            sessionId,
            title: batchTitle,
            assessmentId: defaultAssessmentId || undefined,
            maxStudents: maxStudentsPerBatch || studentsForBatch.length,
            venue: defaultVenue || '',
            date: defaultDate || new Date(),
            students: studentsForBatch,
            status: 'Draft',
            // createdBy: req.user.id // TODO
        });
        try {
            const savedBatch = await newBatch.save();
            createdBatches.push(savedBatch);
        } catch (saveError) {
            // If one batch fails (e.g. duplicate title if prefix is bad), stop or collect errors
            console.error(`Error saving random batch ${batchTitle}:`, saveError);
            return res.status(500).json({ message: `Failed to create batch ${batchTitle}. ${saveError.message}`, createdBatches });
        }
    }

    res.status(201).json({ message: `${createdBatches.length} batches created randomly.`, batches: createdBatches });
};


module.exports = {
    createBatch,
    getBatchesForSession,
    getBatchById,
    updateBatch,
    deleteBatch,
    updateBatchStatus,
    createRandomBatches
};
