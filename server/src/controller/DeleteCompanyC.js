// BCE: Control.
// Coordinates the delete request for company data and delegates the operation to the entity.

// =============================================================================
// CONTROLLER: DeleteCompanyC              (BCE: Controller layer)
// User story #16: As an Interior Designer, I want to delete my company
// information so that it is no longer shown.
//
// Sequence for story #16:
//   1. DeleteCompanyPg asks the designer to confirm
//   2. DeleteCompanyC.deleteCompany(accountId)             <- THIS FILE
//        a. Company.deleteCompany(accountId)       delete this designer's company
//        b. nothing deleted -> 404 "Company not found."
//   3. a confirmation goes back -> displaySuccess()
// =============================================================================

const Company = require('../entity/Company');
const RequestError = require('./RequestError');

class DeleteCompanyC {
  // Receives: accountId = the logged-in designer.
  // Returns:  { message: 'Company deleted.' }
  async deleteCompany(accountId) {
    const deleted = await Company.deleteCompany(accountId);
    if (!deleted) throw new RequestError(404, 'Company not found.');
    return { message: 'Company deleted.' };
  }
}

// Expose this module’s entry points to its callers.
module.exports = DeleteCompanyC;
