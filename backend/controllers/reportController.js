const AssessmentEntry = require('../models/AssessmentEntryModel');
const Session = require('../models/SessionModel');
const Batch = require('../models/BatchModel');
const Assessment = require('../models/AssessmentModel');
const mongoose = require('mongoose');

/**
 * @desc    Get data for an individual athlete's report
 * @route   GET /api/reports/individual/:athleteId
 * @access  Private (Requires authentication and authorization based on user role and relation to athlete)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getIndividualAthleteReport = async (req, res) => {
    const { athleteId } = req.params; // This is the string athleteId (e.g., 'STUDENT_001')

    if (!athleteId) {
        return res.status(400).json({ message: 'Athlete ID is required.' });
    }

    try {
        const entries = await AssessmentEntry.find({ athleteId })
            .populate('sessionId', 'name year term')
            .populate('batchId', 'title date')
            .populate({
                path: 'assessmentId',
                select: 'name sport parameters.name parameters.unit parameters._id', // Select specific fields from assessment and its parameters
            })
            .sort({ entryDate: -1 }); // Most recent first

        if (!entries || entries.length === 0) {
            return res.status(404).json({ message: 'No assessment entries found for this athlete.' });
        }

        // TODO: Implement "best-of attempts" logic here if multiple attempts per assessment are stored.
        // For now, we return all entries. User can filter/interpret on frontend or this logic can be added.
        // Example: Group entries by batch/assessment and pick the one with isBestAttempt=true or highest score.

        // Placeholder for sport recommendations
        const sportRecommendations = ["Placeholder: Sport A (based on scores)", "Placeholder: Sport B"];

        res.status(200).json({
            athleteId,
            entries, // Contains raw values, zScores, percentiles, bands per parameter
            // TODO: Add summary statistics if needed (e.g., average zScore across all assessments)
            sportRecommendations, // Placeholder
        });

    } catch (error) {
        console.error(`Error fetching individual athlete report for ${athleteId}:`, error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


/**
 * @desc    Get data for cohort analytics (e.g., for a session or batch)
 * @route   GET /api/reports/cohort/session/:sessionId
 * @access  Private (Requires authentication and authorization, e.g., for Coaches, Admins)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getCohortAnalyticsReport = async (req, res) => {
    const { sessionId } = req.params;
    // Could also add filters like assessmentId, batchId via req.query

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ message: 'Invalid Session ID format.' });
    }

    try {
        const session = await Session.findById(sessionId).select('name year term');
        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        // Fetch all entries for the session
        const entries = await AssessmentEntry.find({ sessionId })
            .populate('assessmentId', 'name parameters._id parameters.name') // For parameter names
            .select('assessmentId data athleteAge athleteGender'); // Select only needed fields

        if (!entries || entries.length === 0) {
            return res.status(200).json({ session, message: 'No entries found in this session for cohort analysis.', cohortData: {} });
        }

        // --- Basic Aggregation Logic (Placeholder - to be expanded) ---
        const cohortData = {
            totalAthletes: new Set(entries.map(e => e.athleteId)).size, // Unique athletes
            totalEntries: entries.length,
            parameterStats: {}, // Keyed by parameterId
        };

        // Aggregate stats per parameter
        for (const entry of entries) {
            if (!entry.assessmentId || !entry.assessmentId.parameters) continue;

            for (const paramData of entry.data) {
                if (paramData.value === null || paramData.value === undefined) continue;

                const paramIdStr = paramData.parameterId.toString();
                const assessmentParam = entry.assessmentId.parameters.find(p => p._id.equals(paramData.parameterId));
                const paramName = assessmentParam ? assessmentParam.name : 'Unknown Parameter';

                if (!cohortData.parameterStats[paramIdStr]) {
                    cohortData.parameterStats[paramIdStr] = {
                        parameterName: paramName,
                        values: [],
                        zScores: [],
                        // TODO: Add distributions for bands, etc.
                    };
                }
                if (typeof paramData.value === 'number') cohortData.parameterStats[paramIdStr].values.push(paramData.value);
                if (typeof paramData.zScore === 'number') cohortData.parameterStats[paramIdStr].zScores.push(paramData.zScore);
            }
        }

        // Calculate averages for the cohort (example)
        for (const paramIdStr in cohortData.parameterStats) {
            const stats = cohortData.parameterStats[paramIdStr];
            if (stats.values.length > 0) {
                stats.averageValue = parseFloat((stats.values.reduce((a, b) => a + b, 0) / stats.values.length).toFixed(2));
            }
            if (stats.zScores.length > 0) {
                stats.averageZScore = parseFloat((stats.zScores.reduce((a, b) => a + b, 0) / stats.zScores.length).toFixed(2));
            }
            // Remove raw values arrays from response if they are too large or not needed directly by charts
            // delete stats.values;
            // delete stats.zScores;
        }

        res.status(200).json({
            session,
            cohortData,
            // TODO: Add data formatted for specific chart types (bar, line, radar)
        });

    } catch (error) {
        console.error(`Error fetching cohort analytics for session ${sessionId}:`, error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


// --- Export Placeholders ---

/**
 * @desc    Export Individual Report as PDF (Placeholder)
 * @route   GET /api/reports/individual/:athleteId/export/pdf
 * @access  Private
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const exportIndividualReportPDF = async (req, res) => {
    const { athleteId } = req.params;
    // TODO: Implement actual PDF generation using a library like pdfmake, puppeteer, or similar
    res.status(200).json({ message: `PDF export for athlete ${athleteId} - Not Implemented Yet.` });
};

/**
 * @desc    Export Individual Report as CSV (Placeholder)
 * @route   GET /api/reports/individual/:athleteId/export/csv
 * @access  Private
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const exportIndividualReportCSV = async (req, res) => {
    const { athleteId } = req.params;
    // TODO: Implement actual CSV generation (fetch data, format as CSV string/file)
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=individual_report_${athleteId}.csv`);
    res.status(200).send(`AthleteID,Date,Assessment,Parameter,Value,ZScore,Band\nPlaceholder1,2023-01-01,TestAssessment,Sprint,10,1.0,Excellent`);
};

/**
 * @desc    Export Cohort Report as PDF (Placeholder)
 * @route   GET /api/reports/cohort/session/:sessionId/export/pdf
 * @access  Private
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const exportCohortReportPDF = async (req, res) => {
    const { sessionId } = req.params;
    res.status(200).json({ message: `PDF export for session cohort ${sessionId} - Not Implemented Yet.` });
};

/**
 * @desc    Export Cohort Report as CSV (Placeholder)
 * @route   GET /api/reports/cohort/session/:sessionId/export/csv
 * @access  Private
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const exportCohortReportCSV = async (req, res) => {
    const { sessionId } = req.params;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cohort_report_session_${sessionId}.csv`);
    res.status(200).send(`Parameter,AverageValue,AverageZScore\nPlaceholderSprint,10.5,0.5`);
};


module.exports = {
    getIndividualAthleteReport,
    getCohortAnalyticsReport,
    exportIndividualReportPDF,
    exportIndividualReportCSV,
    exportCohortReportPDF,
    exportCohortReportCSV,
};
