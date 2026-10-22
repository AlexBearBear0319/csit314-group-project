const UserProfile = require('../entity/UserProfile');
const { profileId } = require('./userProfileValidation');

class SuspendUserProfileC {
  async suspendProfile(id) {
    return UserProfile.suspendProfile(profileId(id));
  }
}
module.exports = SuspendUserProfileC;
