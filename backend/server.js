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
// TODO: Import other route files as they are created e.g. userRoutes etc.

// Load env vars
dotenv.config({ path: './config/config.env' }); // Consider placing config.env in root or backend root

// Connect to database
connectDB();

const app = express();

// Body parser middleware
app.use(express.json());

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

// TODO: app.use('/api/users', userRoutes);
// TODO: app.use('/api/auth', authRoutes);


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
