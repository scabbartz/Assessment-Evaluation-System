const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const benchmarkSchema = new Schema({
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    assessmentId: { // The specific assessment template these benchmarks are for
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true
    },
    parameterId: { // The specific parameter within the assessment these benchmarks apply to
        type: Schema.Types.ObjectId,
        // ref: 'Assessment.parameters' // This ref path might be tricky with Mongoose. Simpler to just store ObjectId.
        // We will ensure this ID corresponds to a parameter within the linked assessmentId via application logic.
        required: true
    },
    parameterName: { type: String, trim: true }, // Denormalized for convenience

    // Optional granularity for benchmarks, if they differ within the same session/assessment/parameter
    // For example, if benchmarks are calculated separately for "U12 Boys" vs "U14 Boys"
    ageGroup: { type: String, trim: true, default: null }, // Can be null if benchmark applies to all ages in session
    gender: { type: String, trim: true, default: null, enum: [null, 'Male', 'Female', 'Co-ed', 'Other', 'Not Specified'] }, // Can be null if benchmark applies to all genders

    mean: { type: Number, required: true },
    stdDev: { type: Number, required: true }, // Population standard deviation

    percentiles: { // Storing specific percentiles as requested
        p10: { type: Number }, // Example additional percentiles
        p25: { type: Number },
        p50: { type: Number }, // Median
        p75: { type: Number },
        p90: { type: Number }  // Example additional percentiles
    },

    count: { type: Number, required: true }, // Number of data points (entries) used for this calculation
    minObservedValue: { type: Number }, // Minimum observed value in the dataset
    maxObservedValue: { type: Number }, // Maximum observed value in the dataset

    lastCalculated: { type: Date, default: Date.now },
    // Could add a version or hash of input data if benchmarks need to be versioned explicitly
    // createdBy: { type: Schema.Types.ObjectId, ref: 'User' } // User/system who triggered calculation
}, { timestamps: true });

// Compound index to ensure uniqueness for a given parameter's benchmark within a session,
// considering optional age/gender stratification.
// Null values for ageGroup/gender mean the benchmark is general for that parameter in the session.
benchmarkSchema.index(
    { sessionId: 1, assessmentId: 1, parameterId: 1, ageGroup: 1, gender: 1 },
    { unique: true, name: "unique_benchmark_granularity" }
);

// Index for querying benchmarks quickly by session and assessment
benchmarkSchema.index({ sessionId: 1, assessmentId: 1 });


const Benchmark = mongoose.model('Benchmark', benchmarkSchema);

module.exports = Benchmark;
