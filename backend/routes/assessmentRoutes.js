const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/assessmentController');

// TODO: Add protect and admin/authorize middleware for relevant routes later
// const { protect, authorize } = require('../middleware/authMiddleware');

// Assessment Routes
router.route('/')
    .post(createAssessment) // TODO: Add protect, authorize(['SystemAdmin', 'ProgramAdmin'])
    .get(getAssessments);   // TODO: Add protect

router.route('/:id')
    .get(getAssessmentById)     // TODO: Add protect
    .put(updateAssessment)      // TODO: Add protect, authorize(['SystemAdmin', 'ProgramAdmin'])
    .delete(deleteAssessment);  // TODO: Add protect, authorize(['SystemAdmin', 'ProgramAdmin'])

router.route('/:id/clone')
    .post(cloneAssessment);     // TODO: Add protect, authorize(['SystemAdmin', 'ProgramAdmin'])

// Nested Parameter Routes
router.route('/:assessmentId/parameters')
    .post(addParameterToAssessment)       // TODO: Add protect, authorize(['SystemAdmin', 'ProgramAdmin'])
    .get(getParametersForAssessment);     // TODO: Add protect

router.route('/:assessmentId/parameters/:paramId')
    .put(updateParameterInAssessment)     // TODO: Add protect, authorize(['SystemAdmin', 'ProgramAdmin'])
    .delete(deleteParameterFromAssessment); // TODO: Add protect, authorize(['SystemAdmin', 'ProgramAdmin'])

module.exports = router;
