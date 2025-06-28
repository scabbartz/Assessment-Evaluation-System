# Athlete Assessment & Evaluation System Prototype (MERN Stack)

This project is a MERN-stack (MongoDB, Express.js, React.js, Node.js) prototype for an Athlete Assessment and Evaluation System. It aims to provide functionalities for managing assessments, sessions, batches, capturing athlete data, and eventually, benchmarking and reporting.

This README provides an overview of the project structure, setup instructions (when applicable), and current development status.

## Current Development Status

**Phase 1: Scaffolding (Completed for Sections 1-3)**

The initial scaffolding for the core features has been laid out. This includes:

*   **Backend**: Models, controllers, and routes for primary entities.
*   **Frontend**: Basic React application structure, API services, and placeholder pages/components for core features.

**Completed Scaffolding Sections:**

1.  **Assessment & Template Management**:
    *   CRUD operations for assessment templates and their parameters.
    *   Versioning and cloning of assessment templates.
2.  **Session & Batch Management**:
    *   CRUD for sessions (year/term based).
    *   Student roster import/management within sessions (basic).
    *   Batch creation (manual and placeholder for random partitioning) within sessions.
    *   Instructor assignment (basic structure).
    *   Batch workflow status management.
3.  **Data Capture & Entry**:
    *   Data model for storing athlete performance entries.
    *   API and UI for single data entry against a batch's assessment.
    *   Placeholders for CSV bulk upload functionality.

**Next Steps (High-Level):**

*   **Phase 1 Completion**: Continue scaffolding for remaining sections (4-10) as per the project plan.
    *   Section 4: Auto-Benchmarking Engine
    *   Section 5: Normalization & Scoring
    *   Section 6: Reporting & Dashboards
    *   Section 7: Feedback & Communication
    *   Section 8: User & Access Control
    *   Section 9: Integration & Extensibility
    *   Section 10: Non-Functional Requirements (planning & early considerations)
*   **Phase 2**: Wire up data entry to computation logic, store benchmarks, and display initial dashboards.
*   **Phase 3**: Enhance UI/UX, add imports, comments, and notifications.
*   **Phase 4**: QA, performance tuning, security audit, documentation.

## Project Structure

```
.
├── backend
│   ├── config          # Database connection (db.js), environment variables (config.env)
│   ├── controllers     # Request handling logic for each entity
│   ├── middleware      # Custom middleware (e.g., auth, error handling - TODO)
│   ├── models          # Mongoose schemas for database entities
│   ├── routes          # API route definitions
│   └── server.js       # Main Express server entry point
├── frontend
│   ├── public          # Static assets (index.html, favicon, etc.)
│   ├── src
│   │   ├── api           # API service functions (using axios)
│   │   ├── assets        # Images, fonts, etc. (TODO)
│   │   ├── components    # Reusable UI components (common, layout, feature-specific)
│   │   ├── contexts      # React contexts (e.g., AuthContext - TODO)
│   │   ├── hooks         # Custom React hooks (TODO)
│   │   ├── pages         # Top-level page components for each feature
│   │   ├── styles        # Global styles, themes (index.css)
│   │   ├── utils         # Utility functions (TODO)
│   │   └── App.js        # Main React application component with routing
│   │   └── index.js      # React entry point
│   └── package.json      # Frontend dependencies and scripts
├── package.json        # Root package.json (TODO: for concurrently running front/back)
└── README.md           # This file
```

## Getting Started (Placeholder - Once environment is fully set up)

These are general instructions. Specifics might vary based on the final deployment environment.

**Prerequisites:**

*   Node.js and npm (or Yarn)
*   MongoDB (local instance or connection URI to a cloud-hosted one like MongoDB Atlas)

**Backend Setup:**

1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `npm install` (or `yarn install`)
3.  Create a `config/config.env` file by copying `config/config.env.example` (if provided) or by creating it manually.
    *   Set `MONGO_URI` to your MongoDB connection string.
    *   Set `PORT` (e.g., 5001).
    *   (Later) `JWT_SECRET`, etc.
4.  Start the backend server: `npm run dev` (for development with nodemon) or `npm start` (for production).

**Frontend Setup:**

1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install` (or `yarn install`)
3.  The frontend `package.json` includes a `proxy` setting to redirect API calls to the backend (e.g., `http://localhost:5001`).
4.  Start the frontend development server: `npm start`. This will usually open the app in your browser at `http://localhost:3000`.

**Running Both (TODO - using `concurrently`):**

A root `package.json` can be set up to run both backend and frontend servers with a single command using a tool like `concurrently`.

## Key Technologies

*   **MongoDB**: NoSQL database for storing application data.
*   **Mongoose**: ODM library for MongoDB and Node.js.
*   **Express.js**: Web application framework for Node.js (backend).
*   **React.js**: JavaScript library for building user interfaces (frontend).
    *   React Router for client-side routing.
    *   Axios for making HTTP requests to the backend.
*   **Node.js**: JavaScript runtime environment for the backend.
*   **Dotenv**: For managing environment variables.
*   **(Planned/Potential)**:
    *   Authentication: JSON Web Tokens (JWT) with bcryptjs for password hashing.
    *   Styling: A UI library like Material-UI, Ant Design, or Tailwind CSS.
    *   State Management: React Context API or Redux/Zustand for more complex state.
    *   File Uploads: Multer (backend) for CSV or other file imports.
    *   CSV Parsing: Papaparse (frontend or backend).

## Contribution

This project is currently under development by Jules V2. Follow the established plan and confirm completion of each step/phase.

---

This README will be updated as the project progresses.
```
