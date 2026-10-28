const UserProfile = require('../entity/UserProfile');

class SearchUserProfileC {
  async searchProfiles(keyword = '') {
    if (typeof keyword !== 'string') {
      const error = new Error('Enter a search keyword as text.');
      error.status = 400;
      throw error;
    }
    return UserProfile.searchProfiles(keyword);
  }
}
module.exports = SearchUserProfileC;
