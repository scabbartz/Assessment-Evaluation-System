import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import sessionService from '../../api/sessionService'; // For getting batches of a session
import batchService from '../../api/batchService';   // For deleting a batch directly

const BatchListPage = () => {
    const { sessionId } = useParams(); // Expecting sessionId in the URL for context
    const navigate = useNavigate();

    const [batches, setBatches] = useState([]);
    const [sessionInfo, setSessionInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchBatchesAndSession = useCallback(async () => {
        if (!sessionId) {
            // TODO: Handle listing all batches from all sessions if that's a requirement
            // For now, assume sessionId is always provided for batch listing.
            setError("Session ID is required to list batches.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const [sessionData, batchesData] = await Promise.all([
                sessionService.getSessionById(sessionId),
                sessionService.getBatchesForSession(sessionId)
            ]);
            setSessionInfo(sessionData);
            setBatches(batchesData);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch batch data');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchBatchesAndSession();
    }, [fetchBatchesAndSession]);

    const handleDeleteBatch = async (batchId) => {
        if (window.confirm('Are you sure you want to delete this batch?')) {
            setIsLoading(true); // Or a specific loading state for delete
            try {
                await batchService.deleteBatch(batchId);
                fetchBatchesAndSession(); // Refresh the list
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to delete batch');
                setIsLoading(false); // Stop loading on error
            }
            // setIsLoading(false) will be handled by fetchBatchesAndSession's finally block on success
        }
    };

    const handleRandomBatchCreation = async () => {
        // Basic prompt for configuration, ideally a modal form
        const numBatches = prompt("Enter number of batches to create (leave blank to use max students per batch):");
        const maxStudents = numBatches ? "" : prompt("Enter max students per batch:");

        if (!numBatches && !maxStudents) {
            alert("Either number of batches or max students per batch must be specified.");
            return;
        }

        const config = {
            numberOfBatches: numBatches ? parseInt(numBatches) : undefined,
            maxStudentsPerBatch: maxStudents ? parseInt(maxStudents) : undefined,
            defaultBatchTitlePrefix: sessionInfo ? `${sessionInfo.term} - Batch` : "Batch",
            // defaultVenue: "Main Hall",
            // defaultDate: new Date().toISOString().split('T')[0]
        };

        setIsLoading(true);
        try {
            const result = await sessionService.createRandomBatchesInSession(sessionId, config);
            alert(`${result.batches.length} batches created successfully!`);
            fetchBatchesAndSession();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create random batches');
            setIsLoading(false);
        }
    };


    if (!sessionId) return <p>No session selected. Please select a session to view its batches.</p>;
    if (isLoading && batches.length === 0 && !sessionInfo) return <p>Loading batch information...</p>;


    return (
        <div>
            {sessionInfo && <h2>Batches for Session: {sessionInfo.name} ({sessionInfo.year} - {sessionInfo.term})</h2>}
            {!sessionInfo && <h2>Batches</h2>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            <Link to={`/sessions/${sessionId}/batches/new`}>
                <button style={{ marginBottom: '10px' }}>Create New Batch Manually</button>
            </Link>
             <button onClick={handleRandomBatchCreation} style={{ marginBottom: '10px', marginLeft: '10px', backgroundColor: '#f0ad4e' }} disabled={isLoading || !sessionInfo || sessionInfo?.students?.length === 0}>
                Create Batches Randomly
            </button>
            {sessionInfo?.students?.length === 0 && <p style={{color: 'orange'}}>Cannot create random batches as the session has no students.</p>}


            {batches.length === 0 && !isLoading ? (
                <p>No batches found for this session. <Link to={`/sessions/${sessionId}/batches/new`}>Create one now!</Link></p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Assessment</th>
                            <th>Date</th>
                            <th>Venue</th>
                            <th>Students</th>
                            <th>Instructors</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batches.map(batch => (
                            <tr key={batch._id}>
                                <td>{batch.title}</td>
                                <td>{batch.assessmentId ? batch.assessmentId.name : 'N/A'}</td>
                                <td>{batch.date ? new Date(batch.date).toLocaleDateString() : 'N/A'}</td>
                                <td>{batch.venue || 'N/A'}</td>
                                <td>{batch.students ? batch.students.length : 0}{batch.maxStudents ? ` / ${batch.maxStudents}` : ''}</td>
                                <td>{batch.instructors ? batch.instructors.map(i => i.name).join(', ') : 'N/A'}</td>
                                <td>{batch.status}</td>
                                <td>
                                    <Link to={`/sessions/${sessionId}/batches/edit/${batch._id}`}>
                                        <button>Edit</button>
                                    </Link>
                                    {/* Link to Data Entry for this batch - Section 3 */}
                                    <Link to={`/data-entry/batch/${batch._id}`}>
                                        <button style={{marginLeft: '5px', backgroundColor: 'green'}}>Enter Data</button>
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteBatch(batch._id)}
                                        style={{marginLeft: '5px', backgroundColor: 'red'}}
                                        disabled={isLoading}
                                    >
                                        Delete
                                    </button>
                                    {/* TODO: Add workflow action buttons (In Progress, Finish, Publish) */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {isLoading && <p>Loading...</p>}
             <button onClick={() => navigate('/sessions')} style={{marginTop: '20px'}}>Back to Sessions List</button>
        </div>
    );
};

export default BatchListPage;
