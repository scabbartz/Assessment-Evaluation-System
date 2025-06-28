const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userNotificationSchema = new Schema({
    userId: { // The user who this notification is for
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: { // Optional title for the notification
        type: String,
        trim: true,
        maxlength: 255
    },
    message: { // The main content of the notification
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    link: { // Optional URL link related to the notification (e.g., to a specific report, comment thread)
        type: String,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true // To quickly find unread notifications
    },
    readAt: { // Timestamp when the notification was marked as read
        type: Date
    },
    type: { // Optional: Type of notification for categorization or specific UI handling
        type: String,
        trim: true,
        lowercase: true,
        // Examples: 'new_comment', 'batch_published', 'system_alert', 'mention'
    },
    // urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    // icon: { type: String } // Optional icon name/URL for UI
    emitterId: { // Optional: User or System component that generated the notification
        type: Schema.Types.ObjectId,
        ref: 'User', // Could also be null for system-generated
        default: null
    },
    emitterName: { // Denormalized name of the emitter for convenience
        type: String,
        trim: true
    }
}, { timestamps: true }); // Adds createdAt and updatedAt

// TTL index to automatically delete very old (e.g., read and older than 90 days) notifications
// userNotificationSchema.index(
//     { createdAt: 1, isRead: 1 },
//     { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { isRead: true } }
// );
// Or simply by createdAt if all old notifications should be purged eventually
userNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 }); // e.g., 180 days

const UserNotification = mongoose.model('UserNotification', userNotificationSchema);

module.exports = UserNotification;
