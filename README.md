# CSIT314 Group CCB: Interior Design Platform

A web platform where Interior Designers show their projects (IDPs), Customers
search and shortlist them, a User Admin manages users, and a Platform Manager
manages categories and reports.

**Tech stack:** React + Vite (client), Node.js + Express (server), Sequelize,
Supabase (PostgreSQL database and image storage), Vercel (hosting).

We built the system with the **BCE pattern** (Boundary, Controller, Entity).
Every user story has its own Boundary page, its own Controller class and the
Entity (database) class it needs. The class and method names in the code match
the diagrams in our report.

## The three layers

| Layer | Folder | What it does | Naming |
|---|---|---|---|
| **Boundary** | `client/src/boundary/` | The pages the user sees. It **checks the input** (`validateInput`) before anything is sent, and **shows the messages** (`displaySuccess`, `displayError`). | `[Action][Thing]Pg.jsx`, e.g. `SuspendUserAccountPg.jsx`. Three older pages keep their `...Page` names: `IDPManagementPage` (#32), `OngoingIDPPage` (#33) and `DesignerIdpsPage` (#20-29) |
| **Controller** | `server/src/controller/` | The **business logic** of one story: checks the input again, checks the rules (does it exist? is the name free? is it yours?), calls the entities and decides the result or the error. | `[Action][Thing]C.js`, e.g. `SuspendUserAccountC.js` |
| **Entity** | `server/src/entity/` | The **CRUD** on one database table: create, read, update, delete, search. It does not decide what is allowed. | a noun, e.g. `UserAccount.js` |

How a request travels:

```
Boundary (page)  ->  api.js  ->  routes/ (HTTP bridge)  ->  Controller  ->  Entity  ->  Database
   validateInput        POST        matches the address       the rules       CRUD
   displaySuccess                   to a controller method
   displayError
```

Rules we follow:

- A Boundary never talks to the database. It only calls a Controller.
- A Controller never writes SQL. It only calls Entity methods.
- Only an Entity reads or writes its table.
- `server/src/routes/` is not a BCE class. It only matches an address to a
  controller method. It makes no decisions.
- The Boundary checks the input so the user sees a message at once. The
  Controller checks it again, because anyone can call the API without our page.
- Errors are thrown as `RequestError` in the controller. `middleware/errorHandler.js`
  turns them into the HTTP reply, so no route file has its own error handling.

## Folder layout

```
client/src/
  boundary/      the pages (one per user story) and their small helpers
  components/    reusable parts: Button, FormField, Message, ResultsTable ...
  hooks/         useRecord, useRecordSearch
  layout/        the menus and page frame
  pages/         the dashboards (not a user story)
  api.js         the fetch wrapper (adds the CSRF token, handles errors)
server/src/
  controller/    one class per user story, plus small rule helpers
  entity/        one class per database table
  routes/        the HTTP bridge
  middleware/    login check, role check, CSRF check, rate limit, error handler
  storage/       the Supabase Storage client for project photos
server/scripts/  tools we run by hand: seed, account audit, password reset, storage cleanup
server/tests/    API tests for every story (Jest, in-memory SQLite)
client/tests/    page tests (Vitest)
database/        the SQL files that build the Supabase database, in the order to run
```

## First-time setup (on your laptop)

Run every command from the **main project folder** (`csit314-group-project`),
not inside `server` or `client`.

```
git clone <repo link>
cd csit314-group-project
npm install                       (installs packages for both server and client)
```

Then make the database settings file:

1. In the `server` folder, copy `.env.example` and rename the copy to `.env`.
2. Paste in the `DATABASE_URL` from the group chat.

The SQL files in `database/` are numbered in the order to run them in the
Supabase SQL Editor. This is only needed for a new, empty database.
If deleting a project says "This record is still in use", run
`database/07-fix-delete-cascade.sql`. It makes the database remove a project's
photos and shortlist rows together with the project.
`database/optional-demo-data.sql` is run last and only adds rows: about 100
accounts, categories, companies, IDPs and shortlist items for the demo. It does
not delete anything, so it is safe to run on a database that already has data.

Check it works:

```
npm test                          (all server tests should pass)
npm run dev                       (starts the API on port 3000 and the website on port 5173)
```

## Daily routine

```
git checkout main
git pull
npm install                       (only needed if someone added new packages)
git checkout -b story-<number>-<short-name>
...write tests first, then code...
git add <the files you changed>
git commit -m "Story #<number>: what you did"
git push -u origin story-<number>-<short-name>
```

Then open a Pull Request on GitHub, wait for all the checks (including Vercel)
to go green, and get a review.

**Never** push straight to `main`. **Never** commit `.env`. Keep commit messages short.

## Useful commands (run from the main folder)

| Command | What it does |
|---|---|
| `npm install` | Installs or updates all packages |
| `npm test` | Runs all server tests (uses a temporary test database, never the real one) |
| `npm run dev` | Starts the API and website together; Ctrl+C stops both |
| `npm run dev:server` | Starts the backend and restarts it when you save a file |
| `npm run dev:client` | Starts the website |
| `npm run build` | Builds the website (same as Vercel does) |
| `npm test --workspace client` | Runs the page tests |

**Do not run `npm run seed`.** The database is shared by the whole team, and
seeding **wipes everything**. Ask the team if the data needs resetting.

## If something breaks

- **`npm install` fails, or "Please install pg package manually":** delete the `node_modules` folders (in the main folder, `server` and `client`), then run `npm install` again from the main folder.
- **`git push` says authentication failed:** run `git config --global credential.helper manager`, then push again and sign in through the browser pop-up.
