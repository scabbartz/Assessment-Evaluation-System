const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Structure for individual parameter data within an entry
const parameterDataSchema = new Schema({
    parameterId: { type: Schema.Types.ObjectId, ref: 'Assessment.parameters', required: true }, // Refers to the specific parameter in the Assessment template
    parameterName: { type: String, required: true }, // Denormalized for easier display
    value: { type: Schema.Types.Mixed, required: true }, // Can be number, string (for text type), time (store as seconds or ISO string)
    unit: { type: String }, // Denormalized unit from parameter for context

    // Fields to be populated by Normalization & Scoring (Section 5)
    rawValue: { type: Schema.Types.Mixed }, // Store the original value if 'value' gets transformed (e.g. time to seconds)
    zScore: { type: Number },
    percentile: { type: Number }, // Percentile rank within the cohort (0-100)
    band: { type: String }, // E.g., Excellent, Needs Improvement
    notes: {type: String } // Optional notes for this specific parameter entry
}, { _id: false });


const assessmentEntrySchema = new Schema({
    batchId: {
        type: Schema.Types.ObjectId,
        ref: 'Batch',
        required: true,
        index: true
    },
    sessionId: { // Denormalized from Batch for easier querying of all entries in a session
        type: Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
        index: true
    },
    assessmentId: { // Denormalized from Batch, the actual assessment template used
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true,
        index: true
    },
    // Athlete Information - For now, directly embedded.
    // Could be a ref to a global Athlete model if athletes are managed centrally.
    athleteId: { type: String, required: true, trim: true, index: true }, // Unique system ID for the athlete
    athleteName: { type: String, required: true, trim: true },
    athleteAge: { type: Number }, // Age at the time of assessment
    athleteGender: { type: String, enum: ['Male', 'Female', 'Other', 'Not Specified'] },
    // Consider adding athleteDateOfBirth for more accurate age calculation if needed.

    entryDate: { type: Date, default: Date.now }, // Date data was recorded/entered

    data: [parameterDataSchema], // Array of data for each parameter in the assessment

    // Optional: to track who entered/modified the data
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Optional: for multiple attempts if allowed by assessment design
    attemptNumber: { type: Number, default: 1 },
    isBestAttempt: { type: Boolean, default: true }, // Logic needed to manage this if multiple attempts

    overallScore: { type: Number }, // If a composite score is calculated
    overallBand: { type: String },  // If an overall band is assigned

}, { timestamps: true });

// Compound index for ensuring uniqueness of an entry for an athlete in a batch for a specific attempt (if applicable)
// assessmentEntrySchema.index({ batchId: 1, athleteId: 1, attemptNumber: 1 }, { unique: true });
// Or simply, one entry per athlete per batch, if attempts are handled differently or not at all initially.
assessmentEntrySchema.index({ batchId: 1, athleteId: 1 }, { unique: true, partialFilterExpression: { attemptNumber: 1 } }); // Unique for first attempt


// Pre-save hook to denormalize sessionId and assessmentId from the batch if not provided directly
assessmentEntrySchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('batchId')) {
        if (this.batchId && (!this.sessionId || !this.assessmentId)) {
            try {
                const Batch = mongoose.model('Batch'); // Avoid circular dependency issues at model definition time
                const batch = await Batch.findById(this.batchId).select('sessionId assessmentId');
                if (batch) {
                    if (!this.sessionId) this.sessionId = batch.sessionId;
                    if (!this.assessmentId) this.assessmentId = batch.assessmentId;
                } else if (!this.sessionId || !this.assessmentId) {
                    // Only throw error if essential fields cannot be derived and are not provided
                    return next(new Error('Could not find batch to denormalize sessionId or assessmentId, and they were not provided.'));
                }
            } catch (error) {
                return next(error);
            }
        }
    }
    // Ensure rawValue is set if not explicitly provided
    this.data.forEach(paramData => {
        if (paramData.value !== undefined && paramData.rawValue === undefined) {
            paramData.rawValue = paramData.value;
        }
    });
    next();
});


const AssessmentEntry = mongoose.model('AssessmentEntry', assessmentEntrySchema);

module.exports = AssessmentEntry;
