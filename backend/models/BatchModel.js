const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Re-using studentIdentifierSchema or a similar structure for students assigned to a batch
const studentIdentifierSchema = new Schema({
    studentId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    // Any other batch-specific student info if needed
}, { _id: false });

// Instructor identifier (can be expanded or linked to User model)
const instructorIdentifierSchema = new Schema({
    instructorId: { type: String, required: true }, // Could be UserId or an employee ID
    name: { type: String, required: true },
    type: { type: String, enum: ['real', 'virtual'], default: 'real' } // As per 2.4
}, { _id: false });

const batchSchema = new Schema({
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
        index: true
    },
    title: { type: String, required: true, trim: true }, // E.g., "Morning Group A", "U12 Sprints - Batch 1"
    assessmentId: { // The assessment template to be used for this batch
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
        // required: true // May not be required immediately on batch creation, but needed for data entry
    },
    maxStudents: { type: Number, min: 1 },
    venue: { type: String, trim: true },
    date: { type: Date }, // Could also be startDate, endDate if a batch spans multiple days
    startTime: { type: String }, // E.g., "09:00"
    endTime: { type: String }, // E.g., "12:00"

    // 2.4 Instructor Assignment
    instructors: [instructorIdentifierSchema], // Array of assigned instructors

    // Students assigned to this specific batch (subset of Session's students)
    students: [studentIdentifierSchema],

    // 2.5 Batch Workflow
    status: {
        type: String,
        enum: ['Draft', 'In Progress', 'Finished', 'Published', 'Cancelled'],
        default: 'Draft'
    },
    // resultsCalculated: { type: Boolean, default: false }, // Flag for "Calculate Results" action
    // publishedAt: { type: Date }, // Timestamp for "Publish" action

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index to quickly find batches for a session
// Covered by sessionId having index: true

// Index for unique batch titles within a session (optional, depending on requirements)
batchSchema.index({ sessionId: 1, title: 1 }, { unique: true });

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
