// BCE: Control.
// Coordinates the create request for company data and delegates the operation to the entity.

// =============================================================================
// CONTROLLER: CreateCompanyC              (BCE: Controller layer)
// User story #13: As an Interior Designer, I want to create my company
// information so that customers know who I work for.
//
// Sequence for story #13:
//   1. CreateCompanyPg checks the form, then sends { name, description }
//   2. CreateCompanyC.createCompany(accountId, body)       <- THIS FILE
//        a. check the fields again
//        b. Company.viewCompany(accountId)         does this designer already
//           have a company? (one company per designer)
//        c. Company.createCompany(values)          save it
//   3. the new company goes back -> displaySuccess()
//
// accountId comes from the login session on the server, never from the page.
// =============================================================================

const Company = require('../entity/Company');
const RequestError = require('./RequestError');
const { companyFields } = require('./companyValidation');

class CreateCompanyC {
  // Receives: accountId = the logged-in designer, body = { name, description }
  // Returns:  the saved company.
  async createCompany(accountId, body) {
    const values = companyFields(body);

    // Business rule: one designer has at most one company.
    if (await Company.viewCompany(accountId)) {
      throw new RequestError(409, 'You already have company information. Update it instead.');
    }
    return Company.createCompany({ ...values, designerAccountId: accountId });
  }
}

// Expose this module’s entry points to its callers.
module.exports = CreateCompanyC;
