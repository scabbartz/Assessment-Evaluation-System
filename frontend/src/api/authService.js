import axios from 'axios';

const API_URL = '/api/auth'; // Uses proxy

// Helper to get the token from local storage (or context)
const getAuthToken = () => {
    // In a real app, this might come from React Context or a more robust state management.
    // For scaffolding, localStorage is simple.
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token;
};

// Helper to create Authorization headers
const getAuthHeaders = () => {
    const token = getAuthToken();
    // Using 'mocktoken-' prefix if token is a mock one for backend placeholder middleware to recognize
    // In a real app, it would always be 'Bearer actualJWT'
    const prefix = token && token.startsWith('mocktoken-') ? '' : 'Bearer ';
    return token ? { Authorization: `${prefix}${token}` } : {};
};


/**
 * Registers a new user.
 * @param {object} userData - User data (name, email, password, role, scopes).
 * @returns {Promise<object>} - User object and token.
 */
export const register = async (userData) => {
    const response = await axios.post(`${API_URL}/register`, userData);
    if (response.data && response.data.token) {
        // Store user and token (e.g., in localStorage for simple persistence)
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
};

/**
 * Logs in an existing user.
 * @param {object} credentials - User credentials (email, password).
 * @returns {Promise<object>} - User object and token.
 */
export const login = async (credentials) => {
    const response = await axios.post(`${API_URL}/login`, credentials);
    if (response.data && response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
};

/**
 * Logs out the current user (client-side).
 */
export const logout = () => {
    localStorage.removeItem('user');
    // TODO: Optionally call a backend logout endpoint if it exists (e.g., to invalidate server-side session or httpOnly cookie)
};

/**
 * Gets the current logged-in user's profile.
 * @returns {Promise<object>} - User profile data.
 */
export const getCurrentUser = async () => {
    const config = { headers: getAuthHeaders() };
    try {
        const response = await axios.get(`${API_URL}/me`, config);
        return response.data;
    } catch (error) {
        // If token is invalid or expired, backend might return 401.
        // Handle this by logging out the user.
        if (error.response && error.response.status === 401) {
            logout(); // Clear stale token/user data
        }
        throw error; // Re-throw error for the component to handle
    }
};

/**
 * Gets the current user object from localStorage.
 * This is a synchronous helper, useful for initial state in UI.
 * @returns {object|null} - The user object or null if not logged in.
 */
export const getLocalUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};


const authService = {
    register,
    login,
    logout,
    getCurrentUser,
    getLocalUser, // Utility to get stored user synchronously
    getAuthToken,   // Utility to get just the token
};

export default authService;
