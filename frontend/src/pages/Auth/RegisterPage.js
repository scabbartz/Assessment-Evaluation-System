import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../api/authService';
// Import userRoles if you want to populate a dropdown for role selection (for admin registration)
// import { userRoles } from '../../../backend/models/UserModel'; // Adjust path as needed, or define frontend constant

// For scaffolding, we'll use a simplified list of roles for self-registration if allowed
// Or, role might be fixed or determined by admin.
const availableRolesForRegistration = ['User', 'Athlete', 'Coach', 'Evaluator']; // Example

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState(availableRolesForRegistration[0]); // Default role
    // TODO: Add state for 'scopes' if it's part of the registration form.
    // For simplicity in scaffolding, scope assignment might be an admin task post-registration.

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // TODO: Access AuthContext to set user upon successful registration & login
    // const { login: contextLogin } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!name || !email || !password || !confirmPassword) {
            setError('All fields are required.');
            setIsLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            setIsLoading(false);
            return;
        }

        try {
            const userData = { name, email, password, role /*, scopes (if collected) */ };
            const responseData = await authService.register(userData);
            console.log('Registration successful:', responseData);
            // Typically, after registration, the user is also logged in.
            // The register endpoint in authController already returns a token.
            // contextLogin(responseData); // Update global auth state
            navigate('/'); // Redirect to homepage or dashboard
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
            console.error('Registration error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '450px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <h2>Register</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Full Name:</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px' }}>Confirm Password:</label>
                    <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="role" style={{ display: 'block', marginBottom: '5px' }}>Register as:</label>
                    <select id="role" value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
                        {availableRolesForRegistration.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {/* In a real app, role selection might be limited or not present for self-registration */}
                </div>
                <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {isLoading ? 'Registering...' : 'Register'}
                </button>
            </form>
            <p style={{ marginTop: '15px', textAlign: 'center' }}>
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </div>
    );
};

export default RegisterPage;
