const UserProfile = require('../entity/UserProfile');
const { profileId } = require('./userProfileValidation');

class SuspendUserProfileC {
  async suspendProfile(id) {
    return UserProfile.suspendProfile(profileId(id));
  }

  // Alternative flow of #4: activate a suspended profile again.
  async activateProfile(id) {
    return UserProfile.activateProfile(profileId(id));
  }
}
module.exports = SuspendUserProfileC;
