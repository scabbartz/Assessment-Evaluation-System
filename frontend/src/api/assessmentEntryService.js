import axios from 'axios';

// Base URLs
const BATCHES_URL = '/api/batches'; // For batch-nested operations
const ENTRIES_URL = '/api/entries'; // For direct entry operations
const ATHLETES_URL = '/api/athletes'; // For athlete-nested operations


// Create a new data entry for an athlete in a batch
export const createAssessmentEntry = async (batchId, entryData) => {
    const response = await axios.post(`${BATCHES_URL}/${batchId}/entries`, entryData);
    return response.data;
};

// Bulk create assessment entries for a batch
export const createBulkAssessmentEntries = async (batchId, entriesArray) => {
    // entriesArray is [{ athleteId, athleteName, data: [...] }, ...]
    const response = await axios.post(`${BATCHES_URL}/${batchId}/entries/bulk`, { entries: entriesArray });
    return response.data; // Expects 207 for partial success, or 201 for full
};

// Get all entries for a specific batch
export const getEntriesForBatch = async (batchId) => {
    const response = await axios.get(`${BATCHES_URL}/${batchId}/entries`);
    return response.data;
};

// Get all entries for a specific athlete
export const getEntriesForAthlete = async (athleteId) => {
    // athleteId is the string identifier like 'STUDENT_001'
    const response = await axios.get(`${ATHLETES_URL}/${athleteId}/entries`);
    return response.data;
};

// Get a single assessment entry by its MongoDB _id
export const getAssessmentEntryById = async (entryId) => {
    const response = await axios.get(`${ENTRIES_URL}/${entryId}`);
    return response.data;
};

// Update a specific assessment entry by its MongoDB _id
export const updateAssessmentEntry = async (entryId, updateData) => {
    const response = await axios.put(`${ENTRIES_URL}/${entryId}`, updateData);
    return response.data;
};

// Delete a specific assessment entry by its MongoDB _id
export const deleteAssessmentEntry = async (entryId) => {
    const response = await axios.delete(`${ENTRIES_URL}/${entryId}`);
    return response.data;
};

// Helper to generate a CSV template for a given assessment
// This is a frontend utility, doesn't call backend, but related to data entry.
export const generateCSVTemplate = (assessmentParameters) => {
    // assessmentParameters is an array like [{ name: 'Sprint 20m', unit: 's' }, ...]
    if (!assessmentParameters || assessmentParameters.length === 0) {
        return "AthleteID,AthleteName,AthleteAge,AthleteGender\n"; // Basic template if no params
    }
    // Fixed columns + dynamic parameter columns
    const headers = ['AthleteID', 'AthleteName', 'AthleteAge', 'AthleteGender', 'AttemptNumber (Optional)'];
    assessmentParameters.forEach(param => {
        headers.push(`${param.name} (${param.unit || 'value'})`); // e.g., "Sprint 20m (s)"
    });
    return headers.join(',') + '\n';
    // Example row: STUD001,John Doe,12,Male,1,2.5,55
};


const assessmentEntryService = {
    createAssessmentEntry,
    createBulkAssessmentEntries,
    getEntriesForBatch,
    getEntriesForAthlete,
    getAssessmentEntryById,
    updateAssessmentEntry,
    deleteAssessmentEntry,
    generateCSVTemplate,
};

export default assessmentEntryService;
