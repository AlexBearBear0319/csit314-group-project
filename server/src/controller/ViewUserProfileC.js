// =============================================================================
// CONTROLLER: ViewUserProfileC            (BCE: Controller layer)
// User story #2: As a User Admin, I want to view a user profile so that I can
// check its details.
//
// Sequence for story #2:
//   1. ViewUserProfilePg asks for profile :id
//   2. ViewUserProfileC.viewProfile(id)                    <- THIS FILE
//        a. check the ID
//        b. UserProfile.viewProfile(id)            read the profile
//        c. not found -> 404 "User profile not found."
//   3. the profile goes back and the page shows the details
// =============================================================================

const UserProfile = require('../entity/UserProfile');
const RequestError = require('./RequestError');
const { profileId } = require('./userProfileValidation');

class ViewUserProfileC {
  // Receives: id = the ID from the web address, as text.
  // Returns:  the profile.
  async viewProfile(id) {
    const profile = await UserProfile.viewProfile(profileId(id));
    if (!profile) throw new RequestError(404, 'User profile not found.');
    return profile;
  }
}

module.exports = ViewUserProfileC;
