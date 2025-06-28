import axios from 'axios';

const API_URL = '/api/benchmarks'; // Uses proxy

// TODO: Add getAuthHeaders() if/when auth is implemented

/**
 * Triggers benchmark calculation for a given session.
 * @param {string} sessionId - The ID of the session.
 * @param {object} [filters={}] - Optional filters for calculation.
 * @param {string} [filters.assessmentIdFilter] - Specific assessment ID to calculate for.
 * @param {string} [filters.ageGroupFilter] - Specific age group to filter entries by.
 * @param {string} [filters.genderFilter] - Specific gender to filter entries by.
 * @returns {Promise<object>} - The response from the backend.
 */
export const calculateBenchmarksForSession = async (sessionId, filters = {}) => {
    const response = await axios.post(`${API_URL}/calculate/session/${sessionId}`, filters);
    return response.data; // Expected: { message, created, updated }
};

/**
 * Fetches benchmarks based on query parameters.
 * @param {object} queryParams - Object containing query parameters.
 * @param {string} [queryParams.sessionId]
 * @param {string} [queryParams.assessmentId]
 * @param {string} [queryParams.parameterId]
 * @param {string} [queryParams.ageGroup]
 * @param {string} [queryParams.gender]
 * @returns {Promise<Array>} - An array of benchmark objects.
 */
export const getBenchmarks = async (queryParams = {}) => {
    const response = await axios.get(API_URL, { params: queryParams });
    return response.data;
};

/**
 * Fetches a single benchmark by its MongoDB _id.
 * @param {string} benchmarkId - The ID of the benchmark.
 * @returns {Promise<object>} - The benchmark object.
 */
export const getBenchmarkById = async (benchmarkId) => {
    const response = await axios.get(`${API_URL}/${benchmarkId}`);
    return response.data;
};

// Placeholder for deleting a benchmark if that functionality is added
// export const deleteBenchmark = async (benchmarkId) => {
//     const response = await axios.delete(`${API_URL}/${benchmarkId}`);
//     return response.data;
// };

const benchmarkService = {
    calculateBenchmarksForSession,
    getBenchmarks,
    getBenchmarkById,
    // deleteBenchmark,
};

export default benchmarkService;
