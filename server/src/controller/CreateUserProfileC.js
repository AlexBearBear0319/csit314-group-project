// BCE: Control.
// Coordinates the create request for user profile data and delegates the operation to the entity.

// =============================================================================
// CONTROLLER: CreateUserProfileC          (BCE: Controller layer)
// User story #1: As a User Admin, I want to create a user profile so that I can
// define a type of user on the platform.
//
// Sequence for story #1:
//   1. CreateUserProfilePg checks the form, then sends { name, description }
//   2. CreateUserProfileC.createProfile(body)              <- THIS FILE
//        a. check the fields again
//        b. UserProfile.findByName(name)           is the name free?
//        c. UserProfile.createProfile(name, description)   save it
//   3. the new profile goes back -> displaySuccess()
// =============================================================================

const UserProfile = require('../entity/UserProfile');
const RequestError = require('./RequestError');
const { profileFields } = require('./userProfileValidation');

class CreateUserProfileC {
  // Receives: body = { name, description }
  // Returns:  the saved profile.
  async createProfile(body) {
    const { name, description } = profileFields(body);

    // Business rule: two profiles cannot share a name.
    if (await UserProfile.findByName(name)) {
      throw new RequestError(409, 'A user profile with this name already exists.',
        { name: 'A user profile with this name already exists.' });
    }
    return UserProfile.createProfile(name, description);
  }
}

// Expose this module’s entry points to its callers.
module.exports = CreateUserProfileC;
