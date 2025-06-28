const express = require('express');
const router = express.Router();
const {
    getBatchById,
    updateBatch,
    deleteBatch,
    updateBatchStatus,
    processBatchResults, // Added new import
    // TODO: Add controller for publishBatch etc. if they become separate actions
} = require('../controllers/batchController');

// TODO: Add protect and authorize middleware

// Routes for direct batch operations using batchId
router.route('/:batchId')
    .get(getBatchById)      // GET /api/batches/:batchId
    .put(updateBatch)       // PUT /api/batches/:batchId
    .delete(deleteBatch);   // DELETE /api/batches/:batchId

router.route('/:batchId/status')
    .patch(updateBatchStatus); // PATCH /api/batches/:batchId/status - For workflow transitions

router.route('/:batchId/process-results')
    .post(processBatchResults); // POST /api/batches/:batchId/process-results - For Z-scores, bands etc.

// TODO: publishBatchResults might be a specific status update or a more complex action
// router.route('/:batchId/publish')
//     .post(publishBatchResults);


module.exports = router;
