import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

// Assessment Pages
import AssessmentListPage from './pages/Assessment/AssessmentListPage';
import AssessmentFormPage from './pages/Assessment/AssessmentFormPage';

// Session Pages
import SessionListPage from './pages/Session/SessionListPage';
import SessionFormPage from './pages/Session/SessionFormPage';

// Batch Pages
import BatchListPage from './pages/Batch/BatchListPage';
import BatchFormPage from './pages/Batch/BatchFormPage';

// Data Entry Page
import DataEntryPage from './pages/DataEntry/DataEntryPage';

// TODO: Import other pages: ReportPage etc.
// TODO: Import Navbar, Footer, other layout components

// Basic Navbar for navigation
const Navbar = () => (
  <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      <li style={{ display: 'inline', marginRight: '10px' }}><Link to="/">Home (Assessments)</Link></li>
      <li style={{ display: 'inline', marginRight: '10px' }}><Link to="/assessments">Assessments</Link></li>
      <li style={{ display: 'inline', marginRight: '10px' }}><Link to="/sessions">Sessions</Link></li>
      {/* Add other top-level navigation links here */}
    </ul>
  </nav>
);


function App() {
  return (
    <Router>
      <div className="container" style={{padding: '20px'}}>
        <Navbar /> {/* Added Navbar */}
        <h1>Athlete Assessment System</h1> {/* Temporary Title - Could be part of Navbar/Header component */}

        <Routes>
          {/* Default Route */}
          <Route path="/" element={<AssessmentListPage />} />

          {/* Assessment Routes */}
          <Route path="/assessments" element={<AssessmentListPage />} />
          <Route path="/assessments/new" element={<AssessmentFormPage mode="create" />} />
          <Route path="/assessments/edit/:id" element={<AssessmentFormPage mode="edit" />} />
          <Route path="/assessments/clone/:id" element={<AssessmentFormPage mode="clone" />} />

          {/* Session Routes */}
          <Route path="/sessions" element={<SessionListPage />} />
          <Route path="/sessions/new" element={<SessionFormPage mode="create" />} />
          <Route path="/sessions/edit/:id" element={<SessionFormPage mode="edit" />} />

          {/* Batch Routes (nested under sessions for context) */}
          {/* List batches for a session */}
          <Route path="/sessions/:sessionId/batches" element={<BatchListPage />} />
          {/* Create new batch for a session */}
          <Route path="/sessions/:sessionId/batches/new" element={<BatchFormPage mode="create" />} />
          {/* Edit batch for a session */}
          <Route path="/sessions/:sessionId/batches/edit/:batchId" element={<BatchFormPage mode="edit" />} />

          {/* Data Entry Routes */}
          {/* Data entry for a specific batch (batchId in URL) */}
          <Route path="/data-entry/batch/:batchId" element={<DataEntryPage />} />
          {/* Generic data entry page (user selects session/batch) - might be less common if flow is from batch list */}
          <Route path="/data-entry" element={<DataEntryPage />} />


          {/* TODO: Add routes for Reports, User Management etc. */}
          {/* Example for Reporting (Section 6)
          <Route path="/reports/individual/:athleteId" element={<IndividualReportPage />} />
          <Route path="/reports/cohort/:sessionId" element={<CohortAnalyticsPage />} />
          */}
        </Routes>
      </div>
      {/* <Footer /> */}
    </Router>
  );
}

export default App;
