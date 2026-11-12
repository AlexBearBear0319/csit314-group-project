// =============================================================================
// CONTROLLER: ViewCompanyC                (BCE: Controller layer)
// User story #14: As an Interior Designer, I want to view my company
// information so that I can check its details.
//
// Sequence for story #14:
//   1. ViewCompanyPg opens
//   2. ViewCompanyC.viewCompany(accountId)                 <- THIS FILE
//        a. Company.viewCompany(accountId)         read this designer's company
//        b. none found -> 404 "Company not found."
//   3. the company goes back and the page shows it
// =============================================================================

const Company = require('../entity/Company');
const RequestError = require('./RequestError');

class ViewCompanyC {
  // Receives: accountId = the logged-in designer.
  // Returns:  the designer's company.
  async viewCompany(accountId) {
    const company = await Company.viewCompany(accountId);
    if (!company) throw new RequestError(404, 'Company not found.');
    return company;
  }
}

module.exports = ViewCompanyC;
