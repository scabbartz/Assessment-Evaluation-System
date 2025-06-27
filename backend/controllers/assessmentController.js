const Assessment = require('../models/AssessmentModel');
const mongoose = require('mongoose');

// --- Assessment Controllers ---

// @desc    Create a new assessment
// @route   POST /api/assessments
// @access  Private (TODO: Add auth middleware)
const createAssessment = async (req, res) => {
    try {
        const { name, description, sport, ageGroup, gender, category, benchmarkMode, parameters } = req.body;
        // TODO: Add validation for required fields

        const assessment = new Assessment({
            name,
            description,
            sport,
            ageGroup,
            gender,
            category,
            benchmarkMode,
            parameters: parameters || [], // Ensure parameters is an array
            // createdBy: req.user.id // TODO: Uncomment when auth is implemented
        });

        const createdAssessment = await assessment.save();
        res.status(201).json(createdAssessment);
    } catch (error) {
        console.error("Error creating assessment:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: "Server error while creating assessment" });
    }
};

// @desc    Get all assessments
// @route   GET /api/assessments
// @access  Private (TODO: Add auth middleware)
const getAssessments = async (req, res) => {
    try {
        const assessments = await Assessment.find({}) //.populate('createdBy', 'name'); // TODO: Populate user
        res.status(200).json(assessments);
    } catch (error) {
        console.error("Error fetching assessments:", error);
        res.status(500).json({ message: "Server error while fetching assessments" });
    }
};

// @desc    Get a single assessment by ID
// @route   GET /api/assessments/:id
// @access  Private (TODO: Add auth middleware)
const getAssessmentById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Assessment ID format' });
        }
        const assessment = await Assessment.findById(req.params.id);

        if (assessment) {
            res.status(200).json(assessment);
        } else {
            res.status(404).json({ message: 'Assessment not found' });
        }
    } catch (error) {
        console.error("Error fetching assessment by ID:", error);
        res.status(500).json({ message: "Server error while fetching assessment" });
    }
};

// @desc    Update an assessment
// @route   PUT /api/assessments/:id
// @access  Private (TODO: Add auth middleware)
const updateAssessment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Assessment ID format' });
        }
        const { name, description, sport, ageGroup, gender, category, benchmarkMode, status, parameters } = req.body;

        const assessment = await Assessment.findById(req.params.id);

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        assessment.name = name || assessment.name;
        assessment.description = description || assessment.description;
        assessment.sport = sport || assessment.sport;
        assessment.ageGroup = ageGroup || assessment.ageGroup;
        assessment.gender = gender || assessment.gender;
        assessment.category = category || assessment.category;
        assessment.benchmarkMode = benchmarkMode || assessment.benchmarkMode;
        assessment.status = status || assessment.status;
        // assessment.updatedBy = req.user.id; // TODO: Uncomment when auth is implemented
        assessment.version = assessment.version + 1; // Increment version on update

        // For parameters, a full replace is simpler for now.
        // More granular updates (add/remove/update specific param) can be done via dedicated parameter routes.
        if (parameters) {
            assessment.parameters = parameters;
        }

        const updatedAssessment = await assessment.save();
        res.status(200).json(updatedAssessment);
    } catch (error) {
        console.error("Error updating assessment:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: "Server error while updating assessment" });
    }
};

// @desc    Delete an assessment
// @route   DELETE /api/assessments/:id
// @access  Private (TODO: Add auth middleware)
const deleteAssessment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Assessment ID format' });
        }
        const assessment = await Assessment.findById(req.params.id);

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        await assessment.remove();
        res.status(200).json({ message: 'Assessment removed' });
    } catch (error) {
        console.error("Error deleting assessment:", error);
        res.status(500).json({ message: "Server error while deleting assessment" });
    }
};

// @desc    Clone an assessment
// @route   POST /api/assessments/:id/clone
// @access  Private (TODO: Add auth middleware)
const cloneAssessment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Assessment ID format' });
        }
        const originalAssessment = await Assessment.findById(req.params.id);

        if (!originalAssessment) {
            return res.status(404).json({ message: 'Original assessment not found' });
        }

        const clonedAssessmentInstance = await originalAssessment.clone();
        // clonedAssessmentInstance.createdBy = req.user.id; // TODO: Uncomment when auth is implemented

        const savedClonedAssessment = await clonedAssessmentInstance.save();
        res.status(201).json(savedClonedAssessment);
    } catch (error) {
        console.error("Error cloning assessment:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: "Server error while cloning assessment" });
    }
};


// --- Parameter Controllers (Nested under Assessment) ---

// @desc    Add a parameter to an assessment
// @route   POST /api/assessments/:assessmentId/parameters
// @access  Private (TODO: Add auth middleware)
const addParameterToAssessment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.assessmentId)) {
            return res.status(400).json({ message: 'Invalid Assessment ID format' });
        }
        const { name, unit, tag, type, customBands, description, scoringDetails } = req.body;
        // TODO: Add validation

        const assessment = await Assessment.findById(req.params.assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const newParameter = {
            name,
            unit,
            tag,
            type,
            customBands: customBands || [],
            description,
            scoringDetails
        };

        assessment.parameters.push(newParameter);
        assessment.version = assessment.version + 1;
        // assessment.updatedBy = req.user.id; // TODO: Uncomment when auth is implemented

        await assessment.save();
        // Return the newly added parameter, it will have an _id assigned by MongoDB
        const addedParam = assessment.parameters[assessment.parameters.length - 1];
        res.status(201).json(addedParam);
    } catch (error) {
        console.error("Error adding parameter:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: "Server error while adding parameter" });
    }
};

// @desc    Get all parameters for an assessment
// @route   GET /api/assessments/:assessmentId/parameters
// @access  Private (TODO: Add auth middleware)
const getParametersForAssessment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.assessmentId)) {
            return res.status(400).json({ message: 'Invalid Assessment ID format' });
        }
        const assessment = await Assessment.findById(req.params.assessmentId).select('parameters');
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }
        res.status(200).json(assessment.parameters);
    } catch (error) {
        console.error("Error fetching parameters:", error);
        res.status(500).json({ message: "Server error while fetching parameters" });
    }
};

// @desc    Update a parameter within an assessment
// @route   PUT /api/assessments/:assessmentId/parameters/:paramId
// @access  Private (TODO: Add auth middleware)
const updateParameterInAssessment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.assessmentId)) {
            return res.status(400).json({ message: 'Invalid Assessment ID format' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.paramId)) {
            return res.status(400).json({ message: 'Invalid Parameter ID format' });
        }

        const assessment = await Assessment.findById(req.params.assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const parameter = assessment.parameters.id(req.params.paramId);
        if (!parameter) {
            return res.status(404).json({ message: 'Parameter not found' });
        }

        const { name, unit, tag, type, customBands, description, scoringDetails } = req.body;

        parameter.name = name || parameter.name;
        parameter.unit = unit || parameter.unit;
        parameter.tag = tag || parameter.tag;
        parameter.type = type || parameter.type;
        parameter.customBands = customBands || parameter.customBands;
        parameter.description = description || parameter.description;
        parameter.scoringDetails = scoringDetails || parameter.scoringDetails;

        assessment.version = assessment.version + 1;
        // assessment.updatedBy = req.user.id; // TODO: Uncomment when auth is implemented

        await assessment.save();
        res.status(200).json(parameter);
    } catch (error) {
        console.error("Error updating parameter:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: "Server error while updating parameter" });
    }
};

// @desc    Delete a parameter from an assessment
// @route   DELETE /api/assessments/:assessmentId/parameters/:paramId
// @access  Private (TODO: Add auth middleware)
const deleteParameterFromAssessment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.assessmentId)) {
            return res.status(400).json({ message: 'Invalid Assessment ID format' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.paramId)) {
            return res.status(400).json({ message: 'Invalid Parameter ID format' });
        }

        const assessment = await Assessment.findById(req.params.assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const parameter = assessment.parameters.id(req.params.paramId);
        if (!parameter) {
            return res.status(404).json({ message: 'Parameter not found' });
        }

        parameter.remove(); // Mongoose subdocument remove
        assessment.version = assessment.version + 1;
        // assessment.updatedBy = req.user.id; // TODO: Uncomment when auth is implemented

        await assessment.save();
        res.status(200).json({ message: 'Parameter removed' });
    } catch (error) {
        console.error("Error deleting parameter:", error);
        res.status(500).json({ message: "Server error while deleting parameter" });
    }
};


module.exports = {
    createAssessment,
    getAssessments,
    getAssessmentById,
    updateAssessment,
    deleteAssessment,
    cloneAssessment,
    addParameterToAssessment,
    getParametersForAssessment,
    updateParameterInAssessment,
    deleteParameterFromAssessment,
};
