const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Route files
const assessmentRoutes = require('./routes/assessmentRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const batchRoutes = require('./routes/batchRoutes');
const {
    mainEntryRouter,
    batchNestedEntryRouter,
    athleteNestedEntryRouter
} = require('./routes/assessmentEntryRoutes');
const benchmarkRoutes = require('./routes/benchmarkRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { commentRouter, entryCommentRouter } = require('./routes/commentRoutes');
const notificationTemplateRoutes = require('./routes/notificationTemplateRoutes');
const authRoutes = require('./routes/authRoutes');
// TODO: Import other route files as they are created e.g. userRoutes etc. (like a dedicated userRoutes for admin user management)

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const helmet = require('helmet'); // For security headers
const cors = require('cors'); // For Cross-Origin Resource Sharing

// Load env vars
dotenv.config({ path: './config/config.env' }); // Consider placing config.env in root or backend root

// Connect to database
connectDB();

const app = express();

// --- Security Middlewares ---
// Set security HTTP headers
app.use(helmet());

// Enable CORS - Configure appropriately for your frontend URL in production
// For development, a simple setup is often fine.
// For production, specify origins: app.use(cors({ origin: 'https://your-frontend-domain.com' }));
app.use(cors()); // Allows all origins by default - good for dev, restrict in prod.

// Body parser middleware
app.use(express.json());

// Audit Log Middleware (to make req.logAuditEvent available)
const { auditLogMiddleware } = require('./utils/auditLogger');
app.use(auditLogMiddleware);

// Mount routers
app.use('/api/assessments', assessmentRoutes);
app.use('/api/sessions', sessionRoutes);

// For direct batch operations like GET /api/batches/:batchId or PUT /api/batches/:batchId
app.use('/api/batches', batchRoutes);
// For entries nested under a batch: POST /api/batches/:batchId/entries or GET /api/batches/:batchId/entries
app.use('/api/batches/:batchId/entries', batchNestedEntryRouter);

// For entries related to a specific athlete: GET /api/athletes/:athleteId/entries
app.use('/api/athletes/:athleteId/entries', athleteNestedEntryRouter);

// For direct operations on a single entry: GET /api/entries/:entryId or PUT /api/entries/:entryId
app.use('/api/entries', mainEntryRouter);

// Benchmark routes
app.use('/api/benchmarks', benchmarkRoutes);

// Report routes
app.use('/api/reports', reportRoutes);

// Comment routes
// For comments nested under an assessment entry: e.g. /api/assessment-entries/:entryId/comments
app.use('/api/assessment-entries/:entryId/comments', entryCommentRouter);
// For direct comment manipulation by its ID: e.g. /api/comments/:commentId
app.use('/api/comments', commentRouter);

// Notification Template CRUD routes
app.use('/api/notification-templates', notificationTemplateRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// TODO: app.use('/api/users', userRoutes); // For admin management of users


// --- Swagger API Documentation Setup ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Athlete Assessment & Evaluation System API',
            version: '1.0.0',
            description: 'API documentation for the Athlete Assessment & Evaluation System.',
            // contact: { name: "API Support", email: "support@example.com" },
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 5001}/api`, // Adjust if your API base path is different
                description: 'Development server'
            }
        ],
        // TODO: Add components section for securitySchemes (e.g., Bearer Auth for JWT)
        // components: {
        //   securitySchemes: {
        //     bearerAuth: {
        //       type: 'http',
        //       scheme: 'bearer',
        //       bearerFormat: 'JWT',
        //     }
        //   }
        // },
        // security: [{ bearerAuth: [] }] // Apply JWT globally if all routes are protected
    },
    // Path to the API docs (JSDoc comments)
    apis: ['./routes/*.js', './controllers/*.js'], // Adjust paths to include files with JSDoc comments for Swagger
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// --- End Swagger Setup ---


// TODO: Implement centralized error handling middleware
// app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
