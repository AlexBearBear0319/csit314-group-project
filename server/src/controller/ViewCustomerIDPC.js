const CustomerProject = require('../entity/CustomerProject');
class ViewCustomerIDPC {
  async viewProject(id) {
    if (!/^[1-9][0-9]*$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id)>2147483647) throw Object.assign(new Error('Invalid project ID.'),{status:400});
    return CustomerProject.viewProject(Number(id));
  }
}
module.exports = ViewCustomerIDPC;
