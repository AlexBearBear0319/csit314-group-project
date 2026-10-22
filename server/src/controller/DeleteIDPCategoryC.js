const IDPCategory = require('../entity/IDPCategory');
const { categoryId } = require('./idpCategoryValidation');

class DeleteIDPCategoryC {
  async deleteCategory(id) {
    return IDPCategory.deleteCategory(categoryId(id));
  }
}
module.exports = DeleteIDPCategoryC;
