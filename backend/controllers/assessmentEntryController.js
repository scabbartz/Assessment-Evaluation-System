const AssessmentEntry = require('../models/AssessmentEntryModel');
const Batch = require('../models/BatchModel');
const Assessment = require('../models/AssessmentModel'); // To validate parameters
const mongoose = require('mongoose');

// Helper function for basic validation of parameter data against assessment template
// This function now performs more robust type checking.
const validateParameterData = async (assessmentId, entryDataFromRequest) => {
    const assessmentTemplate = await Assessment.findById(assessmentId).select('parameters');
    if (!assessmentTemplate) {
        throw new Error('Assessment template not found for validation.');
    }
    const templateParamsMap = new Map(assessmentTemplate.parameters.map(p => [p._id.toString(), p]));
    const validatedDataArray = [];

    for (const paramEntry of entryDataFromRequest) {
        if (!paramEntry.parameterId || !mongoose.Types.ObjectId.isValid(paramEntry.parameterId)) {
             throw new Error(`Invalid or missing parameterId: ${paramEntry.parameterId}`);
        }
        const templateParam = templateParamsMap.get(paramEntry.parameterId.toString());
        if (!templateParam) {
            throw new Error(`Parameter ID ${paramEntry.parameterId} not found in assessment template.`);
        }

        let originalValue = paramEntry.value;
        let processedValue = originalValue;

        // Type validation and potential conversion
        switch (templateParam.type) {
            case 'numeric':
            case 'rating': // Ratings are often numeric (e.g., 1-5, 1-10)
                if (originalValue === null || originalValue === undefined || String(originalValue).trim() === '') {
                    processedValue = null; // Allow explicitly null/empty for non-required numerics
                } else {
                    processedValue = Number(originalValue);
                    if (isNaN(processedValue)) {
                        throw new Error(`Value for numeric parameter "${templateParam.name}" (${originalValue}) is not a valid number.`);
                    }
                }
                break;
            case 'time':
                // For time, we might expect a string like "MM:SS.ms" or just seconds.
                // For now, let's assume it's stored as a string if complex, or number if seconds.
                // If it's meant to be numeric (e.g., total seconds), conversion logic would go here.
                // Example: if (typeof originalValue === 'string' && originalValue.includes(':')) { processedValue = convertTimeToSeconds(originalValue); }
                // For now, accept as is if it's a string or number.
                if (originalValue !== null && originalValue !== undefined && typeof originalValue !== 'string' && typeof originalValue !== 'number') {
                     throw new Error(`Value for time parameter "${templateParam.name}" must be a string or number.`);
                }
                break;
            case 'text':
            case 'choice': // Choice might be stored as the selected string value
                if (originalValue !== null && originalValue !== undefined && typeof originalValue !== 'string') {
                    processedValue = String(originalValue); // Ensure it's a string
                }
                break;
            default:
                // Unknown parameter type, accept value as is or throw error
                console.warn(`Unknown parameter type "${templateParam.type}" for parameter "${templateParam.name}". Accepting value as is.`);
                break;
        }

        // TODO: Add range validation if min/max are defined on templateParam.customBands or dedicated fields.
        // TODO: For 'choice' type, validate against allowed choices in templateParam.customBands.

        const validatedParam = {
            parameterId: templateParam._id,
            parameterName: templateParam.name,
            unit: templateParam.unit,
            value: processedValue, // The potentially type-converted value
            rawValue: originalValue // Always store the original submitted value
        };
        if (paramEntry.notes) { // Preserve notes if provided
            validatedParam.notes = paramEntry.notes;
        }

        validatedDataArray.push(validatedParam);
    }
    return validatedDataArray; // Return the new array of validated parameter data objects
};


// @desc    Create a new data entry for an athlete in a batch
// @route   POST /api/batches/:batchId/entries
// @access  Private (TODO: Add auth)
const createAssessmentEntry = async (req, res) => {
    try {
        const { batchId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).json({ message: 'Invalid Batch ID format.' });
        }

        const parentBatch = await Batch.findById(batchId).select('sessionId assessmentId students');
        if (!parentBatch) {
            return res.status(404).json({ message: 'Parent batch not found.' });
        }
        if (!parentBatch.assessmentId) {
            return res.status(400).json({ message: 'Batch does not have an assessment template assigned.' });
        }

        const { athleteId, athleteName, athleteAge, athleteGender, entryDate, data, attemptNumber } = req.body;

        if (!athleteId || !athleteName || !data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: 'Athlete ID, Name, and Parameter Data are required.' });
        }

        // Check if athlete is part of the batch's student list (optional, but good for consistency)
        const athleteInBatch = parentBatch.students.find(s => s.studentId === athleteId);
        if (!athleteInBatch) {
            // Decide on strictness: return error or allow adding ad-hoc athletes?
            // For now, let's be flexible but one could make this an error:
            // console.warn(`Athlete ID ${athleteId} not found in batch roster, but entry will be created.`);
            // If strict: return res.status(400).json({ message: `Athlete ID ${athleteId} is not registered in this batch.` });
        }


        const validatedData = await validateParameterData(parentBatch.assessmentId, data);

        const newEntry = new AssessmentEntry({
            batchId,
            sessionId: parentBatch.sessionId,
            assessmentId: parentBatch.assessmentId,
            athleteId,
            athleteName,
            athleteAge,
            athleteGender,
            entryDate: entryDate || new Date(),
            data: validatedData,
            attemptNumber: attemptNumber || 1,
            // enteredBy: req.user.id // TODO
        });

        const createdEntry = await newEntry.save();
        res.status(201).json(createdEntry);

    } catch (error) {
        console.error("Error creating assessment entry:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        if (error.code === 11000) {
             return res.status(400).json({ message: "Duplicate entry for this athlete in this batch (and attempt number)." });
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

// @desc    Bulk create assessment entries (e.g., from CSV upload)
// @route   POST /api/batches/:batchId/bulk-entries
// @access  Private (TODO: Add auth)
const createBulkAssessmentEntries = async (req, res) => {
    // This controller will handle an array of entry objects.
    // The actual CSV parsing should ideally happen client-side or in a dedicated service.
    // For Phase 1 scaffolding, we assume `req.body.entries` is an array of valid entry objects.
    try {
        const { batchId } = req.params;
        const { entries } = req.body; // Expecting: { entries: [ { athleteId, athleteName, data: [...] }, ... ] }

        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).json({ message: 'Invalid Batch ID format.' });
        }
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ message: 'Entries array is required and cannot be empty.' });
        }

        const parentBatch = await Batch.findById(batchId).select('sessionId assessmentId students');
        if (!parentBatch) {
            return res.status(404).json({ message: 'Parent batch not found.' });
        }
        if (!parentBatch.assessmentId) {
            return res.status(400).json({ message: 'Batch does not have an assessment template assigned.' });
        }

        const results = { created: [], errors: [] };
        const sessionStudentIds = new Set(parentBatch.students.map(s => s.studentId));

        for (const entryData of entries) {
            if (!entryData.athleteId || !entryData.athleteName || !entryData.data || !Array.isArray(entryData.data)) {
                results.errors.push({ entry: entryData, error: 'Missing required fields (athleteId, athleteName, data).' });
                continue;
            }

            // Optional: Check if athlete is in batch roster
            // if (!sessionStudentIds.has(entryData.athleteId)) {
            //     results.errors.push({ entry: entryData, error: `Athlete ID ${entryData.athleteId} not in batch roster.` });
            //     continue;
            // }

            try {
                const validatedParamData = await validateParameterData(parentBatch.assessmentId, entryData.data);
                const newEntry = new AssessmentEntry({
                    batchId,
                    sessionId: parentBatch.sessionId,
                    assessmentId: parentBatch.assessmentId,
                    ...entryData, // includes athleteId, athleteName, athleteAge, athleteGender, entryDate, attemptNumber
                    data: validatedParamData,
                    // enteredBy: req.user.id // TODO
                });
                const savedEntry = await newEntry.save();
                results.created.push(savedEntry);
            } catch (err) {
                results.errors.push({
                    athleteId: entryData.athleteId,
                    athleteName: entryData.athleteName,
                    error: err.message || 'Failed to save entry.',
                    details: err.code === 11000 ? "Duplicate entry." : (err.errors || null)
                });
            }
        }

        if (results.errors.length > 0) {
            // Partial success
            return res.status(207).json({
                message: `Bulk operation completed with ${results.created.length} successes and ${results.errors.length} failures.`,
                results
            });
        }
        res.status(201).json({ message: 'All entries created successfully.', results });

    } catch (error) {
        console.error("Error in bulk assessment entry:", error);
        res.status(500).json({ message: `Server error during bulk processing: ${error.message}` });
    }
};


// @desc    Get all entries for a specific batch
// @route   GET /api/batches/:batchId/entries
// @access  Private (TODO: Add auth)
const getEntriesForBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).json({ message: 'Invalid Batch ID format.' });
        }
        // TODO: Add pagination if list can be long
        const entries = await AssessmentEntry.find({ batchId })
            .populate('assessmentId', 'name') // Populate basic assessment info
            // .populate('enteredBy', 'name') // TODO
            .sort({ athleteName: 1, entryDate: 1 });
        res.status(200).json(entries);
    } catch (error) {
        console.error("Error fetching entries for batch:", error);
        res.status(500).json({ message: "Server error while fetching entries." });
    }
};

// @desc    Get all entries for a specific athlete (across all sessions/batches)
// @route   GET /api/athletes/:athleteId/entries
// @access  Private (TODO: Add auth or specific athlete access)
const getEntriesForAthlete = async (req, res) => {
    try {
        const { athleteId } = req.params; // This is the string ID (e.g. 'STUDENT_001')
        if (!athleteId) {
            return res.status(400).json({ message: 'Athlete ID is required.' });
        }

        const entries = await AssessmentEntry.find({ athleteId })
            .populate('batchId', 'title date')
            .populate('sessionId', 'name term year')
            .populate('assessmentId', 'name sport')
            .sort({ entryDate: -1 }); // Most recent first

        if (!entries || entries.length === 0) {
            return res.status(404).json({ message: 'No entries found for this athlete.' });
        }
        res.status(200).json(entries);
    } catch (error) {
        console.error("Error fetching entries for athlete:", error);
        res.status(500).json({ message: "Server error while fetching athlete entries." });
    }
};

// @desc    Get a single assessment entry by its ID
// @route   GET /api/entries/:entryId
// @access  Private
const getAssessmentEntryById = async (req, res) => {
    try {
        const { entryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(entryId)) {
            return res.status(400).json({ message: 'Invalid Entry ID format.' });
        }
        const entry = await AssessmentEntry.findById(entryId)
            .populate('batchId', 'title assessmentId') // Include assessmentId from batch for context
            .populate('assessmentId', 'name parameters'); // Include parameters from assessment template

        if (!entry) {
            return res.status(404).json({ message: 'Assessment entry not found.' });
        }
        res.status(200).json(entry);
    } catch (error) {
        console.error("Error fetching assessment entry by ID:", error);
        res.status(500).json({ message: "Server error while fetching entry." });
    }
};


// @desc    Update a specific assessment entry
// @route   PUT /api/entries/:entryId
// @access  Private (TODO: Add auth)
const updateAssessmentEntry = async (req, res) => {
    try {
        const { entryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(entryId)) {
            return res.status(400).json({ message: 'Invalid Entry ID format.' });
        }

        const entry = await AssessmentEntry.findById(entryId);
        if (!entry) {
            return res.status(404).json({ message: 'Assessment entry not found.' });
        }

        // TODO: Check if batch is published/locked before allowing updates.
        // const parentBatch = await Batch.findById(entry.batchId);
        // if (parentBatch && parentBatch.status === 'Published') {
        //     return res.status(400).json({ message: 'Cannot update entry for a published batch.' });
        // }

        const { athleteAge, athleteGender, entryDate, data, notes } = req.body; // Only allow certain fields to be updated

        if (athleteAge !== undefined) entry.athleteAge = athleteAge;
        if (athleteGender !== undefined) entry.athleteGender = athleteGender;
        if (entryDate !== undefined) entry.entryDate = entryDate;

        if (data && Array.isArray(data)) {
            // Need to validate this data again against the original assessment template
            const validatedData = await validateParameterData(entry.assessmentId, data);
            entry.data = validatedData;
        }

        // entry.lastModifiedBy = req.user.id; // TODO

        // If scores/bands were set, an update to raw data should clear them or trigger recalculation
        // For now, let's assume they will be recalculated by Section 4/5 logic.
        // entry.data.forEach(d => { d.zScore = undefined; d.percentile = undefined; d.band = undefined; });
        // entry.overallScore = undefined; entry.overallBand = undefined;

        const updatedEntry = await entry.save();
        res.status(200).json(updatedEntry);

    } catch (error) {
        console.error("Error updating assessment entry:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


// @desc    Delete a specific assessment entry
// @route   DELETE /api/entries/:entryId
// @access  Private (TODO: Add auth)
const deleteAssessmentEntry = async (req, res) => {
    try {
        const { entryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(entryId)) {
            return res.status(400).json({ message: 'Invalid Entry ID format.' });
        }

        const entry = await AssessmentEntry.findById(entryId);
        if (!entry) {
            return res.status(404).json({ message: 'Assessment entry not found.' });
        }

        // TODO: Check if batch is published/locked.
        // const parentBatch = await Batch.findById(entry.batchId);
        // if (parentBatch && parentBatch.status === 'Published') {
        //     return res.status(400).json({ message: 'Cannot delete entry from a published batch.' });
        // }

        await entry.remove();
        res.status(200).json({ message: 'Assessment entry removed successfully.' });

    } catch (error) {
        console.error("Error deleting assessment entry:", error);
        res.status(500).json({ message: "Server error while deleting entry." });
    }
};


module.exports = {
    createAssessmentEntry,
    createBulkAssessmentEntries,
    getEntriesForBatch,
    getEntriesForAthlete,
    getAssessmentEntryById,
    updateAssessmentEntry,
    deleteAssessmentEntry,
};
