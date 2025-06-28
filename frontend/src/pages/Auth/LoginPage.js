import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../api/authService';
import { toast } from 'react-toastify'; // Import toast

// TODO: Later, integrate with an AuthContext to update global auth state

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // const [error, setError] = useState(''); // Replaced by toast
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // TODO: Access AuthContext to set user upon successful login
    // const { login: contextLogin } = useAuth(); // Example if using AuthContext

    const handleSubmit = async (e) => {
        e.preventDefault();
        // setError(''); // No longer needed
        setIsLoading(true);

        if (!email || !password) {
            toast.error('Email and password are required.');
            setIsLoading(false);
            return;
        }

        try {
            const userData = await authService.login({ email, password });
            // console.log('Login successful:', userData);
            // contextLogin(userData); // Update global auth state via context
            // For now, just navigate. App.js or Navbar might check localStorage.
            toast.success(`Welcome back, ${userData.name}!`);
            // Dispatch custom event so Navbar updates immediately if it's listening
            window.dispatchEvent(new Event('authChange'));
            navigate('/'); // Redirect to homepage or dashboard after login
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
            toast.error(errorMsg);
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <h2>Login</h2>
            {/* {error && <p style={{ color: 'red' }}>{error}</p>} Removed direct error display */}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p style={{ marginTop: '15px', textAlign: 'center' }}>
                Don't have an account? <Link to="/register">Register here</Link>
            </p>
            {/* TODO: Add "Forgot Password?" link later */}
        </div>
    );
};

export default LoginPage;
