const express = require('express');
const router = express.Router();
const {
    createSession,
    getSessions,
    getSessionById,
    updateSession,
    deleteSession,
    addStudentsToSessionRoster,
    removeStudentFromSessionRoster,
    importSessionRoster,
} = require('../controllers/sessionController');

const {
    createBatch,
    getBatchesForSession,
    createRandomBatches
} = require('../controllers/batchController');

// TODO: Add protect and authorize middleware (e.g., protect, authorize(['ProgramAdmin', 'SystemAdmin']))

// Session Routes
router.route('/')
    .post(createSession)    // POST /api/sessions
    .get(getSessions);      // GET /api/sessions

router.route('/:id')
    .get(getSessionById)    // GET /api/sessions/:id
    .put(updateSession)     // PUT /api/sessions/:id
    .delete(deleteSession); // DELETE /api/sessions/:id

// Student Roster Management within a Session
router.route('/:id/students')
    .post(addStudentsToSessionRoster);      // POST /api/sessions/:id/students

router.route('/:id/students/:studentId') // studentId here is the internal unique student identifier string
    .delete(removeStudentFromSessionRoster); // DELETE /api/sessions/:id/students/:studentId

router.route('/:id/import-roster')
    .post(importSessionRoster);             // POST /api/sessions/:id/import-roster (placeholder for CSV upload later)


// Nested Batch Routes under a Session
router.route('/:sessionId/batches')
    .post(createBatch)                  // POST /api/sessions/:sessionId/batches
    .get(getBatchesForSession);         // GET /api/sessions/:sessionId/batches

router.route('/:sessionId/create-random-batches')
    .post(createRandomBatches);        // POST /api/sessions/:sessionId/create-random-batches


module.exports = router;
