// =============================================================================
// SCRIPT: seed.js
// WHAT IT DOES: fills the database with test data, so the team has accounts to
// log in with during development and lab demos.
//
// WARNING: this WIPES the tables and recreates them. All existing data in them
// is lost. Run with: npm run seed
//
// IT CREATES 3 THINGS:
//   1. the 4 user profiles (the roles)
//   2. 1 demo login for each role
//   3. 100 made-up accounts, so the system looks a realistic size
// =============================================================================

// Load bcrypt, the tool that scrambles ("hashes") passwords before they are saved.
const bcrypt = require('bcryptjs');
// Load the database connection and the 2 tables this script fills.
const { sequelize, UserProfile, UserAccount } = require('../src/entity');

// How many made-up accounts to create. A name in CAPITALS is a fixed setting.
const FAKE_ACCOUNTS = 100;
// The test password that every seeded account uses. It is for test data only.
const DEMO_PASSWORD = 'password123';

// -----------------------------------------------------------------------------
// MAIN SCRIPT
// (async () => { ... })() creates a function and runs it straight away. It is
// needed so the code inside can use "await" to wait for the database.
// -----------------------------------------------------------------------------
(async () => {
  // Load faker, a tool that invents realistic names and emails.
  const { faker } = await import('@faker-js/faker');
  // "try" means: run this code, and if anything fails, jump to "catch" below.
  try {
    // force: true deletes the tables and creates them again, empty.
    await sequelize.sync({ force: true }); // drop + recreate tables

    // ---- Part 1: the 4 user profiles (roles) --------------------------------
    // bulkCreate saves many rows at once. Each { } below becomes one row.
    const profiles = await UserProfile.bulkCreate([
      { name: 'User Admin', description: 'Manages user accounts and profiles' }, // role 1
      { name: 'Interior Designer', description: 'Manages company info and IDP portfolio' }, // role 2
      { name: 'Customer', description: 'Searches, views and shortlists IDPs' }, // role 3
      { name: 'Platform Manager', description: 'Manages IDP categories and reports' }, // role 4
    ]); // End of the profile list.

    // Scramble the test password once. All the accounts below share this result.
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // ---- Part 2: one known demo login per role (for lab demos) ---------------
    // The 4 login names, in the same order as the 4 profiles above.
    const demoNames = ['admin1', 'designer1', 'customer1', 'manager1'];
    // Save all 4 demo accounts at once.
    await UserAccount.bulkCreate(
      // .map builds one account for each profile. p = the profile, i = its
      // position in the list (0, 1, 2, 3).
      profiles.map((p, i) => ({
        username: demoNames[i], // the login name at the same position
        password: hash, // the scrambled test password
        name: `Demo ${p.name}`, // for example "Demo Customer"
        email: `${demoNames[i]}@example.com`, // for example admin1@example.com
        dob: '2000-01-01', // a made-up date of birth
        profileId: p.id, // link this account to its profile (its role)
      })) // End of building one demo account.
    ); // End of saving the demo accounts.

    // ---- Part 3: lots of fake accounts so the system looks real-sized --------
    const fake = []; // start with an empty list of accounts
    // Repeat the code in { } 100 times. i counts 0, 1, 2 ... 99.
    for (let i = 0; i < FAKE_ACCOUNTS; i++) {
      const first = faker.person.firstName(); // invent a first name
      const last = faker.person.lastName(); // invent a last name
      // Add one made-up account to the list.
      fake.push({
        username: `${first}.${last}.${i}`.toLowerCase(), // for example jane.tan.7
        password: hash, // the same scrambled test password
        name: `${first} ${last}`, // the full name
        email: faker.internet.email({ firstName: first, lastName: last }).toLowerCase(), // an invented email
        dob: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }).toISOString().slice(0, 10), // age 18 to 70, as YYYY-MM-DD
        photo: faker.image.avatar(), // the web address of a made-up profile picture
        status: Math.random() < 0.1 ? 'suspended' : 'active', // about 1 in 10 is suspended
        profileId: profiles[faker.number.int({ min: 1, max: 3 })].id, // mostly non-admin roles
      }); // End of one made-up account.
    } // End of the repeat.
    // Save all the made-up accounts at once.
    await UserAccount.bulkCreate(fake);

    // Print a summary in the terminal, so the person running this can see it worked.
    console.log(`Seeded 4 profiles and ${4 + FAKE_ACCOUNTS} accounts.`);
    // Print the demo logins and the test password.
    console.log(`Demo logins: ${demoNames.join(', ')} / password: ${DEMO_PASSWORD}`);
    // Close the database connection, so the script can finish.
    await sequelize.close();
  } catch (err) { // This runs only if something in "try" failed.
    // Print what went wrong.
    console.error('Seeding failed:', err.message);
    // End the script. The code 1 tells the terminal that it failed.
    process.exit(1);
  } // End of try / catch.
})(); // End of the main script. The () here is what runs it.
