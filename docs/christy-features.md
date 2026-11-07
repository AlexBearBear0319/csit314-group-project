# Christy's feature implementation

This branch implements the project plan's User Profiles stories #1–5 and IDP Categories stories #39–43. User Accounts, login, reports, and project portfolios belong to the other feature owners.

## Routes and BCE classes

| Story | React boundary | Controller method | Entity method | API |
|---|---|---|---|---|
| #1 | CreateUserProfilePg | CreateUserProfileC.createProfile(body) | UserProfile.createProfile(name, description) | POST /api/user-profiles |
| #2 | ViewUserProfilePg | ViewUserProfileC.viewProfile(id) | UserProfile.viewProfile(id) | GET /api/user-profiles/:id |
| #3 | UpdateUserProfilePg | UpdateUserProfileC.updateProfile(id, body) | UserProfile.updateProfile(id, name, description) | PUT /api/user-profiles/:id |
| #4 | SuspendUserProfilePg | SuspendUserProfileC.suspendProfile(id) | UserProfile.suspendProfile(id) | POST /api/user-profiles/:id/suspend |
| #5 | SearchUserProfilePg | SearchUserProfileC.searchProfiles(keyword) | UserProfile.searchProfiles(keyword) | GET /api/user-profiles?keyword=... |
| #39 | CreateIDPCategoryPg | CreateIDPCategoryC.createCategory(body) | IDPCategory.createCategory(name, description) | POST /api/idp-categories |
| #40 | ViewIDPCategoryPg | ViewIDPCategoryC.viewCategory(id) | IDPCategory.viewCategory(id) | GET /api/idp-categories/:id |
| #41 | UpdateIDPCategoryPg | UpdateIDPCategoryC.updateCategory(id, body) | IDPCategory.updateCategory(id, name, description) | PUT /api/idp-categories/:id |
| #42 | DeleteIDPCategoryPg | DeleteIDPCategoryC.deleteCategory(id) | IDPCategory.deleteCategory(id) | DELETE /api/idp-categories/:id |
| #43 | SearchIDPCategoryPg | SearchIDPCategoryC.searchCategories(keyword) | IDPCategory.searchCategories(keyword) | GET /api/idp-categories?keyword=... |

Boundary URLs start at `/admin/profiles` and `/manager/categories`. Both have `/create`, `/:id`, and `/:id/edit` pages. Profiles have `/:id/suspend`; categories have `/:id/delete`.

## Data and responses

- Profiles retain their existing table and fields. Suspending sets `status` to `suspended`; it preserves accounts and their profile IDs. The existing `UserAccount.login()` method checks suspended profiles.
- Categories use `idp_category` with Sequelize's `id`, `createdAt`, and `updatedAt`, plus `name` and `description`. Name is required and unique. Description is optional. Both text fields accept up to 255 characters, matching the existing profile text fields. No category values or sample records are inserted into the application.
- Create/update accept only name and description. IDs and profile status cannot be changed through those payloads.
- Search matches name or description, case-insensitively and literally. Empty search lists all records. `%` and `_` are text, not wildcards. Search currently loads the list into memory; introduce database filtering/pagination if real data grows substantially.
- Success returns the record (201 on create, 200 on view/update/suspend). Delete returns `{ "message": "IDP category deleted." }`. Validation returns 400 with `message` and field `errors`; duplicate names return 409; missing IDs return 404. Database failures return a generic 500 response.

## Integration work

**Login integration (28 Oct 2026):** This branch now includes `origin/main` at `e250b41`. Profile APIs require a real User Admin session; category APIs require a real Platform Manager session. Both use `authenticateSession`, `requireRole` and `requireCsrf` in `routes/index.cjs`. React routes use the shared reactive `RequireRole`. The shared API client carries cookies and CSRF tokens, and retains caller cancellation for search/detail requests. The readiness check includes `idp_category`.

The session middleware reloads account and profile status for every protected request. Suspending a profile therefore blocks its existing sessions as well as future logins. Integration tests cover this through the real login API.

The shared login still supports four canonical roles. Creating or renaming a profile does not define new permissions; unknown role names cannot sign in. Agree any additional role mappings with the team before expanding permissions. This implementation does not invent a reactivation flow or a rule preventing suspension of the administrator's own profile.

**IDP owner:** Import `IDPCategory` from `server/src/entity`. Link projects to category IDs using a foreign key (or an association table if several categories per project are agreed). Use `ON DELETE RESTRICT` rather than cascading deletion of projects. The delete route maps foreign-key violations to 409 and displays an in-use message. A real association is not added here because the IDP entity and agreed cardinality do not yet exist. The test suite uses a test-only reference table to verify this behaviour.

**Team:** Category fields follow the existing name/description pattern. Property, room, and style taxonomies, permission editing, reactivation, and preventing suspension of the current administrator are not prescribed in the supplied specification or allocation. These remain requirements decisions rather than hidden business rules. The per-story diagrams and use case descriptions are in [christy-stories/README.md](christy-stories/README.md). They describe current code and still need team/tutor review.

## Validation and local testing

From the repository root:

```powershell
npm.cmd test
npm.cmd run lint --workspace client
npm.cmd run build
```

Server tests use SQLite in memory. The category suite includes 100 temporary records and a restricted foreign-key deletion test. It does not touch Supabase.

Run `npm.cmd run dev:server` and `npm.cmd run dev:client` in separate terminals. The backend uses `server/.env`, so manual changes affect whichever database its `DATABASE_URL` selects. Do not run the destructive seed script to test these features.

The client uses `VITE_API_URL` when provided. Otherwise development uses `http://localhost:3000`, and production uses same-origin `/api` routes, matching the root Vercel rewrites. A separate backend host still requires `VITE_API_URL` and matching backend `FRONTEND_URL` configuration.

## Schema and remaining evidence

Run `docs/christy-schema.sql` after the shared auth schema when the team is ready to apply the database changes. It widens `user_profile.name` to 255 characters and creates the category table with RLS enabled and no direct browser grants. No remote database change was performed in this run. Do not run `sync({ force: true })` or the seed script against Supabase.

On 28 Oct the new authorization suite failed all 16 tests before the feature routers were mounted, then passed after integration. The full server suite passed 110 tests. The existing CRUD code predates this run; historical TDD screenshots are unavailable and must not be fabricated. The story pack records this distinction.

The tracker’s final task includes remote CI, PR merge and a live deployment check. Those remain pending, along with applying the SQL and recording lab/manual accessibility evidence. Do not mark task 10 Done from a local green test run alone. The uploaded workbook was left unchanged.
