const UserProfile = require('../entity/UserProfile');
const { profileFields, profileId } = require('./userProfileValidation');

class UpdateUserProfileC {
  async updateProfile(id, body) {
    const validId = profileId(id);
    const { name, description } = profileFields(body);
    return UserProfile.updateProfile(validId, name, description);
  }
}
module.exports = UpdateUserProfileC;
