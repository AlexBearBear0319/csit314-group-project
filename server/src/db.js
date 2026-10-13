// db.js — connects Sequelize (the "pantry assistant") to the database.
// - When running tests (NODE_ENV=test): uses a temporary in-memory SQLite
//   database that is wiped every run, so tests NEVER touch real data.
// - Otherwise: uses the Supabase Postgres database from DATABASE_URL in .env.
require('dotenv').config({ quiet: true });
const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'test') {
  sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Copy .env.example to .env and fill it in.');
  }
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });
}

module.exports = sequelize;
