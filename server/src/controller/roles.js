// =============================================================================
// CONTROLLER HELPER: roles
// The four built-in roles of the platform and how a profile name maps to one.
// This is a business rule (which profile name counts as which role), so it
// lives in the controller layer, not in the entity.
// =============================================================================

// Profile name (any capital letters) -> the official role name.
const ROLE_NAMES = {
  'user admin': 'User Admin',
  'interior designer': 'Interior Designer',
  customer: 'Customer',
  'platform manager': 'Platform Manager',
};

// Returns the official role name, or null if the name is not one of the 4 roles.
function canonicalRole(name) {
  return ROLE_NAMES[String(name || '').trim().toLowerCase()] || null;
}

// The role used for a login session: one of the 4 roles, or the name of a
// profile the User Admin created (story #1). Returns null only for a blank name.
function sessionRole(name) {
  return canonicalRole(name) || String(name || '').trim() || null;
}

module.exports = { canonicalRole, sessionRole };
