// BCE: Control.
// Coordinates the search request for user profile data and delegates the operation to the entity.

// =============================================================================
// CONTROLLER: SearchUserProfileC          (BCE: Controller layer)
// User story #5: As a User Admin, I want to search for user profiles so that I
// can quickly find a specific profile.
//
// Sequence for story #5:
//   1. SearchUserProfilePg sends the keyword the admin typed
//   2. SearchUserProfileC.searchProfiles(keyword)          <- THIS FILE
//        a. the keyword must be plain text
//        b. UserProfile.searchProfiles(keyword)    find the matches
//   3. the list goes back and the page shows it
// =============================================================================

const UserProfile = require('../entity/UserProfile');
const RequestError = require('./RequestError');

class SearchUserProfileC {
  // Receives: keyword = text, or nothing (which lists every profile).
  // Returns:  the matching profiles.
  async searchProfiles(keyword = '') {
    if (typeof keyword !== 'string') throw new RequestError(400, 'Enter a search keyword as text.');
    return UserProfile.searchProfiles(keyword);
  }
}

// Expose this module’s entry points to its callers.
module.exports = SearchUserProfileC;
