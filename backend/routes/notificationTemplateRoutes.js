const express = require('express');
const router = express.Router();
const {
    createNotificationTemplate,
    getNotificationTemplates,
    getNotificationTemplateByIdOrName,
    updateNotificationTemplate,
    deleteNotificationTemplate,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { userRoles } = require('../models/UserModel');

const templateAdminRoles = [userRoles[0], userRoles[1]]; // SuperAdmin, SystemAdmin

/**
 * @swagger
 * tags:
 *   name: Notification Templates
 *   description: Management of notification templates.
 * components:
 *   schemas:
 *     NotificationTemplate:
 *       type: object
 *       required: [name, type, body]
 *       properties:
 *         _id: { type: string, readOnly: true }
 *         name: { type: string, unique: true, description: "Unique identifier, e.g., 'batch_published_email'" }
 *         description: { type: string, nullable: true }
 *         type: { type: string, enum: ['email', 'sms', 'in_app'] }
 *         subject: { type: string, nullable: true, description: "Required if type is 'email'" }
 *         body: { type: string, description: "Template content with placeholders like {{variableName}}" }
 *         placeholders:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *           nullable: true
 *         isEnabled: { type: boolean, default: true }
 *         createdAt: { type: string, format: date-time, readOnly: true }
 *         updatedAt: { type: string, format: date-time, readOnly: true }
 *     NotificationTemplateInput:
 *       type: object
 *       required: [name, type, body]
 *       properties:
 *         name: { type: string }
 *         description: { type: string, nullable: true }
 *         type: { type: string, enum: ['email', 'sms', 'in_app'] }
 *         subject: { type: string, nullable: true }
 *         body: { type: string }
 *         placeholders:
 *           type: array
 *           items:
 *             type: object
 *             properties: { name: { type: string }, description: { type: string } }
 *           nullable: true
 *         isEnabled: { type: boolean, default: true }
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /notification-templates:
 *   post:
 *     summary: Create a new notification template.
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content: { "application/json": { schema: { $ref: '#/components/schemas/NotificationTemplateInput' } } }
 *     responses:
 *       201:
 *         description: Template created successfully.
 *         content: { "application/json": { schema: { $ref: '#/components/schemas/NotificationTemplate' } } }
 *       400: { description: "Invalid input or template name already exists." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 *   get:
 *     summary: Get all notification templates.
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of notification templates.
 *         content: { "application/json": { schema: { type: "array", items: { $ref: '#/components/schemas/NotificationTemplate' } } } }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 */
router.route('/')
    .post(protect, authorize(templateAdminRoles), createNotificationTemplate)
    .get(protect, authorize(templateAdminRoles), getNotificationTemplates);

/**
 * @swagger
 * /notification-templates/{idOrName}:
 *   get:
 *     summary: Get a single notification template by its ID or unique name.
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrName
 *         required: true
 *         schema: { type: string }
 *         description: The MongoDB _id or unique name of the template.
 *     responses:
 *       200:
 *         description: Notification template data.
 *         content: { "application/json": { schema: { $ref: '#/components/schemas/NotificationTemplate' } } }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 *       404: { description: "Template not found." }
 */
router.get('/:idOrName', protect, authorize(templateAdminRoles), getNotificationTemplateByIdOrName);

/**
 * @swagger
 * /notification-templates/{id}:
 *   put:
 *     summary: Update a notification template by its ID.
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The MongoDB _id of the template to update.
 *     requestBody:
 *       required: true
 *       content: { "application/json": { schema: { $ref: '#/components/schemas/NotificationTemplateInput' } } } # Name cannot be updated
 *     responses:
 *       200:
 *         description: Template updated successfully.
 *         content: { "application/json": { schema: { $ref: '#/components/schemas/NotificationTemplate' } } }
 *       400: { description: "Invalid input or ID format." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 *       404: { description: "Template not found." }
 *   delete:
 *     summary: Delete a notification template by its ID.
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The MongoDB _id of the template to delete.
 *     responses:
 *       200:
 *         description: Template deleted successfully.
 *         content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } } } }
 *       400: { description: "Invalid ID format." }
 *       401: { description: "Not authorized." }
 *       403: { description: "Forbidden." }
 *       404: { description: "Template not found." }
 */
router.route('/:id')
    .put(protect, authorize(templateAdminRoles), updateNotificationTemplate)
    .delete(protect, authorize(templateAdminRoles), deleteNotificationTemplate);

module.exports = router;
