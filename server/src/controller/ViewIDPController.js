const IDPDatabase = require('../entity/IDPDatabase');
const { searchOptions } = require('./SearchIDPController');

class ViewIDPController {
  retrieveIDP(query = {}) {
    const options = searchOptions(query);
    if (options.sort === 'date') return this.sortByDate(options);
    if (options.sort === 'alphabetical') return this.sortAlphabetically(options);
    return IDPDatabase.retrieveIDP(options);
  }

  sortByDate(options) {
    return IDPDatabase.retrieveIDP({ ...options, sort: 'date' });
  }

  sortAlphabetically(options) {
    return IDPDatabase.retrieveIDP({ ...options, sort: 'alphabetical' });
  }

  selectIDP(projectID) {
    if (!/^[1-9][0-9]*$/.test(projectID) || Number(projectID) > 2147483647) {
      throw Object.assign(new Error('Invalid project ID.'), { status: 400 });
    }
    return this.retrieveIDPDetails(Number(projectID));
  }

  async retrieveIDPDetails(projectID) {
    this.IDPData = await IDPDatabase.getIDPDetails(projectID);
    return this.IDPData;
  }
}

module.exports = ViewIDPController;
