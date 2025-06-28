const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing
const Schema = mongoose.Schema;

const userRoles = [
    'SuperAdmin',    // Full system control
    'SystemAdmin',   // Manages system settings, user accounts within their scope
    'ProgramAdmin',  // Manages programs, sessions, assessment templates within their scope
    'SchoolAdmin',   // Manages school-level data, users, coaches within their scope
    'Coach',         // Manages batches, enters data, views reports for their athletes/teams
    'Evaluator',     // Primarily enters assessment data
    'Athlete',       // Views personal reports, (future: interacts with portal)
    'User'           // Generic user, if roles are more granular or default
];

// Flexible scope structure. Can be adapted based on actual hierarchy.
// Example: A ProgramAdmin might have scope: { programId: 'prog123' }
// A SchoolAdmin: { schoolId: 'schoolABC' }
// A State-level Admin: { state: 'California' }
const scopeSchema = new Schema({
    level: { type: String, enum: ['System', 'State', 'District', 'Block', 'Panchayat', 'School', 'Program', 'Team', 'Individual'], required: true }, // Type of scope
    entityId: { type: String, trim: true }, // ID of the entity this scope refers to (e.g., schoolId, programId)
    // Additional hierarchical identifiers can be added as needed
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    // ... and so on for block, panchayat if that level of detail is needed.
}, { _id: false });


const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name.'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email.'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address.'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please provide a password.'],
        minlength: [6, 'Password must be at least 6 characters long.'],
        select: false // Do not return password by default in queries
    },
    role: {
        type: String,
        enum: userRoles,
        required: [true, 'Please assign a role to the user.'],
        default: 'User' // Or a more restrictive default like 'Athlete' if self-registration is for them
    },
    scopes: [scopeSchema], // An array of scopes, user might have multiple responsibilities
    isActive: { // To enable/disable user accounts
        type: Boolean,
        default: true
    },
    isVerified: { // For email verification if implemented
        type: Boolean,
        default: false // Or true if verification is not immediate
    },
    // verificationToken: String, // For email verification process
    // passwordResetToken: String,
    // passwordResetExpires: Date,
    lastLogin: {
        type: Date
    },
    // createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Who created this user account
    // preferences: { type: Schema.Types.Mixed } // For user-specific UI preferences etc.
}, { timestamps: true });


// Middleware: Hash password before saving user
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method: Compare entered password with hashed password in DB
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method: Generate JWT (Placeholder - Actual JWT generation will be in controller or utility)
// userSchema.methods.getSignedJwtToken = function() {
//     return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
//         expiresIn: process.env.JWT_EXPIRE
//     });
// };


const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.userRoles = userRoles; // Exporting roles array for use elsewhere (e.g. validation)
