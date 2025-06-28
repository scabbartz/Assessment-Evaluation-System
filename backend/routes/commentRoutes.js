const express = require('express');
const router = express.Router(); // For general /api/comments routes
const entryNestedRouter = express.Router({ mergeParams: true }); // For /api/assessment-entries/:entryId/comments

const {
    createComment,
    getCommentsForEntry,
    updateComment,
    deleteComment,
} = require('../controllers/commentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { userRoles } = require('../models/UserModel');

const canCommentRoles = [userRoles[0], userRoles[1], userRoles[2], userRoles[3], userRoles[4], userRoles[5], userRoles[6]];
const canManageAnyCommentRoles = [userRoles[0], userRoles[1]];

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comment management on assessment entries.
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         assessmentEntryId: { type: string }
 *         athleteId: { type: string }
 *         userId: { type: string }
 *         userName: { type: string }
 *         text: { type: string }
 *         parentCommentId: { type: string, nullable: true }
 *         isEdited: { type: boolean }
 *         isDeleted: { type: boolean, default: false, description: "Indicates if comment is soft-deleted" }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     NewComment:
 *       type: object
 *       required: [text]
 *       properties:
 *         text: { type: string, description: "The content of the comment." }
 *         parentCommentId: { type: string, nullable: true, description: "ID of the parent comment if this is a reply." }
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// --- Routes for comments nested under an assessment entry ---
// Mounted at /api/assessment-entries/:entryId/comments

/**
 * @swagger
 * /assessment-entries/{entryId}/comments:
 *   post:
 *     summary: Create a new comment on an assessment entry.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the assessment entry to comment on.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewComment'
 *     responses:
 *       201:
 *         description: Comment created successfully.
 *         content: { "application/json": { schema: { $ref: '#/components/schemas/Comment' } } }
 *       400: { description: "Invalid input or ID format." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 *       404: { description: "Assessment entry or parent comment not found." }
 */
entryNestedRouter.route('/')
    .post(protect, authorize(canCommentRoles), createComment)
/**
 * @swagger
 * /assessment-entries/{entryId}/comments:
 *   get:
 *     summary: Get all comments for an assessment entry.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the assessment entry.
 *     responses:
 *       200:
 *         description: A list of comments (controller returns flat list, client can nest).
 *         content: { "application/json": { schema: { type: "array", items: { $ref: '#/components/schemas/Comment' } } } }
 *       400: { description: "Invalid Assessment Entry ID format." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 */
    .get(protect, authorize(canCommentRoles), getCommentsForEntry);


// --- Routes for direct manipulation of comments by their own ID ---
// Mounted at /api/comments

/**
 * @swagger
 * /comments/{commentId}:
 *   put:
 *     summary: Update an existing comment.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the comment to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string, description: "The updated comment text." }
 *     responses:
 *       200:
 *         description: Comment updated successfully.
 *         content: { "application/json": { schema: { $ref: '#/components/schemas/Comment' } } }
 *       400: { description: "Invalid input or Comment ID format." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden (not owner or admin)." }
 *       404: { description: "Comment not found." }
 *   delete:
 *     summary: Delete a comment (soft delete).
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the comment to delete.
 *     responses:
 *       200:
 *         description: Comment deleted successfully.
 *         content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } } } }
 *       400: { description: "Invalid Comment ID format." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden (not owner or admin)." }
 *       404: { description: "Comment not found or already deleted." }
 */
router.route('/:commentId')
    .put(protect, authorize(canCommentRoles), updateComment)
    .delete(protect, authorize(canCommentRoles), deleteComment);


module.exports = {
    commentRouter: router,
    entryCommentRouter: entryNestedRouter
};
