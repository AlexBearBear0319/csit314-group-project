// =============================================================================
// ENTITY: UserProfile            (BCE: Entity layer)
// A profile is a role: User Admin, Interior Designer, Customer, Platform
// Manager, or one that a User Admin creates later (stories #1-5).
//
// Table: user_profile (name, description, status)
//
// Rule for our entities: this class only does CRUD on its own table
// (Create, Read, Update, search). It never decides what is allowed. The
// controllers (CreateUserProfileC, SuspendUserProfileC ...) decide, then call
// the methods below.
// =============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class UserProfile extends Model {
  // CREATE (story #1)
  // name, description = already checked by CreateUserProfileC.
  // Returns the saved profile.
  static async createProfile(name, description) {
    return this.create({ name, description });
  }

  // READ one (story #2, also used by the other stories to check a profile exists)
  // Returns the profile, or null if no profile has this ID.
  static async viewProfile(id) {
    return this.findByPk(id);
  }

  // READ by name (used by the controller to stop two profiles sharing a name)
  // ignoreId = when updating, skip the profile we are editing.
  // Returns the matching profile, or null.
  static async findByName(name, ignoreId = null) {
    const profile = await this.findOne({ where: { name } });
    return profile && profile.id !== ignoreId ? profile : null;
  }

  // READ all (used by sign-up to find the Customer / Interior Designer profile)
  static async listProfiles() {
    return this.findAll({ order: [['id', 'ASC']] });
  }

  // READ the active profiles for the "User profile" dropdown on the account
  // form (stories #6 and #8). Suspended profiles are left out because nobody
  // with a suspended profile can log in.
  // Returns e.g. [{ id: 3, name: 'Customer' }, ...] sorted A-Z.
  static async listActiveOptions() {
    const profiles = await this.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });
    return profiles.map((profile) => ({ id: profile.id, name: profile.name }));
  }

  // UPDATE (story #3)
  // Returns the updated profile, or null if no profile has this ID.
  static async updateProfile(id, name, description) {
    const profile = await this.findByPk(id);
    return profile ? profile.update({ name, description }) : null;
  }

  // UPDATE status (story #4): suspend, or activate again.
  // Returns the updated profile, or null if no profile has this ID.
  static async suspendProfile(id) {
    const profile = await this.findByPk(id);
    return profile ? profile.update({ status: 'suspended' }) : null;
  }

  static async activateProfile(id) {
    const profile = await this.findByPk(id);
    return profile ? profile.update({ status: 'active' }) : null;
  }

  // SEARCH (story #5)
  // Name or description contains the keyword (capital letters ignored).
  // An empty keyword returns every profile, newest first.
  static async searchProfiles(keyword = '') {
    // The biggest ID is the newest profile.
    const profiles = await this.findAll({ order: [['id', 'DESC']] });
    const term = keyword.trim().toLowerCase();
    // The list is small, so we match in JavaScript. This way % and _ are plain
    // text and behave the same in the test database and in PostgreSQL.
    return profiles.filter((profile) =>
      profile.name.toLowerCase().includes(term) ||
      (profile.description || '').toLowerCase().includes(term));
  }
}

UserProfile.init(
  {
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' }, // active | suspended
  },
  { sequelize, modelName: 'UserProfile', tableName: 'user_profile' }
);

module.exports = UserProfile;
