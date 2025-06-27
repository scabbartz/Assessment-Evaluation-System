import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import sessionService from '../../api/sessionService';

const SESSION_STATUSES = ['upcoming', 'active', 'completed', 'archived'];

const SessionFormPage = ({ mode }) => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [session, setSession] = useState({
        name: '',
        year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, // Default year format
        term: '',
        description: '',
        startDate: '',
        endDate: '',
        status: SESSION_STATUSES[0],
        students: [] // [{ studentId: '', name: '' }]
    });
    const [newStudentId, setNewStudentId] = useState('');
    const [newStudentName, setNewStudentName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (mode === 'edit' && id) {
            setIsLoading(true);
            sessionService.getSessionById(id)
                .then(data => {
                    setSession({
                        ...data,
                        startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
                        endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
                        students: data.students || []
                    });
                    setIsLoading(false);
                })
                .catch(err => {
                    setError(err.response?.data?.message || err.message || 'Failed to fetch session');
                    setIsLoading(false);
                });
        } else if (mode === 'create') {
            setSession({ // Reset for create mode
                name: '', year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, term: '', description: '',
                startDate: '', endDate: '', status: SESSION_STATUSES[0], students: []
            });
        }
    }, [id, mode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSession(prev => ({ ...prev, [name]: value }));
    };

    const handleAddStudent = () => {
        if (!newStudentId.trim() || !newStudentName.trim()) {
            alert('Student ID and Name are required.');
            return;
        }
        if (session.students.find(s => s.studentId === newStudentId.trim())) {
            alert('Student ID already exists in this session.');
            return;
        }
        setSession(prev => ({
            ...prev,
            students: [...prev.students, { studentId: newStudentId.trim(), name: newStudentName.trim() }]
        }));
        setNewStudentId('');
        setNewStudentName('');
    };

    const handleRemoveStudent = (studentIdToRemove) => {
        setSession(prev => ({
            ...prev,
            students: prev.students.filter(s => s.studentId !== studentIdToRemove)
        }));
    };

    // Placeholder for CSV import UI trigger
    const handleImportRoster = () => {
        // This will later integrate with a file upload component (Section 3.2)
        alert("Roster import functionality will be implemented in Data Capture section.");
        // Example: const studentsFromFile = await parseCsvAndGetStudents();
        // setSession(prev => ({ ...prev, students: studentsFromFile }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!session.name.trim() || !session.year.trim() || !session.term.trim()) {
            setError("Session Name, Year, and Term are required.");
            setIsLoading(false);
            return;
        }
        // Validate year format
        if (!/^\d{4}-\d{4}$/.test(session.year)) {
            setError("Year must be in YYYY-YYYY format (e.g., 2023-2024).");
            setIsLoading(false);
            return;
        }

        const payload = {
            ...session,
            startDate: session.startDate || null, // Send null if empty
            endDate: session.endDate || null,     // Send null if empty
        };

        try {
            if (mode === 'edit') {
                await sessionService.updateSession(id, payload);
            } else {
                await sessionService.createSession(payload);
            }
            navigate('/sessions');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to save session');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && mode === 'edit') return <p>Loading session data...</p>;

    return (
        <div>
            <h2>{mode === 'edit' ? 'Edit Session' : 'Create New Session'}</h2>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name">Session Name:</label>
                    <input type="text" id="name" name="name" value={session.name} onChange={handleChange} required />
                </div>
                <div>
                    <label htmlFor="year">Year (YYYY-YYYY):</label>
                    <input type="text" id="year" name="year" value={session.year} onChange={handleChange} required pattern="\d{4}-\d{4}" placeholder="e.g., 2023-2024"/>
                </div>
                <div>
                    <label htmlFor="term">Term (e.g., Term 1, Annual Camp):</label>
                    <input type="text" id="term" name="term" value={session.term} onChange={handleChange} required />
                </div>
                <div>
                    <label htmlFor="description">Description:</label>
                    <textarea id="description" name="description" value={session.description} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="startDate">Start Date:</label>
                    <input type="date" id="startDate" name="startDate" value={session.startDate} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="endDate">End Date:</label>
                    <input type="date" id="endDate" name="endDate" value={session.endDate} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="status">Status:</label>
                    <select id="status" name="status" value={session.status} onChange={handleChange}>
                        {SESSION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <hr />
                <h3>Student Roster</h3>
                <div>
                    <input
                        type="text"
                        placeholder="New Student ID"
                        value={newStudentId}
                        onChange={(e) => setNewStudentId(e.target.value)}
                        style={{width: 'calc(40% - 5px)', marginRight: '5px'}}
                    />
                    <input
                        type="text"
                        placeholder="New Student Name"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        style={{width: 'calc(40% - 10px)', marginRight: '10px'}}
                    />
                    <button type="button" onClick={handleAddStudent} style={{width: 'calc(20% - 5px)'}}>Add Student</button>
                </div>
                <button type="button" onClick={handleImportRoster} style={{marginTop: '10px', backgroundColor: '#5cb85c'}}>
                    Import Roster (CSV - Placeholder)
                </button>
                {session.students.length > 0 ? (
                    <ul style={{listStyle: 'none', paddingLeft: 0, maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', marginTop: '10px'}}>
                        {session.students.map((student, index) => (
                            <li key={index} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #eee'}}>
                                <span>{student.name} ({student.studentId})</span>
                                <button type="button" onClick={() => handleRemoveStudent(student.studentId)} style={{backgroundColor: 'red', fontSize: '0.8em', padding: '3px 6px'}}>
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : <p>No students added to this session yet.</p>}

                <hr style={{marginTop: '20px'}} />
                <button type="submit" disabled={isLoading} style={{marginTop: '10px'}}>
                    {isLoading ? 'Saving...' : (mode === 'edit' ? 'Update Session' : 'Create Session')}
                </button>
                <button type="button" onClick={() => navigate('/sessions')} style={{marginLeft: '10px', backgroundColor: 'grey'}}>
                    Cancel
                </button>
            </form>
        </div>
    );
};

export default SessionFormPage;
