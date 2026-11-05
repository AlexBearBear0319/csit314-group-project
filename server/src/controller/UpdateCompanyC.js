const Company = require('../entity/Company');
const { companyFields } = require('./companyValidation');
class UpdateCompanyC {
  async updateCompany(accountId, body) { const values = companyFields(body); const company = await Company.findOwned(accountId); return company ? company.update(values) : null; }
}
module.exports = UpdateCompanyC;
