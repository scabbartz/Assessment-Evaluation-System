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

// Reporting Pages
import IndividualReportPage from './pages/Reporting/IndividualReportPage';
import CohortAnalyticsPage from './pages/Reporting/CohortAnalyticsPage';

// Auth Pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';

// TODO: Import other pages for User Management, etc.
// TODO: Import Navbar, Footer, other layout components, AuthContext
import authService from './api/authService'; // To get local user for Navbar
import React, { useState, useEffect /*, createContext, useContext */ } from 'react'; // Added useState, useEffect
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NotificationBell from './components/common/NotificationBell'; // Import NotificationBell

// --- Placeholder for AuthContext ---
// const AuthContext = createContext(null);
// export const useAuth = () => useContext(AuthContext);
// const AuthProvider = ({ children }) => {
//   const [currentUser, setCurrentUser] = useState(authService.getLocalUser());
//   const login = (userData) => { setCurrentUser(userData); /* localStorage is handled by authService */ };
//   const logout = () => { authService.logout(); setCurrentUser(null); };
//   return <AuthContext.Provider value={{ currentUser, login, logout }}>{children}</AuthContext.Provider>;
// };
// --- End AuthContext Placeholder ---


// Basic Navbar for navigation
const Navbar = () => {
  const navigate = useNavigate(); // To redirect on logout
  // For scaffolding, directly check localStorage or use a simple state.
  // In a real app, this would come from AuthContext.
  const [user, setUser] = useState(authService.getLocalUser());

  useEffect(() => {
    // Listen to storage changes or custom events if login/logout happens in other tabs/components
    // This is a simplified way to update navbar on login/logout for scaffolding
    const handleStorageChange = () => {
        setUser(authService.getLocalUser());
    };
    window.addEventListener('storage', handleStorageChange); // For changes in other tabs
    // Custom event for same-tab updates (authService.login/logout would dispatch this)
    window.addEventListener('authChange', handleStorageChange);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('authChange', handleStorageChange);
    };
  }, []);


  const handleLogout = () => {
    authService.logout();
    setUser(null); // Update local state
    window.dispatchEvent(new Event('authChange')); // Notify other components like App.js if needed
    navigate('/login');
  };

  return (
    <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div> {/* Left side links */}
            <li style={{ display: 'inline', marginRight: '10px' }}><Link to="/">Home</Link></li>
            <li style={{ display: 'inline', marginRight: '10px' }}><Link to="/assessments">Assessments</Link></li>
            <li style={{ display: 'inline', marginRight: '10px' }}><Link to="/sessions">Sessions</Link></li>
            {/* TODO: Conditionally show other links based on role */}
            {user && (<li style={{ display: 'inline', marginRight: '10px' }}><Link to="/data-entry">Data Entry</Link></li>)}
        </div>
        <div style={{display: 'flex', alignItems: 'center'}}> {/* Right side links & Bell */}
            {user ? (
                <>
                    <NotificationBell /> {/* Add NotificationBell here */}
                    <li style={{ display: 'inline', marginRight: '10px' }}>Welcome, {user.name}! ({user.role})</li>
                    {/* <li style={{ display: 'inline', marginRight: '10px' }}><Link to="/profile">My Profile</Link></li> {/* TODO: Profile page */}
                    <li style={{ display: 'inline' }}>
                        <button onClick={handleLogout} style={{background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer'}}>Logout</button>
                    </li>
                </>
            ) : (
                <>
                    <li style={{ display: 'inline', marginRight: '10px' }}><Link to="/login">Login</Link></li>
                    <li style={{ display: 'inline' }}><Link to="/register">Register</Link></li>
                </>
            )}
        </div>
      </ul>
    </nav>
  );
};


function App() {
  // Placeholder for AuthProvider wrapper
  // return (
  //   <AuthProvider>
  //     <Router>
  //       ... app content ...
  //     </Router>
  //   </AuthProvider>
  // );

  // For now, App without full AuthProvider context
  return (
    <Router> {/* This Router should be inside AuthProvider if using context that needs router (e.g. for navigate) */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light" // or "dark" or "colored"
      />
      <div className="container" style={{padding: '20px'}}>
        <Navbar />
        <h1>Athlete Assessment System</h1>

        <Routes> {/* Routes should also be ideally within AuthProvider if they use useAuth hook */}
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

          {/* Reporting Routes */}
          <Route path="/reports/individual/:athleteId" element={<IndividualReportPage />} />
          <Route path="/reports/cohort/session/:sessionId" element={<CohortAnalyticsPage />} />
          {/* Could add /reports/cohort/batch/:batchId later if needed */}

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* TODO: Add ProfilePage route, protected routes based on auth status */}


          {/* TODO: Add routes for Admin User Management etc. (part of Section 8) */}
        </Routes>
      </div>
      {/* <Footer /> */}
    </Router>
  );
}

export default App;
