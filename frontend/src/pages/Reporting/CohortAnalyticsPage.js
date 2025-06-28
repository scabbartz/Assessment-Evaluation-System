import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import reportService from '../../api/reportService';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const CohortAnalyticsPage = () => {
    const { sessionId } = useParams(); // SessionId from URL
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [barChartData, setBarChartData] = useState(null);

    // TODO: Add state for selected batch if filtering cohort by batch within a session

    useEffect(() => {
        if (sessionId) {
            setIsLoading(true);
            reportService.getCohortAnalyticsReport(sessionId)
                .then(data => {
                    setReportData(data);
                    setIsLoading(false);
                })
                .catch(err => {
                    setError(err.response?.data?.message || err.message || 'Failed to load cohort analytics.');
                    setIsLoading(false);
                    console.error(err);
                });
        } else {
            // Handle case where sessionId is not provided, maybe show a selector or error
            setError("Session ID is required to view cohort analytics.");
            setIsLoading(false);
        }
    }, [sessionId]);

    if (isLoading) return <p>Loading cohort analytics for session...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (!reportData || !reportData.session) return <p>No cohort data found for this session, or session details missing.</p>;

    const { session, cohortData, message } = reportData;

    // Prepare data for Bar Chart (Average Z-Scores)
    useEffect(() => {
        if (cohortData && cohortData.parameterStats) {
            const labels = Object.values(cohortData.parameterStats).map(stat => stat.parameterName);
            const dataValues = Object.values(cohortData.parameterStats).map(stat => stat.averageZScore || 0); // Default to 0 if no Z-score

            setBarChartData({
                labels,
                datasets: [
                    {
                        label: 'Average Z-Score',
                        data: dataValues,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                    },
                ],
            });
        }
    }, [cohortData]);

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Average Z-Scores per Parameter',
            },
        },
        scales: {
            y: {
                beginAtZero: false, // Z-scores can be negative
                title: {
                    display: true,
                    text: 'Average Z-Score'
                }
            },
            x: {
                 title: {
                    display: true,
                    text: 'Parameters'
                }
            }
        }
    };


    return (
        <div>
            <h2>Cohort Analytics: {session.name} ({session.year} - {session.term})</h2>

            {message && <p><em>{message}</em></p>}

            <div style={{ marginBottom: '20px' }}>
                 <a href={reportService.getCohortReportPdfUrl(sessionId)} target="_blank" rel="noopener noreferrer">
                    <button>Export as PDF (Placeholder)</button>
                </a>
                <a href={reportService.getCohortReportCsvUrl(sessionId)} download={`cohort_report_session_${sessionId}.csv`} style={{marginLeft: '10px'}}>
                    <button>Export as CSV (Placeholder)</button>
                </a>
            </div>

            {cohortData && (
                <div>
                    <p><strong>Total Athletes in Cohort (with entries):</strong> {cohortData.totalAthletes || 0}</p>
                    <p><strong>Total Assessment Entries:</strong> {cohortData.totalEntries || 0}</p>

                    <h3>Parameter Statistics (Averages):</h3>
                    {Object.keys(cohortData.parameterStats || {}).length > 0 ? (
                        <table style={{width: '100%', fontSize: '0.9em', marginBottom: '20px'}}>
                            <thead>
                                <tr>
                                    <th>Parameter Name</th>
                                    <th>Average Raw Value (if applicable)</th>
                                    <th>Average Z-Score</th>
                                    <th>Data Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.values(cohortData.parameterStats).map(stat => (
                                    <tr key={stat.parameterName}>
                                        <td>{stat.parameterName}</td>
                                        <td>{stat.averageValue !== undefined ? stat.averageValue : 'N/A (Text/Non-numeric)'}</td>
                                        <td>{stat.averageZScore !== undefined ? stat.averageZScore : 'N/A'}</td>
                                        <td>{stat.values?.length || stat.zScores?.length || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p>No aggregated parameter statistics available to display in table.</p>}

                    {/* Chart Section */}
                    <div style={{ marginTop: '30px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        {barChartData && Object.keys(cohortData.parameterStats || {}).length > 0 ? (
                            <div style={{border: '1px solid #ddd', padding: '10px', width: '100%', minWidth: '300px', height: '400px'}}>
                                <Bar data={barChartData} options={barChartOptions} />
                            </div>
                        ) : (
                            <div style={{border: '1px solid #ddd', padding: '10px', width: '100%', minWidth: '300px', height: 'auto'}}>
                                <h4>Average Z-Scores Chart</h4>
                                <p><em>No data available to display chart or chart is loading.</em></p>
                            </div>
                        )}

                        {/* Placeholders for other charts */}
                        <div style={{border: '1px solid #ddd', padding: '10px', width: 'calc(50% - 10px)', minWidth: '300px', height: '300px', boxSizing: 'border-box'}}>
                            <h4>Performance Distribution (Line Chart Placeholder)</h4>
                             <p><em>Line chart visualization (e.g., score distribution) would appear here.</em></p>
                        </div>
                        <div style={{border: '1px solid #ddd', padding: '10px', width: 'calc(50% - 10px)', minWidth: '300px', height: '300px', boxSizing: 'border-box'}}>
                            <h4>Multi-Parameter Profile (Radar Chart Placeholder)</h4>
                            <p><em>Radar chart (e.g. for comparing multiple key parameters) would appear here.</em></p>
                        </div>
                    </div>
                </div>
            )}
            <Link to="/sessions" style={{display: 'block', marginTop: '20px'}}>Back to Sessions List</Link>
        </div>
    );
};

export default CohortAnalyticsPage;
