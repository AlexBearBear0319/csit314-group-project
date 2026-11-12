// =============================================================================
// CONTROLLER: UpdateDesignerIDPC          (BCE: Controller layer)
// User story #22 (current IDP): As an Interior Designer, I want to update a
// current IDP so that its details stay accurate as the project progresses.
// User story #27 (past IDP): As an Interior Designer, I want to update a past
// IDP so that its details stay accurate.
//
// Sequence for #22 and #27:
//   1. the designer's page checks the form, then sends the new values
//   2. UpdateDesignerIDPC.updateIDP(designerAccountId, status, id, body)   <- THIS FILE
//        a. check the ID and the fields (a past project needs a completion date)
//        b. IDPCategory.viewCategory(id)           is the chosen category real?
//        c. InteriorDesignProject.updateProject(...)   save, but only if the
//           project is THIS designer's and has this status
//        d. not found -> 404 "Project not found."
//   3. the updated project goes back -> displaySuccess()
// =============================================================================

const IDPCategory = require('../entity/IDPCategory');
const InteriorDesignProject = require('../entity/InteriorDesignProject');
const RequestError = require('./RequestError');
const { checkProject, projectIdFromUrl } = require('./designerIdpValidation');
const { renderProject } = require('./designerIdpPresenter');

class UpdateDesignerIDPC {
  // Receives: designerAccountId = the logged-in designer
  //           status = 'current' (story #22) or 'past' (story #27)
  //           id = project ID from the web address, as text
  //           body = the same fields as Create
  // Returns:  { project }
  async updateIDP(designerAccountId, status, id, body) {
    // Step 2a: check the fields.
    const { values, errors } = checkProject(body, status);

    // Step 2b: a chosen category must exist.
    if (values.categoryId && !(await IDPCategory.viewCategory(values.categoryId))) {
      errors.categoryId = 'Choose an existing project category.';
    }
    if (Object.keys(errors).length) throw new RequestError(422, 'Check the project details.', errors);

    // Steps 2c and 2d: save, or 404 if this is not the designer's project.
    const project = await InteriorDesignProject.updateProject({
      id: projectIdFromUrl(id),
      designerAccountId,
      status,
      values,
    });
    if (!project) throw new RequestError(404, 'Project not found.');
    return { project: await renderProject(project) };
  }
}

module.exports = UpdateDesignerIDPC;
