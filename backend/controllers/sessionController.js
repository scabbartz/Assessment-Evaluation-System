const Session = require('../models/SessionModel');
const Batch = require('../models/BatchModel'); // To handle cascading deletes or updates if necessary
const mongoose = require('mongoose');

// @desc    Create a new session
// @route   POST /api/sessions
// @access  Private (TODO: Add auth middleware, e.g., ProgramAdmin)
const createSession = async (req, res) => {
    try {
        const { year, term, name, description, startDate, endDate, status, students } = req.body;

        // Basic validation
        if (!year || !term || !name) {
            return res.status(400).json({ message: 'Year, Term, and Name are required for a session.' });
        }

        const newSession = new Session({
            year,
            term,
            name,
            description,
            startDate,
            endDate,
            status,
            students: students || [], // Ensure students is an array
            // createdBy: req.user.id // TODO: Uncomment when auth is implemented
        });

        const createdSession = await newSession.save();
        res.status(201).json(createdSession);
    } catch (error) {
        console.error("Error creating session:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        if (error.code === 11000) { // Duplicate key error
             return res.status(400).json({ message: "Duplicate session identifier. A session with this name, year, or term combination might already exist." });
        }
        res.status(500).json({ message: "Server error while creating session." });
    }
};

// @desc    Get all sessions
// @route   GET /api/sessions
// @access  Private (TODO: Add auth middleware)
const getSessions = async (req, res) => {
    try {
        // TODO: Add filtering, pagination, sorting options
        const sessions = await Session.find({}).sort({ year: -1, term: -1, createdAt: -1 }); // Sort by most recent
        res.status(200).json(sessions);
    } catch (error) {
        console.error("Error fetching sessions:", error);
        res.status(500).json({ message: "Server error while fetching sessions." });
    }
};

// @desc    Get a single session by ID
// @route   GET /api/sessions/:id
// @access  Private (TODO: Add auth middleware)
const getSessionById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Session ID format.' });
        }
        const session = await Session.findById(req.params.id);
        // TODO: Populate batches associated with this session? Or handle in a separate endpoint.
        // const batches = await Batch.find({ sessionId: req.params.id });

        if (session) {
            res.status(200).json(session);
        } else {
            res.status(404).json({ message: 'Session not found.' });
        }
    } catch (error) {
        console.error("Error fetching session by ID:", error);
        res.status(500).json({ message: "Server error while fetching session." });
    }
};

// @desc    Update a session
// @route   PUT /api/sessions/:id
// @access  Private (TODO: Add auth middleware, e.g., ProgramAdmin)
const updateSession = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Session ID format.' });
        }

        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        const { year, term, name, description, startDate, endDate, status, students } = req.body;

        session.year = year || session.year;
        session.term = term || session.term;
        session.name = name || session.name;
        session.description = description === undefined ? session.description : description;
        session.startDate = startDate === undefined ? session.startDate : startDate;
        session.endDate = endDate === undefined ? session.endDate : endDate;
        session.status = status || session.status;
        // session.updatedBy = req.user.id; // TODO: Uncomment when auth is implemented

        // Roster Management: Overwrite for simplicity. More granular add/remove can be separate endpoints.
        if (students !== undefined) {
            session.students = students;
        }

        const updatedSession = await session.save();
        res.status(200).json(updatedSession);
    } catch (error) {
        console.error("Error updating session:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
         if (error.code === 11000) {
             return res.status(400).json({ message: "Update failed due to duplicate session identifier." });
        }
        res.status(500).json({ message: "Server error while updating session." });
    }
};

// @desc    Delete a session
// @route   DELETE /api/sessions/:id
// @access  Private (TODO: Add auth middleware, e.g., ProgramAdmin)
const deleteSession = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Session ID format.' });
        }
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        // **IMPORTANT**: Decide on cascading delete behavior for Batches and other dependent data.
        // Option 1: Prevent deletion if batches exist
        const batchCount = await Batch.countDocuments({ sessionId: session._id });
        if (batchCount > 0) {
            return res.status(400).json({ message: `Cannot delete session. It has ${batchCount} associated batch(es). Please delete them first or archive the session.` });
        }
        // Option 2: Delete associated batches (use with caution)
        // await Batch.deleteMany({ sessionId: session._id });

        await session.remove();
        res.status(200).json({ message: 'Session removed successfully.' });
    } catch (error) {
        console.error("Error deleting session:", error);
        res.status(500).json({ message: "Server error while deleting session." });
    }
};


// --- Student Roster Management within a Session ---

// @desc    Add students to a session's roster
// @route   POST /api/sessions/:id/students
// @access  Private (TODO: Add auth)
const addStudentsToSessionRoster = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Session ID format.' });
        }
        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        const { students } = req.body; // Expecting an array of studentIdentifier objects
        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: 'Students array is required and cannot be empty.' });
        }

        // Basic validation for student objects
        for (const student of students) {
            if (!student.studentId || !student.name) {
                return res.status(400).json({ message: 'Each student must have a studentId and name.' });
            }
        }

        // Prevent duplicates based on studentId within the same session
        const existingStudentIds = new Set(session.students.map(s => s.studentId));
        const newStudents = students.filter(s => !existingStudentIds.has(s.studentId));

        if (newStudents.length === 0) {
            return res.status(400).json({ message: 'All provided students are already in the roster or no new students provided.' });
        }

        session.students.push(...newStudents);
        // session.updatedBy = req.user.id; // TODO
        await session.save();
        res.status(200).json({ message: `${newStudents.length} student(s) added.`, session });

    } catch (error) {
        console.error("Error adding students to session:", error);
        res.status(500).json({ message: "Server error while adding students." });
    }
};

// @desc    Remove a student from a session's roster
// @route   DELETE /api/sessions/:id/students/:studentId
// @access  Private (TODO: Add auth)
const removeStudentFromSessionRoster = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Session ID format.' });
        }
        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        const studentIdToRemove = req.params.studentId;
        const initialLength = session.students.length;
        session.students = session.students.filter(s => s.studentId !== studentIdToRemove);

        if (session.students.length === initialLength) {
            return res.status(404).json({ message: 'Student not found in this session roster.' });
        }

        // TODO: Check if student is in any batches of this session and handle (prevent or remove from batches too)

        // session.updatedBy = req.user.id; // TODO
        await session.save();
        res.status(200).json({ message: 'Student removed from roster.', session });

    } catch (error) {
        console.error("Error removing student from session:", error);
        res.status(500).json({ message: "Server error while removing student." });
    }
};


// @desc    Import student roster (e.g., from CSV upload - placeholder for now)
// @route   POST /api/sessions/:id/import-roster
// @access  Private (TODO: Add auth)
const importSessionRoster = async (req, res) => {
    // This would involve file parsing (e.g., multer for file upload, csv-parser for CSV)
    // For now, this can just be a wrapper around addStudentsToSessionRoster or direct update
    // if the list of students is directly provided in the body after client-side parsing.
    // Actual file upload and parsing will be implemented in Section 3.2.
    // For now, let's assume it works like addStudentsToSessionRoster but replaces the whole roster.
     try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Session ID format.' });
        }
        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        const { students } = req.body; // Expecting an array of studentIdentifier objects
        if (!Array.isArray(students)) { // Can be an empty array to clear roster
            return res.status(400).json({ message: 'Students array is required.' });
        }

        // Basic validation for student objects
        for (const student of students) {
            if (!student.studentId || !student.name) {
                return res.status(400).json({ message: 'Each student must have a studentId and name.' });
            }
        }

        // Simple replacement of the roster
        session.students = students;
        // session.updatedBy = req.user.id; // TODO
        await session.save();
        res.status(200).json({ message: `Roster updated with ${students.length} student(s).`, session });

    } catch (error) {
        console.error("Error importing roster to session:", error);
        res.status(500).json({ message: "Server error while importing roster." });
    }
};


module.exports = {
    createSession,
    getSessions,
    getSessionById,
    updateSession,
    deleteSession,
    addStudentsToSessionRoster,
    removeStudentFromSessionRoster,
    importSessionRoster,
};
