import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import sessionService from '../../api/sessionService'; // To get session students
import batchService from '../../api/batchService';     // To create/update batch
import assessmentService from '../../api/assessmentService'; // To list assessment templates

const BATCH_STATUSES = ['Draft', 'In Progress', 'Finished', 'Published', 'Cancelled'];
const INSTRUCTOR_TYPES = ['real', 'virtual'];

const BatchFormPage = ({ mode }) => {
    const { sessionId, batchId } = useParams(); // batchId for edit mode
    const navigate = useNavigate();

    const [batch, setBatch] = useState({
        title: '',
        assessmentId: '',
        maxStudents: '',
        venue: '',
        date: '',
        startTime: '',
        endTime: '',
        instructors: [], // [{ instructorId: '', name: '', type: 'real' }]
        students: [],    // [{ studentId: '', name: '' }] - selected students
        status: BATCH_STATUSES[0]
    });

    const [sessionStudents, setSessionStudents] = useState([]); // Full roster of the parent session
    const [availableAssessments, setAvailableAssessments] = useState([]);

    const [newInstructorId, setNewInstructorId] = useState('');
    const [newInstructorName, setNewInstructorName] = useState('');
    const [newInstructorType, setNewInstructorType] = useState(INSTRUCTOR_TYPES[0]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sessionName, setSessionName] = useState('');


    const fetchPrerequisites = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [sessData, assessData] = await Promise.all([
                sessionService.getSessionById(sessionId),
                assessmentService.getAssessments() // Fetch all active assessments
            ]);

            setSessionName(sessData.name);
            setSessionStudents(sessData.students || []);
            setAvailableAssessments(assessData.filter(a => a.status === 'active') || []);

            if (mode === 'edit' && batchId) {
                const batchData = await batchService.getBatchById(batchId);
                setBatch({
                    ...batchData,
                    date: batchData.date ? new Date(batchData.date).toISOString().split('T')[0] : '',
                    assessmentId: batchData.assessmentId?._id || batchData.assessmentId || '', // Handle populated vs non-populated
                    // Ensure students in batch are objects with studentId and name for consistency with sessionStudents
                    students: batchData.students?.map(s => ({ studentId: s.studentId, name: s.name })) || []
                });
            } else {
                 // Default title for new batch
                 setBatch(prev => ({...prev, title: `${sessData.term || 'New'} Batch`}));
            }

        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch prerequisite data');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, batchId, mode]);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setBatch(prev => ({ ...prev, [name]: value }));
    };

    const handleStudentSelection = (studentId, studentName) => {
        setBatch(prev => {
            const isSelected = prev.students.some(s => s.studentId === studentId);
            if (isSelected) {
                return { ...prev, students: prev.students.filter(s => s.studentId !== studentId) };
            } else {
                // Check maxStudents if defined
                if (prev.maxStudents && prev.students.length >= parseInt(prev.maxStudents)) {
                    alert(`Cannot add more than ${prev.maxStudents} students to this batch.`);
                    return prev;
                }
                return { ...prev, students: [...prev.students, { studentId, name: studentName }] };
            }
        });
    };

    const handleAddInstructor = () => {
        if (!newInstructorId.trim() || !newInstructorName.trim()) {
            alert('Instructor ID and Name are required.');
            return;
        }
        setBatch(prev => ({
            ...prev,
            instructors: [...prev.instructors, {
                instructorId: newInstructorId.trim(),
                name: newInstructorName.trim(),
                type: newInstructorType
            }]
        }));
        setNewInstructorId('');
        setNewInstructorName('');
    };

    const handleRemoveInstructor = (instructorIdToRemove) => {
        setBatch(prev => ({
            ...prev,
            instructors: prev.instructors.filter(inst => inst.instructorId !== instructorIdToRemove)
        }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!batch.title.trim()) {
            setError("Batch Title is required.");
            setIsLoading(false);
            return;
        }

        const payload = {
            ...batch,
            sessionId: sessionId, // Ensure sessionId is part of the payload
            maxStudents: batch.maxStudents ? parseInt(batch.maxStudents) : undefined,
            date: batch.date || null,
            // students: batch.students.map(s => s.studentId) // Example: Send only IDs if backend expects that
                                                           // Our backend model expects {studentId, name}
        };

        try {
            if (mode === 'edit') {
                await batchService.updateBatch(batchId, payload);
            } else { // create mode
                await sessionService.createBatchInSession(sessionId, payload);
            }
            navigate(`/sessions/${sessionId}/batches`);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to save batch');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && (!batch.title && mode ==='edit')) return <p>Loading batch data...</p>;

    return (
        <div>
            <h2>{mode === 'edit' ? `Edit Batch: ${batch.title}` : `Create New Batch for Session: ${sessionName}`}</h2>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="title">Batch Title:</label>
                    <input type="text" id="title" name="title" value={batch.title} onChange={handleChange} required />
                </div>
                <div>
                    <label htmlFor="assessmentId">Assessment Template:</label>
                    <select id="assessmentId" name="assessmentId" value={batch.assessmentId} onChange={handleChange}>
                        <option value="">-- Select Assessment (Optional) --</option>
                        {availableAssessments.map(ass => (
                            <option key={ass._id} value={ass._id}>{ass.name} ({ass.sport})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="maxStudents">Max Students (Optional):</label>
                    <input type="number" id="maxStudents" name="maxStudents" value={batch.maxStudents} onChange={handleChange} min="1" />
                </div>
                <div>
                    <label htmlFor="venue">Venue (Optional):</label>
                    <input type="text" id="venue" name="venue" value={batch.venue} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="date">Date (Optional):</label>
                    <input type="date" id="date" name="date" value={batch.date} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="startTime">Start Time (Optional):</label>
                    <input type="time" id="startTime" name="startTime" value={batch.startTime} onChange={handleChange} />
                </div>
                 <div>
                    <label htmlFor="endTime">End Time (Optional):</label>
                    <input type="time" id="endTime" name="endTime" value={batch.endTime} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="status">Status:</label>
                    <select id="status" name="status" value={batch.status} onChange={handleChange}>
                        {BATCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <hr />
                <h3>Assign Instructors</h3>
                <div>
                    <input type="text" placeholder="Instructor ID" value={newInstructorId} onChange={e => setNewInstructorId(e.target.value)} style={{width: '30%', marginRight: '5px'}}/>
                    <input type="text" placeholder="Instructor Name" value={newInstructorName} onChange={e => setNewInstructorName(e.target.value)} style={{width: '30%', marginRight: '5px'}}/>
                    <select value={newInstructorType} onChange={e => setNewInstructorType(e.target.value)} style={{width: '20%', marginRight: '5px'}}>
                        {INSTRUCTOR_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button type="button" onClick={handleAddInstructor} style={{width: '15%'}}>Add Instructor</button>
                </div>
                 {batch.instructors.length > 0 ? (
                    <ul style={{listStyle: 'none', paddingLeft: 0}}>
                        {batch.instructors.map((inst, index) => (
                            <li key={index}>{inst.name} ({inst.instructorId}) - {inst.type}
                                <button type="button" onClick={() => handleRemoveInstructor(inst.instructorId)} style={{marginLeft: '10px', backgroundColor: 'pink'}}>Remove</button>
                            </li>
                        ))}
                    </ul>
                ) : <p>No instructors assigned yet.</p>}


                <hr />
                <h3>Assign Students from Session Roster ({batch.students.length} selected)</h3>
                {sessionStudents.length === 0 && <p>No students in the parent session roster, or roster still loading.</p>}
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
                    {sessionStudents.map(stud => (
                        <div key={stud.studentId}>
                            <input
                                type="checkbox"
                                id={`stud-${stud.studentId}`}
                                checked={batch.students.some(s => s.studentId === stud.studentId)}
                                onChange={() => handleStudentSelection(stud.studentId, stud.name)}
                                disabled={
                                    !batch.students.some(s => s.studentId === stud.studentId) && // not already selected
                                    batch.maxStudents && // maxStudents is set
                                    batch.students.length >= parseInt(batch.maxStudents) // current selection reached max
                                }
                            />
                            <label htmlFor={`stud-${stud.studentId}`}>{stud.name} ({stud.studentId})</label>
                        </div>
                    ))}
                </div>

                <hr style={{marginTop: '20px'}} />
                <button type="submit" disabled={isLoading} style={{marginTop: '10px'}}>
                    {isLoading ? 'Saving...' : (mode === 'edit' ? 'Update Batch' : 'Create Batch')}
                </button>
                <button type="button" onClick={() => navigate(`/sessions/${sessionId}/batches`)} style={{marginLeft: '10px', backgroundColor: 'grey'}}>
                    Cancel
                </button>
            </form>
        </div>
    );
};

export default BatchFormPage;
