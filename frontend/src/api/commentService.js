import axios from 'axios';

// TODO: Add getAuthHeaders() if/when auth is implemented

/**
 * Creates a new comment on an assessment entry.
 * @param {string} assessmentEntryId - The ID of the assessment entry.
 * @param {object} commentData - The comment data.
 * @param {string} commentData.text - The text of the comment.
 * @param {string} [commentData.parentCommentId] - Optional ID of the parent comment for replies.
 * @returns {Promise<object>} - The created comment object.
 */
export const createComment = async (assessmentEntryId, commentData) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.post(`/api/assessment-entries/${assessmentEntryId}/comments`, commentData/*, config*/);
    return response.data;
};

/**
 * Fetches all comments for a specific assessment entry.
 * @param {string} assessmentEntryId - The ID of the assessment entry.
 * @returns {Promise<Array>} - An array of comment objects.
 */
export const getCommentsForEntry = async (assessmentEntryId) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.get(`/api/assessment-entries/${assessmentEntryId}/comments`/*, config*/);
    return response.data; // Expected to be a flat list of comments
};

/**
 * Updates an existing comment.
 * @param {string} commentId - The ID of the comment to update.
 * @param {object} updateData - The data to update (e.g., { text: "new text" }).
 * @returns {Promise<object>} - The updated comment object.
 */
export const updateComment = async (commentId, updateData) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.put(`/api/comments/${commentId}`, updateData/*, config*/);
    return response.data;
};

/**
 * Deletes a comment (soft delete).
 * @param {string} commentId - The ID of the comment to delete.
 * @returns {Promise<object>} - The response from the server (e.g., { message: "Comment deleted" }).
 */
export const deleteComment = async (commentId) => {
    // const config = { headers: getAuthHeaders() };
    const response = await axios.delete(`/api/comments/${commentId}`/*, config*/);
    return response.data;
};

const commentService = {
    createComment,
    getCommentsForEntry,
    updateComment,
    deleteComment,
};

export default commentService;
