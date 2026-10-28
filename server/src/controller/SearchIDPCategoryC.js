const IDPCategory = require('../entity/IDPCategory');

class SearchIDPCategoryC {
  async searchCategories(keyword = '') {
    if (typeof keyword !== 'string') {
      const error = new Error('Enter a search keyword as text.');
      error.status = 400;
      throw error;
    }
    return IDPCategory.searchCategories(keyword);
  }
}
module.exports = SearchIDPCategoryC;
