// =============================================================================
// ENTITY: PlatformReport           (BCE: Entity layer, no table of its own)
// Counts what was created on the platform in a time range (stories #44-46).
// It reads six tables and only counts rows, so it never changes any data.
// =============================================================================

const { Op, Transaction } = require('sequelize');
const { sequelize, Company, UserAccount, InteriorDesignProject, IDPCategory } = require('./index');

class PlatformReport {
  // Counts the records created from `start` up to (not including) `endExclusive`.
  // All six counts run in ONE transaction with REPEATABLE_READ, so they all see
  // the same snapshot of the database. The numbers then always add up, even if
  // someone creates a record while the report runs.
  // Returns { accounts, companies, categories, projects, currentProjects, pastProjects }.
  static async generateReport({ start, endExclusive }) {
    const createdAt = { [Op.gte]: new Date(start), [Op.lt]: new Date(endExclusive) };
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async (transaction) => {
      const counts = {};
      const wanted = [
        ['accounts', UserAccount, {}],
        ['companies', Company, {}],
        ['categories', IDPCategory, {}],
        ['projects', InteriorDesignProject, {}],
        ['currentProjects', InteriorDesignProject, { status: 'current' }],
        ['pastProjects', InteriorDesignProject, { status: 'past' }],
      ];
      for (const [key, model, extra] of wanted) {
        counts[key] = await model.count({ where: { createdAt, ...extra }, transaction });
      }
      return counts;
    });
  }
}

module.exports = PlatformReport;
