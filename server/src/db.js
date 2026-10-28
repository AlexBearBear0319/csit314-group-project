// db.js — connects Sequelize (the "pantry assistant") to the database.
// - When running tests (NODE_ENV=test): uses a temporary in-memory SQLite
//   database that is wiped every run, so tests NEVER touch real data.
// - Otherwise: uses the Supabase Postgres database from DATABASE_URL in .env.
require('dotenv').config({ quiet: true });
const { Sequelize } = require('sequelize');
const pg = require('pg');

const postgresOptions = {
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
};

let sequelize;

if (process.env.NODE_ENV === 'test') {
  sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
} else if (process.env.VERCEL_ENV === 'preview' && !process.env.DATABASE_URL) {
  // Preview deployments can start without production database credentials.
  // Database calls fail fast until a Preview DATABASE_URL is configured.
  sequelize = new Sequelize('preview_unconfigured', 'preview_unconfigured', 'preview_unconfigured', {
    host: '127.0.0.1',
    port: 1,
    ...postgresOptions,
    retry: { max: 0 },
    pool: { max: 1, min: 0, acquire: 1000, idle: 1000 },
  });
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Copy .env.example to .env and fill it in.');
  }
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...postgresOptions,
  });
}

module.exports = sequelize;
