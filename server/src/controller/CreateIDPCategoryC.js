// =============================================================================
// CONTROLLER: CreateIDPCategoryC          (BCE: Controller layer)
// User story #39: As a Platform Manager, I want to create an IDP category so
// that IDPs can be organised on the platform.
//
// Sequence for story #39:
//   1. CreateIDPCategoryPg checks the form, then sends { name, description }
//   2. CreateIDPCategoryC.createCategory(body)             <- THIS FILE
//        a. check the fields again
//        b. IDPCategory.findByName(name)           is the name free?
//        c. IDPCategory.createCategory(name, description)  save it
//   3. the new category goes back -> displaySuccess()
// =============================================================================

const IDPCategory = require('../entity/IDPCategory');
const RequestError = require('./RequestError');
const { categoryFields } = require('./idpCategoryValidation');

class CreateIDPCategoryC {
  // Receives: body = { name, description }
  // Returns:  the saved category.
  async createCategory(body) {
    const { name, description } = categoryFields(body);

    // Business rule: two categories cannot share a name.
    if (await IDPCategory.findByName(name)) {
      throw new RequestError(409, 'An IDP category with this name already exists.',
        { name: 'An IDP category with this name already exists.' });
    }
    return IDPCategory.createCategory(name, description);
  }
}

module.exports = CreateIDPCategoryC;
