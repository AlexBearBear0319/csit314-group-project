# CSIT314 Group CCB: Interior Design Platform

Built with the **BCE** pattern:

| Layer | Where | Naming |
|---|---|---|
| Boundary (pages) | `client/src/boundary/` | `[Action][Thing]Pg.jsx` e.g. `SuspendUserAccountPg.jsx` |
| Controller | `server/src/controller/` | `[Action][Thing]C.js` e.g. `SuspendUserAccountC.js` |
| Entity (database) | `server/src/entity/` | plain noun e.g. `UserAccount.js` |

Class and method names in the code must match the diagrams exactly.

## First-time setup (on your laptop)

```
git clone <repo link>
cd csit314-group-project

cd server
npm install
copy .env.example .env      (Mac: cp .env.example .env) then fill in the real values
npm test                    (all tests should pass)
npm run dev                 (backend on http://localhost:3000/api/health)

cd ../client              (in a second terminal)
npm install
copy .env.example .env
npm run dev                 (frontend on http://localhost:5173)
```

## Daily routine

```
git checkout main
git pull
git checkout -b story-<number>-<short-name>
...write tests first, then code...
git add .
git commit -m "Story #<number>: what you did"
git push -u origin story-<number>-<short-name>
```
Then open a Pull Request on GitHub, wait for the CI tick and a review.

**Never** push straight to `main`. **Never** commit `.env`.

## Useful commands

| Command (inside `server/`) | What it does |
|---|---|
| `npm test` | Runs all unit tests (uses a temporary test database, never the real one) |
| `npm run dev` | Starts the backend (nodemon) and restarts it when you save a file |
| `npm run seed` | **Wipes** the database and refills it with test data |

Demo logins after seeding: `admin1`, `designer1`, `customer1`, `manager1`, password `password123`.
