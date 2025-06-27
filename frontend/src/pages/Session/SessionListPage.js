import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import sessionService from '../../api/sessionService';

const SessionListPage = () => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
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
                                    <button onClick={() => handleDelete(session._id)} style={{marginLeft: '5px', backgroundColor: 'red'}} disabled={isLoading}>
                                        Delete
                                    </button>
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

export default SessionListPage;
