const IDPCategory = require('../entity/IDPCategory');
const { categoryId } = require('./idpCategoryValidation');

class ViewIDPCategoryC {
  async viewCategory(id) {
    return IDPCategory.viewCategory(categoryId(id));
  }
}
module.exports = ViewIDPCategoryC;
