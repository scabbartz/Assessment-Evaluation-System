const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Minimal student schema for now, can be expanded or referenced from a full Student model later
const studentIdentifierSchema = new Schema({
    studentId: { type: String, required: true, trim: true }, // Could be a unique ID from an external system
    name: { type: String, required: true, trim: true },
    // Add other essential identifiers if needed, e.g., grade, schoolId
}, { _id: false }); // Don't create a separate _id for this sub-document by default if it's just an identifier

const sessionSchema = new Schema({
    year: { type: String, required: true, trim: true, match: [/^\d{4}-\d{4}$/, 'Year must be in YYYY-YYYY format (e.g., 2023-2024)'] }, // E.g., "2023-2024"
    term: { type: String, required: true, trim: true }, // E.g., "Term 1", "Annual Camp", "Fall Semester"
    name: { type: String, required: true, trim: true, unique: true }, // E.g., "Annual Junior Athletics Program 2023-2024 Term 1"
    description: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
        type: String,
        enum: ['upcoming', 'active', 'completed', 'archived'],
        default: 'upcoming'
    },
    // For 2.2 Student Roster Import:
    // Option 1: Embed basic student info (if students are not managed as separate complex entities yet)
    students: [studentIdentifierSchema],
    // Option 2: Reference student IDs (if you have a separate Student collection)
    // studentRefs: [{ type: Schema.Types.ObjectId, ref: 'Student' }],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Ensure a session name is unique
// sessionSchema.index({ name: 1 }, { unique: true }); // Alternative to unique:true in schema def
sessionSchema.index({ year: 1, term: 1, name: 1}, { unique: true }); // Combination for uniqueness

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
