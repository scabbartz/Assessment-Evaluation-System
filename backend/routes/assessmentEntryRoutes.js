const express = require('express');
const router = express.Router(); // Main router for /api/entries
const batchNestedRouter = express.Router({ mergeParams: true }); // Router for /api/batches/:batchId/entries
const athleteNestedRouter = express.Router({ mergeParams: true }); // Router for /api/athletes/:athleteId/entries

const {
    createAssessmentEntry,
    createBulkAssessmentEntries,
    getEntriesForBatch,
    getEntriesForAthlete,
    getAssessmentEntryById,
    updateAssessmentEntry,
    deleteAssessmentEntry,
} = require('../controllers/assessmentEntryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { userRoles } = require('../models/UserModel');

// Define roles that can manage assessment entries.
// Typically, Coaches, Evaluators, and relevant Admins.
const entryCreatorRoles = [userRoles[0], userRoles[1], userRoles[2], userRoles[3], userRoles[4], userRoles[5]]; // SuperAdmin, SystemAdmin, ProgramAdmin, SchoolAdmin, Coach, Evaluator
const entryEditorRoles = [...entryCreatorRoles];
// Viewing entries might be broader, depending on report access rules.
const entryViewerRoles = [...entryCreatorRoles, userRoles[6]]; // Athlete can view their own.

// --- Routes for /api/batches/:batchId/entries ---
// These actions are performed in the context of a specific batch.
batchNestedRouter.route('/')
    .post(protect, authorize(entryCreatorRoles), createAssessmentEntry)
    .get(protect, authorize(entryViewerRoles), getEntriesForBatch);

batchNestedRouter.route('/bulk')
    .post(protect, authorize(entryCreatorRoles), createBulkAssessmentEntries);


// --- Routes for /api/athletes/:athleteId/entries ---
// Viewing all entries for a specific athlete.
// Authorization: Athlete themselves, their Coach, relevant Admins.
// This requires more complex logic than simple role check if athlete can only see their own.
// For now, general viewer roles. `getEntriesForAthlete` controller should handle self-access if athleteId matches req.user.athleteId (if such a field exists).
athleteNestedRouter.route('/')
    .get(protect, authorize(entryViewerRoles), getEntriesForAthlete);


// --- Routes for /api/entries/:entryId (direct entry manipulation) ---
// These routes act on a specific entry known by its _id.
router.route('/:entryId')
    .get(protect, authorize(entryViewerRoles), getAssessmentEntryById)
    .put(protect, authorize(entryEditorRoles), updateAssessmentEntry)
    .delete(protect, authorize(entryEditorRoles), deleteAssessmentEntry);


// Export all routers to be mounted in server.js
module.exports = {
    mainEntryRouter: router,
    batchNestedEntryRouter: batchNestedRouter,
    athleteNestedEntryRouter: athleteNestedRouter
};
