const NotificationTemplate = require('../models/NotificationTemplateModel');
const UserNotification = require('../models/UserNotificationModel'); // Added
const User = require('../models/UserModel'); // For fetching user details if needed
const mongoose = require('mongoose');

// --- Notification Template CRUD ---

/**
 * @desc    Create a new notification template
 * @route   POST /api/notification-templates
 * @access  Private (Admin roles specified in routes)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const createNotificationTemplate = async (req, res) => {
    const { name, description, type, subject, body, placeholders, isEnabled } = req.body;
    try {
        const newTemplate = new NotificationTemplate({
            name, description, type, subject, body, placeholders, isEnabled
        });
        const savedTemplate = await newTemplate.save();
        res.status(201).json(savedTemplate);
    } catch (error) {
        console.error("Error creating notification template:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        if (error.code === 11000) { // Duplicate key
            return res.status(400).json({ message: `Template with name '${name}' already exists.` });
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

/**
 * @desc    Get all notification templates
 * @route   GET /api/notification-templates
 * @access  Private (Admin roles specified in routes)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getNotificationTemplates = async (req, res) => {
    try {
        const templates = await NotificationTemplate.find({}).sort({ name: 1 });
        res.status(200).json(templates);
    } catch (error) {
        console.error("Error fetching notification templates:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

/**
 * @desc    Get a single notification template by ID or name
 * @route   GET /api/notification-templates/:idOrName
 * @access  Private (Admin roles specified in routes)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getNotificationTemplateByIdOrName = async (req, res) => {
    const { idOrName } = req.params;
    try {
        let template;
        if (mongoose.Types.ObjectId.isValid(idOrName)) {
            template = await NotificationTemplate.findById(idOrName);
        } else {
            template = await NotificationTemplate.findOne({ name: idOrName.toLowerCase() });
        }

        if (!template) {
            return res.status(404).json({ message: 'Notification template not found.' });
        }
        res.status(200).json(template);
    } catch (error) {
        console.error("Error fetching notification template:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

/**
 * @desc    Update a notification template
 * @route   PUT /api/notification-templates/:id
 * @access  Private (Admin roles specified in routes)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const updateNotificationTemplate = async (req, res) => {
    const { id } = req.params;
    const { description, type, subject, body, placeholders, isEnabled } = req.body; // Name is not updatable to maintain uniqueness

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid Template ID format.' });
    }
    try {
        const template = await NotificationTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ message: 'Notification template not found.' });
        }

        if (description !== undefined) template.description = description;
        if (type) template.type = type;
        if (subject !== undefined) template.subject = subject; // Allow empty subject if type is not email
        if (body) template.body = body;
        if (placeholders) template.placeholders = placeholders;
        if (isEnabled !== undefined) template.isEnabled = isEnabled;
        // template.lastUpdatedBy = req.user.id; // TODO

        const updatedTemplate = await template.save();
        res.status(200).json(updatedTemplate);
    } catch (error) {
        console.error("Error updating notification template:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

/**
 * @desc    Delete a notification template
 * @route   DELETE /api/notification-templates/:id
 * @access  Private (Admin roles specified in routes)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const deleteNotificationTemplate = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid Template ID format.' });
    }
    try {
        const template = await NotificationTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ message: 'Notification template not found.' });
        }
        await template.remove();
        res.status(200).json({ message: 'Notification template deleted successfully.' });
    } catch (error) {
        console.error("Error deleting notification template:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


// --- Placeholder for Notification Sending Logic ---
// This function would be called internally by other services (e.g., after a batch is published, or a new comment is made)

/**
 * Simulates preparing and "sending" a notification.
 * In a real app, this would integrate with an email service (Nodemailer, SendGrid) or SMS gateway.
 * @param {string} templateName - The unique name of the NotificationTemplate to use.
 * @param {object} contextData - An object containing key-value pairs for placeholders in the template.
 * @param {object} recipient - Object containing recipient details (e.g., { email: 'user@example.com', phone: '+1234567890', userId: '...' })
 * @param {object} [emitter={}] - Optional: Information about who/what emitted the notification (e.g., { emitterId: 'someUserId', emitterName: 'User Name'})
 */
const sendNotification = async (templateName, contextData, recipient, emitter = {}) => {
    try {
        const template = await NotificationTemplate.findOne({ name: templateName.toLowerCase(), isEnabled: true });
        if (!template) {
            console.warn(`Notification template "${templateName}" not found or is disabled. Notification not sent.`);
            return { success: false, message: `Template ${templateName} not found or disabled.` };
        }

        let subject = template.subject || '';
        let body = template.body;
        let link = contextData.link || null; // Extract link from context if provided

        // Replace placeholders in subject and body
        for (const key in contextData) {
            if (key === 'link') continue; // Don't replace {{link}} if it's a special field
            const placeholder = `{{${key}}}`;
            const regex = new RegExp(placeholder.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g');
            if (subject) subject = subject.replace(regex, contextData[key]);
            body = body.replace(regex, contextData[key]);
        }

        // Process based on notification type
        if (template.type === 'email' && recipient.email) {
            console.log("---- SIMULATING EMAIL SEND ----");
            console.log(`To: ${recipient.email}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body:\n${body}`);
            console.log("-------------------------------");
            // TODO: Integrate with email sending service (Nodemailer, SendGrid, etc.)
        } else if (template.type === 'sms' && recipient.phone) {
            console.log("---- SIMULATING SMS SEND ----");
            console.log(`To SMS: ${recipient.phone}`);
            console.log(`Body:\n${body}`); // SMS usually doesn't have a subject
            console.log("-----------------------------");
            // TODO: Integrate with SMS gateway (Twilio, Vonage, etc.)
        } else if (template.type === 'in_app' && recipient.userId) {
            if (!mongoose.Types.ObjectId.isValid(recipient.userId)) {
                 console.warn(`Invalid recipient.userId for in-app notification: ${recipient.userId}`);
                 return { success: false, message: 'Invalid recipient userId for in-app notification.' };
            }
            await UserNotification.create({
                userId: recipient.userId,
                title: subject || template.name, // Use subject or template name as title
                message: body,
                link: link, // Link from contextData
                type: templateName, // Use template name as notification type for categorization
                emitterId: emitter.emitterId || null,
                emitterName: emitter.emitterName || 'System'
            });
            console.log(`In-app notification created for User ID: ${recipient.userId}`);
        } else {
             console.log(`Recipient details missing or invalid for template type "${template.type}". Template: ${templateName}`);
             return { success: false, message: `Recipient details missing or invalid for template type ${template.type}.` };
        }

        return { success: true, message: `Notification "${templateName}" processed for ${template.type}.` };

    } catch (error) {
        console.error(`Error in sendNotification for template "${templateName}" to recipient ${JSON.stringify(recipient)}:`, error);
        return { success: false, message: `Error processing notification: ${error.message}` };
    }
};


module.exports = {
    createNotificationTemplate,
    getNotificationTemplates,
    getNotificationTemplateByIdOrName,
    updateNotificationTemplate,
    deleteNotificationTemplate,
    sendNotification, // Exporting for potential internal use by other services/controllers

    // --- User Notification specific controllers ---
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};


/**
 * @desc    Get notifications for the logged-in user
 * @route   GET /api/user-notifications
 * @access  Private (Authenticated user)
 * @param {object} req - Express request object (req.user populated by 'protect' middleware)
 * @param {object} res - Express response object
 */
const getUserNotifications = async (req, res) => {
    // Assuming 'protect' middleware populates req.user.id
    const userId = req.user.id;
    const { limit = 10, page = 1, unreadOnly = 'false' } = req.query;

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    try {
        const query = { userId };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const options = {
            sort: { createdAt: -1 },
            limit: parseInt(limit, 10),
            skip: (parseInt(page, 10) - 1) * parseInt(limit, 10)
        };

        const notifications = await UserNotification.find(query, null, options);
        const totalCount = await UserNotification.countDocuments(query);
        const unreadCount = await UserNotification.countDocuments({ userId, isRead: false });


        res.status(200).json({
            notifications,
            unreadCount,
            currentPage: parseInt(page, 10),
            totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
            totalNotifications: totalCount
        });
    } catch (error) {
        console.error(`Error fetching notifications for user ${userId}:`, error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


/**
 * @desc    Mark a specific notification as read
 * @route   PATCH /api/user-notifications/:notificationId/mark-read
 * @access  Private (Owner of notification)
 * @param {object} req - Express request object (req.user populated, params.notificationId)
 * @param {object} res - Express response object
 */
const markNotificationAsRead = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.id; // From 'protect' middleware

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({ message: 'Invalid Notification ID.' });
    }
    try {
        const notification = await UserNotification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found.' });
        }
        // Ensure the user owns this notification
        if (notification.userId.toString() !== userId) {
            return res.status(403).json({ message: 'User not authorized to update this notification.' });
        }

        if (!notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date();
            await notification.save();
        }
        res.status(200).json(notification);
    } catch (error) {
        console.error(`Error marking notification ${notificationId} as read:`, error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

/**
 * @desc    Mark all notifications for the logged-in user as read
 * @route   PATCH /api/user-notifications/mark-all-read
 * @access  Private (Authenticated user)
 * @param {object} req - Express request object (req.user populated)
 * @param {object} res - Express response object
 */
const markAllNotificationsAsRead = async (req, res) => {
    const userId = req.user.id; // From 'protect' middleware
    try {
        await UserNotification.updateMany(
            { userId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );
        res.status(200).json({ message: 'All unread notifications marked as read.' });
    } catch (error) {
        console.error(`Error marking all notifications as read for user ${userId}:`, error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};
