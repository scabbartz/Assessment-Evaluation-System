import axios from 'axios';
import authService from './authService'; // To get auth token for protected routes

// Helper to create Authorization headers
const getAuthHeaders = () => {
    const token = authService.getAuthToken();
    // Using 'mocktoken-' prefix if token is a mock one for backend placeholder middleware to recognize
    const prefix = token && token.startsWith('mocktoken-') ? '' : 'Bearer ';
    return token ? { Authorization: `${prefix}${token}` } : {};
};


// --- Notification Template Management ---

/**
 * Creates a new notification template.
 * @param {object} templateData - The data for the new template.
 * @returns {Promise<object>} - The created template object.
 */
export const createNotificationTemplate = async (templateData) => {
    const config = { headers: getAuthHeaders() }; // Assuming admin route
    const response = await axios.post('/api/notification-templates', templateData, config);
    return response.data;
};

/**
 * Fetches all notification templates.
 * @returns {Promise<Array>} - An array of template objects.
 */
export const getNotificationTemplates = async () => {
    const config = { headers: getAuthHeaders() }; // Assuming admin route
    const response = await axios.get('/api/notification-templates', config);
    return response.data;
};

/**
 * Updates a notification template.
 * @param {string} templateId - The ID of the template to update.
 * @param {object} updateData - The data to update.
 * @returns {Promise<object>} - The updated template object.
 */
export const updateNotificationTemplate = async (templateId, updateData) => {
    const config = { headers: getAuthHeaders() }; // Assuming admin route
    const response = await axios.put(`/api/notification-templates/${templateId}`, updateData, config);
    return response.data;
};

/**
 * Deletes a notification template.
 * @param {string} templateId - The ID of the template to delete.
 * @returns {Promise<object>} - Confirmation message.
 */
export const deleteNotificationTemplate = async (templateId) => {
    const config = { headers: getAuthHeaders() }; // Assuming admin route
    const response = await axios.delete(`/api/notification-templates/${templateId}`, config);
    return response.data;
};


// --- User In-App Notification Management ---

/**
 * Fetches notifications for the logged-in user.
 * @param {object} params - Query parameters (e.g., { limit, page, unreadOnly: 'true' }).
 * @returns {Promise<object>} - Object containing notifications array and pagination info.
 */
export const getUserNotifications = async (params = {}) => {
    const config = { headers: getAuthHeaders(), params };
    const response = await axios.get('/api/user-notifications', config);
    return response.data; // Expected: { notifications, unreadCount, currentPage, totalPages, totalNotifications }
};

/**
 * Marks a specific notification as read.
 * @param {string} notificationId - The ID of the UserNotification to mark as read.
 * @returns {Promise<object>} - The updated notification object.
 */
export const markNotificationAsRead = async (notificationId) => {
    const config = { headers: getAuthHeaders() };
    const response = await axios.patch(`/api/user-notifications/${notificationId}/mark-read`, {}, config);
    return response.data;
};

/**
 * Marks all unread notifications for the logged-in user as read.
 * @returns {Promise<object>} - Confirmation message.
 */
export const markAllNotificationsAsRead = async () => {
    const config = { headers: getAuthHeaders() };
    const response = await axios.patch('/api/user-notifications/mark-all-read', {}, config);
    return response.data; // Expected: { message: '...' }
};


const notificationService = {
    createNotificationTemplate,
    getNotificationTemplates,
    updateNotificationTemplate,
    deleteNotificationTemplate,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};

export default notificationService;
