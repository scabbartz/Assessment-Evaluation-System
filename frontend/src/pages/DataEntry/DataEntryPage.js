import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import batchService from '../../api/batchService'; // To get batch details (including assessment and its params)
import assessmentEntryService from '../../api/assessmentEntryService'; // To create/manage entries
import sessionService from '../../api/sessionService'; // To list sessions for selection (if batch not pre-selected)
// CSV parsing library (install if not already: npm installpapaparse)
import Papa from 'papaparse';


const DataEntryPage = () => {
    const { batchId: batchIdFromParams } = useParams(); // Batch might be pre-selected via URL
    const navigate = useNavigate();

    // State for selections
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [batchesInSession, setBatchesInSession] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState(batchIdFromParams || '');

    // State for the current batch and its assessment details
    const [currentBatch, setCurrentBatch] = useState(null);
    const [assessmentParameters, setAssessmentParameters] = useState([]);
    const [batchStudents, setBatchStudents] = useState([]); // Students rostered for the selected batch

    // State for the data entry form (single entry)
    const [athleteId, setAthleteId] = useState('');
    const [athleteName, setAthleteName] = useState(''); // Can be auto-filled if athleteId is from roster
    const [athleteAge, setAthleteAge] = useState('');
    const [athleteGender, setAthleteGender] = useState('Male');
    const [attemptNumber, setAttemptNumber] = useState(1);
    const [parameterValues, setParameterValues] = useState({}); // { parameterId: value, ... }

    // State for existing entries for this batch
    const [existingEntries, setExistingEntries] = useState([]);
    const [editingEntry, setEditingEntry] = useState(null); // Stores the entry being edited

    // CSV Upload
    const [csvFile, setCsvFile] = useState(null);
    const [csvErrors, setCsvErrors] = useState([]);
    const [csvSuccessCount, setCsvSuccessCount] = useState(0);

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Fetch sessions for dropdown
    useEffect(() => {
        if (!batchIdFromParams) { // Only if batch is not fixed by URL
            setIsLoading(true);
            sessionService.getSessions()
                .then(setSessions)
                .catch(err => setError(err.message || 'Failed to load sessions'))
                .finally(() => setIsLoading(false));
        }
    }, [batchIdFromParams]);

    // Fetch batches when a session is selected
    useEffect(() => {
        if (selectedSessionId && !batchIdFromParams) {
            setIsLoading(true);
            sessionService.getBatchesForSession(selectedSessionId)
                .then(setBatchesInSession)
                .catch(err => setError(err.message || 'Failed to load batches for session'))
                .finally(() => setIsLoading(false));
        }
    }, [selectedSessionId, batchIdFromParams]);

    // Fetch batch details (assessment params, students) and existing entries when a batch is selected
    const fetchBatchDataAndEntries = useCallback(async (batchToLoadId) => {
        if (!batchToLoadId) {
            setCurrentBatch(null);
            setAssessmentParameters([]);
            setBatchStudents([]);
            setExistingEntries([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const batchDetails = await batchService.getBatchById(batchToLoadId);
            setCurrentBatch(batchDetails);
            setAssessmentParameters(batchDetails.assessmentId?.parameters || []);
            setBatchStudents(batchDetails.students || []);

            const entries = await assessmentEntryService.getEntriesForBatch(batchToLoadId);
            setExistingEntries(entries);

            // Reset form for new entry
            setAthleteId('');
            setAthleteName('');
            setAthleteAge('');
            setParameterValues({});
            setEditingEntry(null);

        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load batch details or entries.');
            setCurrentBatch(null); // Clear batch if error
            setAssessmentParameters([]);
            setBatchStudents([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedBatchId) {
            fetchBatchDataAndEntries(selectedBatchId);
        }
    }, [selectedBatchId, fetchBatchDataAndEntries]);

    // Auto-fill athlete name and potentially age/gender if athleteId from roster is selected
    const handleAthleteIdChange = (e) => {
        const currentAthleteId = e.target.value;
        setAthleteId(currentAthleteId);
        const rosteredStudent = batchStudents.find(s => s.studentId === currentAthleteId);
        if (rosteredStudent) {
            setAthleteName(rosteredStudent.name);
            // setAthleteAge(rosteredStudent.age || ''); // If age/gender are in roster
            // setAthleteGender(rosteredStudent.gender || 'Male');
        } else {
            setAthleteName(''); // Clear if not in roster (manual entry)
        }
    };

    const handleParameterValueChange = (paramId, value) => {
        setParameterValues(prev => ({ ...prev, [paramId]: value }));
    };

    const handleSubmitEntry = async (e) => {
        e.preventDefault();
        if (!selectedBatchId || !currentBatch || !athleteId.trim() || !athleteName.trim()) {
            setError('Batch, Athlete ID, and Athlete Name are required.');
            return;
        }
        if (assessmentParameters.length > 0 && Object.keys(parameterValues).length === 0) {
            setError('At least one parameter value must be entered.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const entryDataPayload = {
            athleteId: athleteId.trim(),
            athleteName: athleteName.trim(),
            athleteAge: athleteAge ? parseInt(athleteAge) : undefined,
            athleteGender,
            attemptNumber: parseInt(attemptNumber) || 1,
            data: assessmentParameters.map(param => ({
                parameterId: param._id,
                // parameterName: param.name, // Will be set by backend
                // unit: param.unit,         // Will be set by backend
                value: parameterValues[param._id] !== undefined ? parameterValues[param._id] : null // Send null if not entered
            })).filter(p => p.value !== null) // Optionally filter out params with no value entered
        };

        try {
            if (editingEntry) {
                await assessmentEntryService.updateAssessmentEntry(editingEntry._id, entryDataPayload);
                alert('Entry updated successfully!');
            } else {
                await assessmentEntryService.createAssessmentEntry(selectedBatchId, entryDataPayload);
                alert('Entry submitted successfully!');
            }
            // Refresh entries and reset form
            fetchBatchDataAndEntries(selectedBatchId);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to submit entry.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditEntry = (entry) => {
        setEditingEntry(entry);
        setAthleteId(entry.athleteId);
        setAthleteName(entry.athleteName);
        setAthleteAge(entry.athleteAge || '');
        setAthleteGender(entry.athleteGender || 'Male');
        setAttemptNumber(entry.attemptNumber || 1);
        const pValues = {};
        entry.data.forEach(pd => { pValues[pd.parameterId] = pd.rawValue !== undefined ? pd.rawValue : pd.value; });
        setParameterValues(pValues);
        window.scrollTo(0,0); // Scroll to top to see the form
    };

    const handleDeleteEntry = async (entryId) => {
        if (window.confirm("Are you sure you want to delete this entry?")) {
            setIsSubmitting(true); // Use general submitting flag
            try {
                await assessmentEntryService.deleteAssessmentEntry(entryId);
                alert('Entry deleted successfully!');
                fetchBatchDataAndEntries(selectedBatchId);
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to delete entry.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleFileChange = (event) => {
        setCsvFile(event.target.files[0]);
        setCsvErrors([]);
        setCsvSuccessCount(0);
    };

    const handleCSVUpload = () => {
        if (!csvFile || !selectedBatchId || !currentBatch?.assessmentId?.parameters) {
            setError("Please select a batch with an assessment and a CSV file to upload.");
            return;
        }
        setIsSubmitting(true);
        setCsvErrors([]);
        setCsvSuccessCount(0);

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const parsedEntries = [];
                const localErrors = [];
                const assessmentParamsMap = new Map(currentBatch.assessmentId.parameters.map(p => [`${p.name} (${p.unit || 'value'})`, p._id]));

                results.data.forEach((row, index) => {
                    const athleteId = row['AthleteID']?.trim();
                    const athleteName = row['AthleteName']?.trim();
                    if (!athleteId || !athleteName) {
                        localErrors.push({ row: index + 1, error: "AthleteID and AthleteName are required."});
                        return;
                    }
                    const entry = {
                        athleteId,
                        athleteName,
                        athleteAge: row['AthleteAge'] ? parseInt(row['AthleteAge']) : undefined,
                        athleteGender: row['AthleteGender']?.trim() || 'Not Specified',
                        attemptNumber: row['AttemptNumber (Optional)'] ? parseInt(row['AttemptNumber (Optional)']) : 1,
                        data: []
                    };
                    let hasParamData = false;
                    assessmentParamsMap.forEach((paramId, headerName) => {
                        if (row[headerName] !== undefined && row[headerName] !== null && row[headerName] !== '') {
                            entry.data.push({ parameterId: paramId, value: row[headerName] });
                            hasParamData = true;
                        }
                    });

                    if (!hasParamData && assessmentParameters.length > 0) { // Only error if assessment expects params
                        localErrors.push({row: index + 1, athleteId, error: "No parameter data found for this athlete."});
                        return;
                    }
                    parsedEntries.push(entry);
                });

                if (localErrors.length > 0) {
                    setCsvErrors(localErrors);
                    setIsSubmitting(false);
                    return;
                }

                if (parsedEntries.length === 0) {
                    setError("No valid entries found in CSV to upload.");
                     setIsSubmitting(false);
                    return;
                }

                try {
                    const response = await assessmentEntryService.createBulkAssessmentEntries(selectedBatchId, parsedEntries);
                    setCsvSuccessCount(response.results?.created?.length || 0);
                    if (response.results?.errors?.length > 0) {
                        setCsvErrors(response.results.errors.map(err => ({
                            athleteId: err.athleteId,
                            error: `${err.error} ${err.details || ''}`
                        })));
                    }
                    if (response.results?.created?.length > 0) {
                         alert(`${response.results.created.length} entries uploaded successfully!`);
                         fetchBatchDataAndEntries(selectedBatchId); // Refresh list
                    } else if (!response.results?.errors?.length) {
                        alert("Bulk upload complete. No new entries were created (perhaps they were all duplicates or other issues).");
                    }

                } catch (err) {
                    setError(err.response?.data?.message || err.message || 'Bulk upload failed.');
                     setCsvErrors([{error: `Server error during bulk upload: ${err.response?.data?.message || err.message}`}]);
                } finally {
                    setIsSubmitting(false);
                }
            },
            error: (error) => {
                setError(`CSV parsing error: ${error.message}`);
                setIsSubmitting(false);
            }
        });
    };

    const downloadCSVTemplate = () => {
        if (!currentBatch || !assessmentParameters || assessmentParameters.length === 0) {
            alert("Please select a batch with an assessment template to download its specific CSV template.");
            const genericTemplate = assessmentEntryService.generateCSVTemplate([]);
            const blob = new Blob([genericTemplate], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "generic_data_entry_template.csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            return;
        }
        const csvContent = assessmentEntryService.generateCSVTemplate(assessmentParameters);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `${currentBatch.title}_data_entry_template.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };


    return (
        <div>
            <h2>Data Entry</h2>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {isLoading && <p>Loading configuration...</p>}

            {/* Session and Batch Selection (if batch not fixed by URL) */}
            {!batchIdFromParams && (
                <div style={{display: 'flex', gap: '20px', marginBottom: '20px'}}>
                    <div>
                        <label htmlFor="sessionSelect">Select Session:</label>
                        <select id="sessionSelect" value={selectedSessionId} onChange={e => {setSelectedSessionId(e.target.value); setSelectedBatchId(''); setCurrentBatch(null);}}>
                            <option value="">-- Select Session --</option>
                            {sessions.map(s => <option key={s._id} value={s._id}>{s.name} ({s.year} - {s.term})</option>)}
                        </select>
                    </div>
                    {selectedSessionId && (
                    <div>
                        <label htmlFor="batchSelect">Select Batch:</label>
                        <select id="batchSelect" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)}>
                            <option value="">-- Select Batch --</option>
                            {batchesInSession.map(b => <option key={b._id} value={b._id}>{b.title} ({b.assessmentId?.name || 'No Assessment'})</option>)}
                        </select>
                    </div>
                    )}
                </div>
            )}

            {currentBatch && (
                <div>
                    <h3>Entering Data for Batch: {currentBatch.title}</h3>
                    <p>Assessment: {currentBatch.assessmentId?.name || "N/A (No assessment linked to batch)"}</p>
                    {currentBatch.assessmentId?.parameters?.length === 0 && <p style={{color: 'orange'}}>Warning: The linked assessment template has no parameters defined.</p>}

                    {/* Single Entry Form */}
                    <h4>{editingEntry ? "Edit Entry" : "Add New Entry"}</h4>
                    <form onSubmit={handleSubmitEntry} style={{border: '1px solid #ccc', padding: '15px', marginBottom: '20px'}}>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                            <div>
                                <label htmlFor="athleteId">Athlete ID:</label>
                                <input list="batchStudentIds" type="text" id="athleteId" value={athleteId} onChange={handleAthleteIdChange} required disabled={!!editingEntry} />
                                <datalist id="batchStudentIds">
                                    {batchStudents.map(s => <option key={s.studentId} value={s.studentId}>{s.name}</option>)}
                                </datalist>
                            </div>
                            <div><label htmlFor="athleteName">Athlete Name:</label><input type="text" id="athleteName" value={athleteName} onChange={e => setAthleteName(e.target.value)} required /></div>
                            <div><label htmlFor="athleteAge">Age:</label><input type="number" id="athleteAge" value={athleteAge} onChange={e => setAthleteAge(e.target.value)} /></div>
                            <div>
                                <label htmlFor="athleteGender">Gender:</label>
                                <select id="athleteGender" value={athleteGender} onChange={e => setAthleteGender(e.target.value)}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Not Specified">Not Specified</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="attemptNumber">Attempt Number:</label>
                                <input type="number" id="attemptNumber" value={attemptNumber} onChange={e => setAttemptNumber(e.target.value)} min="1" defaultValue="1" />
                            </div>
                        </div>

                        <h5>Parameter Values:</h5>
                        {assessmentParameters.length > 0 ? assessmentParameters.map(param => (
                            <div key={param._id} style={{marginBottom: '5px'}}>
                                <label htmlFor={`param-${param._id}`}>{param.name} ({param.unit || 'value'}):</label>
                                <input
                                    type={param.type === 'numeric' || param.type === 'rating' ? 'number' : (param.type === 'time' ? 'text' : 'text')} // 'time' could be 'number' if storing seconds
                                    id={`param-${param._id}`}
                                    placeholder={param.type === 'time' ? 'e.g., 12.34 (s) or 01:30.5 (m:s.ms)' : ''}
                                    value={parameterValues[param._id] || ''}
                                    onChange={e => handleParameterValueChange(param._id, e.target.value)}
                                    step={param.type === 'numeric' && (param.unit === '%' || param.unit === 'score') ? '1' : 'any'} // Basic step
                                />
                            </div>
                        )) : <p>No parameters defined for this assessment.</p>}

                        <button type="submit" disabled={isSubmitting || assessmentParameters.length === 0} style={{marginTop: '10px'}}>
                            {isSubmitting ? 'Submitting...' : (editingEntry ? 'Update Entry' : 'Submit Entry')}
                        </button>
                        {editingEntry && <button type="button" onClick={() => {setEditingEntry(null); setAthleteId(''); setAthleteName(''); setParameterValues({});}} style={{marginLeft: '10px', backgroundColor: 'grey'}}>Cancel Edit</button>}
                    </form>

                    {/* CSV Bulk Upload Section */}
                    <h4>Bulk Upload via CSV</h4>
                    <div style={{border: '1px solid #ccc', padding: '15px', marginBottom: '20px'}}>
                        <button type="button" onClick={downloadCSVTemplate} disabled={!currentBatch || assessmentParameters.length === 0}>
                            Download CSV Template for "{currentBatch.assessmentId?.name || 'this Batch'}"
                        </button>
                        <p style={{fontSize:'0.9em', color: '#555'}}>Template columns: AthleteID, AthleteName, AthleteAge, AthleteGender, AttemptNumber (Optional), then one column for each parameter like "Parameter Name (unit)".</p>
                        <input type="file" accept=".csv" onChange={handleFileChange} />
                        <button onClick={handleCSVUpload} disabled={!csvFile || isSubmitting || assessmentParameters.length === 0}>
                            {isSubmitting ? 'Uploading...' : 'Upload CSV'}
                        </button>
                        {csvSuccessCount > 0 && <p style={{color: 'green'}}>{csvSuccessCount} entries from CSV processed successfully.</p>}
                        {csvErrors.length > 0 && (
                            <div style={{color: 'red', marginTop: '10px'}}>
                                <p>CSV Upload Errors:</p>
                                <ul style={{maxHeight: '150px', overflowY: 'auto'}}>
                                    {csvErrors.map((err, index) => <li key={index}>Row {err.row || '-'}{err.athleteId ? ` (Athlete: ${err.athleteId})` : ''}: {err.error}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>


                    {/* Existing Entries List */}
                    <h4>Existing Entries for this Batch ({existingEntries.length})</h4>
                    {existingEntries.length > 0 ? (
                        <table style={{width: '100%', fontSize: '0.9em'}}>
                            <thead>
                                <tr>
                                    <th>Athlete Name (ID)</th>
                                    <th>Attempt</th>
                                    {assessmentParameters.slice(0, 4).map(p => <th key={p._id}>{p.name}</th>) /* Show first few params */}
                                    {assessmentParameters.length > 4 && <th>...</th>}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {existingEntries.map(entry => (
                                    <tr key={entry._id}>
                                        <td>{entry.athleteName} ({entry.athleteId})</td>
                                        <td>{entry.attemptNumber || 1}</td>
                                        {assessmentParameters.slice(0, 4).map(p => {
                                            const paramData = entry.data.find(d => d.parameterId === p._id || d.parameterId._id === p._id); // Handle populated vs direct ID
                                            return <td key={p._id}>{paramData ? (paramData.rawValue !== undefined ? paramData.rawValue : paramData.value) : 'N/A'}</td>;
                                        })}
                                        {assessmentParameters.length > 4 && <td>...</td>}
                                        <td>
                                            <button onClick={() => handleEditEntry(entry)} disabled={isSubmitting}>Edit</button>
                                            <button onClick={() => handleDeleteEntry(entry._id)} style={{backgroundColor: 'red', marginLeft: '5px'}} disabled={isSubmitting}>Delete</button>
                                            {/* TODO: View Details Link */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p>No entries recorded for this batch yet.</p>}

                </div>
            )}
            {!selectedBatchId && !batchIdFromParams && <p>Please select a session and then a batch to enter data.</p>}
             {batchIdFromParams && !currentBatch && !isLoading && <p>Batch with ID '{batchIdFromParams}' not found or could not be loaded.</p>}
             <Link to={selectedBatchId ? `/sessions/${currentBatch?.sessionId}/batches` : (selectedSessionId ? `/sessions/${selectedSessionId}/batches` : '/sessions')} style={{display:'block', marginTop:'20px'}}>
                Back to Batches / Sessions
            </Link>
        </div>
    );
};

export default DataEntryPage;
