import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import batchService from '../../api/batchService'; // To get batch details (including assessment and its params)
import assessmentEntryService from '../../api/assessmentEntryService'; // To create/manage entries
import sessionService from '../../api/sessionService'; // To list sessions for selection (if batch not pre-selected)
import Papa from 'papaparse'; // CSV parsing library
import { toast } from 'react-toastify'; // Import toast


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
    const [formErrors, setFormErrors] = useState({}); // For client-side validation feedback

    // State for existing entries for this batch
    const [existingEntries, setExistingEntries] = useState([]);
    const [editingEntry, setEditingEntry] = useState(null); // Stores the entry being edited

    // CSV Upload
    const [csvFile, setCsvFile] = useState(null);
    // const [csvParsingError, setCsvParsingError] = useState(''); // Replaced by toast for parsing errors
    const [csvUploadResults, setCsvUploadResults] = useState(null); // To store { created: [], errors: [] } from backend

    const [isLoading, setIsLoading] = useState(false); // For initial page/batch data loading
    const [isSubmitting, setIsSubmitting] = useState(false); // For single entry submission
    const [isUploadingCsv, setIsUploadingCsv] = useState(false); // For CSV upload process
    // const [error, setError] = useState(null); // General page errors, replaced by toasts for operational errors

    // Fetch sessions for dropdown
    useEffect(() => {
        if (!batchIdFromParams) { // Only if batch is not fixed by URL
            setIsLoading(true);
            sessionService.getSessions()
                .then(setSessions)
                .catch(err => toast.error(err.message || 'Failed to load sessions'))
                .finally(() => setIsLoading(false));
        }
    }, [batchIdFromParams]);

    // Fetch batches when a session is selected
    useEffect(() => {
        if (selectedSessionId && !batchIdFromParams) {
            setIsLoading(true);
            sessionService.getBatchesForSession(selectedSessionId)
                .then(setBatchesInSession)
                .catch(err => toast.error(err.message || 'Failed to load batches for session'))
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
        // setError(null); // Using toasts for errors during this fetch
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
            setAttemptNumber(1);
            setParameterValues({});
            setEditingEntry(null);
            setFormErrors({});

        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to load batch details or entries.';
            toast.error(errorMsg);
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

    const handleParameterValueChange = (paramId, value, type) => {
        // Basic type awareness for input handling, though backend does final validation/conversion
        let processedValue = value;
        if (type === 'numeric' || type === 'rating') {
            // Allow empty string for temporary input state, backend will convert to null or number
            if (value === '' || value === null || value === undefined) {
                processedValue = ''; // Or null, depends on how you want to handle empty numeric fields
            } else if (!isNaN(Number(value))) {
                 // Keep as string for input field, backend will parse to Number.
                 // Or Number(value) if you want to store as number in state directly.
                 // Storing as string in state allows for inputs like "12." before becoming "12.0"
            } else {
                // Could set an input-specific error here if value is not parseable as number
            }
        }
        setParameterValues(prev => ({ ...prev, [paramId]: processedValue }));
        // Clear specific form error for this field when user types
        if (formErrors[paramId]) {
            setFormErrors(prev => ({ ...prev, [paramId]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!selectedBatchId) errors.batch = "Batch selection is required.";
        if (!currentBatch) errors.batchLoading = "Batch data is not loaded yet.";
        if (!athleteId.trim()) errors.athleteId = "Athlete ID is required.";
        if (!athleteName.trim()) errors.athleteName = "Athlete Name is required.";
        if (athleteAge && (isNaN(parseInt(athleteAge)) || parseInt(athleteAge) <= 0 || parseInt(athleteAge) > 120 )) {
            errors.athleteAge = "Invalid age.";
        }
        if (isNaN(parseInt(attemptNumber)) || parseInt(attemptNumber) < 1) {
            errors.attemptNumber = "Attempt number must be 1 or greater.";
        }

        assessmentParameters.forEach(param => {
            const value = parameterValues[param._id];
            if (param.type === 'numeric' || param.type === 'rating') {
                if (value !== undefined && value !== null && String(value).trim() !== '' && isNaN(Number(value))) {
                    errors[param._id] = `Value for ${param.name} must be a number.`;
                }
            }
            // Add more specific validation based on param.isRequired, param.min, param.max etc. if those were defined
        });

        // Example: Check if at least one parameter has a value if parameters exist
        // if (assessmentParameters.length > 0) {
        //     const hasAtLeastOneValue = Object.values(parameterValues).some(val => val !== undefined && String(val).trim() !== '');
        //     if (!hasAtLeastOneValue) errors.parameters = "At least one parameter value must be entered.";
        // }

        setFormErrors(errors);
        return Object.keys(errors).length === 0; // Return true if no errors
    };


    const handleSubmitEntry = async (e) => {
        e.preventDefault();
        // setError(null); // No longer needed
        setFormErrors({}); // Clear previous form errors

        if (!validateForm()) { // validateForm now sets formErrors state
            toast.warn("Please correct the errors in the form.");
            return;
        }

        setIsSubmitting(true);

        const entryDataPayload = {
            athleteId: athleteId.trim(),
            athleteName: athleteName.trim(),
            athleteAge: athleteAge ? parseInt(athleteAge) : undefined,
            athleteGender,
            attemptNumber: parseInt(attemptNumber) || 1,
            data: assessmentParameters.map(param => {
                let valueToSubmit = parameterValues[param._id];
                if ((param.type === 'numeric' || param.type === 'rating') && String(valueToSubmit).trim() === '') {
                    valueToSubmit = null;
                }
                return {
                    parameterId: param._id,
                    value: valueToSubmit !== undefined ? valueToSubmit : null
                };
            }).filter(p => p.value !== null && p.value !== undefined && String(p.value).trim() !== '')
        };

        if (assessmentParameters.length > 0 && entryDataPayload.data.length === 0) {
             toast.error('At least one parameter value must be entered and valid.');
             setIsSubmitting(false);
             return;
        }

        try {
            if (editingEntry) {
                await assessmentEntryService.updateAssessmentEntry(editingEntry._id, entryDataPayload);
                toast.success('Entry updated successfully!');
            } else {
                await assessmentEntryService.createAssessmentEntry(selectedBatchId, entryDataPayload);
                toast.success('Entry submitted successfully!');
            }
            fetchBatchDataAndEntries(selectedBatchId);
            // Reset form fields after successful submission (if not editing)
            if (!editingEntry) {
                setAthleteId('');
                setAthleteName('');
                setAthleteAge('');
                setAttemptNumber(1);
                setParameterValues({});
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to submit entry.';
            toast.error(errorMsg);
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
        setFormErrors({}); // Clear any previous form errors
        window.scrollTo(0,0);
    };

    const handleDeleteEntry = async (entryId) => {
        if (window.confirm("Are you sure you want to delete this entry?")) {
            // Using isSubmitting for general loading state for this action too
            setIsSubmitting(true);
            try {
                await assessmentEntryService.deleteAssessmentEntry(entryId);
                toast.success('Entry deleted successfully!');
                fetchBatchDataAndEntries(selectedBatchId);
            } catch (err) {
                const errorMsg = err.response?.data?.message || err.message || 'Failed to delete entry.';
                toast.error(errorMsg);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleFileChange = (event) => {
        setCsvFile(event.target.files[0]);
        // setCsvParsingError(''); // Replaced by toast
        setCsvUploadResults(null);
    };

    const handleCSVUpload = () => {
        if (!csvFile) {
            toast.error("Please select a CSV file to upload.");
            return;
        }
        if (!selectedBatchId || !currentBatch?.assessmentId?.parameters) {
            toast.error("Please select a batch with an assessment template first.");
            return;
        }

        setIsUploadingCsv(true); // Specific loading state for CSV
        // setCsvParsingError(''); // Replaced by toast
        setCsvUploadResults(null);

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: 'greedy',
            dynamicTyping: false,
            complete: async (results) => {
                if (results.errors.length > 0) {
                    console.error("CSV Parsing errors:", results.errors);
                    const errorMessages = results.errors.map(e => e.message).join(', ');
                    toast.error(`Error parsing CSV: ${errorMessages}. Please check file format.`);
                    setIsUploadingCsv(false);
                    return;
                }

                const parsedEntries = [];
                const localParsingErrors = [];

                const assessmentParamsDetails = currentBatch.assessmentId.parameters;
                const paramHeaderToIdMap = new Map();
                assessmentParamsDetails.forEach(p => {
                    paramHeaderToIdMap.set(`${p.name} (${p.unit || 'value'})`, p._id.toString());
                    paramHeaderToIdMap.set(p.name, p._id.toString());
                });

                results.data.forEach((row, index) => {
                    const athleteId = row['AthleteID']?.trim();
                    const athleteName = row['AthleteName']?.trim();

                    if (!athleteId || !athleteName) {
                        if (Object.values(row).every(val => String(val).trim() === '')) return;
                        localParsingErrors.push({ row: index + 2, error: "AthleteID and AthleteName are required." });
                        return;
                    }

                    const entryData = {
                        athleteId, athleteName,
                        athleteAge: row['AthleteAge'] ? parseInt(row['AthleteAge']) : undefined,
                        athleteGender: row['AthleteGender']?.trim() || 'Not Specified',
                        attemptNumber: row['AttemptNumber (Optional)'] ? parseInt(row['AttemptNumber (Optional)']) : 1,
                        data: []
                    };

                    let paramsFoundForRow = 0;
                    for (const headerKey in row) {
                        if (['AthleteID', 'AthleteName', 'AthleteAge', 'AthleteGender', 'AttemptNumber (Optional)'].includes(headerKey)) continue;
                        const paramId = paramHeaderToIdMap.get(headerKey.trim());
                        if (paramId) {
                            const value = String(row[headerKey]).trim();
                            if (value !== '') {
                                entryData.data.push({ parameterId: paramId, value: value });
                                paramsFoundForRow++;
                            }
                        }
                    }

                    if (assessmentParamsDetails.length === 0 || paramsFoundForRow > 0) {
                        parsedEntries.push(entryData);
                    } else if (assessmentParamsDetails.length > 0 && paramsFoundForRow === 0) {
                         localParsingErrors.push({ row: index + 2, athleteId, error: "No parameter data found for this athlete, but assessment expects parameters." });
                    }
                });

                if (localParsingErrors.length > 0) {
                    toast.error("Found errors in CSV data. Please correct them and try again. See details below.");
                    setCsvUploadResults({ created: [], errors: localParsingErrors.map(e => ({...e, from: 'client-parser'})) });
                    setIsUploadingCsv(false);
                    return;
                }

                if (parsedEntries.length === 0) {
                    toast.warn("No valid entries found in CSV to upload after parsing.");
                    setIsUploadingCsv(false);
                    return;
                }

                try {
                    const response = await assessmentEntryService.createBulkAssessmentEntries(selectedBatchId, parsedEntries);
                    setCsvUploadResults(response.results);
                    if (response.results?.created?.length > 0) {
                         toast.success(`${response.results.created.length} entries from CSV uploaded successfully!`);
                         fetchBatchDataAndEntries(selectedBatchId);
                    }
                    if (response.results?.errors?.length > 0) {
                        toast.error("Some entries from CSV failed to save on the server. See details below.");
                    }
                     if (response.results?.created?.length === 0 && response.results?.errors?.length === 0) {
                        toast.info("CSV processed. No new entries were created (they may have been duplicates or empty).");
                    }
                } catch (err) {
                    const errMsg = err.response?.data?.message || err.message || 'Bulk CSV upload failed due to a server error.';
                    toast.error(errMsg);
                    setCsvUploadResults({ created: [], errors: [{ error: errMsg, from: 'server-request'}] });
                } finally {
                    setIsUploadingCsv(false);
                }
            },
            error: (err) => {
                console.error("Papa.parse error:", err);
                toast.error(`CSV File Reading Error: ${err.message}`);
                setIsUploadingCsv(false);
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
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px'}}>
                            <div>
                                <label htmlFor="athleteId">Athlete ID:</label>
                                <input list="batchStudentIds" type="text" id="athleteId" value={athleteId} onChange={handleAthleteIdChange} required disabled={!!editingEntry} />
                                <datalist id="batchStudentIds">
                                    {batchStudents.map(s => <option key={s.studentId} value={s.studentId}>{s.name}</option>)}
                                </datalist>
                                {formErrors.athleteId && <p style={{color: 'red', fontSize: '0.8em'}}>{formErrors.athleteId}</p>}
                            </div>
                            <div>
                                <label htmlFor="athleteName">Athlete Name:</label>
                                <input type="text" id="athleteName" value={athleteName} onChange={e => setAthleteName(e.target.value)} required />
                                {formErrors.athleteName && <p style={{color: 'red', fontSize: '0.8em'}}>{formErrors.athleteName}</p>}
                            </div>
                            <div>
                                <label htmlFor="athleteAge">Age:</label>
                                <input type="number" id="athleteAge" value={athleteAge} onChange={e => setAthleteAge(e.target.value)} />
                                {formErrors.athleteAge && <p style={{color: 'red', fontSize: '0.8em'}}>{formErrors.athleteAge}</p>}
                            </div>
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
                                {formErrors.attemptNumber && <p style={{color: 'red', fontSize: '0.8em'}}>{formErrors.attemptNumber}</p>}
                            </div>
                        </div>

                        <h5>Parameter Values:</h5>
                        {assessmentParameters.length > 0 ? assessmentParameters.map(param => (
                            <div key={param._id} style={{marginBottom: '5px'}}>
                                <label htmlFor={`param-${param._id}`}>{param.name} ({param.unit || 'value'}):</label>
                                <input
                                    type={param.type === 'numeric' || param.type === 'rating' ? 'number' : (param.type === 'time' ? 'text' : 'text')} // 'time' could be 'number' if storing seconds
                                    id={`param-${param._id}`}
                                    placeholder={param.type === 'time' ? 'e.g., 12.34 (s) or 01:30.5 (m:s.ms)' : (param.type === 'numeric' || param.type === 'rating' ? 'Enter number' : 'Enter text')}
                                    value={parameterValues[param._id] || ''}
                                    onChange={e => handleParameterValueChange(param._id, e.target.value, param.type)}
                                    step={param.type === 'numeric' && (param.unit === '%' || param.unit === 'score') ? '1' : 'any'}
                                />
                                {formErrors[param._id] && <p style={{color: 'red', fontSize: '0.8em'}}>{formErrors[param._id]}</p>}
                            </div>
                        )) : <p>No parameters defined for this assessment.</p>}
                        {formErrors.parameters && <p style={{color: 'red', fontSize: '0.8em'}}>{formErrors.parameters}</p>}

                        <button type="submit" disabled={isSubmitting || (currentBatch && assessmentParameters.length === 0 && !confirm("No parameters defined for this assessment. Submit basic athlete info only?"))} style={{marginTop: '10px'}}>
                            {isSubmitting ? 'Submitting...' : (editingEntry ? 'Update Entry' : 'Submit Entry')}
                        </button>
                        {editingEntry && <button type="button" onClick={() => {setEditingEntry(null); setAthleteId(''); setAthleteName(''); setAthleteAge(''); setParameterValues({}); setFormErrors({});}} style={{marginLeft: '10px', backgroundColor: 'grey'}}>Cancel Edit</button>}
                    </form>

                    {/* CSV Bulk Upload Section */}
                    <h4>Bulk Upload via CSV</h4>
                    <div style={{border: '1px solid #ccc', padding: '15px', marginBottom: '20px'}}>
                        <button
                            type="button"
                            onClick={downloadCSVTemplate}
                            disabled={!currentBatch || !assessmentParameters || assessmentParameters.length === 0}
                        >
                            Download CSV Template for "{currentBatch.assessmentId?.name || 'Selected Batch'}"
                        </button>
                        <p style={{fontSize:'0.9em', color: '#555'}}>
                            Required columns: <strong>AthleteID, AthleteName</strong>. Optional: <strong>AthleteAge, AthleteGender, AttemptNumber (Optional)</strong>.
                            Then one column for each parameter like: <strong>"Parameter Name (unit)"</strong>.
                        </p>
                        <input type="file" accept=".csv" onChange={handleFileChange} key={csvFile ? 'file-selected' : 'no-file'} /> {/* Add key to reset input */}
                        <button
                            onClick={handleCSVUpload}
                            disabled={!csvFile || isSubmitting || !currentBatch || !assessmentParameters || assessmentParameters.length === 0}
                            style={{marginLeft: '10px'}}
                        >
                            {isSubmitting ? 'Uploading CSV...' : 'Upload CSV & Process'}
                        </button>

                        {csvParsingError && <p style={{color: 'red', marginTop: '10px'}}>{csvParsingError}</p>}
                        {csvUploadResults && (
                            <div style={{marginTop: '10px', fontSize: '0.9em'}}>
                                {csvUploadResults.created?.length > 0 &&
                                    <p style={{color: 'green'}}>Successfully created/updated {csvUploadResults.created.length} entries from CSV.</p>
                                }
                                {csvUploadResults.errors?.length > 0 && (
                                    <>
                                        <p style={{color: 'red'}}>Encountered {csvUploadResults.errors.length} errors during CSV processing:</p>
                                        <ul style={{maxHeight: '150px', overflowY: 'auto', border: '1px solid #f00', padding: '5px'}}>
                                            {csvUploadResults.errors.map((err, index) => (
                                                <li key={index}>
                                                    {err.row && `Row ${err.row}: `}
                                                    {err.athleteId && `Athlete ${err.athleteId}: `}
                                                    {err.error}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
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
