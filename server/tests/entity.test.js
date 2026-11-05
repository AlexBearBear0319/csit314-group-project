// Proves the database tables work, using the in-memory test database.
// Use this file as the pattern for your own entity tests.
// Load the test database connection and the 2 tables these tests use.
const { sequelize, UserProfile, UserAccount } = require('../src/entity');

// -----------------------------------------------------------------------------
// SETUP: beforeEach runs before EVERY test, so every test starts clean.
// -----------------------------------------------------------------------------
beforeEach(async () => {
  await sequelize.sync({ force: true }); // fresh empty tables before every test
});

// -----------------------------------------------------------------------------
// CLEAN-UP: afterAll runs once at the end. Close the database so the tests can exit.
// -----------------------------------------------------------------------------
afterAll(async () => {
  await sequelize.close();
});

// -----------------------------------------------------------------------------
// TEST GROUP: the UserAccount table. describe(...) groups related tests.
// -----------------------------------------------------------------------------
describe('UserAccount entity', () => {
  // TEST 1: a new account links to its profile and starts as active.
  test('a new account is linked to a profile and starts active', async () => {
    // Create a profile for the account to link to.
    const profile = await UserProfile.create({ name: 'Customer' });
    // Create an account with test details.
    const account = await UserAccount.create({
      username: 'test1', // the login user ID
      password: 'hashed', // a stand-in value; this test does not log in
      name: 'Test User', // the person's name
      email: 'test1@example.com', // the email
      profileId: profile.id, // link to the profile above
    });
    // Check: the status must be 'active'. If not, the test fails.
    expect(account.status).toBe('active');
    // Check: the account must link to the right profile.
    expect(account.profileId).toBe(profile.id);
  }); // End of test 1.

  // TEST 2: the database refuses two accounts with the same user ID.
  test('usernames must be unique', async () => {
    // Create a profile for the accounts to link to.
    const profile = await UserProfile.create({ name: 'Customer' });
    // The details both accounts share.
    const base = { password: 'x', name: 'A', email: 'a@example.com', profileId: profile.id };
    // The first account with this user ID saves normally.
    await UserAccount.create({ ...base, username: 'same' });
    // Check: the second account with the same user ID must be refused.
    await expect(UserAccount.create({ ...base, username: 'same' })).rejects.toThrow();
  }); // End of test 2.
}); // End of the test group.
