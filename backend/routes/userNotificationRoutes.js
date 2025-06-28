const express = require('express');
const router = express.Router();
const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require('../controllers/notificationController'); // User notification actions are in notificationController

const { protect } = require('../middleware/authMiddleware'); // All these routes should be protected

/**
 * @swagger
 * tags:
 *   name: User Notifications
 *   description: Managing and retrieving notifications for the logged-in user.
 * components:
 *   schemas:
 *     UserNotification:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         userId: { type: string }
 *         title: { type: string, nullable: true }
 *         message: { type: string }
 *         link: { type: string, nullable: true }
 *         isRead: { type: boolean }
 *         readAt: { type: string, format: date-time, nullable: true }
 *         type: { type: string, nullable: true }
 *         emitterId: { type: string, nullable: true }
 *         emitterName: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *     PaginatedUserNotifications:
 *       type: object
 *       properties:
 *         notifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserNotification'
 *         unreadCount: { type: integer }
 *         currentPage: { type: integer }
 *         totalPages: { type: integer }
 *         totalNotifications: { type: integer }
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */


/**
 * @swagger
 * /user-notifications:
 *   get:
 *     summary: Get notifications for the currently logged-in user.
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Number of notifications per page.
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number.
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: string, enum: ["true", "false"], default: "false" }
 *         description: Filter for unread notifications only.
 *     responses:
 *       200:
 *         description: A list of user notifications with pagination info.
 *         content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedUserNotifications' } } }
 *       401: { description: "Not authorized." }
 */
router.get('/', protect, getUserNotifications);

/**
 * @swagger
 * /user-notifications/mark-all-read:
 *   patch:
 *     summary: Mark all unread notifications for the logged-in user as read.
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Confirmation message.
 *         content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } } } }
 *       401: { description: "Not authorized." }
 */
router.patch('/mark-all-read', protect, markAllNotificationsAsRead);

/**
 * @swagger
 * /user-notifications/{notificationId}/mark-read:
 *   patch:
 *     summary: Mark a specific notification as read.
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the UserNotification to mark as read.
 *     responses:
 *       200:
 *         description: The updated notification object.
 *         content: { "application/json": { schema: { $ref: '#/components/schemas/UserNotification' } } }
 *       400: { description: "Invalid Notification ID." }
 *       401: { description: "Not authorized." }
 *       403: { description: "User not authorized to update this notification." }
 *       404: { description: "Notification not found." }
 */
router.patch('/:notificationId/mark-read', protect, markNotificationAsRead);


module.exports = router;
