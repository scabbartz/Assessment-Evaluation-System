import axios from 'axios';

const API_URL = '/api/reports'; // Uses proxy

// TODO: Add getAuthHeaders() if/when auth is implemented

/**
 * Fetches data for an individual athlete's report.
 * @param {string} athleteId - The string identifier of the athlete (e.g., 'STUDENT_001').
 * @returns {Promise<object>} - The report data including entries and recommendations.
 */
export const getIndividualAthleteReport = async (athleteId) => {
    const response = await axios.get(`${API_URL}/individual/${athleteId}`);
    return response.data;
};

/**
 * Fetches data for cohort analytics for a specific session.
 * @param {string} sessionId - The MongoDB _id of the session.
 * @returns {Promise<object>} - The cohort analytics data.
 */
export const getCohortAnalyticsReport = async (sessionId) => {
    const response = await axios.get(`${API_URL}/cohort/session/${sessionId}`);
    return response.data;
};

// --- Export Functions (Placeholders - actual file download handled by browser via direct link/anchor tag) ---

/**
 * Provides the URL for downloading an individual report as PDF.
 * @param {string} athleteId - The string identifier of the athlete.
 * @returns {string} - The URL for the PDF export.
 */
export const getIndividualReportPdfUrl = (athleteId) => {
    return `${API_URL}/individual/${athleteId}/export/pdf`;
};

/**
 * Provides the URL for downloading an individual report as CSV.
 * @param {string} athleteId - The string identifier of the athlete.
 * @returns {string} - The URL for the CSV export.
 */
export const getIndividualReportCsvUrl = (athleteId) => {
    return `${API_URL}/individual/${athleteId}/export/csv`;
};

/**
 * Provides the URL for downloading a cohort report as PDF.
 * @param {string} sessionId - The MongoDB _id of the session.
 * @returns {string} - The URL for the PDF export.
 */
export const getCohortReportPdfUrl = (sessionId) => {
    return `${API_URL}/cohort/session/${sessionId}/export/pdf`;
};

/**
 * Provides the URL for downloading a cohort report as CSV.
 * @param {string} sessionId - The MongoDB _id of the session.
 * @returns {string} - The URL for the CSV export.
 */
export const getCohortReportCsvUrl = (sessionId) => {
    return `${API_URL}/cohort/session/${sessionId}/export/csv`;
};


const reportService = {
    getIndividualAthleteReport,
    getCohortAnalyticsReport,
    getIndividualReportPdfUrl,
    getIndividualReportCsvUrl,
    getCohortReportPdfUrl,
    getCohortReportCsvUrl,
};

export default reportService;
