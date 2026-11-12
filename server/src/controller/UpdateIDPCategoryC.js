// =============================================================================
// CONTROLLER: UpdateIDPCategoryC          (BCE: Controller layer)
// User story #41: As a Platform Manager, I want to update an IDP category so
// that its details stay accurate.
//
// Sequence for story #41:
//   1. UpdateIDPCategoryPg checks the form, then sends the new values
//   2. UpdateIDPCategoryC.updateCategory(id, body)         <- THIS FILE
//        a. check the ID and the fields
//        b. IDPCategory.viewCategory(id)           does the category exist?
//        c. IDPCategory.findByName(name, id)       is the new name free?
//        d. IDPCategory.updateCategory(id, name, description)   save it
//   3. the updated category goes back -> displaySuccess()
// =============================================================================

const IDPCategory = require('../entity/IDPCategory');
const RequestError = require('./RequestError');
const { categoryFields, categoryId } = require('./idpCategoryValidation');

class UpdateIDPCategoryC {
  // Receives: id = the category ID from the web address, as text
  //           body = { name, description }
  // Returns:  the updated category.
  async updateCategory(id, body) {
    const validId = categoryId(id);
    const { name, description } = categoryFields(body);

    if (!(await IDPCategory.viewCategory(validId))) throw new RequestError(404, 'IDP category not found.');

    // Business rule: the name must not belong to a different category.
    if (await IDPCategory.findByName(name, validId)) {
      throw new RequestError(409, 'An IDP category with this name already exists.',
        { name: 'An IDP category with this name already exists.' });
    }
    return IDPCategory.updateCategory(validId, name, description);
  }
}

module.exports = UpdateIDPCategoryC;
