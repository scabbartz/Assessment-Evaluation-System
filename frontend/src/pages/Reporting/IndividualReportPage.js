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
    const [error, setError] = useState(null);
    const [commentError, setCommentError] = useState({}); // { entryId: "error message" }


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
                            <h5>Feedback & Comments ({comments[entry._id]?.length || 0})</h5>
                            {isLoadingComments[entry._id] && <p>Loading comments...</p>}
                            {commentError[entry._id] && <p style={{color: 'red'}}>{commentError[entry._id]}</p>}

                            {!comments[entry._id] && !isLoadingComments[entry._id] && (
                                <button onClick={() => fetchCommentsForEntry(entry._id)} style={{fontSize: '0.8em'}}>Load Comments</button>
                            )}

                            {comments[entry._id] && comments[entry._id].length > 0 && (
                                <ul style={{listStyle: 'none', paddingLeft: 0, fontSize: '0.9em', maxHeight: '150px', overflowY: 'auto'}}>
                                    {comments[entry._id].map(comment => (
                                        <li key={comment._id} style={{marginBottom: '5px', paddingBottom: '5px', borderBottom: '1px solid #f0f0f0'}}>
                                            <strong>{comment.userName || 'User'}:</strong> {comment.text}
                                            <br/>
                                            <small style={{color: '#777'}}>
                                                {new Date(comment.createdAt).toLocaleString()}
                                                {comment.isEdited && ' (edited)'}
                                            </small>
                                            {/* TODO: Add edit/delete buttons for comment owner/admin */}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {comments[entry._id] && comments[entry._id].length === 0 && <p>No comments yet.</p>}

                            <div style={{marginTop: '5px'}}>
                                <textarea
                                    rows="2"
                                    placeholder="Add a comment..."
                                    value={newCommentText[entry._id] || ''}
                                    onChange={(e) => setNewCommentText(prev => ({ ...prev, [entry._id]: e.target.value }))}
                                    style={{width: 'calc(100% - 80px)', marginRight: '5px', verticalAlign: 'bottom'}}
                                />
                                <button onClick={() => handleAddComment(entry._id)} style={{fontSize: '0.8em'}}>Post</button>
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

export default IndividualReportPage;
