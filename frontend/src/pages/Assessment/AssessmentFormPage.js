import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import assessmentService from '../../api/assessmentService';
import ParameterForm from '../../components/Assessment/ParameterForm'; // We just created this

// Expanded enums (consider a shared constants file)
const GENDERS = ['Male', 'Female', 'Co-ed', 'Other', 'Not Specified'];
const BENCHMARK_MODES = ['manual', 'auto', 'hybrid'];
const STATUSES = ['draft', 'active', 'archived'];

const AssessmentFormPage = ({ mode }) => {
    const { id } = useParams(); // For edit/clone mode
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState({
        name: '',
        description: '',
        sport: '',
        ageGroup: '',
        gender: GENDERS[0],
        category: '',
        benchmarkMode: BENCHMARK_MODES[0],
        status: STATUSES[0],
        parameters: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showParameterForm, setShowParameterForm] = useState(false);
    const [editingParameter, setEditingParameter] = useState(null); // null for new, object for editing
    const [editingParameterIndex, setEditingParameterIndex] = useState(null);


    useEffect(() => {
        if ((mode === 'edit' || mode === 'clone') && id) {
            setIsLoading(true);
            assessmentService.getAssessmentById(id)
                .then(data => {
                    if (mode === 'clone') {
                        setAssessment({
                            ...data,
                            name: `${data.name} (Clone)`,
                            version: 1, // Reset version for clone
                            status: 'draft', // Clones are drafts
                            // Parameters are part of data and will be carried over
                        });
                    } else {
                        setAssessment(data);
                    }
                    setIsLoading(false);
                })
                .catch(err => {
                    setError(err.message || 'Failed to fetch assessment');
                    setIsLoading(false);
                    console.error(err);
                });
        } else if (mode === 'create') {
            // Reset to default for create mode (e.g. navigating from edit to new)
             setAssessment({
                name: '', description: '', sport: '', ageGroup: '', gender: GENDERS[0],
                category: '', benchmarkMode: BENCHMARK_MODES[0], status: STATUSES[0], parameters: []
            });
        }
    }, [id, mode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAssessment(prev => ({ ...prev, [name]: value }));
    };

    const handleParameterSubmit = (parameterData, index) => {
        let updatedParameters;
        if (index !== null && index !== undefined) { // Editing existing parameter
            updatedParameters = assessment.parameters.map((p, i) => i === index ? parameterData : p);
        } else { // Adding new parameter
            updatedParameters = [...assessment.parameters, parameterData];
        }
        setAssessment(prev => ({ ...prev, parameters: updatedParameters }));
        setShowParameterForm(false);
        setEditingParameter(null);
        setEditingParameterIndex(null);
    };

    const openNewParameterForm = () => {
        setEditingParameter(null); // Make sure it's a new one
        setEditingParameterIndex(null);
        setShowParameterForm(true);
    };

    const openEditParameterForm = (parameter, index) => {
        setEditingParameter({...parameter}); // Pass a copy to avoid direct mutation before save
        setEditingParameterIndex(index);
        setShowParameterForm(true);
    };

    const removeParameter = (indexToRemove) => {
        if(window.confirm('Are you sure you want to remove this parameter?')) {
            setAssessment(prev => ({
                ...prev,
                parameters: prev.parameters.filter((_, index) => index !== indexToRemove)
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Basic client-side validation
        if (!assessment.name.trim() || !assessment.sport.trim()) {
            setError("Assessment Name and Sport are required.");
            setIsLoading(false);
            return;
        }

        try {
            let response;
            if (mode === 'edit') {
                response = await assessmentService.updateAssessment(id, assessment);
            } else { // 'create' or 'clone' (clone becomes a create operation after data prep)
                const { _id, version, createdAt, updatedAt, ...createData } = assessment; // Remove fields not needed for create
                response = await assessmentService.createAssessment(createData);
            }
            console.log('Operation successful:', response);
            navigate('/assessments'); // Redirect to list page after success
        } catch (err) {
            console.error('Failed to save assessment:', err);
            setError(err.response?.data?.message || err.message || 'Failed to save assessment');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && (mode === 'edit' || mode === 'clone')) return <p>Loading assessment data...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>{mode === 'edit' ? 'Edit Assessment' : (mode === 'clone' ? 'Clone Assessment' : 'Create New Assessment')}</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name">Assessment Name:</label>
                    <input type="text" id="name" name="name" value={assessment.name} onChange={handleChange} required />
                </div>
                <div>
                    <label htmlFor="description">Description:</label>
                    <textarea id="description" name="description" value={assessment.description} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="sport">Sport:</label>
                    <input type="text" id="sport" name="sport" value={assessment.sport} onChange={handleChange} required />
                </div>
                <div>
                    <label htmlFor="ageGroup">Age Group (e.g., U12, Senior):</label>
                    <input type="text" id="ageGroup" name="ageGroup" value={assessment.ageGroup} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="gender">Gender:</label>
                    <select id="gender" name="gender" value={assessment.gender} onChange={handleChange}>
                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="category">Category (e.g., Physical Fitness, Skill Test):</label>
                    <input type="text" id="category" name="category" value={assessment.category} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="benchmarkMode">Benchmark Mode:</label>
                    <select id="benchmarkMode" name="benchmarkMode" value={assessment.benchmarkMode} onChange={handleChange}>
                        {BENCHMARK_MODES.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="status">Status:</label>
                    <select id="status" name="status" value={assessment.status} onChange={handleChange}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <hr />
                <h3>Parameters</h3>
                {assessment.parameters.length === 0 && !showParameterForm && <p>No parameters defined yet.</p>}

                {assessment.parameters.map((param, index) => (
                    <div key={index} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0', borderRadius: '4px' }}>
                        <strong>{param.name}</strong> ({param.tag} - {param.type}, Unit: {param.unit})
                        <button type="button" onClick={() => openEditParameterForm(param, index)} style={{marginLeft: '10px'}}>Edit</button>
                        <button type="button" onClick={() => removeParameter(index)} style={{marginLeft: '5px', backgroundColor: 'red'}}>Remove</button>
                    </div>
                ))}

                {showParameterForm && (
                    <ParameterForm
                        parameter={editingParameter}
                        index={editingParameterIndex}
                        onSubmit={handleParameterSubmit}
                        onCancel={() => { setShowParameterForm(false); setEditingParameter(null); setEditingParameterIndex(null);}}
                    />
                )}

                {!showParameterForm && <button type="button" onClick={openNewParameterForm}>Add New Parameter</button>}

                <hr style={{marginTop: '20px'}}/>
                <button type="submit" disabled={isLoading} style={{marginTop: '10px'}}>
                    {isLoading ? 'Saving...' : (mode === 'edit' ? 'Update Assessment' : 'Save Assessment')}
                </button>
                <button type="button" onClick={() => navigate('/assessments')} style={{marginLeft: '10px', backgroundColor: 'grey'}}>
                    Cancel
                </button>
            </form>
        </div>
    );
};

export default AssessmentFormPage;
