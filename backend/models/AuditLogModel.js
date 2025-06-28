const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditLogSchema = new Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    userId: { // User who performed the action (if applicable)
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null // For system events not tied to a specific user
    },
    userName: { // Denormalized for quick display (name of the user)
        type: String,
        trim: true,
        default: 'System'
    },
    action: { // Type of action performed
        type: String,
        required: true,
        trim: true,
        uppercase: true, // e.g., USER_LOGIN, ASSESSMENT_CREATE, DATA_EXPORT
        index: true
    },
    entity: { // The type of entity affected (if applicable)
        type: String,
        trim: true, // e.g., "User", "Assessment", "Batch", "Session", "AssessmentEntry"
        default: null
    },
    entityId: { // The ID of the specific entity affected
        type: Schema.Types.Mixed, // Can be ObjectId or String (like athleteId)
        trim: true,
        default: null
    },
    details: { // Additional contextual information about the event
        type: Schema.Types.Mixed, // Flexible object for storing details like IP address, changed fields, etc.
        default: null
    },
    status: { // Outcome of the action
        type: String,
        enum: ['SUCCESS', 'FAILURE', 'PENDING', 'INFO'],
        default: 'INFO'
    },
    clientInfo: { // Information about the client making the request
        ipAddress: { type: String },
        userAgent: { type: String }
    }
    // We could also add 'traceId' for distributed tracing if the system grows complex
}, {
    timestamps: false, // We use 'timestamp' field instead of mongoose's default createdAt/updatedAt
    collection: 'auditlogs' // Explicit collection name
});

// Optional: TTL index to automatically delete old logs after a certain period
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // e.g., 1 year

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
