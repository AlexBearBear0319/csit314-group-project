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

**Login owner:** Frontend role guards use the existing browser session scaffold. They are navigation checks, not authentication. The management APIs currently have no server-side authorization. Attach the team's authenticated User Admin guard to profile routes and Platform Manager guard to category management routes before deployment. Decide separately whether designers/customers need authenticated read access to categories. Do not trust a role supplied by the browser.

The login dropdown, navigation menus and dashboard routing still use four fixed role names. Newly created or renamed profiles are stored successfully but do not gain a corresponding menu or access policy. The spec does not define the relationship between editable profile names and system permissions. Agree that contract with the login owner and tutor before adding role mappings or restricting profile edits. The frontend placeholder login does not call `UserAccount.login()` yet, so suspension is verified at the entity level rather than through a completed sign-in flow.

**IDP owner:** Import `IDPCategory` from `server/src/entity`. Link projects to category IDs using a foreign key (or an association table if several categories per project are agreed). Use `ON DELETE RESTRICT` rather than cascading deletion of projects. The delete route maps foreign-key violations to 409 and displays an in-use message. A real association is not added here because the IDP entity and agreed cardinality do not yet exist. The test suite uses a test-only reference table to verify this behaviour.

**Team:** Category fields follow the existing name/description pattern. Property, room, and style taxonomies, permission editing, reactivation, and preventing suspension of the current administrator are not prescribed in the supplied specification or allocation. These remain requirements decisions rather than hidden business rules. Compare the class/method table above with the completed diagrams before merge; those diagrams were not available during implementation.

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
