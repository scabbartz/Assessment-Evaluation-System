const NotificationTemplate = require('../models/NotificationTemplateModel');
const mongoose = require('mongoose');

// --- Notification Template CRUD ---

// @desc    Create a new notification template
// @route   POST /api/notification-templates
// @access  Private (Admin)
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

// @desc    Get all notification templates
// @route   GET /api/notification-templates
// @access  Private (Admin)
const getNotificationTemplates = async (req, res) => {
    try {
        const templates = await NotificationTemplate.find({}).sort({ name: 1 });
        res.status(200).json(templates);
    } catch (error) {
        console.error("Error fetching notification templates:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

// @desc    Get a single notification template by ID or name
// @route   GET /api/notification-templates/:idOrName
// @access  Private (Admin)
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

// @desc    Update a notification template
// @route   PUT /api/notification-templates/:id
// @access  Private (Admin)
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

// @desc    Delete a notification template
// @route   DELETE /api/notification-templates/:id
// @access  Private (Admin)
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
 */
const sendNotification = async (templateName, contextData, recipient) => {
    try {
        const template = await NotificationTemplate.findOne({ name: templateName.toLowerCase(), isEnabled: true });
        if (!template) {
            console.warn(`Notification template "${templateName}" not found or is disabled. Notification not sent.`);
            return { success: false, message: `Template ${templateName} not found or disabled.` };
        }

        let subject = template.subject || '';
        let body = template.body;

        // Replace placeholders
        for (const key in contextData) {
            const placeholder = `{{${key}}}`; // or {{{key}}} depending on template engine
            const regex = new RegExp(placeholder.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g');
            if (subject) subject = subject.replace(regex, contextData[key]);
            body = body.replace(regex, contextData[key]);
        }

        // Simulate sending
        console.log("---- SIMULATING NOTIFICATION SEND ----");
        console.log(`Type: ${template.type}`);
        if (template.type === 'email' && recipient.email) {
            console.log(`To: ${recipient.email}`);
            console.log(`Subject: ${subject}`);
        } else if (template.type === 'sms' && recipient.phone) {
            console.log(`To SMS: ${recipient.phone}`);
        } else if (template.type === 'in_app' && recipient.userId) {
            console.log(`To User (In-App): ${recipient.userId}`);
        } else {
             console.log(`Recipient details missing for type ${template.type}.`);
             return { success: false, message: `Recipient details missing for type ${template.type}.` };
        }
        console.log(`Body:\n${body}`);
        console.log("--------------------------------------");

        // TODO: Here you would integrate with actual email/SMS sending services.
        // For 'in_app', you might create a record in a 'UserNotifications' collection.

        return { success: true, message: `Notification "${templateName}" processed for simulated sending.` };

    } catch (error) {
        console.error(`Error in sendNotification for template "${templateName}":`, error);
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
};
