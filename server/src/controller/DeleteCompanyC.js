const Company = require('../entity/Company');
class DeleteCompanyC {
  async deleteCompany(accountId) { return Company.destroy({ where: { designerAccountId: accountId } }); }
}
module.exports = DeleteCompanyC;
