// server.js — starts the backend for real.
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Start the API even when PostgreSQL is down. /api/health reports process
// status, and /api/health/ready reports database, schema and Storage status.
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
