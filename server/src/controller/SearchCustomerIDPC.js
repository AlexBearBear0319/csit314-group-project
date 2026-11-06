const CustomerProject = require('../entity/CustomerProject');
const { keyword } = require('./companyValidation');
class SearchCustomerIDPC {
  async searchProjects(query) {
    const page = query.page === undefined ? 1 : Number(query.page);
    if (typeof query.page === 'object' || !Number.isSafeInteger(page) || page < 1 || page > 1000000) throw Object.assign(new Error('Enter a valid page number.'),{status:400});
    return CustomerProject.searchProjects(keyword(query.keyword),page);
  }
}
module.exports = SearchCustomerIDPC;
