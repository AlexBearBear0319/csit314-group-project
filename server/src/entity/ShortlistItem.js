// =============================================================================
// ENTITY: ShortlistItem
// User stories #34-36: a Customer saves, searches and views shortlisted IDPs.
//
// One row in the shortlist_item table means: "this Customer saved this project".
//
// HOW A REQUEST TRAVELS (BCE = Boundary, Controller, Entity):
//   Boundary (the web page) -> routes/shortlist.js -> a Shortlist controller
//   -> ShortlistItem  <- THIS FILE, the only layer that reads or writes this table
//
// WORDS USED IN THIS FILE:
//   const   = give a value a name. The name keeps that value.
//   require = load code from another file so this file can use it.
//   class   = a group of related functions. A function in a class is a "method".
//   static  = call the method on the class itself: ShortlistItem.viewSaved(...).
//   async   = this function takes time (it waits for the database).
//   await   = wait here for the slow work to finish, then carry on.
//   return  = stop the function and hand back this value.
// =============================================================================

// Load the tools from Sequelize, the library that talks to the database for us.
const { DataTypes, Model, UniqueConstraintError } = require('sequelize');
// Load the database connection.
const sequelize = require('../db');
// Load the account table, because each saved row belongs to a Customer account.
const UserAccount = require('./UserAccount');
// Load the project table, because each saved row points at a project.
const InteriorDesignProject = require('./InteriorDesignProject');
// Load the photo table, because the View page shows a project's photos.
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
    savedAt: item.createdAt, // when the Customer saved it
  };
} // End of summaryFields.

// Start of the class. "extends Model" gives it database methods such as findOne.
class ShortlistItem extends Model {
  // ---------------------------------------------------------------------------
  // FUNCTION: saveProject
  // Story #34: Save IDP to shortlist.
  // RECEIVES: customerAccountId = the logged-in Customer's account ID
  //           projectId         = the project to save
  // GIVES BACK: { project } when saved, { conflict: true } when it is already
  //             saved, or null when no project has this ID.
  // ---------------------------------------------------------------------------
  static async saveProject(customerAccountId, projectId) {
    // 1. Check that the project exists. findByPk = find by primary key (the ID).
    const project = await InteriorDesignProject.findByPk(projectId);
    if (!project) return null; // no such project, so stop

    // 2. Try to save the row. "try" means: if this fails, jump to "catch".
    try {
      // SQL: INSERT INTO shortlist_item (customer_account_id, project_id) VALUES (?, ?)
      const item = await ShortlistItem.create({ customerAccountId, projectId });
      // 3. Read the row back with its project, and send only the safe fields.
      return { project: await ShortlistItem.viewSaved(customerAccountId, item.projectId) };
    } catch (error) {
      // The table allows each Customer to save each project only once. The
      // database itself refuses a second copy, even if 2 clicks arrive together.
      if (error instanceof UniqueConstraintError) return { conflict: true };
      // Any other problem is unexpected, so pass it on to the error handler.
      throw error;
    }
  } // End of saveProject.

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
    // Read every project this Customer saved, with its designer.
    const items = await ShortlistItem.findAll({
      where: { customerAccountId }, // only this Customer's rows
      include: [{ association: 'project', required: true, include: [{ association: 'designer', attributes: ['name'] }] }], // also load the project and designer name
      order: [['createdAt', 'DESC'], ['id', 'DESC']], // newest save first
    });
    // Turn the rows into safe copies.
    const projects = items.map(summaryFields);

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
      include: [{ association: 'project', required: true, include: [{ association: 'designer', attributes: ['name'] }] }], // also load the project and designer name
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
  // FUNCTION: countForOwnedProject
  // Story #31: the shortlist count of one project, for the designer who owns it.
  // GIVES BACK: the count, or null if the project is not found or not theirs.
  // ---------------------------------------------------------------------------
  static async countForOwnedProject(designerAccountId, projectId) {
    // Check ownership first, so a designer cannot read another designer's numbers.
    const project = await InteriorDesignProject.findOne({ where: { id: projectId, designerAccountId }, attributes: ['id'] });
    if (!project) return null;
    return ShortlistItem.count({ where: { projectId: project.id } });
  } // End of countForOwnedProject.
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
