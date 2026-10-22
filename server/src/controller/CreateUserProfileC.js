const UserProfile = require('../entity/UserProfile');
const { profileFields } = require('./userProfileValidation');

class CreateUserProfileC {
  async createProfile(body) {
    const { name, description } = profileFields(body);
    return UserProfile.createProfile(name, description);
  }
}
module.exports = CreateUserProfileC;
