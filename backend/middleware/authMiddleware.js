// const jwt = require('jsonwebtoken'); // Will be needed for actual JWT verification
const User = require('../models/UserModel'); // May be needed to check if user still exists or is active

// Placeholder for JWT secret (should be in .env file)
// const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key_for_development';

// Protect routes: Verifies token and attaches user to request object
const protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // else if (req.cookies.token) { // Alternative: check for token in cookies
    //     token = req.cookies.token;
    // }

    // --- Mock Token Logic for Scaffolding ---
    if (req.headers.authorization && req.headers.authorization.startsWith('mocktoken-')) {
        console.log('Auth Middleware (Protect): Using mock token logic.');
        const parts = req.headers.authorization.split('-');
        if (parts.length >= 3) {
            // In a real scenario, you'd verify the token and then fetch the user from DB
            // For mock, we just simulate the user object.
            // const decoded = jwt.verify(token, JWT_SECRET);
            // req.user = await User.findById(decoded.id).select('-password');
            // if (!req.user || !req.user.isActive) throw new Error('User not found or inactive');

            req.user = { _id: parts[1], id: parts[1], role: parts[2], name: `MockUser-${parts[1]}` }; // Simulate req.user
            console.log(`Auth Middleware: Mock user set - ID: ${req.user.id}, Role: ${req.user.role}`);
            return next();
        }
    }
    // --- End Mock Token Logic ---

    if (!token) {
        // For scaffolding, we might allow unauthenticated access to some "protected" routes if no token is found,
        // or explicitly return an error. Let's default to error for routes that use this middleware.
        console.warn('Auth Middleware (Protect): No token found. Access denied (placeholder).');
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }

    try {
        // --- Actual JWT Verification (to be enabled later) ---
        // const decoded = jwt.verify(token, JWT_SECRET);
        // req.user = await User.findById(decoded.id).select('-password'); // Exclude password from req.user
        // if (!req.user) {
        //     return res.status(401).json({ message: 'Not authorized, user not found.' });
        // }
        // if (!req.user.isActive) {
        //     return res.status(403).json({ message: 'Account deactivated.' });
        // }
        // next();
        // --- End Actual JWT Verification ---

        // If we reach here with a real token but JWT logic is commented out, it means we are still in placeholder mode.
        // For now, if a non-mock token was provided but not processed by mock logic, deny access.
        console.warn('Auth Middleware (Protect): Token found but JWT verification is placeholder. Denying access.');
        return res.status(401).json({ message: 'Not authorized, token verification placeholder.' });

    } catch (error) {
        console.error('Token verification error:', error.message);
        return res.status(401).json({ message: 'Not authorized, token failed.' });
    }
};


// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            // This should ideally not happen if 'protect' middleware runs first and sets req.user
            console.warn('Auth Middleware (Authorize): req.user or req.user.role not found. Denying access.');
            return res.status(401).json({ message: 'User not authenticated for role check.' });
        }
        if (!roles.includes(req.user.role)) {
            console.warn(`Auth Middleware (Authorize): User role '${req.user.role}' not authorized for this route. Required: ${roles.join(', ')}`);
            return res.status(403).json({ message: `Role '${req.user.role}' is not authorized to access this resource.` });
        }
        console.log(`Auth Middleware (Authorize): Role '${req.user.role}' authorized.`);
        next();
    };
};

module.exports = { protect, authorize };
