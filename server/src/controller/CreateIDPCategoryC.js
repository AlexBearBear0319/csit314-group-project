const IDPCategory = require('../entity/IDPCategory');
const { categoryFields } = require('./idpCategoryValidation');

class CreateIDPCategoryC {
  async createCategory(body) {
    const { name, description } = categoryFields(body);
    return IDPCategory.createCategory(name, description);
  }
}
module.exports = CreateIDPCategoryC;
