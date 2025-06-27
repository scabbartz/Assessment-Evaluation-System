import axios from 'axios';

const API_URL = '/api/sessions'; // Uses proxy

// TODO: Add getAuthHeaders() if/when auth is implemented

// Create a new session
export const createSession = async (sessionData) => {
    const response = await axios.post(API_URL, sessionData);
    return response.data;
};

// Get all sessions
export const getSessions = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

// Get a single session by ID
export const getSessionById = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

// Update a session
export const updateSession = async (id, sessionData) => {
    const response = await axios.put(`${API_URL}/${id}`, sessionData);
    return response.data;
};

// Delete a session
export const deleteSession = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
};

// --- Student Roster Management ---

// Add students to a session's roster
export const addStudentsToRoster = async (sessionId, studentsArray) => {
    // studentsArray should be like: [{ studentId: "s1", name: "John Doe" }, ...]
    const response = await axios.post(`${API_URL}/${sessionId}/students`, { students: studentsArray });
    return response.data;
};

// Remove a student from a session's roster
export const removeStudentFromRoster = async (sessionId, studentId) => {
    const response = await axios.delete(`${API_URL}/${sessionId}/students/${studentId}`);
    return response.data;
};

// Import student roster (e.g., replacing all students)
export const importRoster = async (sessionId, studentsArray) => {
    const response = await axios.post(`${API_URL}/${sessionId}/import-roster`, { students: studentsArray });
    return response.data;
};


// --- Batch related methods via Session endpoint ---

// Get all batches for a specific session
export const getBatchesForSession = async (sessionId) => {
    const response = await axios.get(`${API_URL}/${sessionId}/batches`);
    return response.data;
};

// Create a new batch within a session
export const createBatchInSession = async (sessionId, batchData) => {
    const response = await axios.post(`${API_URL}/${sessionId}/batches`, batchData);
    return response.data;
};

// Create multiple batches by random partitioning
export const createRandomBatchesInSession = async (sessionId, config) => {
    // config: { numberOfBatches, maxStudentsPerBatch, defaultBatchTitlePrefix, ... }
    const response = await axios.post(`${API_URL}/${sessionId}/create-random-batches`, config);
    return response.data;
};


const sessionService = {
    createSession,
    getSessions,
    getSessionById,
    updateSession,
    deleteSession,
    addStudentsToRoster,
    removeStudentFromRoster,
    importRoster,
    getBatchesForSession,
    createBatchInSession,
    createRandomBatchesInSession,
};

export default sessionService;
