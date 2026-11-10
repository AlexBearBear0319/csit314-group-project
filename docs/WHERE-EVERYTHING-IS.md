# Where everything is

This guide explains how the project is organised. You do not need to read code to use it. It tells you which file does what, so you can find the right file for a story, a diagram or a test.

All file names in this guide are on the `main` branch.

---

## 1. The big picture

The project has two parts:

| Part | What it is | Folder |
|---|---|---|
| **The website** | What the user sees in the browser: pages, buttons, forms | `client/` |
| **The server** | The program behind the website. It checks the rules and keeps the data | `server/` |

The data (users, companies, projects, shortlists) is kept in a **database** on Supabase. Project photos are kept in **Supabase Storage**.

---

## 2. The three kinds of files (BCE)

The code follows the **Boundary-Control-Entity (BCE)** pattern from the lectures. Think of a restaurant:

| BCE layer | Restaurant | What it does in this project | Folder | How to spot it |
|---|---|---|---|---|
| **Boundary** | The dining room and the menu | The page the user sees and clicks | `client/src/boundary/` | Name ends in **`Pg`** (page), e.g. `CreateUserProfilePg.jsx` |
| **Control** | The waiter | Checks the request follows the rules, then asks the entity for the data | `server/src/controller/` | Name ends in **`C`** (controller), e.g. `CreateUserProfileC.js` |
| **Entity** | The store room | Reads and saves data in the database. Only entities touch the database | `server/src/entity/` | A plain noun, e.g. `UserProfile.js` |

**Example: story #1, Create User Profile**

- Boundary: `CreateUserProfilePg.jsx`: the form where the User Admin types the new profile.
- Control: `CreateUserProfileC.js`: checks the name is not empty and not already used.
- Entity: `UserProfile.js`: saves the new profile in the database.

Class and method names in the code match the UML diagrams.

---

## 3. What happens when a user clicks a button

1. The user clicks a button on a **page** (Boundary).
2. The page sends a request to the server through one file: `client/src/api.js`.
3. The server's **front door**, `server/src/routes/index.cjs`, makes three security checks:
   - Is the user logged in?
   - Does the user have the right role? (For example, only a User Admin can manage accounts.)
   - Did the request really come from our website? (This stops other websites sending fake requests.)
4. If all checks pass, the request goes to the **controller** (Control).
5. The controller checks the business rules, then asks the **entity** (Entity) to read or save the data.
6. The answer goes back to the page. The page shows the result or an error message.

---

## 4. Feature by feature

Each table shows one feature. The columns are:

- **Page (Boundary)**: in `client/src/boundary/` unless another folder is given.
- **Rules (Control)**: in `server/src/controller/`.
- **Data (Entity)**: in `server/src/entity/`.

### 4.1 Login and logout (all 4 roles)

| Story | What the user does | Page (Boundary) | Rules (Control) | Data (Entity) |
|---|---|---|---|---|
| #11, #18, #37, #47 | Log in | `UserLoginPg.jsx` | `SessionController.js` | `UserAccount.js`, `UserSession.js` |
| #12, #19, #38, #48 | Log out | The **Log out** button in the header, `client/src/layout/Layout.jsx` | `SessionController.js` | `UserSession.js` |
| (not a story) | Sign up as a Customer or Interior Designer | `RegisterPg.jsx` | `SessionController.js` | `UserAccount.js` |

**Tests:** `server/tests/auth.api.test.js`

### 4.2 User Admin: user profiles (stories #1-5)

A **user profile** is a role, such as "Customer" or "Senior Designer".

| Story | What the user does | Page (Boundary) | Rules (Control) | Data (Entity) |
|---|---|---|---|---|
| #1 | Create a profile | `CreateUserProfilePg.jsx` | `CreateUserProfileC.js` | `UserProfile.js` |
| #2 | View a profile | `ViewUserProfilePg.jsx` | `ViewUserProfileC.js` | `UserProfile.js` |
| #3 | Update a profile | `UpdateUserProfilePg.jsx` | `UpdateUserProfileC.js` | `UserProfile.js` |
| #4 | Suspend (or re-activate) a profile | `SuspendUserProfilePg.jsx` | `SuspendUserProfileC.js` | `UserProfile.js` |
| #5 | Search profiles | `SearchUserProfilePg.jsx` | `SearchUserProfileC.js` | `UserProfile.js` |

**Rule checks** shared by these controllers: `userProfileValidation.js`.
**Tests:** `server/tests/userProfiles.test.js`, `christyAuthorization.test.js`, `listingOrder.test.js`

**New:** accounts on a profile that a User Admin made (for example "Senior Designer") can now log in. They land on a simple home page, `client/src/pages/ProfileHome.jsx`, because their role has no feature pages of its own.

### 4.3 User Admin: user accounts (stories #6-10)

A **user account** is one person's login. Each account belongs to one profile.

| Story | What the user does | Page (Boundary) | Rules (Control) | Data (Entity) |
|---|---|---|---|---|
| #6 | Create an account | `CreateUserAccountPg.jsx` | `CreateUserAccountC.js` | `UserAccount.js` |
| #7 | View an account | `ViewUserAccountPg.jsx` | `ViewUserAccountC.js` | `UserAccount.js` |
| #8 | Update an account | `UpdateUserAccountPg.jsx` | `UpdateUserAccountC.js` | `UserAccount.js` |
| #9 | Suspend an account | `SuspendUserAccountPg.jsx` (a pop-up on the View and Search pages) | `SuspendUserAccountC.js` | `UserAccount.js` |
| #10 | Search accounts | `SearchUserAccountPg.jsx` | `SearchUserAccountC.js` | `UserAccount.js` |

**Rule checks:** `userAccountValidation.js`.
**Tests:** `server/tests/userAccounts.test.js`, `entity.test.js`, `listingOrder.test.js`

### 4.4 Interior Designer: company information (stories #13-17)

| Story | What the user does | Page (Boundary) | Rules (Control) | Data (Entity) |
|---|---|---|---|---|
| #13 | Create my company | `CreateCompanyPg.jsx` | `CreateCompanyC.js` | `Company.js` |
| #14 | View my company | `ViewCompanyPg.jsx` | `ViewCompanyC.js` | `Company.js` |
| #15 | Update my company | `UpdateCompanyPg.jsx` | `UpdateCompanyC.js` | `Company.js` |
| #16 | Delete my company | `DeleteCompanyPg.jsx` (a pop-up on the View page) | `DeleteCompanyC.js` | `Company.js` |
| #17 | Search companies | `SearchCompanyPg.jsx` | `SearchCompanyC.js` | `Company.js` |

**Rule checks:** `companyValidation.js`.
**Tests:** `server/tests/xandra.test.js`, `client/tests/company-boundary.test.jsx`

### 4.5 Interior Designer: projects (IDPs, stories #20-31)

An **IDP** is an Interior Design Project. "Current" projects are still going on. "Past" projects are finished.

| Story | What the user does | Page (Boundary) | Rules (Control) | Data (Entity) |
|---|---|---|---|---|
| #20-24 | Create, view, update, delete and search **current** projects | `ManageCurrentIdpsPg.jsx` | `IdpController.js` | `InteriorDesignProject.js` |
| #25-29 | Create, view, update, delete and search **past** projects | `ManagePastIdpsPg.jsx` | `IdpController.js` | `InteriorDesignProject.js` |
| #20-29 | Add, change or remove project photos | (on the same pages) | `IdpImageController.js` | `ProjectImage.js` |
| #30 | See how many times a project was viewed | Shown on each project card, `client/src/components/ProjectFolderCard.jsx` | `ViewIDPViewCountC.js` | `InteriorDesignProject.js` |
| #31 | See how many Customers shortlisted a project | Shown on each project card | `ViewIDPShortlistCountC.js` | `ShortlistItem.js` |

**Rule checks** for #30-31: `idpStatsValidation.js`.
**Tests:** `server/tests/idp.api.test.js`, `idpStats.test.js`, `client/tests/designer-projects.test.jsx`, `project-photos.test.jsx`

The designer's home page with recent projects is `client/src/pages/DesignerDashboard.jsx`.

### 4.6 Customer: find projects and shortlist (stories #32-36)

| Story | What the user does | Page (Boundary) | Rules (Control) | Data (Entity) |
|---|---|---|---|---|
| #32 | Search projects by keyword and filters | `IDPManagementPage.jsx` | `SearchIDPController.js` | `IDPDatabase.js` |
| #33 | Browse the list and open one project | `OngoingIDPPage.jsx` (opens in a pop-up) | `ViewIDPController.js` | `IDPDatabase.js` |
| #34 | Save a project to my shortlist | `SaveShortlistPg.jsx` (the **Save** button on each project card and pop-up) | `SaveShortlistC.js` | `ShortlistItem.js` |
| #35 | Search my shortlist | `SearchShortlistPg.jsx` (the search box on the shortlist page) | `SearchShortlistC.js` | `ShortlistItem.js` |
| #36 | View my shortlist | `ViewShortlistPg.jsx` | `ViewShortlistC.js` | `ShortlistItem.js` |

`IDPDatabase.js` reads the same projects that designers save in `InteriorDesignProject.js`. It only shows what a Customer is allowed to see.

**Rule checks:** `shortlistValidation.js`.
**Tests:** `server/tests/customerBce.test.js`, `shortlist.test.js`, `xandra.test.js`, `client/tests/customer-bce.test.jsx`, `shortlist.test.jsx`

### 4.7 Platform Manager: categories and reports (stories #39-46)

An **IDP category** is a type of project. Designers pick a category for each project, and Customers can filter by it.

| Story | What the user does | Page (Boundary) | Rules (Control) | Data (Entity) |
|---|---|---|---|---|
| #39 | Create a category | `CreateIDPCategoryPg.jsx` | `CreateIDPCategoryC.js` | `IDPCategory.js` |
| #40 | View a category | `ViewIDPCategoryPg.jsx` | `ViewIDPCategoryC.js` | `IDPCategory.js` |
| #41 | Update a category | `UpdateIDPCategoryPg.jsx` | `UpdateIDPCategoryC.js` | `IDPCategory.js` |
| #42 | Delete a category | `DeleteIDPCategoryPg.jsx` | `DeleteIDPCategoryC.js` | `IDPCategory.js` |
| #43 | Search categories | `SearchIDPCategoryPg.jsx` | `SearchIDPCategoryC.js` | `IDPCategory.js` |
| #44-46 | Make a daily, weekly or monthly report | `GenerateReportPg.jsx` (one page, 3 report types) | `GenerateReportC.js` | `PlatformReport.js` |

**Rule checks:** `idpCategoryValidation.js`.
**Tests:** `server/tests/idpCategories.test.js`, `christyAuthorization.test.js`, `listingOrder.test.js`, `xandra.test.js` (reports)

---

## 5. What each test file checks

A **test** is a small program that uses the app automatically and checks the result. Run all tests with `npm test`. Tests use a temporary database, so they never change the real data.

### Server tests (`server/tests/`): check the rules and the data

| Test file | What it checks |
|---|---|
| `auth.api.test.js` | Login, sign-up, logout, session expiry, and password reset |
| `userProfiles.test.js` | User profile stories #1-5 |
| `userAccounts.test.js` | User account stories #6-10, and that only a User Admin can use them |
| `entity.test.js` | A new account is linked to a profile, starts active, and needs a unique username |
| `christyAuthorization.test.js` | A User Admin and a Platform Manager cannot use each other's pages; a suspended profile cannot log in |
| `listingOrder.test.js` | Lists of accounts, profiles and categories show the newest first |
| `xandra.test.js` | Company stories #13-17, Customer browsing and view counts, and the daily, weekly and monthly reports |
| `idp.api.test.js` | Designer project stories #20-29 (current and past projects) |
| `idpStats.test.js` | View count (#30) and shortlist count (#31) |
| `customerBce.test.js` | Customer search and view (#32-33): sorting, filters, and project details |
| `shortlist.test.js` | Shortlist stories #34-36, and that only Customers can use them |
| `idpCategories.test.js` | Category stories #39-43 |
| `health.test.js` | The server's "are you working?" check |
| `app-import.test.js`, `browser-origin.test.js`, `preview-startup.test.js` | Technical checks: the server starts correctly, accepts our website, and works on Vercel previews |

`server/tests/helpers/featureSession.js` is not a test. It logs in a test user so the other tests can use the app.

### Website tests (`client/tests/`): check the pages

| Test file | What it checks |
|---|---|
| `company-boundary.test.jsx` | The company View, Search and Delete pages show data and errors correctly |
| `designer-projects.test.jsx` | The designer project pages: editing, searching, sorting, page numbers and errors |
| `project-photos.test.jsx` | Project photos load again if a link expires or the network fails |
| `customer-bce.test.jsx` | The Customer search page: keywords, filters, sorting, the pop-up and the Save button |
| `shortlist.test.jsx` | The shortlist pages: view, search, save, and error messages |
| `api.test.mjs` | How the website talks to the server: time-outs, errors and security |

`client/tests/setup.js` is not a test. It prepares the test environment.

---

## 6. Helper files (not Boundary, Control or Entity)

These files support the BCE files. They do not belong to one story.

### On the website (`client/src/`)

| File or folder | What it does |
|---|---|
| `App.jsx` | The list of web addresses. It says which page opens at which address, e.g. `/admin/accounts` opens `SearchUserAccountPg.jsx` |
| `api.js` | The only file that sends requests to the server |
| `session.js` | Remembers who is logged in and their role |
| `storage.js`, `useProjectImages.js` | Upload and show project photos |
| `components/` | Shared building blocks: buttons, forms, tables, search bar, project cards, pop-ups |
| `layout/` | The header, the menus for each role (`menus.js`) and the Log out button |
| `pages/` | Home pages for each role (`Dashboard.jsx`, `DesignerDashboard.jsx`, `ProfileHome.jsx`), and the shared designer project page (`DesignerIdpsPage.jsx`) |
| `hooks/` | Shared code that loads one record or a search result for a page |
| `boundary/*Data.js`, `boundary/*Shared.js(x)` | Shared labels and helpers for a group of pages. They are not pages |
| `styles.css` | Colours, fonts and layout |

### On the server (`server/src/`)

| File or folder | What it does |
|---|---|
| `routes/index.cjs` | The front door. It lists every server address and its security checks |
| `routes/*.js` | One file per feature. It passes each request to the right controller |
| `middleware/authenticateSession.js` | Checks that the user is logged in and has the right role |
| `middleware/rateLimit.js` | Blocks too many login or sign-up tries in a short time |
| `security/browserOrigin.js` | Makes sure requests come from our own website |
| `storage/IdpImageStorage.js` | Saves and reads project photos in Supabase Storage |
| `entity/index.js` | Loads every entity. Add a new entity here |
| `entity/UserSession.js` | Remembers each login session so it can be ended at logout |
| `entity/IdpImageUploadIntent.js`, `entity/IdpImageCleanupTask.js` | Keep track of photo uploads and photos that must be deleted later |
| `db.js` | Connects to the database (or to a temporary one during tests) |
| `app.js`, `server.js` | Start the server |

### Scripts for the team lead only

**Do not run these unless Kaz asks you to.** They change the shared database.

| Command | File | What it does |
|---|---|---|
| `npm run seed` | `seed.js` | **Wipes the database** and fills it with test data |
| `npm run auth:audit` | `auditAccountRoles.js` | Checks every account has a valid role and password |
| `npm run auth:provision` | `provisionAccount.js`, `accountProvisioning.js` | Resets one account's password |
| `npm run storage:cleanup` | `cleanupIdpStorage.js` | Deletes old photos that are no longer used |

---

## 7. Places that do not follow the naming pattern

- **Designer projects (#20-29):** one controller, `IdpController.js`, handles all 10 stories. The two pages `ManageCurrentIdpsPg.jsx` and `ManagePastIdpsPg.jsx` both show the same shared page, `pages/DesignerIdpsPage.jsx`.
- **Customer search and view (#32-33):** the files are named `IDPManagementPage.jsx`, `OngoingIDPPage.jsx`, `SearchIDPController.js` and `ViewIDPController.js`. They do not end in `Pg` or `C`.
- **Login and logout:** one controller, `SessionController.js`, handles both. There is no logout page, only a button in the header.
- **Pop-ups instead of pages:** Suspend user account (#9), Delete company (#16), Save to shortlist (#34) and Search shortlist (#35) appear inside another page. They have no web address of their own.
- **Not used:** `client/src/pages/ComingSoon.jsx` is a placeholder. No page uses it now.

---

## 8. Folder map

```
csit314-group-project/
├── client/                 the website
│   ├── src/
│   │   ├── boundary/       BOUNDARY: the pages for each story
│   │   ├── components/     shared buttons, forms, tables, cards
│   │   ├── layout/         header, menus, Log out button
│   │   ├── pages/          home pages for each role
│   │   ├── hooks/          shared loading code
│   │   ├── App.jsx         which page opens at which address
│   │   └── api.js          sends requests to the server
│   └── tests/              website tests
├── server/                 the server
│   ├── src/
│   │   ├── controller/     CONTROL: the rules for each story
│   │   ├── entity/         ENTITY: reads and saves the database
│   │   ├── routes/         server addresses and security checks
│   │   ├── middleware/     login and rate-limit checks
│   │   ├── storage/        project photos
│   │   └── security/       accepts requests only from our website
│   └── tests/              server tests
└── docs/                   database SQL, story notes, diagrams, test plans
```
