const Company = require('../entity/Company');
class ViewCompanyC {
  async viewCompany(accountId, body) { return Company.findOwned(accountId); }
}
module.exports = ViewCompanyC;
