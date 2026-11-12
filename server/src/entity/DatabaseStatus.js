// =============================================================================
// ENTITY: DatabaseStatus           (BCE: Entity layer, no table of its own)
// Not a user story. It is used by the /api/health/ready check so we can see,
// after a deployment, whether the database is reachable and has every table
// and column the code needs. It only READS the structure of the database.
// =============================================================================

const sequelize = require('../db');

// The tables and columns the code expects to find.
const REQUIRED_COLUMNS = {
  company: ['id', 'name', 'description', 'designer_account_id', 'created_at', 'updated_at'],
  idp_category: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
  user_profile: ['id', 'name', 'description', 'status', 'createdAt', 'updatedAt'],
  user_account: ['id', 'username', 'password', 'name', 'email', 'dob', 'photo', 'status', 'profileId', 'createdAt', 'updatedAt'],
  user_session: ['id', 'account_id', 'token_hash', 'csrf_token', 'expires_at', 'created_at', 'updated_at'],
  interior_design_project: ['id', 'name', 'description', 'property_type', 'design_style', 'status', 'completion_date', 'designer_account_id', 'category_id', 'view_count', 'created_at', 'updated_at'],
  project_image: ['id', 'project_id', 'storage_path', 'file_name', 'content_type', 'size_bytes', 'alt_text', 'sort_order', 'created_at', 'updated_at'],
  idp_image_upload_intent: ['id', 'project_id', 'designer_account_id', 'storage_path', 'file_name', 'content_type', 'size_bytes', 'alt_text', 'expires_at', 'created_at', 'updated_at'],
  idp_image_cleanup_task: ['id', 'designer_account_id', 'storage_path', 'attempts', 'last_error', 'created_at', 'updated_at'],
};

class DatabaseStatus {
  // Returns { database, schema, schemaIssues }.
  //   database = 'ok' or 'unavailable'
  //   schema   = 'ok', 'missing_tables', 'missing_columns' or 'unknown'
  static async check() {
    const result = { database: 'unavailable', schema: 'unknown', schemaIssues: [] };
    try {
      await sequelize.authenticate();
      result.database = 'ok';
      const tables = await sequelize.getQueryInterface().showAllTables();
      const names = new Set(tables.map((table) => (typeof table === 'string' ? table : table.tableName)));
      result.schema = 'ok';

      for (const [table, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
        if (!names.has(table)) {
          result.schemaIssues.push({ table, missingTable: true, missingColumns: [] });
          continue;
        }
        const columns = await sequelize.getQueryInterface().describeTable(table);
        const missingColumns = requiredColumns.filter((column) => !Object.hasOwn(columns, column));
        if (missingColumns.length) result.schemaIssues.push({ table, missingTable: false, missingColumns });
      }
      if (result.schemaIssues.some((issue) => issue.missingTable)) result.schema = 'missing_tables';
      else if (result.schemaIssues.length) result.schema = 'missing_columns';
    } catch {
      result.schema = 'unknown';
    }
    return result;
  }
}

module.exports = DatabaseStatus;
