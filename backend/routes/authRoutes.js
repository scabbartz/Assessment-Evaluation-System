const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getMe,
    // TODO: Add other auth controller methods like forgotPassword, resetPassword
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Import actual middleware

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and registration
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: ['User', 'Athlete', 'Coach', 'Evaluator', 'ProgramAdmin', 'SystemAdmin', 'SuperAdmin']
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: object # Define scopeSchema properties if needed
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               # Define successful registration response schema here (user object + token)
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 # ... other user properties
 *       400:
 *         description: Invalid input or user already exists
 */
router.post('/register', registerUser);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and get token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful, token returned
 *         content:
 *           application/json:
 *             schema:
 *               # Define successful login response schema here (user object + token)
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 # ... other user properties
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: [] # Indicates this route uses Bearer token authentication (defined in swaggerOptions)
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               # Define user profile schema here
 *               type: object
 *       401:
 *         description: Not authorized, token failed or not provided
 */
router.get('/me', protect, getMe); // Using actual 'protect' middleware

// TODO: Add routes for password management
// router.post('/forgotpassword', forgotPassword);
// router.put('/resetpassword/:resettoken', resetPassword);
// router.put('/updatepassword', protect, updateUserPassword); // Update logged-in user's password

// TODO: If there's a separate user controller for managing user accounts by admins:
// const userController = require('../controllers/userController'); // Assuming it exists
// router.get('/users', protect, authorize(['SystemAdmin', 'SuperAdmin']), userController.getAllUsers);
// router.get('/users/:id', protect, authorize(['SystemAdmin', 'SuperAdmin']), userController.getUserById);
// router.put('/users/:id', protect, authorize(['SystemAdmin', 'SuperAdmin']), userController.updateUser);
// router.delete('/users/:id', protect, authorize(['SystemAdmin', 'SuperAdmin']), userController.deleteUser);


module.exports = router;
