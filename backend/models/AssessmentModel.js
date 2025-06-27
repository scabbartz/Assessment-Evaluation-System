const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const parameterSchema = new Schema({
    name: { type: String, required: true },
    unit: {
        type: String,
        enum: ['cm', 's', 'reps', 'kg', 'm', 'score', 'text', '%', 'rating', 'level', 'px', 'bpm', 'mmhg', 'lbs'], // Added more units based on potential needs
        required: true
    },
    tag: {
        type: String,
        enum: ['Strength', 'Agility', 'Endurance', 'Skill', 'Power', 'Speed', 'Flexibility', 'Cognitive', 'Body Composition', 'Tactical', 'Psychological'], // Added more tags
        required: true
    },
    type: {
        type: String,
        enum: ['numeric', 'time', 'text', 'rating', 'choice'], // Added rating & choice
        required: true
    },
    // Example: [{ name: 'Excellent', min: 80, max: 100, value: 5 }, { name: 'Good', min: 60, max: 79, value: 4 }]
    // For 'choice' type, customBands could be [{name: 'Option A', value: 'A'}, {name: 'Option B', value: 'B'}]
    customBands: [{
        name: { type: String, required: true },
        value: { type: Schema.Types.Mixed }, // Can be a score, a category, etc.
        min: { type: Number },
        max: { type: Number },
        description: { type: String }
    }],
    description: { type: String },
    scoringDetails: { // For more complex scoring if needed later
        weight: { type: Number, default: 1 },
        direction: { type: String, enum: ['higher_is_better', 'lower_is_better', 'nominal'], default: 'higher_is_better'}
    }
}, { timestamps: true });

const assessmentSchema = new Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    sport: { type: String, required: true, trim: true },
    // Consider making ageGroup more flexible, e.g., array of strings or minAge/maxAge
    ageGroup: { type: String, trim: true }, // E.g., "U12", "U14-U16", "Senior"
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Co-ed', 'Other', 'Not Specified'],
        default: 'Not Specified'
    },
    // 'unit' at Assessment level might be a general unit if all params share it, or removed if params define their own.
    // category could be e.g., "Physical Fitness", "Technical Skill", "Game Performance"
    category: { type: String, trim: true },
    benchmarkMode: {
        type: String,
        enum: ['manual', 'auto', 'hybrid'],
        default: 'manual'
    },
    version: { type: Number, default: 1 },
    status: {
        type: String,
        enum: ['draft', 'active', 'archived'],
        default: 'draft'
    },
    parameters: [parameterSchema], // Embedding parameters directly
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Assuming a User model later
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Method to clone an assessment
assessmentSchema.methods.clone = async function() {
    const newAssessmentData = this.toObject();
    delete newAssessmentData._id; // Remove old ID
    delete newAssessmentData.createdAt;
    delete newAssessmentData.updatedAt;
    newAssessmentData.name = `${this.name} (Clone)`; // Mark as clone
    newAssessmentData.version = 1; // Reset version or increment from original's latest
    newAssessmentData.status = 'draft'; // Cloned assessments are drafts

    // Deep copy parameters to ensure they get new _ids if embedded
    if (newAssessmentData.parameters && newAssessmentData.parameters.length > 0) {
        newAssessmentData.parameters = newAssessmentData.parameters.map(param => {
            const newParam = { ...param };
            delete newParam._id; // Ensure new sub-document ID if your ODM creates them automatically upon saving parent
            return newParam;
        });
    }

    const ClonedAssessment = mongoose.model('Assessment'); // Use the same model
    return new ClonedAssessment(newAssessmentData);
};

const Assessment = mongoose.model('Assessment', assessmentSchema);
// We don't need a separate Parameter model if it's always embedded.
// If Parameters can exist independently or be reused, then a separate model and referencing is better.
// For now, embedding as per "nested CRUD API and UI for Parameters under each Assessment".

module.exports = Assessment;
