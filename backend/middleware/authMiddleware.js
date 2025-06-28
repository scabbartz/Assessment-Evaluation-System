// const jwt = require('jsonwebtoken'); // Will be needed for actual JWT verification
const User = require('../models/UserModel'); // May be needed to check if user still exists or is active

const jwt = require('jsonwebtoken'); // Now using actual jsonwebtoken
const User = require('../models/UserModel');

// Protect routes: Verifies token and attaches user to request object
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            if (!process.env.JWT_SECRET) {
                console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
                return res.status(500).json({ message: 'Server configuration error.' });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token's ID and attach to request object
            // Exclude password from being attached to req.user
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found for this token.' });
            }
            if (!req.user.isActive) {
                 return res.status(403).json({ message: 'Account deactivated. Please contact administrator.' });
            }

            next(); // Proceed to the next middleware or route handler
        } catch (error) {
            console.error('Token verification failed:', error.message);
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, token failed (invalid signature or malformed).' });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired.' });
            }
            // For other errors during token processing
            return res.status(401).json({ message: 'Not authorized, token processing error.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
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
