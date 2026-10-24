# School-Parent Communication System (SPCS)

SPCS is a web application for Nativity Girls School. It will give parents a safe view of their children's school records and give teachers and administrators tools for attendance, grades, behavior reports, announcements, and communication.

The project uses React and Vite in the frontend directory, and Node.js, Express, and MongoDB/Mongoose in the backend directory. The application is being built in feature branches; main remains the stable integration branch.

## Prerequisites

- Node.js 20.19 or newer
- npm
- MongoDB 7 or 8 for database-backed features

## Run locally

1. Install root tools: npm install.
2. Install the API dependencies: npm --prefix backend install.
3. Install frontend dependencies: npm --prefix frontend install.
4. Copy backend/.env.example to backend/.env and set MONGODB_URI to a local MongoDB database.
5. Start both applications with npm run dev.
6. Open the Vite URL shown in the terminal (default: http://127.0.0.1:5173). The API listens on http://127.0.0.1:5000.

The initial foundation includes an API health check and a frontend connection status. School records, authentication, and role-specific pages will be added in later feature branches.

## Useful commands

- npm run dev:api runs only the Express API.
- npm run dev:web runs only the React frontend.
- npm test runs backend tests.
- npm run build builds the frontend for production.

## Data and security

Use fictional student records during development. Never commit environment files, credentials, real student records, node_modules, or build output. Server-side authorization will enforce role and parent-child/class relationships; hiding a page in React is not an authorization control.

See docs/requirements-notes.md for the source review, assumptions, and unresolved requirements.