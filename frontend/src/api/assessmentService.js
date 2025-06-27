import axios from 'axios';

const API_URL = '/api/assessments'; // Uses proxy in package.json for development

// Helper to get auth token if implemented
// const getAuthHeaders = () => {
//   const token = localStorage.getItem('token'); // Or however you store your token
//   return token ? { Authorization: `Bearer ${token}` } : {};
// };

// Create a new assessment
export const createAssessment = async (assessmentData) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.post(API_URL, assessmentData/*, config*/);
    return response.data;
};

// Get all assessments
export const getAssessments = async () => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.get(API_URL/*, config*/);
    return response.data;
};

// Get a single assessment by ID
export const getAssessmentById = async (id) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.get(`${API_URL}/${id}`/*, config*/);
    return response.data;
};

// Update an assessment
export const updateAssessment = async (id, assessmentData) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.put(`${API_URL}/${id}`, assessmentData/*, config*/);
    return response.data;
};

// Delete an assessment
export const deleteAssessment = async (id) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.delete(`${API_URL}/${id}`/*, config*/);
    return response.data;
};

// Clone an assessment
export const cloneAssessment = async (id) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.post(`${API_URL}/${id}/clone`/*, config*/);
    return response.data;
};

// --- Parameter Endpoints ---

// Add a parameter to an assessment
export const addParameter = async (assessmentId, parameterData) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.post(`${API_URL}/${assessmentId}/parameters`, parameterData/*, config*/);
    return response.data;
};

// Get all parameters for an assessment (though typically they come with the assessment)
export const getParameters = async (assessmentId) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.get(`${API_URL}/${assessmentId}/parameters`/*, config*/);
    return response.data;
};

// Update a parameter within an assessment
export const updateParameter = async (assessmentId, paramId, parameterData) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.put(`${API_URL}/${assessmentId}/parameters/${paramId}`, parameterData/*, config*/);
    return response.data;
};

// Delete a parameter from an assessment
export const deleteParameter = async (assessmentId, paramId) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.delete(`${API_URL}/${assessmentId}/parameters/${paramId}`/*, config*/);
    return response.data;
};

const assessmentService = {
    createAssessment,
    getAssessments,
    getAssessmentById,
    updateAssessment,
    deleteAssessment,
    cloneAssessment,
    addParameter,
    getParameters,
    updateParameter,
    deleteParameter,
};

export default assessmentService;
