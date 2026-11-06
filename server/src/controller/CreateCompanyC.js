const Company = require('../entity/Company');
const { companyFields } = require('./companyValidation');
class CreateCompanyC {
  async createCompany(accountId, body) { return Company.create({ ...companyFields(body), designerAccountId: accountId }); }
}
module.exports = CreateCompanyC;
