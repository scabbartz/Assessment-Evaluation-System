const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationTemplateSchema = new Schema({
    name: { // Unique identifier for the template
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true, // e.g., "batch_assignment_email", "new_feedback_sms"
    },
    description: { // Optional description of what this template is for
        type: String,
        trim: true,
    },
    type: { // Type of notification
        type: String,
        enum: ['email', 'sms', 'in_app'], // 'in_app' for system notifications within the UI
        required: true,
    },
    subject: { // Required for email type, optional for others
        type: String,
        trim: true,
        // Subject can also use placeholders like {{batchName}}
        // This validation can be conditional based on type if needed
        // validate: {
        //     validator: function(v) {
        //         return this.type !== 'email' || (v && v.length > 0);
        //     },
        //     message: 'Subject is required for email templates.'
        // }
    },
    body: { // The template content
        type: String,
        required: true,
        trim: true,
        // Body will use placeholders like {{athleteName}}, {{batchTitle}}, {{commentLink}}, etc.
        // Example for an email body:
        // "Dear {{userName}},\n\nA new comment has been posted on an assessment for {{athleteName}} in batch {{batchTitle}}.\n\nComment: {{commentText}}\n\nYou can view it here: {{commentLink}}\n\nRegards,\nThe System"
    },
    placeholders: [{ // Optional: list of expected placeholder variables for this template for documentation/validation
        name: String, // e.g., "userName", "athleteName"
        description: String // e.g., "The name of the user receiving the notification"
    }],
    isEnabled: { // To easily enable/disable sending this type of notification
        type: Boolean,
        default: true,
    },
    // For managing template versions if needed in the future
    // version: { type: Number, default: 1 },
    // lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

// Ensure subject is present if type is email (alternative to schema-level conditional validation)
notificationTemplateSchema.path('subject').required(function() {
  return this.type === 'email';
}, 'Subject is required for email templates.');


const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);

module.exports = NotificationTemplate;
