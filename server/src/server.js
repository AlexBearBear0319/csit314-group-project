// server.js — starts the backend for real.
const app = require('./app');
const { sequelize } = require('./entity');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate(); // check we can reach the database
    await sequelize.sync();         // create any missing tables (never deletes data)
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Could not start backend:', err.message);
    process.exit(1);
  }
})();
