const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    assessmentEntryId: { // The specific result set this comment pertains to
        type: Schema.Types.ObjectId,
        ref: 'AssessmentEntry',
        required: true,
        index: true
    },
    athleteId: { // Denormalized for easier querying of comments related to an athlete
        type: String, // Assuming athleteId is the string identifier used in AssessmentEntry
        required: true,
        index: true
    },
    userId: { // User who made the comment (e.g., coach, admin)
        type: Schema.Types.ObjectId,
        ref: 'User', // Assuming a User model will exist
        required: true
    },
    userName: { // Denormalized for display convenience
        type: String,
        required: true
    },
    text: {
        type: String,
        required: [true, 'Comment text cannot be empty.'],
        trim: true,
        maxlength: [2000, 'Comment text cannot exceed 2000 characters.']
    },
    parentCommentId: { // For threaded replies
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        default: null // null indicates a top-level comment
    },
    // We can also store likes, flags, etc. if needed in the future
    // likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isEdited: {
        type: Boolean,
        default: false
    },
    isDeleted: { // Soft delete flag
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// To fetch replies efficiently, though client-side handling might also work for nesting
// commentSchema.virtual('replies', {
//   ref: 'Comment',
//   localField: '_id',
//   foreignField: 'parentCommentId'
// });

// Ensure that only non-deleted comments are usually fetched by default
commentSchema.pre('find', function() {
    this.where({ isDeleted: false });
});
commentSchema.pre('findOne', function() {
    this.where({ isDeleted: false });
});
// Note: For admin views that need to see deleted comments, a separate query or flag would be needed.


const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
