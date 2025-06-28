const express = require('express');
const router = express.Router();
const {
    createNotificationTemplate,
    getNotificationTemplates,
    getNotificationTemplateByIdOrName,
    updateNotificationTemplate,
    deleteNotificationTemplate,
} = require('../controllers/notificationController');

// TODO: Add 'protect' and 'authorize' (e.g., Admin only) middleware for all these routes.
// const { protect, authorize } = require('../middleware/authMiddleware');


// @route   POST /api/notification-templates
// @desc    Create a new notification template
// @access  Private (Admin)
router.post('/', /* protect, authorize(['Admin']), */ createNotificationTemplate);

// @route   GET /api/notification-templates
// @desc    Get all notification templates
// @access  Private (Admin)
router.get('/', /* protect, authorize(['Admin']), */ getNotificationTemplates);

// @route   GET /api/notification-templates/:idOrName
// @desc    Get a single notification template by its MongoDB _id or unique name
// @access  Private (Admin)
router.get('/:idOrName', /* protect, authorize(['Admin']), */ getNotificationTemplateByIdOrName);

// @route   PUT /api/notification-templates/:id
// @desc    Update a notification template by its MongoDB _id
// @access  Private (Admin)
router.put('/:id', /* protect, authorize(['Admin']), */ updateNotificationTemplate);

// @route   DELETE /api/notification-templates/:id
// @desc    Delete a notification template by its MongoDB _id
// @access  Private (Admin)
router.delete('/:id', /* protect, authorize(['Admin']), */ deleteNotificationTemplate);


module.exports = router;
