const IDPDatabase = require('../entity/IDPDatabase');
const { keyword } = require('./companyValidation');

function searchOptions(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  if (typeof query.page === 'object' || !Number.isSafeInteger(page) || page < 1 || page > 1000000) {
    throw Object.assign(new Error('Enter a valid page number.'), { status: 400 });
  }
  // No sort chosen means newest first.
  const sort = query.sort || 'date';
  if (!['fifo', 'date', 'alphabetical'].includes(sort)) {
    throw Object.assign(new Error('Choose a valid sort order.'), { status: 400 });
  }
  return {
    keyword: keyword(query.keyword).trim(),
    propertyType: keyword(query.propertyType).trim(),
    designStyle: keyword(query.designStyle).trim(),
    page,
    sort,
  };
}

// Routes create one controller for each request so search state stays isolated.
class SearchIDPController {
  receiveSearchKeyword(query) {
    this.options = searchOptions(query);
    this.searchKeyword = this.options.keyword;
    if (!this.searchKeyword && !this.options.propertyType && !this.options.designStyle) {
      throw Object.assign(new Error('Enter a keyword or choose a filter.'), { status: 400 });
    }
    return this.searchIDP();
  }

  async searchIDP() {
    this.matchingIDPRecords = await IDPDatabase.searchByKeyword(this.searchKeyword, this.options);
    return this.returnSearchResults();
  }

  filterIDPResults() {
    // Filtering and pagination happen in the database before rows are returned.
    return this.matchingIDPRecords;
  }

  checkSearchResults() {
    return this.matchingIDPRecords.total > 0;
  }

  returnSearchResults() {
    return { ...this.filterIDPResults(), hasResults: this.checkSearchResults() };
  }
}

module.exports = { SearchIDPController, searchOptions };
