// =============================================================================
// CONTROLLER: SuspendUserProfileC         (BCE: Controller layer)
// User story #4: As a User Admin, I want to suspend a user profile so that
// users of that type can no longer log in.
//
// Sequence for story #4:
//   1. SuspendUserProfilePg asks the admin to confirm, then sends the ID
//   2. SuspendUserProfileC.suspendProfile(id)              <- THIS FILE
//        a. check the ID
//        b. UserProfile.viewProfile(id)            does the profile exist?
//        c. UserProfile.suspendProfile(id)         set status = 'suspended'
//   3. the suspended profile goes back -> displaySuccess()
//
// Alternative flow: activateProfile(id) puts a suspended profile back to
// 'active', so its accounts can log in again.
// =============================================================================

const UserProfile = require('../entity/UserProfile');
const RequestError = require('./RequestError');
const { profileId } = require('./userProfileValidation');

class SuspendUserProfileC {
  // Receives: id = the profile ID from the web address, as text.
  // Returns:  the suspended profile.
  async suspendProfile(id) {
    const validId = await this.findExisting(id);
    return UserProfile.suspendProfile(validId);
  }

  // Alternative flow of story #4. Returns the activated profile.
  async activateProfile(id) {
    const validId = await this.findExisting(id);
    return UserProfile.activateProfile(validId);
  }

  // Shared first steps: check the ID, then make sure the profile exists.
  async findExisting(id) {
    const validId = profileId(id);
    if (!(await UserProfile.viewProfile(validId))) throw new RequestError(404, 'User profile not found.');
    return validId;
  }
}

module.exports = SuspendUserProfileC;
