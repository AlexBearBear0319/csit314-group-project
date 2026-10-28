const UserProfile = require('../entity/UserProfile');
const { profileId } = require('./userProfileValidation');

class ViewUserProfileC {
  async viewProfile(id) {
    return UserProfile.viewProfile(profileId(id));
  }
}
module.exports = ViewUserProfileC;
