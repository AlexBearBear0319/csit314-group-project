// =============================================================================
// SCRIPT: seed.js
// WHAT IT DOES: fills the database with test data, so the team has accounts to
// log in with during development and lab demos. The project brief asks for test
// data that is big enough to look like a real system (about 100 records of each
// kind), so we make that many.
//
// WARNING: this WIPES the tables and recreates them. All existing data in them
// is lost. Run with: npm run seed
// Do NOT run it on the shared Supabase database without asking the team first.
//
// IT CREATES:
//   1. the 4 user profiles (the roles)
//   2. 1 demo login for each role
//   3. 100 Interior Designers, 100 Customers and a few staff accounts
//   4. 100 IDP categories
//   5. 101 companies (one for every designer, including the demo designer)
//   6. 100 IDPs (current and past) with view counts
//   7. 100 shortlist items (a Customer saving an IDP)
//
// To check the script without touching any real data, run it on the temporary
// in-memory test database:   NODE_ENV=test node scripts/seed.js
// =============================================================================

// Load bcrypt, the tool that scrambles ("hashes") passwords before they are saved.
const bcrypt = require('bcryptjs');
// Load the database connection and the tables this script fills.
const {
  sequelize, UserProfile, UserAccount, IDPCategory, Company, InteriorDesignProject, ShortlistItem,
} = require('../src/entity');

// How many made-up records to create. A name in CAPITALS is a fixed setting.
const FAKE_DESIGNERS = 100; // every designer also gets one company
const FAKE_CUSTOMERS = 100;
const FAKE_STAFF = 6; // User Admins and Platform Managers, shared equally
const FAKE_CATEGORIES = 100;
const FAKE_PROJECTS = 100;
const FAKE_SHORTLIST_ITEMS = 100;
// The test password that every seeded account uses. It is for test data only.
const DEMO_PASSWORD = 'password123';

// Word lists we mix together to make believable names. Each list has a few
// entries, and the combinations give us far more than 100 different names.
const ROOMS = [
  'Living Room', 'Kitchen', 'Master Bedroom', 'Children Room', 'Study Room', 'Bathroom', 'Dining Area',
  'Balcony', 'Home Office', 'Entrance Foyer', 'Walk-in Wardrobe', 'Utility Room', 'Pet Corner',
  'Reading Nook', 'Open Plan Space', 'Guest Room', 'Rooftop Terrace', 'Kitchenette', 'Studio Space', 'Whole Home',
];
const CATEGORY_TYPES = ['Compact', 'Luxury', 'Budget', 'Family', 'Eco-friendly'];
const DESIGN_STYLES = ['Modern', 'Minimalist', 'Scandinavian', 'Industrial', 'Contemporary', 'Japandi', 'Classic', 'Tropical'];
const PROPERTY_TYPES = ['HDB 3-room', 'HDB 4-room', 'HDB 5-room', 'Condominium', 'Landed house', 'Shophouse', 'Studio apartment'];
const COMPANY_ENDINGS = ['Interiors', 'Design Studio', 'Living', 'Renovation', 'Home Concepts'];

// -----------------------------------------------------------------------------
// MAIN SCRIPT
// (async () => { ... })() creates a function and runs it straight away. It is
// needed so the code inside can use "await" to wait for the database.
// -----------------------------------------------------------------------------
(async () => {
  // Load faker, a tool that invents realistic names, dates and sentences.
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
    // We read the profiles back so we are sure each one has its ID, on any database.
    const profileId = {};
    for (const profile of await UserProfile.findAll()) profileId[profile.name] = profile.id;

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
        profileId: profileId[p.name], // link this account to its profile (its role)
      })) // End of building one demo account.
    ); // End of saving the demo accounts.

    // ---- Part 3: lots of fake accounts so the system looks real-sized --------
    // makeAccount builds one made-up account for a role. n makes the user ID unique.
    let n = 0; // counts every fake account, so no two user IDs are the same
    const makeAccount = (roleName) => {
      n += 1;
      const first = faker.person.firstName(); // invent a first name
      const last = faker.person.lastName(); // invent a last name
      return {
        username: `${first}.${last}.${n}`.toLowerCase(), // for example jane.tan.7
        password: hash, // the same scrambled test password
        name: `${first} ${last}`, // the full name
        email: `${first}.${last}.${n}@example.com`.toLowerCase(), // an invented email that can never be real
        dob: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }).toISOString().slice(0, 10), // age 18 to 70, as YYYY-MM-DD
        photo: faker.image.avatar(), // the web address of a made-up profile picture
        status: Math.random() < 0.1 ? 'suspended' : 'active', // about 1 in 10 is suspended
        profileId: profileId[roleName], // link to the role
      };
    };
    const fake = []; // start with an empty list of accounts
    for (let i = 0; i < FAKE_DESIGNERS; i++) fake.push(makeAccount('Interior Designer'));
    for (let i = 0; i < FAKE_CUSTOMERS; i++) fake.push(makeAccount('Customer'));
    for (let i = 0; i < FAKE_STAFF; i++) fake.push(makeAccount(i % 2 === 0 ? 'User Admin' : 'Platform Manager'));
    // Save all the made-up accounts at once.
    await UserAccount.bulkCreate(fake);

    // Read the accounts back, so we have the ID of every designer and customer.
    const designers = await UserAccount.findAll({ where: { profileId: profileId['Interior Designer'] } });
    const customers = await UserAccount.findAll({ where: { profileId: profileId.Customer } });

    // ---- Part 4: IDP categories ----------------------------------------------
    // Category names must be different from each other. We combine a type and a
    // room, for example "Compact Kitchen", which gives 5 x 20 = 100 names.
    const categoryRows = [];
    for (const type of CATEGORY_TYPES) {
      for (const room of ROOMS) {
        if (categoryRows.length < FAKE_CATEGORIES) {
          categoryRows.push({
            name: `${type} ${room}`,
            description: `${type} ideas for the ${room.toLowerCase()}`.slice(0, 255), // the column holds up to 255 characters
          });
        }
      }
    }
    await IDPCategory.bulkCreate(categoryRows);
    const categories = await IDPCategory.findAll();

    // ---- Part 5: one company for every designer -----------------------------
    // A designer can only have one company (the table allows one row per designer).
    await Company.bulkCreate(designers.map((designer) => {
      const lastName = designer.name.split(' ').pop(); // the surname, for the company name
      return {
        name: `${lastName} ${faker.helpers.arrayElement(COMPANY_ENDINGS)}`,
        description: `${faker.company.catchPhrase()}. ${faker.lorem.sentence()}`,
        designerAccountId: designer.id,
      };
    }));

    // ---- Part 6: interior design projects (IDPs) ----------------------------
    // About 6 in 10 are current projects. The others are past projects, which
    // must have a completion date.
    const pick = (list) => faker.helpers.arrayElement(list); // choose one item at random
    const projectRows = [];
    for (let i = 0; i < FAKE_PROJECTS; i++) {
      const isPast = Math.random() >= 0.6;
      projectRows.push({
        name: `${pick(DESIGN_STYLES)} ${pick(ROOMS)} for ${pick(PROPERTY_TYPES)}`, // for example "Japandi Kitchen for HDB 4-room"
        description: faker.lorem.sentences(2),
        propertyType: pick(PROPERTY_TYPES),
        designStyle: pick(DESIGN_STYLES),
        status: isPast ? 'past' : 'current',
        completionDate: isPast ? faker.date.between({ from: '2023-01-01', to: '2026-10-31' }).toISOString().slice(0, 10) : null,
        viewCount: faker.number.int({ min: 0, max: 300 }), // how many times customers opened it (story #30)
        designerAccountId: pick(designers).id, // a random designer owns it
        categoryId: pick(categories).id, // a random category
      });
    }
    await InteriorDesignProject.bulkCreate(projectRows);
    const projects = await InteriorDesignProject.findAll();

    // ---- Part 7: shortlist items --------------------------------------------
    // A Customer can save each project only once, so we remember the pairs we
    // already made and skip any repeat.
    const seen = new Set();
    const shortlistRows = [];
    while (shortlistRows.length < FAKE_SHORTLIST_ITEMS) {
      const customer = pick(customers);
      const project = pick(projects);
      const key = `${customer.id}-${project.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        shortlistRows.push({ customerAccountId: customer.id, projectId: project.id });
      }
    }
    await ShortlistItem.bulkCreate(shortlistRows);

    // Print a summary in the terminal, so the person running this can see it worked.
    console.log('Seeded:');
    console.log(`  profiles          ${await UserProfile.count()}`);
    console.log(`  accounts          ${await UserAccount.count()}`);
    console.log(`  IDP categories    ${await IDPCategory.count()}`);
    console.log(`  companies         ${await Company.count()}`);
    console.log(`  IDPs              ${await InteriorDesignProject.count()}`);
    console.log(`  shortlist items   ${await ShortlistItem.count()}`);
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
