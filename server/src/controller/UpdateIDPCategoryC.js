const IDPCategory = require('../entity/IDPCategory');
const { categoryFields, categoryId } = require('./idpCategoryValidation');

class UpdateIDPCategoryC {
  async updateCategory(id, body) {
    const validId = categoryId(id);
    const { name, description } = categoryFields(body);
    return IDPCategory.updateCategory(validId, name, description);
  }
}
module.exports = UpdateIDPCategoryC;
