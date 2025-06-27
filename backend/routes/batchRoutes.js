const express = require('express');
const router = express.Router();
const {
    getBatchById,
    updateBatch,
    deleteBatch,
    updateBatchStatus,
    // TODO: Add controller for calculateResults, publishBatch etc. if they become separate actions
} = require('../controllers/batchController');

// TODO: Add protect and authorize middleware

// Routes for direct batch operations using batchId
router.route('/:batchId')
    .get(getBatchById)      // GET /api/batches/:batchId
    .put(updateBatch)       // PUT /api/batches/:batchId
    .delete(deleteBatch);   // DELETE /api/batches/:batchId

router.route('/:batchId/status')
    .patch(updateBatchStatus); // PATCH /api/batches/:batchId/status - For workflow transitions

// Example for future actions from 2.5:
// router.route('/:batchId/calculate-results')
//     .post(calculateBatchResults); // POST /api/batches/:batchId/calculate-results

// router.route('/:batchId/publish')
//     .post(publishBatchResults);    // POST /api/batches/:batchId/publish (could also be part of status update)


module.exports = router;
