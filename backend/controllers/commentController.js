const Comment = require('../models/CommentModel');
const AssessmentEntry = require('../models/AssessmentEntryModel'); // To ensure entry exists
const mongoose = require('mongoose');

// @desc    Create a new comment on an assessment entry
// @route   POST /api/assessment-entries/:entryId/comments
// @access  Private (TODO: Authenticated users like coaches, admins)
const createComment = async (req, res) => {
    const { entryId } = req.params; // entryId refers to AssessmentEntry._id
    const { text, parentCommentId } = req.body;
    // const userId = req.user.id; // TODO: Get from authenticated user
    // const userName = req.user.name; // TODO: Get from authenticated user

    // --- TODO: Replace with actual user data once auth is implemented ---
    const userId = new mongoose.Types.ObjectId(); // Placeholder User ID
    const userName = "Placeholder User";
    // --- End of Placeholder ---

    if (!mongoose.Types.ObjectId.isValid(entryId)) {
        return res.status(400).json({ message: 'Invalid Assessment Entry ID format.' });
    }
    if (parentCommentId && !mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ message: 'Invalid Parent Comment ID format.' });
    }

    try {
        const assessmentEntry = await AssessmentEntry.findById(entryId).select('athleteId');
        if (!assessmentEntry) {
            return res.status(404).json({ message: 'Assessment entry not found.' });
        }

        if (parentCommentId) {
            const parent = await Comment.findById(parentCommentId);
            if (!parent || parent.assessmentEntryId.toString() !== entryId) {
                 return res.status(404).json({ message: 'Parent comment not found or does not belong to this assessment entry.' });
            }
        }

        const newComment = new Comment({
            assessmentEntryId: entryId,
            athleteId: assessmentEntry.athleteId, // Denormalize athleteId from the entry
            userId,
            userName,
            text,
            parentCommentId: parentCommentId || null
        });

        const savedComment = await newComment.save();
        // TODO: Populate user details if needed in response, for now userName is denormalized
        res.status(201).json(savedComment);

    } catch (error) {
        console.error("Error creating comment:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

// @desc    Get all comments for an assessment entry (hierarchical structure if possible)
// @route   GET /api/assessment-entries/:entryId/comments
// @access  Private (TODO: Users who can view the report)
const getCommentsForEntry = async (req, res) => {
    const { entryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(entryId)) {
        return res.status(400).json({ message: 'Invalid Assessment Entry ID format.' });
    }

    try {
        // Fetch all comments for the entry, sorted by creation date
        const comments = await Comment.find({ assessmentEntryId: entryId, isDeleted: false })
            // .populate('userId', 'name avatar') // TODO: Populate user details
            .sort({ createdAt: 'asc' }); // Fetch flat list, client can build hierarchy

        // TODO: Optionally, build a threaded/nested structure here if desired for the API response.
        // For now, returning a flat list is simpler and often sufficient.
        // Example of building hierarchy (can be complex and resource-intensive for deep threads):
        // const commentMap = {};
        // const nestedComments = [];
        // comments.forEach(comment => {
        //     commentMap[comment._id.toString()] = comment.toObject(); // Use .toObject() to allow adding replies array
        //     commentMap[comment._id.toString()].replies = [];
        // });
        // comments.forEach(comment => {
        //     if (comment.parentCommentId) {
        //         if(commentMap[comment.parentCommentId.toString()]) { // Check if parent exists (not deleted)
        //              commentMap[comment.parentCommentId.toString()].replies.push(commentMap[comment._id.toString()]);
        //         }
        //     } else {
        //         nestedComments.push(commentMap[comment._id.toString()]);
        //     }
        // });
        // res.status(200).json(nestedComments);

        res.status(200).json(comments); // Return flat list for now

    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

// @desc    Update a comment
// @route   PUT /api/comments/:commentId
// @access  Private (TODO: Owner of the comment or Admin)
const updateComment = async (req, res) => {
    const { commentId } = req.params;
    const { text } = req.body;
    // const userId = req.user.id; // TODO: Get from authenticated user

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ message: 'Invalid Comment ID format.' });
    }
    if (!text || text.trim() === '') {
        return res.status(400).json({ message: 'Comment text cannot be empty.' });
    }

    try {
        const comment = await Comment.findById(commentId);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        // TODO: Authorization check: Ensure req.user.id matches comment.userId or user is admin
        // if (comment.userId.toString() !== userId && !req.user.isAdmin) {
        //     return res.status(403).json({ message: 'User not authorized to update this comment.' });
        // }

        comment.text = text;
        comment.isEdited = true;
        const updatedComment = await comment.save();
        res.status(200).json(updatedComment);

    } catch (error) {
        console.error("Error updating comment:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

// @desc    Delete a comment (Soft delete)
// @route   DELETE /api/comments/:commentId
// @access  Private (TODO: Owner of the comment or Admin)
const deleteComment = async (req, res) => {
    const { commentId } = req.params;
    // const userId = req.user.id; // TODO: Get from authenticated user

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ message: 'Invalid Comment ID format.' });
    }

    try {
        const comment = await Comment.findById(commentId);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({ message: 'Comment not found or already deleted.' });
        }

        // TODO: Authorization check
        // if (comment.userId.toString() !== userId && !req.user.isAdmin) {
        //     return res.status(403).json({ message: 'User not authorized to delete this comment.' });
        // }

        comment.isDeleted = true;
        comment.deletedAt = new Date();
        comment.text = "[This comment has been deleted]"; // Optional: clear text or mark as deleted
        await comment.save();

        // TODO: Decide if replies to this comment should also be soft-deleted or handled differently.
        // For now, they will still point to this parentCommentId but might appear orphaned if not handled client-side.
        // Or, recursively delete/hide replies (can be complex).
        // await Comment.updateMany({ parentCommentId: commentId }, { isDeleted: true, deletedAt: new Date() });


        res.status(200).json({ message: 'Comment deleted successfully.' });

    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


module.exports = {
    createComment,
    getCommentsForEntry,
    updateComment,
    deleteComment,
};
