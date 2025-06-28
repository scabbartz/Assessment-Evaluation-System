import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import reportService from '../../api/reportService';
import commentService from '../../api/commentService'; // Import comment service

// Placeholder for a simple chart component wrapper
// import { Line } from 'react-chartjs-2'; // Example if using Chart.js
// Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend); // For Chart.js v3+

const IndividualReportPage = () => {
    const { athleteId } = useParams(); // Athlete's string ID
    const [reportData, setReportData] = useState(null);
    const [comments, setComments] = useState({}); // Store comments per entryId: { entryId1: [comment1, comment2], ... }
    const [newCommentText, setNewCommentText] = useState({}); // { entryId: "text" }
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingComments, setIsLoadingComments] = useState({}); // { entryId: true/false }
    const [error, setError] = useState(null); // General page load error
    const [commentError, setCommentError] = useState({}); // { entryId: "error message for specific comment section" }
    const [editingComment, setEditingComment] = useState(null); // { commentId: string, text: string, entryId: string }
    const [replyToComment, setReplyToComment] = useState(null); // { parentCommentId: string, entryId: string }


    // Placeholder for current user (replace with actual auth context later)
    const MOCK_CURRENT_USER = {
        // _id: "mockUserId123", // Replace with actual user ID from auth
        // name: "Mock Current User",
        // role: "Coach" // Example role
        // For now, to test edit/delete, let's assume we can edit/delete any comment.
        // In a real app, these would be based on comment.userId === currentUser._id or currentUser.role === 'Admin'
        _id: null, name: null, role: null
    };
    const currentUser = MOCK_CURRENT_USER;


    useEffect(() => {
        if (athleteId) {
            setIsLoading(true);
            reportService.getIndividualAthleteReport(athleteId)
                .then(data => {
                    setReportData(data);
                    // Optionally fetch comments for all entries initially, or do it on demand
                    // For now, let's not auto-fetch all. User can click to load.
                    setIsLoading(false);
                })
                .catch(err => {
                    setError(err.response?.data?.message || err.message || 'Failed to load individual report.');
                    setIsLoading(false);
                    console.error(err);
                });
        }
    }, [athleteId]);

    const fetchCommentsForEntry = async (entryId) => {
        setIsLoadingComments(prev => ({ ...prev, [entryId]: true }));
        setCommentError(prev => ({ ...prev, [entryId]: null }));
        try {
            const fetchedComments = await commentService.getCommentsForEntry(entryId);
            setComments(prev => ({ ...prev, [entryId]: fetchedComments }));
        } catch (err) {
            setCommentError(prev => ({ ...prev, [entryId]: err.response?.data?.message || err.message || 'Failed to load comments.' }));
        } finally {
            setIsLoadingComments(prev => ({ ...prev, [entryId]: false }));
        }
    };

    const handleAddComment = async (entryId) => {
        if (!newCommentText[entryId]?.trim()) {
            setCommentError(prev => ({ ...prev, [entryId]: 'Comment text cannot be empty.' }));
            return;
        }
        // Assuming user info will be handled by backend based on auth token
        const commentData = { text: newCommentText[entryId].trim() };
        try {
            await commentService.createComment(entryId, commentData);
            setNewCommentText(prev => ({ ...prev, [entryId]: '' })); // Clear input
            fetchCommentsForEntry(entryId); // Refresh comments for that entry
        } catch (err) {
            setCommentError(prev => ({ ...prev, [entryId]: err.response?.data?.message || err.message || 'Failed to post comment.' }));
        }
    };

    // TODO: Add functions for updating/deleting comments if UI for that is added.
    const handleEditComment = (comment, entryId) => {
        setEditingComment({ commentId: comment._id, text: comment.text, entryId });
        // Potentially scroll to the main comment input box which could be repurposed for editing
    };

    const handleCancelEdit = () => {
        setEditingComment(null);
    };

    const handleUpdateComment = async () => {
        if (!editingComment || !editingComment.text.trim()) {
            toast.error("Comment text cannot be empty.");
            return;
        }
        try {
            await commentService.updateComment(editingComment.commentId, { text: editingComment.text });
            toast.success("Comment updated successfully.");
            fetchCommentsForEntry(editingComment.entryId); // Refresh comments
            setEditingComment(null);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || "Failed to update comment.");
        }
    };

    const handleDeleteComment = async (commentId, entryId) => {
        if (window.confirm("Are you sure you want to delete this comment?")) {
            try {
                await commentService.deleteComment(commentId);
                toast.success("Comment deleted successfully.");
                fetchCommentsForEntry(entryId); // Refresh comments
            } catch (err) {
                toast.error(err.response?.data?.message || err.message || "Failed to delete comment.");
            }
        }
    };

    const handleReplyToComment = (parentComment, entryId) => {
        setReplyToComment({ parentCommentId: parentComment._id, entryId });
        // Focus the main comment input for that entry, or a specific reply input
        const mainCommentInput = document.getElementById(`comment-input-${entryId}`);
        if (mainCommentInput) mainCommentInput.focus();
        toast.info(`Replying to ${parentComment.userName}'s comment. Type your reply below.`);
    };

    const handleCancelReply = () => {
        setReplyToComment(null);
    };

    const handlePostCommentOrReply = async (entryId) => {
        const textToPost = editingComment ? editingComment.text : (newCommentText[entryId] || '');
        if (!textToPost.trim()) {
            setCommentError(prev => ({ ...prev, [entryId]: 'Comment text cannot be empty.' }));
            toast.error('Comment text cannot be empty.');
            return;
        }

        const commentPayload = {
            text: textToPost.trim(),
            parentCommentId: replyToComment && replyToComment.entryId === entryId ? replyToComment.parentCommentId : null
        };

        try {
            if (editingComment && editingComment.entryId === entryId) { // Ensure editing correct comment
                await commentService.updateComment(editingComment.commentId, { text: commentPayload.text });
                toast.success("Comment updated successfully.");
                setEditingComment(null);
            } else {
                await commentService.createComment(entryId, commentPayload);
                toast.success(commentPayload.parentCommentId ? "Reply posted successfully." : "Comment posted successfully.");
            }

            setNewCommentText(prev => ({ ...prev, [entryId]: '' }));
            setReplyToComment(null); // Clear reply state
            fetchCommentsForEntry(entryId);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "Failed to post comment/reply.";
            setCommentError(prev => ({ ...prev, [entryId]: errorMsg }));
            toast.error(errorMsg);
        }
    };


    if (isLoading) return <p>Loading individual report for athlete {athleteId}...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (!reportData) return <p>No report data found for athlete {athleteId}.</p>;

    const { entries, sportRecommendations } = reportData;

    // TODO: Structure data for charts if any are to be displayed.
    // E.g., progress chart for a specific parameter over time.

    return (
        <div>
            <h2>Individual Athlete Report: {reportData.athleteId}</h2>

            <div style={{ marginBottom: '20px' }}>
                <a href={reportService.getIndividualReportPdfUrl(athleteId)} target="_blank" rel="noopener noreferrer">
                    <button>Export as PDF (Placeholder)</button>
                </a>
                <a href={reportService.getIndividualReportCsvUrl(athleteId)} download={`individual_report_${athleteId}.csv`} style={{marginLeft: '10px'}}>
                    <button>Export as CSV (Placeholder)</button>
                </a>
            </div>

            <h3>Assessment History ({entries?.length || 0} entries)</h3>
            {entries && entries.length > 0 ? (
                entries.map(entry => (
                    <div key={entry._id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '15px', borderRadius: '5px' }}>
                        <h4>Session: {entry.sessionId?.name || 'N/A'} ({entry.sessionId?.year} - {entry.sessionId?.term})</h4>
                        <p><strong>Batch:</strong> {entry.batchId?.title || 'N/A'} (Date: {entry.batchId?.date ? new Date(entry.batchId.date).toLocaleDateString() : 'N/A'})</p>
                        <p><strong>Assessment Template:</strong> {entry.assessmentId?.name || 'N/A'} (Sport: {entry.assessmentId?.sport || 'N/A'})</p>
                        <p><strong>Entry Date:</strong> {new Date(entry.entryDate).toLocaleString()}</p>
                        <p><strong>Attempt:</strong> {entry.attemptNumber || 1}</p>
                        {entry.overallScore !== null && <p><strong>Overall Score:</strong> {entry.overallScore} (Band: {entry.overallBand || 'N/A'})</p>}

                        <h5>Parameters:</h5>
                        {entry.data && entry.data.length > 0 ? (
                            <table style={{width: '100%', fontSize: '0.9em'}}>
                                <thead>
                                    <tr>
                                        <th>Parameter</th>
                                        <th>Raw Value</th>
                                        <th>Unit</th>
                                        <th>Z-Score</th>
                                        <th>Percentile</th>
                                        <th>Band</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entry.data.map((paramData, index) => {
                                        // Find parameter name from the populated assessmentId.parameters
                                        const assessmentParam = entry.assessmentId?.parameters?.find(p => p._id === paramData.parameterId || p._id.toString() === paramData.parameterId.toString());
                                        const paramName = paramData.parameterName || assessmentParam?.name || 'Unknown Parameter';
                                        const paramUnit = paramData.unit || assessmentParam?.unit || '';

                                        return (
                                            <tr key={paramData.parameterId + '_' + index}> {/* Ensure unique key if paramId can repeat in error cases */}
                                                <td>{paramName}</td>
                                                <td>{paramData.rawValue !== undefined ? String(paramData.rawValue) : String(paramData.value)}</td>
                                                <td>{paramUnit}</td>
                                                <td>{paramData.zScore !== null ? paramData.zScore : 'N/A'}</td>
                                                <td>{paramData.percentile !== null ? paramData.percentile : 'N/A'}</td>
                                                <td>{paramData.band || 'N/A'}</td>
                                                <td>{paramData.notes || ''}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : <p>No parameter data recorded for this entry.</p>}

                        {/* Comments Section Placeholder */}
                        <div style={{marginTop: '10px', borderTop: '1px dashed #ddd', paddingTop: '10px'}}>
                            <h5>Feedback & Comments ({comments[entry._id]?.filter(c => !c.parentCommentId).length || 0} top-level)</h5>
                            {isLoadingComments[entry._id] && <p>Loading comments...</p>}
                            {commentError[entry._id] && <p style={{color: 'red', fontSize: '0.9em'}}>{commentError[entry._id]}</p>}

                            {!comments[entry._id] && !isLoadingComments[entry._id] && (
                                <button onClick={() => fetchCommentsForEntry(entry._id)} style={{fontSize: '0.8em', marginBottom: '10px'}}>Load Comments</button>
                            )}

                            {/* Render Comments (Recursive component or inline logic for nesting) */}
                            {comments[entry._id] && <RenderComments
                                entryId={entry._id}
                                allCommentsForEntry={comments[entry._id]}
                                currentUser={currentUser}
                                onEdit={handleEditComment}
                                onDelete={handleDeleteComment}
                                onReply={handleReplyToComment}
                            />}

                            {/* Comment Input Form (handles new comments, replies, and edits) */}
                            <div style={{marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px'}}>
                                {editingComment && editingComment.entryId === entry._id ? (
                                    <>
                                        <h6>Editing comment:</h6>
                                        <textarea
                                            id={`comment-edit-input-${entry._id}`}
                                            rows="3"
                                            value={editingComment.text}
                                            onChange={(e) => setEditingComment(prev => ({ ...prev, text: e.target.value }))}
                                            style={{width: '100%', marginBottom: '5px', boxSizing: 'border-box'}}
                                        />
                                        <button onClick={() => handlePostCommentOrReply(entry._id)} style={{fontSize: '0.9em', marginRight: '5px'}}>Save Edit</button>
                                        <button onClick={handleCancelEdit} style={{fontSize: '0.9em', backgroundColor: '#aaa'}}>Cancel Edit</button>
                                    </>
                                ) : (
                                    <>
                                        <h6>{replyToComment && replyToComment.entryId === entry._id ? `Replying to comment...` : 'Add a new comment:'}</h6>
                                        {replyToComment && replyToComment.entryId === entry._id && (
                                            <button onClick={handleCancelReply} style={{fontSize: '0.8em', marginBottom: '5px', backgroundColor: '#eee'}}>Cancel Reply</button>
                                        )}
                                        <textarea
                                            id={`comment-input-${entry._id}`}
                                            rows="3"
                                            placeholder="Type your comment or reply here..."
                                            value={newCommentText[entry._id] || ''}
                                            onChange={(e) => setNewCommentText(prev => ({ ...prev, [entry._id]: e.target.value }))}
                                            style={{width: '100%', marginBottom: '5px', boxSizing: 'border-box'}}
                                        />
                                        <button onClick={() => handlePostCommentOrReply(entry._id)} style={{fontSize: '0.9em'}}>
                                            {replyToComment && replyToComment.entryId === entry._id ? 'Post Reply' : 'Post Comment'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : <p>No assessment entries found.</p>}

            {/* Placeholder for Charts */}
            {/* <div style={{marginTop: '30px'}}>
                <h4>Progress Charts (Placeholder)</h4>
                <p>Charts showing progress over time for key parameters would go here.</p>
                {/* Example: <Line data={...} options={...} /> */}
            {/* </div> */}


            {sportRecommendations && sportRecommendations.length > 0 && (
                <div style={{marginTop: '30px'}}>
                    <h3>Sport Recommendations (Placeholder)</h3>
                    <ul>
                        {sportRecommendations.map((rec, index) => <li key={index}>{rec}</li>)}
                    </ul>
                </div>
            )}
            <Link to="/sessions" style={{display: 'block', marginTop: '20px'}}>Back to Sessions (or other relevant page)</Link>
        </div>
    );
};


// Recursive or Helper Component to Render Comments and Replies
const RenderComments = ({ entryId, allCommentsForEntry, currentUser, onEdit, onDelete, onReply, level = 0 }) => {
    const parentId = level === 0 ? null : arguments[1]; // A bit hacky, better to pass parentId explicitly if nesting deeply

    // Filter comments for the current level (top-level or replies to a specific parent)
    // This simple filter works for one level of replies. Deeper nesting needs more robust parentId tracking.
    // For now, this just renders all comments flat but with reply buttons.
    // A proper threaded view would filter comments based on their `parentCommentId`.
    // Let's build the structure for threading:
    const buildThread = (comments, parentIdToFilter = null) => {
        return comments
            .filter(comment => (comment.parentCommentId ? comment.parentCommentId.toString() : null) === (parentIdToFilter ? parentIdToFilter.toString() : null))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // Sort by creation time
            .map(comment => (
                <div key={comment._id} style={{
                    marginLeft: `${level * 20}px`,
                    marginBottom: '10px',
                    padding: '8px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    backgroundColor: level > 0 ? '#f9f9f9' : '#fff'
                }}>
                    <p style={{margin: '0 0 5px 0'}}>
                        <strong>{comment.userName || 'User'}:</strong> {comment.text}
                    </p>
                    <small style={{color: '#777', fontSize: '0.8em'}}>
                        {new Date(comment.createdAt).toLocaleString()}
                        {comment.isEdited && ' (edited)'}
                    </small>
                    <div style={{marginTop: '5px'}}>
                        {/* Placeholder: Show edit/delete only if currentUser matches comment.userId or isAdmin */}
                        {/* For scaffolding, let's assume all can be interacted with, or use mock user */}
                        { (currentUser?._id === comment.userId || currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin' || !currentUser?._id /* allow all if no user */) && (
                            <>
                                <button onClick={() => onEdit(comment, entryId)} style={{fontSize: '0.8em', marginRight: '5px', padding: '2px 5px'}}>Edit</button>
                                <button onClick={() => onDelete(comment._id, entryId)} style={{fontSize: '0.8em', padding: '2px 5px', backgroundColor: '#ffdddd'}}>Delete</button>
                            </>
                        )}
                        <button onClick={() => onReply(comment, entryId)} style={{fontSize: '0.8em', marginLeft: '10px', padding: '2px 5px'}}>Reply</button>
                    </div>
                    {/* Recursively render replies */}
                    <div style={{marginTop: '8px', paddingLeft: '15px', borderLeft: '2px solid #eee'}}>
                        {buildThread(allCommentsForEntry, comment._id)}
                    </div>
                </div>
            ));
    };

    if (!allCommentsForEntry || allCommentsForEntry.length === 0) {
        return <p style={{fontSize: '0.9em', color: '#666'}}>No comments yet for this entry.</p>;
    }

    return <div>{buildThread(allCommentsForEntry, null)}</div>;
};


export default IndividualReportPage;
