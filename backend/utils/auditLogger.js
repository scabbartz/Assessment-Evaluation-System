const AuditLog = require('../models/AuditLogModel');

/**
 * Logs an audit event.
 * This is an asynchronous function but often doesn't need to be awaited
 * unless successful logging is critical for the subsequent operation.
 * For performance, it's fire-and-forget.
 *
 * @param {object} logData - The data for the audit log.
 * @param {string} [logData.userId] - ID of the user performing the action.
 * @param {string} [logData.userName] - Name of the user.
 * @param {string} logData.action - Action performed (e.g., USER_LOGIN, ASSESSMENT_UPDATE).
 * @param {string} [logData.entity] - Type of entity affected (e.g., "User", "Assessment").
 * @param {string|mongoose.Types.ObjectId} [logData.entityId] - ID of the entity affected.
 * @param {object} [logData.details] - Additional contextual information.
 * @param {string} [logData.status='INFO'] - Outcome of the action ('SUCCESS', 'FAILURE', 'INFO').
 * @param {object} [logData.clientInfo] - Client information (ipAddress, userAgent).
 */
const logAuditEvent = async ({
    userId = null,
    userName = 'System',
    action,
    entity = null,
    entityId = null,
    details = null,
    status = 'INFO', // Default status to INFO if not specified
    clientInfo = {}  // Default clientInfo to empty object
} = {}) => {
    if (!action) {
        console.error('Audit Log Error: Action is required.');
        return;
    }

    try {
        const auditEntry = new AuditLog({
            userId,
            userName: userId ? userName : 'System', // Ensure userName is 'System' if userId is null
            action: action.toUpperCase(),
            entity,
            entityId,
            details,
            status,
            clientInfo,
            timestamp: new Date() // Explicitly set timestamp, though model has default
        });
        await auditEntry.save();
        // console.log(`Audit Logged: ${action} by ${userName || 'System'}`); // Optional: for dev logging
    } catch (error) {
        // Log to console, but don't let audit logging failure break the main application flow.
        console.error('Failed to save audit log:', error.message, {
            userId, userName, action, entity, entityId, details, status
        });
    }
};


// Middleware to extract client info and make logAuditEvent available on req
const auditLogMiddleware = (req, res, next) => {
    req.logAuditEvent = (logDataPartial) => {
        const clientInfo = {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers?.['user-agent']
        };

        // Automatically include userId and userName if req.user is populated by auth middleware
        const userId = req.user?._id || req.user?.id || null;
        const userName = req.user?.name || (userId ? `User_${userId}` : 'System'); // Fallback userName

        logAuditEvent({
            userId: userId,
            userName: userName,
            clientInfo: clientInfo,
            ...logDataPartial, // User-provided log data (action, entity, etc.)
        });
    };
    next();
};


module.exports = {
    logAuditEvent,
    auditLogMiddleware
};
