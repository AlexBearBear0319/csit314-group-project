// =============================================================================
// CONTROLLER: SearchDesignerIDPC          (BCE: Controller layer)
// User story #24 (current IDP): As an Interior Designer, I want to search for
// current IDPs so that I can quickly find a specific ongoing project.
// User story #29 (past IDP): As an Interior Designer, I want to search for past
// IDPs so that I can quickly find a specific finished project.
//
// The same method also builds the designer's project list: with no search text
// it returns every project of that status.
//
// Sequence for #24 and #29:
//   1. the designer's page sends the search text, sort order and page number
//   2. SearchDesignerIDPC.searchIDPs(designerAccountId, status, params)   <- THIS FILE
//        a. check q, sort, page and pageSize
//        b. InteriorDesignProject.listOwned(...)   this designer's matching
//           projects, nine per page
//        c. ShortlistItem.countsByProject(...) and a short-lived link per photo
//   3. { projects, pagination } goes back and the page shows one page of cards
// =============================================================================

const InteriorDesignProject = require('../entity/InteriorDesignProject');
const { checkSearch } = require('./designerIdpValidation');
const { renderProjectPage } = require('./designerIdpPresenter');

class SearchDesignerIDPC {
  // Receives: designerAccountId = the logged-in designer
  //           status = 'current' (story #24) or 'past' (story #29)
  //           params = { q, sort, page, pageSize } from the web address
  // Returns:  { projects, pagination: { page, pageSize, total, totalPages } }
  async searchIDPs(designerAccountId, status, params) {
    const { query, sort, page } = checkSearch(params);
    const result = await InteriorDesignProject.listOwned({ designerAccountId, status, query, page, sort });
    return renderProjectPage(result, page);
  }
}

module.exports = SearchDesignerIDPC;
