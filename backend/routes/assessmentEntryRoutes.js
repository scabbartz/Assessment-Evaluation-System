const express = require('express');
const router = express.Router(); // Main router for /api/entries
const batchNestedRouter = express.Router({ mergeParams: true }); // Router for /api/batches/:batchId/entries
const athleteNestedRouter = express.Router({ mergeParams: true }); // Router for /api/athletes/:athleteId/entries

const {
    createAssessmentEntry,          // Used by batchNestedRouter
    createBulkAssessmentEntries,    // Used by batchNestedRouter
    getEntriesForBatch,             // Used by batchNestedRouter
    getEntriesForAthlete,           // Used by athleteNestedRouter
    getAssessmentEntryById,         // Used by main router
    updateAssessmentEntry,          // Used by main router
    deleteAssessmentEntry,          // Used by main router
} = require('../controllers/assessmentEntryController');

// TODO: Add protect and authorize middleware where appropriate

// --- Routes for /api/batches/:batchId/entries ---
batchNestedRouter.route('/')
    .post(createAssessmentEntry)    // POST /api/batches/:batchId/entries
    .get(getEntriesForBatch);       // GET /api/batches/:batchId/entries

batchNestedRouter.route('/bulk') // Note: changed from /bulk-entries to just /bulk for brevity
    .post(createBulkAssessmentEntries); // POST /api/batches/:batchId/entries/bulk


// --- Routes for /api/athletes/:athleteId/entries ---
athleteNestedRouter.route('/')
    .get(getEntriesForAthlete);     // GET /api/athletes/:athleteId/entries


// --- Routes for /api/entries/:entryId (direct entry manipulation) ---
router.route('/:entryId')
    .get(getAssessmentEntryById)    // GET /api/entries/:entryId
    .put(updateAssessmentEntry)     // PUT /api/entries/:entryId
    .delete(deleteAssessmentEntry); // DELETE /api/entries/:entryId


// Export all routers to be mounted in server.js
module.exports = {
    mainEntryRouter: router,
    batchNestedEntryRouter: batchNestedRouter,
    athleteNestedEntryRouter: athleteNestedRouter
};
