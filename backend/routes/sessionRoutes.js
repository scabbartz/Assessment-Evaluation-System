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

const { protect, authorize } = require('../middleware/authMiddleware');
const { userRoles } = require('../models/UserModel');

// Define roles that can manage sessions and their core components
const sessionAdminRoles = [userRoles[0], userRoles[1], userRoles[2]]; // SuperAdmin, SystemAdmin, ProgramAdmin
const sessionEditorRoles = [...sessionAdminRoles, userRoles[3], userRoles[4]]; // SchoolAdmin, Coach might also manage rosters or batches under a session they have access to. This needs refinement based on exact scope logic.

// For now, let's assume ProgramAdmins and above manage session lifecycle.
// Coaches/SchoolAdmins might manage rosters/batches IF they are within their permitted scope (not handled by this simple role check alone).

// Session Routes
router.route('/')
    .post(protect, authorize(sessionAdminRoles), createSession)    // POST /api/sessions
    .get(protect, getSessions);      // GET /api/sessions (All authenticated users can list sessions)

router.route('/:id')
    .get(protect, getSessionById)    // GET /api/sessions/:id (All authenticated can view details)
    .put(protect, authorize(sessionAdminRoles), updateSession)     // PUT /api/sessions/:id
    .delete(protect, authorize(sessionAdminRoles), deleteSession); // DELETE /api/sessions/:id

// Student Roster Management within a Session
// Assuming session admins or designated roles (e.g., coach of that session's program) can manage rosters.
// For simplicity, using sessionAdminRoles for now. Scope checks would be more granular.
router.route('/:id/students')
    .post(protect, authorize(sessionEditorRoles), addStudentsToSessionRoster);

router.route('/:id/students/:studentId')
    .delete(protect, authorize(sessionEditorRoles), removeStudentFromSessionRoster);

router.route('/:id/import-roster')
    .post(protect, authorize(sessionEditorRoles), importSessionRoster);


// Nested Batch Routes under a Session
// Batch creation/listing might be done by more roles than just top-level session admins, e.g., Coaches for their assigned sessions.
router.route('/:sessionId/batches')
    .post(protect, authorize(sessionEditorRoles), createBatch)
    .get(protect, getBatchesForSession); // All authenticated can list batches of a session

router.route('/:sessionId/create-random-batches')
    .post(protect, authorize(sessionEditorRoles), createRandomBatches);


module.exports = router;
