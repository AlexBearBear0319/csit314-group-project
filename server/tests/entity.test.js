// Proves the database tables work, using the in-memory test database.
// Use this file as the pattern for your own entity tests.
const { sequelize, UserProfile, UserAccount } = require('../src/entity');

beforeEach(async () => {
  await sequelize.sync({ force: true }); // fresh empty tables before every test
});

afterAll(async () => {
  await sequelize.close();
});

describe('UserAccount entity', () => {
  test('a new account is linked to a profile and starts active', async () => {
    const profile = await UserProfile.create({ name: 'Customer' });
    const account = await UserAccount.create({
      username: 'test1',
      password: 'hashed',
      name: 'Test User',
      email: 'test1@example.com',
      profileId: profile.id,
    });
    expect(account.status).toBe('active');
    expect(account.profileId).toBe(profile.id);
  });

  test('usernames must be unique', async () => {
    const profile = await UserProfile.create({ name: 'Customer' });
    const base = { password: 'x', name: 'A', email: 'a@example.com', profileId: profile.id };
    await UserAccount.create({ ...base, username: 'same' });
    await expect(UserAccount.create({ ...base, username: 'same' })).rejects.toThrow();
  });
});
