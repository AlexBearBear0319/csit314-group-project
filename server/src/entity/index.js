// Loads every entity so Sequelize knows about all tables.
// When you create a new entity (e.g. IDP.js), add it here.
const sequelize = require('../db');
const UserProfile = require('./UserProfile');
const UserAccount = require('./UserAccount');
const IDPCategory = require('./IDPCategory');
const UserSession = require('./UserSession');
const InteriorDesignProject = require('./InteriorDesignProject');
const ProjectImage = require('./ProjectImage');
const Company = require('./Company');
const IdpImageUploadIntent = require('./IdpImageUploadIntent');
const IdpImageCleanupTask = require('./IdpImageCleanupTask');
const ShortlistItem = require('./ShortlistItem'); // Customer shortlist stories #34-36

UserAccount.hasOne(Company, { as: 'company', foreignKey: 'designerAccountId', onDelete: 'CASCADE' });
Company.belongsTo(UserAccount, { as: 'designer', foreignKey: 'designerAccountId' });

UserAccount.hasMany(UserSession, { foreignKey: 'accountId', onDelete: 'CASCADE' });
UserSession.belongsTo(UserAccount, { foreignKey: 'accountId' });
UserAccount.hasMany(InteriorDesignProject, { as: 'projects', foreignKey: 'designerAccountId', onDelete: 'CASCADE' });
InteriorDesignProject.belongsTo(UserAccount, { as: 'designer', foreignKey: 'designerAccountId' });
InteriorDesignProject.hasMany(ProjectImage, { as: 'images', foreignKey: 'projectId', onDelete: 'CASCADE' });
ProjectImage.belongsTo(InteriorDesignProject, { as: 'project', foreignKey: 'projectId' });
InteriorDesignProject.hasMany(IdpImageUploadIntent, { as: 'uploadIntents', foreignKey: 'projectId', onDelete: 'CASCADE' });
IdpImageUploadIntent.belongsTo(InteriorDesignProject, { as: 'project', foreignKey: 'projectId' });

module.exports = {
  sequelize,
  Company,
  UserProfile,
  UserAccount,
  UserSession,
  IDPCategory,
  InteriorDesignProject,
  ProjectImage,
  IdpImageUploadIntent,
  IdpImageCleanupTask,
  ShortlistItem, // Customer shortlist stories #34-36
};
