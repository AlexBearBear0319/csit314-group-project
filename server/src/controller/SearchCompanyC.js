const Company = require('../entity/Company');
const { keyword } = require('./companyValidation');
class SearchCompanyC {
  async searchCompanies(accountId, keywordText) { return Company.searchOwned(accountId, keyword(keywordText)); }
}
module.exports = SearchCompanyC;
