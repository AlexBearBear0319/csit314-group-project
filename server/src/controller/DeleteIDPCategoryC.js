// =============================================================================
// CONTROLLER: DeleteIDPCategoryC          (BCE: Controller layer)
// User story #42: As a Platform Manager, I want to delete an IDP category so
// that an unused or inappropriate category is removed.
//
// Sequence for story #42:
//   1. DeleteIDPCategoryPg asks the manager to confirm, then sends the ID
//   2. DeleteIDPCategoryC.deleteCategory(id)               <- THIS FILE
//        a. check the ID
//        b. IDPCategory.viewCategory(id)           does the category exist?
//        c. business rule: a category that projects still use cannot be deleted
//           (IDPCategory.countProjects(id))
//        d. IDPCategory.deleteCategory(id)         delete it
//   3. a confirmation goes back -> displaySuccess()
// =============================================================================

const IDPCategory = require('../entity/IDPCategory');
const RequestError = require('./RequestError');
const { categoryId } = require('./idpCategoryValidation');

class DeleteIDPCategoryC {
  // Receives: id = the category ID from the web address, as text.
  // Returns:  { message: 'IDP category deleted.' }
  async deleteCategory(id) {
    const validId = categoryId(id);

    if (!(await IDPCategory.viewCategory(validId))) throw new RequestError(404, 'IDP category not found.');

    // Deleting a used category would leave projects with no category.
    if ((await IDPCategory.countProjects(validId)) > 0) {
      throw new RequestError(409, 'This IDP category is in use and cannot be deleted.');
    }

    await IDPCategory.deleteCategory(validId);
    return { message: 'IDP category deleted.' };
  }
}

module.exports = DeleteIDPCategoryC;
