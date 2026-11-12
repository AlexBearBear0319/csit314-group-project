// =============================================================================
// ENTITY: ShortlistItem          (BCE: Entity layer)
// Stories #34-36: a Customer saves, searches and views shortlisted IDPs.
// One row in the shortlist_item table means "this Customer saved this project".
//
// Table: shortlist_item (customer_account_id, project_id). The pair is unique,
// so a Customer can save a project only once.
//
// This class only does CRUD on its own table. The controllers (SaveShortlistC,
// SearchShortlistC, ViewShortlistC) decide what is allowed, then call it.
// =============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');
const UserAccount = require('./UserAccount');
const InteriorDesignProject = require('./InteriorDesignProject');
const ProjectImage = require('./ProjectImage');

// =============================================================================
// FUNCTION: summaryFields (helper, only used in this file)
// WHAT IT DOES: builds a SAFE copy of a saved project to send to the browser.
// The designer's email and account ID are deliberately left out.
// RECEIVES: item = one shortlist row, loaded with its project and designer.
// GIVES BACK: the safe copy.
// =============================================================================
function summaryFields(item) {
  const { project } = item; // take the linked project out of the row
  return {
    id: project.id, // the project's ID
    name: project.name, // the project's name
    description: project.description, // the project's description
    propertyType: project.propertyType, // such as Condo or HDB
    designStyle: project.designStyle, // such as Modern
    status: project.status, // 'current' or 'past'
    completionDate: project.completionDate, // when a past project finished
    // ?. means: read .name only if a designer was found. || null covers the rest.
    designerName: project.designer?.name || null,
    // Only the pop-up asks for these two. In the list they are simply null.
    categoryName: project.category?.name || null,
    companyName: project.designer?.company?.name || null,
    savedAt: item.createdAt, // when the Customer saved it
  };
} // End of summaryFields.

// Start of the class. "extends Model" gives it database methods such as findOne.
class ShortlistItem extends Model {
  // ---------------------------------------------------------------------------
  // CREATE (story #34)
  // Saves one row. SaveShortlistC has already checked that the project exists
  // and that this Customer has not saved it yet.
  // Returns the saved project's safe fields.
  // SQL: INSERT INTO shortlist_item (customer_account_id, project_id) VALUES (?, ?)
  // ---------------------------------------------------------------------------
  static async createItem(customerAccountId, projectId) {
    const item = await ShortlistItem.create({ customerAccountId, projectId });
    return ShortlistItem.viewSaved(customerAccountId, item.projectId);
  }

  // ---------------------------------------------------------------------------
  // READ one row (used by SaveShortlistC to see if the project is already saved)
  // Returns the row, or null.
  // ---------------------------------------------------------------------------
  static async findItem(customerAccountId, projectId) {
    return ShortlistItem.findOne({ where: { customerAccountId, projectId } });
  }

  // ---------------------------------------------------------------------------
  // READ all (story #36, the list)
  // "View my shortlist so that I can see all the IDPs I have saved".
  // RECEIVES: customerAccountId = the logged-in Customer's account ID
  // GIVES BACK: every project this Customer saved, the latest save at the top.
  // ---------------------------------------------------------------------------
  static async viewShortlist(customerAccountId) {
    const items = await ShortlistItem.findAll({
      where: { customerAccountId }, // only this Customer's rows
      include: [{ association: 'project', required: true, include: [{ association: 'designer', attributes: ['name'] }] }], // also load the project and designer name
      order: [['createdAt', 'DESC'], ['id', 'DESC']], // latest save first; the ID settles a tie
    });
    return items.map(summaryFields);
  } // End of viewShortlist.

  // ---------------------------------------------------------------------------
  // FUNCTION: searchSaved
  // Story #35: Search shortlisted IDPs.
  // Finds this Customer's saved projects whose name, property type or design
  // style CONTAINS the keyword, ignoring capitals. An empty keyword lists all.
  // RECEIVES: customerAccountId = the logged-in Customer's account ID
  //           keyword           = the search text
  // GIVES BACK: a list of safe project copies, newest save first.
  // ---------------------------------------------------------------------------
  static async searchSaved(customerAccountId, keyword) {
    // Start from the whole shortlist, then keep only what matches.
    const projects = await ShortlistItem.viewShortlist(customerAccountId);

    // Remove spaces at the ends of the keyword and make it lowercase.
    const term = String(keyword || '').trim().toLowerCase();
    // With no keyword, hand back the whole list.
    if (!term) return projects;
    // One Customer's shortlist is small, so filter it here. This treats characters
    // like % as plain text, the same way in the test and real databases.
    return projects.filter((project) => [project.name, project.propertyType, project.designStyle]
      .some((value) => (value || '').toLowerCase().includes(term))); // keep it if any field contains the keyword
  } // End of searchSaved.

  // ---------------------------------------------------------------------------
  // FUNCTION: viewSaved
  // Story #36: View shortlisted IDP.
  // The where below checks the owner, so one Customer can never open a project
  // through another Customer's shortlist.
  // RECEIVES: customerAccountId = the logged-in Customer's account ID
  //           projectId         = the project to view
  // GIVES BACK: the safe copy, or null if this Customer did not save it.
  // ---------------------------------------------------------------------------
  static async viewSaved(customerAccountId, projectId) {
    // Find the row for this Customer and this project.
    const item = await ShortlistItem.findOne({
      where: { customerAccountId, projectId }, // both must match
      // Also load what the pop-up shows: the category, the designer and their company.
      // required: false keeps the project even if it has no category or company.
      include: [{
        association: 'project',
        required: true,
        include: [
          { association: 'category', attributes: ['name'], required: false },
          { association: 'designer', attributes: ['name'], include: [{ association: 'company', attributes: ['name'], required: false }] },
        ],
      }],
    });
    // If it was found, hand back the safe copy. If not, hand back null.
    return item ? summaryFields(item) : null;
  } // End of viewSaved.

  // ---------------------------------------------------------------------------
  // FUNCTION: savedImages
  // Story #36 (part): reads the photo records of one project, in display order.
  // RECEIVES: projectId = the project.
  // GIVES BACK: a list of photo rows.
  // ---------------------------------------------------------------------------
  static async savedImages(projectId) {
    // SQL: SELECT ... FROM project_image WHERE project_id = ? ORDER BY sort_order
    return ProjectImage.findAll({ where: { projectId }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
  } // End of savedImages.

  // ---------------------------------------------------------------------------
  // FUNCTION: countsByProject
  // Story #31: count how many customers saved each of these projects.
  // One query for the whole list, so a page of 9 projects does not need 9 queries.
  // RECEIVES: projectIds = a list of project ids
  // GIVES BACK: a Map of projectId -> count. A project nobody saved has 0.
  // ---------------------------------------------------------------------------
  static async countsByProject(projectIds) {
    // Start every project at 0, then fill in the ones that have rows.
    const counts = new Map(projectIds.map((id) => [id, 0]));
    if (!projectIds.length) return counts;
    // SQL: SELECT project_id, COUNT(*) FROM shortlist_item WHERE project_id IN (...) GROUP BY project_id
    const rows = await ShortlistItem.findAll({
      attributes: ['projectId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      where: { projectId: projectIds },
      group: ['projectId'],
      raw: true,
    });
    for (const row of rows) counts.set(Number(row.projectId), Number(row.total));
    return counts;
  } // End of countsByProject.

  // ---------------------------------------------------------------------------
  // READ a count (story #31)
  // How many Customers saved this project. ViewIDPShortlistCountC has already
  // checked that the project belongs to the designer who asked.
  // ---------------------------------------------------------------------------
  static async countForProject(projectId) {
    return ShortlistItem.count({ where: { projectId } });
  }
} // End of the class.

// -----------------------------------------------------------------------------
// TABLE DEFINITION
// ShortlistItem.init tells Sequelize which columns the shortlist_item table has.
// Sequelize also adds id, created_at and updated_at automatically.
// -----------------------------------------------------------------------------
ShortlistItem.init(
  {
    customerAccountId: { type: DataTypes.INTEGER, allowNull: false, field: 'customer_account_id' }, // who saved it
    projectId: { type: DataTypes.INTEGER, allowNull: false, field: 'project_id' }, // what they saved
  },
  {
    sequelize, // the database connection
    modelName: 'ShortlistItem', // the name used in the code
    tableName: 'shortlist_item', // the name of the table in the database
    underscored: true, // write column names like created_at
    // Allow each Customer to save each project only once.
    indexes: [{ unique: true, fields: ['customer_account_id', 'project_id'] }],
  }
); // End of the table definition.

// -----------------------------------------------------------------------------
// LINKS BETWEEN TABLES
// onDelete: 'CASCADE' means: if the account or project is deleted, delete its
// shortlist rows too, so a shortlist never points at something that is gone.
// -----------------------------------------------------------------------------
UserAccount.hasMany(ShortlistItem, { foreignKey: 'customerAccountId', onDelete: 'CASCADE' }); // an account has many saved rows
ShortlistItem.belongsTo(UserAccount, { as: 'customer', foreignKey: 'customerAccountId' }); // each row belongs to one account
InteriorDesignProject.hasMany(ShortlistItem, { foreignKey: 'projectId', onDelete: 'CASCADE' }); // a project can be saved many times
ShortlistItem.belongsTo(InteriorDesignProject, { as: 'project', foreignKey: 'projectId' }); // each row points at one project

// Let other files load this class.
module.exports = ShortlistItem;
