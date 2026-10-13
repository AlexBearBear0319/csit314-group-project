// seed.js — fills the database with test data.
// WARNING: this WIPES the tables and recreates them. Run with: npm run seed
const bcrypt = require('bcryptjs');
const { sequelize, UserProfile, UserAccount } = require('./entity');

const FAKE_ACCOUNTS = 100;
const DEMO_PASSWORD = 'password123';

(async () => {
  const { faker } = await import('@faker-js/faker');
  try {
    await sequelize.sync({ force: true }); // drop + recreate tables

    // 1. The 4 user profiles (roles)
    const profiles = await UserProfile.bulkCreate([
      { name: 'User Admin', description: 'Manages user accounts and profiles' },
      { name: 'Interior Designer', description: 'Manages company info and IDP portfolio' },
      { name: 'Customer', description: 'Searches, views and shortlists IDPs' },
      { name: 'Platform Manager', description: 'Manages IDP categories and reports' },
    ]);

    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // 2. One known demo login per role (for lab demos)
    const demoNames = ['admin1', 'designer1', 'customer1', 'manager1'];
    await UserAccount.bulkCreate(
      profiles.map((p, i) => ({
        username: demoNames[i],
        password: hash,
        name: `Demo ${p.name}`,
        email: `${demoNames[i]}@example.com`,
        dob: '2000-01-01',
        profileId: p.id,
      }))
    );

    // 3. Lots of fake accounts so the system looks real-sized
    const fake = [];
    for (let i = 0; i < FAKE_ACCOUNTS; i++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      fake.push({
        username: `${first}.${last}.${i}`.toLowerCase(),
        password: hash,
        name: `${first} ${last}`,
        email: faker.internet.email({ firstName: first, lastName: last }).toLowerCase(),
        dob: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }).toISOString().slice(0, 10),
        photo: faker.image.avatar(),
        status: Math.random() < 0.1 ? 'suspended' : 'active',
        profileId: profiles[faker.number.int({ min: 1, max: 3 })].id, // mostly non-admin roles
      });
    }
    await UserAccount.bulkCreate(fake);

    console.log(`Seeded 4 profiles and ${4 + FAKE_ACCOUNTS} accounts.`);
    console.log(`Demo logins: ${demoNames.join(', ')} / password: ${DEMO_PASSWORD}`);
    await sequelize.close();
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
})();
