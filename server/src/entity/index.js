// Loads every entity so Sequelize knows about all tables.
// When you create a new entity (e.g. IDP.js), add it here.
const sequelize = require('../db');
const UserProfile = require('./UserProfile');
const UserAccount = require('./UserAccount');
const IDPCategory = require('./IDPCategory');

module.exports = { sequelize, UserProfile, UserAccount, IDPCategory };
