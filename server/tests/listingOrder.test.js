// =============================================================================
// TESTS: listingOrder.test.js
// The team agreed that every list opens with the newest record at the top.
// The IDP lists are checked in idp.api.test.js and customerBce.test.js. This
// file covers the three admin-style lists.
// =============================================================================

const { sequelize, UserAccount, UserProfile, IDPCategory } = require('../src/entity');

beforeEach(async () => { await sequelize.sync({ force: true }); });
afterAll(async () => { await sequelize.close(); });

test('user accounts: the account added last comes first', async () => {
  const profile = await UserProfile.create({ name: 'Customer' });
  const details = (name) => ({ username: name, password: 'not-used', name, email: `${name}@example.com`, profileId: profile.id });
  await UserAccount.create(details('first'));
  await UserAccount.create(details('second'));
  const accounts = await UserAccount.searchAccounts('');
  expect(accounts.map((account) => account.username)).toEqual(['second', 'first']);
});

test('user profiles: the profile added last comes first', async () => {
  await UserProfile.create({ name: 'Alpha' });
  await UserProfile.create({ name: 'Zulu' });
  const profiles = await UserProfile.searchProfiles('');
  expect(profiles.map((profile) => profile.name)).toEqual(['Zulu', 'Alpha']);
});

test('IDP categories: the category added last comes first', async () => {
  await IDPCategory.create({ name: 'Alpha' });
  await IDPCategory.create({ name: 'Zulu' });
  const categories = await IDPCategory.searchCategories('');
  expect(categories.map((category) => category.name)).toEqual(['Zulu', 'Alpha']);
});
