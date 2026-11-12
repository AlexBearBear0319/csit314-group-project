// BCE: Control.
// Coordinates the update request for user profile data and delegates the operation to the entity.

// =============================================================================
// CONTROLLER: UpdateUserProfileC          (BCE: Controller layer)
// User story #3: As a User Admin, I want to update a user profile so that its
// details stay accurate.
//
// Sequence for story #3:
//   1. UpdateUserProfilePg checks the form, then sends the new values
//   2. UpdateUserProfileC.updateProfile(id, body)          <- THIS FILE
//        a. check the ID and the fields
//        b. UserProfile.viewProfile(id)            does the profile exist?
//        c. UserProfile.findByName(name, id)       is the new name free?
//        d. UserProfile.updateProfile(id, name, description)   save it
//   3. the updated profile goes back -> displaySuccess()
// =============================================================================

const UserProfile = require('../entity/UserProfile');
const RequestError = require('./RequestError');
const { profileFields, profileId } = require('./userProfileValidation');

class UpdateUserProfileC {
  // Receives: id = the profile ID from the web address, as text
  //           body = { name, description }
  // Returns:  the updated profile.
  async updateProfile(id, body) {
    const validId = profileId(id);
    const { name, description } = profileFields(body);

    if (!(await UserProfile.viewProfile(validId))) throw new RequestError(404, 'User profile not found.');

    // Business rule: the name must not belong to a different profile. We pass
    // validId so keeping the profile's own name is fine.
    if (await UserProfile.findByName(name, validId)) {
      throw new RequestError(409, 'A user profile with this name already exists.',
        { name: 'A user profile with this name already exists.' });
    }
    return UserProfile.updateProfile(validId, name, description);
  }
}

// Expose this module’s entry points to its callers.
module.exports = UpdateUserProfileC;
