// =============================================================================
// CONTROLLER: CreateDesignerIDPC          (BCE: Controller layer)
// User story #20 (current IDP): As an Interior Designer, I want to create a
// current IDP so that customers can see a project I am working on.
// User story #25 (past IDP): As an Interior Designer, I want to create a past
// IDP so that customers can see a project I have finished.
//
// Both stories follow the same steps. The only difference is the status
// ('current' or 'past'), which the page passes in. A past project also needs a
// completion date.
//
// Sequence for #20 and #25:
//   1. ManageCurrentIdpsPg / ManagePastIdpsPg checks the form, then sends it
//   2. CreateDesignerIDPC.createIDP(designerAccountId, status, body)   <- THIS FILE
//        a. check the fields again (a past project needs a completion date)
//        b. IDPCategory.viewCategory(id)           is the chosen category real?
//        c. InteriorDesignProject.createProject(values)   save the project
//   3. the new project goes back -> displaySuccess(). The designer can then add
//      photos (ManageIDPImageC).
//
// designerAccountId comes from the login session on the server, never from the
// page, so a project always belongs to the designer who is logged in.
//
// CreateDesignerIDPC.listCategories() fills the "Category" dropdown on the form.
// =============================================================================

const IDPCategory = require('../entity/IDPCategory');
const InteriorDesignProject = require('../entity/InteriorDesignProject');
const RequestError = require('./RequestError');
const { checkProject } = require('./designerIdpValidation');
const { renderProject } = require('./designerIdpPresenter');

class CreateDesignerIDPC {
  // Receives: designerAccountId = the logged-in designer
  //           status = 'current' (story #20) or 'past' (story #25)
  //           body = { name, description, propertyType, designStyle, categoryId, completionDate }
  // Returns:  { project }
  async createIDP(designerAccountId, status, body) {
    // Step 2a: check the fields.
    const { values, errors } = checkProject(body, status);

    // Step 2b: a chosen category must exist (this needs the database).
    if (values.categoryId && !(await IDPCategory.viewCategory(values.categoryId))) {
      errors.categoryId = 'Choose an existing project category.';
    }
    if (Object.keys(errors).length) throw new RequestError(422, 'Check the project details.', errors);

    // Step 2c: save. A new project has no photos yet.
    const project = await InteriorDesignProject.createProject({ ...values, status, designerAccountId });
    project.images = [];
    return { project: await renderProject(project) };
  }

  // Returns the categories for the dropdown, for example [{ id: 3, name: 'Modern' }].
  async listCategories() {
    return IDPCategory.listOptions();
  }
}

module.exports = CreateDesignerIDPC;
