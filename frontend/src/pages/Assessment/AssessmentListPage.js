import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import assessmentService from '../../api/assessmentService';
import { toast } from 'react-toastify'; // Import toast

const AssessmentListPage = () => {
    const [assessments, setAssessments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    // const [error, setError] = useState(null); // Replaced by toast for operational errors
    const navigate = useNavigate();

    const fetchAssessments = (showLoadingMessage = true) => {
        if(showLoadingMessage) setIsLoading(true);
        assessmentService.getAssessments()
            .then(data => {
                setAssessments(data);
            })
            .catch(err => {
                const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch assessments';
                toast.error(errorMsg);
                console.error(err);
            })
            .finally(() => {
                if(showLoadingMessage) setIsLoading(false);
            });
    };

    useEffect(() => {
        fetchAssessments();
    }, []);

    const handleDelete = async (id, assessmentName) => {
        if (window.confirm(`Are you sure you want to delete the assessment: "${assessmentName}"? This action cannot be undone.`)) {
            // setIsLoading(true); // Handled by general loading or specific action loading state if preferred
            try {
                await assessmentService.deleteAssessment(id);
                toast.success(`Assessment "${assessmentName}" deleted successfully.`);
                setAssessments(prev => prev.filter(assessment => assessment._id !== id));
            } catch (err) {
                const errorMsg = err.response?.data?.message || err.message || 'Failed to delete assessment.';
                toast.error(errorMsg);
                console.error(err);
            } finally {
                // setIsLoading(false);
            }
        }
    };

    const handleClone = async (id, assessmentName) => {
        if (window.confirm(`Are you sure you want to clone the assessment: "${assessmentName}"? A new draft will be created.`)) {
            // setIsLoading(true);
            try {
                const clonedAssessment = await assessmentService.cloneAssessment(id);
                toast.success(`Assessment "${assessmentName}" cloned successfully as "${clonedAssessment.name}".`);
                fetchAssessments(false); // Re-fetch list without full page loading indicator
                // Optionally navigate to the edit page of the clone:
                // navigate(`/assessments/edit/${clonedAssessment._id}`);
            } catch (err) {
                const errorMsg = err.response?.data?.message || err.message || 'Failed to clone assessment.';
                toast.error(errorMsg);
                console.error(err);
            } finally {
                // setIsLoading(false);
            }
        }
    };

    if (isLoading && assessments.length === 0) return <p>Loading assessments...</p>;
    // Error display is handled by toasts for operational errors.
    // A general error for initial load could still be here if needed:
    // if (error && assessments.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;


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
                                    <button onClick={() => handleClone(assessment._id, assessment.name)} style={{marginLeft: '5px'}}>Clone</button>
                                    <button onClick={() => handleDelete(assessment._id, assessment.name)} style={{marginLeft: '5px', backgroundColor: 'red'}}>Delete</button>
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
