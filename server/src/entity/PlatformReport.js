const { Op, Transaction } = require('sequelize');
const { sequelize, Company, UserAccount, InteriorDesignProject, IDPCategory } = require('./index');
class PlatformReport {
  static async generateReport({start,endExclusive}) {
    const createdAt = {[Op.gte]:new Date(start),[Op.lt]:new Date(endExclusive)};
    // One snapshot keeps the totals and status breakdown consistent.
    return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ},async transaction=>{
      const counts = {};
      for (const [key,model,extra] of [
        ['accounts',UserAccount,{}],['companies',Company,{}],['categories',IDPCategory,{}],
        ['projects',InteriorDesignProject,{}],['currentProjects',InteriorDesignProject,{status:'current'}],['pastProjects',InteriorDesignProject,{status:'past'}],
      ]) counts[key]=await model.count({where:{createdAt,...extra},transaction});
      return counts;
    });
  }
}
module.exports = PlatformReport;
