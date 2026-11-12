// BCE: Control.
// Coordinates the view request for IDP category data and delegates the operation to the entity.

// =============================================================================
// CONTROLLER: ViewIDPCategoryC            (BCE: Controller layer)
// User story #40: As a Platform Manager, I want to view an IDP category so
// that I can check its details.
//
// Sequence for story #40:
//   1. ViewIDPCategoryPg asks for category :id
//   2. ViewIDPCategoryC.viewCategory(id)                   <- THIS FILE
//        a. check the ID
//        b. IDPCategory.viewCategory(id)           read the category
//        c. not found -> 404 "IDP category not found."
//   3. the category goes back and the page shows the details
// =============================================================================

const IDPCategory = require('../entity/IDPCategory');
const RequestError = require('./RequestError');
const { categoryId } = require('./idpCategoryValidation');

class ViewIDPCategoryC {
  // Receives: id = the ID from the web address, as text.
  // Returns:  the category.
  async viewCategory(id) {
    const category = await IDPCategory.viewCategory(categoryId(id));
    if (!category) throw new RequestError(404, 'IDP category not found.');
    return category;
  }
}

// Expose this module’s entry points to its callers.
module.exports = ViewIDPCategoryC;
