const Company = require('../entity/Company');
class ViewCompanyC {
  async viewCompany(accountId) { return Company.findOwned(accountId); }
}
module.exports = ViewCompanyC;
