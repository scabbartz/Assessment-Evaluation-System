const express = require('express');
const router = express.Router(); // For general /api/comments routes
const entryNestedRouter = express.Router({ mergeParams: true }); // For /api/assessment-entries/:entryId/comments

const {
    createComment,
    getCommentsForEntry,
    updateComment,
    deleteComment,
} = require('../controllers/commentController');

// TODO: Add 'protect' middleware for authentication to all routes.
// TODO: Add 'authorize' middleware for role-based access where needed (e.g., for delete/update).
// const { protect, authorize } = require('../middleware/authMiddleware');


// --- Routes for comments nested under an assessment entry ---
// Mounted at /api/assessment-entries/:entryId/comments
entryNestedRouter.route('/')
    .post(/* protect, */ createComment)       // POST to create a comment on entryId
    .get(/* protect, */ getCommentsForEntry);  // GET all comments for entryId


// --- Routes for direct manipulation of comments by their own ID ---
// Mounted at /api/comments
router.route('/:commentId')
    .put(/* protect, authorize(['self', 'Admin']), */ updateComment)    // PUT to update a specific comment
    .delete(/* protect, authorize(['self', 'Admin']), */ deleteComment); // DELETE a specific comment


module.exports = {
    commentRouter: router, // For /api/comments/:commentId
    entryCommentRouter: entryNestedRouter // For /api/assessment-entries/:entryId/comments
};
