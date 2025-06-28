const User = require('../models/UserModel');
const mongoose = require('mongoose'); // For ObjectId validation if needed elsewhere
// const jwt = require('jsonwebtoken'); // Will be used when JWT is fully implemented
// const crypto = require('crypto'); // For generating reset tokens, etc.

// Placeholder for generating JWT. In a real app, use 'jsonwebtoken' library.
const generateToken = (userId, role) => {
    // return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
    return `mocktoken-${userId}-${role}-${Date.now()}`; // Simple mock token
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public (or Admin only, depending on registration policy)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const registerUser = async (req, res) => {
    const { name, email, password, role, scopes } = req.body;

    try {
        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password, // Password will be hashed by pre-save hook in UserModel
            role: role || 'User', // Default role if not provided
            scopes: scopes || []  // Default to empty array if not provided
        });

        if (user) {
            // Audit log user registration
            if (req.logAuditEvent) { // Check if middleware made it available
                req.logAuditEvent({
                    action: 'USER_REGISTER_SUCCESS',
                    entity: 'User',
                    entityId: user._id,
                    details: { registeredEmail: user.email, role: user.role },
                    status: 'SUCCESS',
                    // userId will be automatically picked from req.user if this registration was done by an admin
                    // If self-registration, req.user might not exist yet, so userId in log will be null.
                });
            }

            const token = generateToken(user._id, user.role);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                scopes: user.scopes,
                isActive: user.isActive,
                token, // Send token to client
                message: 'User registered successfully.'
            });
        } else {
            res.status(400).json({ message: 'Invalid user data.' });
        }
    } catch (error) {
        console.error("Error registering user:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", errors: error.errors });
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


/**
 * @desc    Authenticate user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password.' });
    }

    try {
        const user = await User.findOne({ email }).select('+password'); // Explicitly select password

        if (user && (await user.matchPassword(password))) {
            if (!user.isActive) {
                // Audit log failed login due to inactive account
                if (req.logAuditEvent) {
                    req.logAuditEvent({
                        userId: user._id, // We know the user at this point
                        userName: user.name,
                        action: 'USER_LOGIN_FAILURE',
                        entity: 'Auth',
                        details: { email: email, reason: 'Account deactivated' },
                        status: 'FAILURE'
                    });
                }
                return res.status(403).json({ message: 'Account is deactivated. Please contact administrator.' });
            }

            // Audit log successful login
            if (req.logAuditEvent) {
                req.logAuditEvent({
                    userId: user._id,
                    userName: user.name,
                    action: 'USER_LOGIN_SUCCESS',
                    entity: 'Auth',
                    status: 'SUCCESS'
                });
            }

            user.lastLogin = Date.now();
            await user.save(); // Save lastLogin time

            const token = generateToken(user._id, user.role);
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                scopes: user.scopes,
                isActive: user.isActive,
                token,
            });
        } else {
            // Audit log failed login attempt (invalid credentials)
            // We don't know the user ID here if email was wrong, or password was wrong for a valid email.
            if (req.logAuditEvent) {
                req.logAuditEvent({
                    action: 'USER_LOGIN_FAILURE',
                    entity: 'Auth',
                    details: { attemptedEmail: email, reason: 'Invalid credentials' },
                    status: 'FAILURE'
                });
            }
            res.status(401).json({ message: 'Invalid email or password.' });
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};


/**
 * @desc    Get current logged-in user's profile
 * @route   GET /api/auth/me
 * @access  Private (requires token)
 * @param {object} req - Express request object (req.user populated by 'protect' middleware)
 * @param {object} res - Express response object
 */
const getMe = async (req, res) => {
    // This route will be protected by auth middleware which adds `req.user`
    try {
        // req.user is expected to be populated by the 'protect' middleware
        const user = await User.findById(req.user.id); // req.user.id should come from decoded token

        if (user) {
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                scopes: user.scopes,
                isActive: user.isActive,
                createdAt: user.createdAt
            });
        } else {
            res.status(404).json({ message: 'User not found.' }); // Should not happen if token is valid
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
};

// TODO: Add other auth functions as needed:
// - forgotPassword
// - resetPassword
// - updateUserDetails (could be in a separate userController)
// - updateUserPassword
// - logout (typically handled client-side by clearing token, but can have a server endpoint for httpOnly cookies)

module.exports = {
    registerUser,
    loginUser,
    getMe,
};
