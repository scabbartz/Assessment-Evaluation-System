import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import assessmentService from '../../api/assessmentService';

const AssessmentListPage = () => {
    const [assessments, setAssessments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const fetchAssessments = () => {
        setIsLoading(true);
        assessmentService.getAssessments()
            .then(data => {
                setAssessments(data);
                setIsLoading(false);
            })
            .catch(err => {
                setError(err.message || 'Failed to fetch assessments');
                setIsLoading(false);
                console.error(err);
            });
    };

    useEffect(() => {
        fetchAssessments();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
            setIsLoading(true);
            try {
                await assessmentService.deleteAssessment(id);
                setAssessments(prev => prev.filter(assessment => assessment._id !== id)); // Update UI optimistically or re-fetch
                // fetchAssessments(); // Re-fetch to ensure consistency
            } catch (err) {
                setError(err.message || 'Failed to delete assessment');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleClone = async (id) => {
        if (window.confirm('Are you sure you want to clone this assessment? A new draft will be created.')) {
            setIsLoading(true);
            try {
                const clonedAssessment = await assessmentService.cloneAssessment(id);
                // navigate(`/assessments/edit/${clonedAssessment._id}`); // Option 1: Go to edit page of the clone
                fetchAssessments(); // Option 2: Refresh list to show the clone
            } catch (err) {
                setError(err.message || 'Failed to clone assessment');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (isLoading && assessments.length === 0) return <p>Loading assessments...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Assessment Templates</h2>
            <Link to="/assessments/new">
                <button style={{ marginBottom: '20px' }}>Create New Assessment</button>
            </Link>
            {assessments.length === 0 && !isLoading ? (
                <p>No assessment templates found. <Link to="/assessments/new">Create one now!</Link></p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Sport</th>
                            <th>Age Group</th>
                            <th>Category</th>
                            <th>Parameters</th>
                            <th>Version</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assessments.map(assessment => (
                            <tr key={assessment._id}>
                                <td>{assessment.name}</td>
                                <td>{assessment.sport}</td>
                                <td>{assessment.ageGroup || 'N/A'}</td>
                                <td>{assessment.category || 'N/A'}</td>
                                <td>{assessment.parameters ? assessment.parameters.length : 0}</td>
                                <td>{assessment.version}</td>
                                <td>{assessment.status}</td>
                                <td>
                                    <Link to={`/assessments/edit/${assessment._id}`}>
                                        <button>Edit</button>
                                    </Link>
                                    <button onClick={() => handleClone(assessment._id)} style={{marginLeft: '5px'}}>Clone</button>
                                    <button onClick={() => handleDelete(assessment._id)} style={{marginLeft: '5px', backgroundColor: 'red'}}>Delete</button>
                                    {/* TODO: Add a "View Details" button/link */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
             {isLoading && <p>Updating list...</p>}
        </div>
    );
};

export default AssessmentListPage;
