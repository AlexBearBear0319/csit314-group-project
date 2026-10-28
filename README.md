# CSIT314 Group CCB: Interior Design Platform

Built with the **BCE** pattern:

| Layer | Where | Naming |
|---|---|---|
| Boundary (pages) | `client/src/boundary/` | `[Action][Thing]Pg.jsx` e.g. `SuspendUserAccountPg.jsx` |
| Controller | `server/src/controller/` | `[Action][Thing]C.js` e.g. `SuspendUserAccountC.js` |
| Entity (database) | `server/src/entity/` | plain noun e.g. `UserAccount.js` |

Class and method names in the code must match the diagrams exactly.

## UI references

- Read [UI_GUIDELINES.md](UI_GUIDELINES.md) before a UI change.
- See the [standalone UI preview](docs/ui-preview.html) for the approved visual example. Its sample records do not belong to the app.
- See [Interior Designer IDP setup](docs/INTERIOR_DESIGNER_IDPS_SETUP.md) for the SQL, Supabase Storage settings, deployment variables and live API checks.

For another coding tool, use this prompt:

> Read `AGENTS.md` and `UI_GUIDELINES.md`. Use the shared theme and components. Keep the routes, props, and behaviour that this task does not ask you to change. Implement only this story and its acceptance criteria: `[story and criteria]`. Do not add sample records or unsupported rules. Report the changed files and checks.

Some tools do not read repository instructions. If your tool does not load these files, paste this prompt into it.

## First-time setup (on your laptop)

Run every command from the **main project folder** (`csit314-group-project`), not inside `server` or `client`.

```
git clone <repo link>
cd csit314-group-project
npm install                       (installs packages for both server and client)
```

Then make the database settings file:

1. In the `server` folder, copy `.env.example` and rename the copy to `.env`
2. Paste in the `DATABASE_URL` from the group chat (ask Kaz if you don't have it)

Check it works:

```
npm test                          (all tests should pass)
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
Then open a Pull Request on GitHub, wait for all the checks (including Vercel) to go green, and get a review.

**Never** push straight to `main`. **Never** commit `.env`. Keep commit messages short.

## Useful commands (run from the main folder)

| Command | What it does |
|---|---|
| `npm install` | Installs or updates all packages |
| `npm test` | Runs all server unit tests (uses a temporary test database, never the real one) |
| `npm run dev` | Starts the API and website together; Ctrl+C stops both |
| `npm run dev:server` | Starts the backend and restarts it when you save a file |
| `npm run dev:client` | Starts the website |
| `npm run build` | Builds the website (same as Vercel does) |

**Do not run `npm run seed`.** The database is shared by the whole team, and seeding **wipes everything**. Ask Kaz if the data needs resetting.

Use a project account with a password that the account owner has confirmed. This workspace cannot verify shared database passwords. Do not run the seed command against the shared database.

## If something breaks

- **`npm install` fails, or "Please install pg package manually":** delete the `node_modules` folders (in the main folder, `server` and `client`), then run `npm install` again from the main folder.
- **`git push` says authentication failed:** run `git config --global credential.helper manager`, then push again and sign in through the browser pop-up.
