// BCE: Control.
// Coordinates the update request for company data and delegates the operation to the entity.

// =============================================================================
// CONTROLLER: UpdateCompanyC              (BCE: Controller layer)
// User story #15: As an Interior Designer, I want to update my company
// information so that it stays accurate.
//
// Sequence for story #15:
//   1. UpdateCompanyPg checks the form, then sends { name, description }
//   2. UpdateCompanyC.updateCompany(accountId, body)       <- THIS FILE
//        a. check the fields again
//        b. Company.updateCompany(accountId, values)   save the changes
//        c. none found -> 404 "Company not found."
//   3. the updated company goes back -> displaySuccess()
// =============================================================================

const Company = require('../entity/Company');
const RequestError = require('./RequestError');
const { companyFields } = require('./companyValidation');

class UpdateCompanyC {
  // Receives: accountId = the logged-in designer, body = { name, description }
  // Returns:  the updated company.
  async updateCompany(accountId, body) {
    const values = companyFields(body);
    const company = await Company.updateCompany(accountId, values);
    if (!company) throw new RequestError(404, 'Company not found.');
    return company;
  }
}

// Expose this module’s entry points to its callers.
module.exports = UpdateCompanyC;
