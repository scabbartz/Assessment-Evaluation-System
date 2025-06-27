import axios from 'axios';

const API_URL = '/api/batches'; // Uses proxy

// TODO: Add getAuthHeaders() if/when auth is implemented

// Get a single batch by its ID
export const getBatchById = async (batchId) => {
    const response = await axios.get(`${API_URL}/${batchId}`);
    return response.data;
};

// Update a batch
export const updateBatch = async (batchId, batchData) => {
    const response = await axios.put(`${API_URL}/${batchId}`, batchData);
    return response.data;
};

// Delete a batch
export const deleteBatch = async (batchId) => {
    const response = await axios.delete(`${API_URL}/${batchId}`);
    return response.data;
};

// Update batch status (workflow action)
export const updateBatchStatus = async (batchId, status) => {
    // status should be a string like "In Progress", "Finished", etc.
    const response = await axios.patch(`${API_URL}/${batchId}/status`, { status });
    return response.data;
};

// Placeholder for "Calculate Results" - actual implementation later
export const calculateBatchResults = async (batchId) => {
    // This will eventually trigger backend computation (Section 4)
    console.warn('calculateBatchResults is a placeholder and not yet implemented on the backend.');
    // const response = await axios.post(`${API_URL}/${batchId}/calculate-results`);
    // return response.data;
    return Promise.resolve({ message: "Results calculation triggered (placeholder)." });
};

// Placeholder for "Publish Results" - actual implementation later
export const publishBatchResults = async (batchId) => {
    // This might just be a status update to "Published" or a more complex operation
    console.warn('publishBatchResults is a placeholder and might just be a status update.');
    // const response = await axios.post(`${API_URL}/${batchId}/publish`);
    // return response.data;
    return updateBatchStatus(batchId, 'Published'); // Example: just changing status
};


const batchService = {
    getBatchById,
    updateBatch,
    deleteBatch,
    updateBatchStatus,
    calculateBatchResults, // For 2.5 actions
    publishBatchResults,   // For 2.5 actions
};

export default batchService;
