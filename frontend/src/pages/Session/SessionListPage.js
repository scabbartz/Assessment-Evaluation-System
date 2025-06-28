import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import sessionService from '../../api/sessionService';
import benchmarkService from '../../api/benchmarkService'; // Import benchmark service

const SessionListPage = () => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCalculating, setIsCalculating] = useState(null); // To track which session's benchmarks are being calculated
    const [error, setError] = useState(null);
    const [calculationStatus, setCalculationStatus] = useState({}); // To show status per session: { sessionId: "Success!" }
    const navigate = useNavigate();

    const fetchSessions = () => {
        setIsLoading(true);
        sessionService.getSessions()
            .then(data => {
                setSessions(data);
                setIsLoading(false);
            })
            .catch(err => {
                setError(err.response?.data?.message || err.message || 'Failed to fetch sessions');
                setIsLoading(false);
                console.error(err);
            });
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this session? This may also affect associated batches and data.')) {
            setIsLoading(true);
            try {
                await sessionService.deleteSession(id);
                fetchSessions(); // Re-fetch to update list
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to delete session');
                console.error(err);
                // Keep isLoading false or true based on whether you want to allow further actions
                setIsLoading(false);
            }
            // setIsLoading(false); // Moved to finally or re-fetch success
        }
    };

    if (isLoading && sessions.length === 0) return <p>Loading sessions...</p>;


    return (
        <div>
            <h2>Sessions Management</h2>
            <Link to="/sessions/new">
                <button style={{ marginBottom: '20px' }}>Create New Session</button>
            </Link>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {sessions.length === 0 && !isLoading ? (
                <p>No sessions found. <Link to="/sessions/new">Create one now!</Link></p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Year</th>
                            <th>Term</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Students</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map(session => (
                            <tr key={session._id}>
                                <td>{session.name}</td>
                                <td>{session.year}</td>
                                <td>{session.term}</td>
                                <td>{session.startDate ? new Date(session.startDate).toLocaleDateString() : 'N/A'}</td>
                                <td>{session.endDate ? new Date(session.endDate).toLocaleDateString() : 'N/A'}</td>
                                <td>{session.students ? session.students.length : 0}</td>
                                <td>{session.status}</td>
                                <td>
                                    <Link to={`/sessions/edit/${session._id}`}>
                                        <button>Edit</button>
                                    </Link>
                                    <Link to={`/sessions/${session._id}/batches`}>
                                        <button style={{marginLeft: '5px'}}>View Batches</button>
                                    </Link>
                                    <button
                                         onClick={() => handleCalculateBenchmarks(session._id, setIsCalculating, setCalculationStatus, setError)}
                                        style={{marginLeft: '5px', backgroundColor: '#5bc0de'}}
                                        disabled={isLoading || isCalculating === session._id}
                                    >
                                        {isCalculating === session._id ? 'Calculating...' : 'Calc Benchmarks'}
                                    </button>
                                    <button onClick={() => handleDelete(session._id)} style={{marginLeft: '5px', backgroundColor: 'red'}} disabled={isLoading || isCalculating === session._id}>
                                        Delete
                                    </button>
                                    {calculationStatus[session._id] && <span style={{marginLeft: '10px', fontSize: '0.9em', color: calculationStatus[session._id].includes('Error') ? 'red' : 'green'}}>{calculationStatus[session._id]}</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {isLoading && <p>Loading...</p>}
        </div>
    );
};

// Helper function for handleCalculateBenchmarks to be defined within or outside component
async function handleCalculateBenchmarks(sessionId, setIsCalculatingCallback, setCalculationStatusCallback, setErrorCallback) {
    if (!window.confirm(`Are you sure you want to calculate (or re-calculate) benchmarks for session ID: ${sessionId}? This may take some time.`)) {
        return;
    }
    setIsCalculatingCallback(sessionId);
    setErrorCallback(null);
    setCalculationStatusCallback(prev => ({ ...prev, [sessionId]: 'Processing...' }));

    try {
        // TODO: Potentially add UI to select assessmentIdFilter, ageGroupFilter, genderFilter
        const filters = {};
        const result = await benchmarkService.calculateBenchmarksForSession(sessionId, filters);
        setCalculationStatusCallback(prev => ({ ...prev, [sessionId]: `Done: ${result.created || 0} created, ${result.updated || 0} updated.`}));
        // Optionally clear status after a few seconds
        setTimeout(() => setCalculationStatusCallback(prev => ({ ...prev, [sessionId]: null })), 5000);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to calculate benchmarks.';
        setErrorCallback(`Error for session ${sessionId}: ${errorMsg}`); // Show general error or specific
        setCalculationStatusCallback(prev => ({ ...prev, [sessionId]: `Error: ${errorMsg.substring(0,50)}...` })); // Short error status
        console.error(err);
    } finally {
        setIsCalculatingCallback(null);
    }
}


export default SessionListPage;
