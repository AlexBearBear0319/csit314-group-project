const Company = require('../entity/Company');
const { keyword } = require('./companyValidation');
class SearchCompanyC {
  async searchCompanies(accountId, body) { return Company.searchOwned(accountId, keyword(body)); }
}
module.exports = SearchCompanyC;
