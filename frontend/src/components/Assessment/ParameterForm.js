import React, { useState, useEffect } from 'react';

// Expanded enums to match backend model (or use a shared constants file)
const PARAM_UNITS = ['cm', 's', 'reps', 'kg', 'm', 'score', 'text', '%', 'rating', 'level', 'px', 'bpm', 'mmhg', 'lbs'];
const PARAM_TAGS = ['Strength', 'Agility', 'Endurance', 'Skill', 'Power', 'Speed', 'Flexibility', 'Cognitive', 'Body Composition', 'Tactical', 'Psychological'];
const PARAM_TYPES = ['numeric', 'time', 'text', 'rating', 'choice'];

const ParameterForm = ({ parameter: initialParameter, onSubmit, onCancel, index }) => {
    const [parameter, setParameter] = useState({
        name: '',
        unit: PARAM_UNITS[0],
        tag: PARAM_TAGS[0],
        type: PARAM_TYPES[0],
        description: '',
        customBands: [], // [{ name: '', value: '', min: '', max: '', description: ''}]
        scoringDetails: { weight: 1, direction: 'higher_is_better' }
    });

    useEffect(() => {
        if (initialParameter) {
            setParameter({
                ...initialParameter,
                customBands: initialParameter.customBands ? initialParameter.customBands.map(cb => ({...cb})) : [],
                scoringDetails: initialParameter.scoringDetails || { weight: 1, direction: 'higher_is_better' }
            });
        }
    }, [initialParameter]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setParameter(prev => ({ ...prev, [name]: value }));
    };

    const handleScoringChange = (e) => {
        const { name, value } = e.target;
        setParameter(prev => ({
            ...prev,
            scoringDetails: { ...prev.scoringDetails, [name]: value }
        }));
    };

    const handleCustomBandChange = (bandIndex, e) => {
        const { name, value } = e.target;
        const updatedBands = parameter.customBands.map((band, i) =>
            i === bandIndex ? { ...band, [name]: value } : band
        );
        setParameter(prev => ({ ...prev, customBands: updatedBands }));
    };

    const addCustomBand = () => {
        setParameter(prev => ({
            ...prev,
            customBands: [...prev.customBands, { name: '', value: '', min: '', max: '', description: '' }]
        }));
    };

    const removeCustomBand = (bandIndex) => {
        setParameter(prev => ({
            ...prev,
            customBands: prev.customBands.filter((_, i) => i !== bandIndex)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(parameter, index); // Pass index if editing an existing item in a list
    };

    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '15px', borderRadius: '5px' }}>
            <h4>Parameter Details {initialParameter? `(Editing ${initialParameter.name})` : '(New Parameter)'}</h4>
            <div>
                <label htmlFor={`param-name-${index}`}>Name:</label>
                <input type="text" id={`param-name-${index}`} name="name" value={parameter.name} onChange={handleChange} required />
            </div>
            <div>
                <label htmlFor={`param-unit-${index}`}>Unit:</label>
                <select id={`param-unit-${index}`} name="unit" value={parameter.unit} onChange={handleChange} required>
                    {PARAM_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor={`param-tag-${index}`}>Tag:</label>
                <select id={`param-tag-${index}`} name="tag" value={parameter.tag} onChange={handleChange} required>
                    {PARAM_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor={`param-type-${index}`}>Type:</label>
                <select id={`param-type-${index}`} name="type" value={parameter.type} onChange={handleChange} required>
                    {PARAM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor={`param-description-${index}`}>Description (Optional):</label>
                <textarea id={`param-description-${index}`} name="description" value={parameter.description} onChange={handleChange} />
            </div>

            <h5>Scoring Details (Optional)</h5>
            <div>
                <label htmlFor={`param-scoring-weight-${index}`}>Weight:</label>
                <input type="number" id={`param-scoring-weight-${index}`} name="weight" value={parameter.scoringDetails.weight} onChange={handleScoringChange} step="0.1"/>
            </div>
            <div>
                <label htmlFor={`param-scoring-direction-${index}`}>Direction:</label>
                <select id={`param-scoring-direction-${index}`} name="direction" value={parameter.scoringDetails.direction} onChange={handleScoringChange}>
                    <option value="higher_is_better">Higher is Better</option>
                    <option value="lower_is_better">Lower is Better</option>
                    <option value="nominal">Nominal (specific target)</option>
                </select>
            </div>

            <h5>Custom Bands (Optional)</h5>
            {parameter.customBands.map((band, bandIndex) => (
                <div key={bandIndex} style={{ border: '1px dashed #ccc', padding: '10px', marginBottom: '10px'}}>
                    <label>Band {bandIndex + 1}</label>
                    <input type="text" name="name" placeholder="Band Name (e.g., Excellent)" value={band.name} onChange={(e) => handleCustomBandChange(bandIndex, e)} />
                    {parameter.type === 'numeric' || parameter.type === 'time' ? (
                        <>
                            <input type="number" name="min" placeholder="Min Value" value={band.min || ''} onChange={(e) => handleCustomBandChange(bandIndex, e)} />
                            <input type="number" name="max" placeholder="Max Value" value={band.max || ''} onChange={(e) => handleCustomBandChange(bandIndex, e)} />
                        </>
                    ) : (
                         <input type="text" name="value" placeholder="Value (e.g., A, Good)" value={band.value || ''} onChange={(e) => handleCustomBandChange(bandIndex, e)} />
                    )}
                    <input type="text" name="description" placeholder="Band Description" value={band.description || ''} onChange={(e) => handleCustomBandChange(bandIndex, e)} />
                    <button type="button" onClick={() => removeCustomBand(bandIndex)}>Remove Band</button>
                </div>
            ))}
            <button type="button" onClick={addCustomBand}>Add Custom Band</button>

            <div style={{marginTop: '10px'}}>
                <button type="submit">Save Parameter</button>
                {onCancel && <button type="button" onClick={onCancel} style={{marginLeft: '10px'}}>Cancel</button>}
            </div>
        </form>
    );
};

export default ParameterForm;
