# Christy’s story pack

Stories #1–5 and #39–43, from the uploaded project plan. Each story has its own use case description, use case diagram, BCE diagram, sequence diagram and test-case mapping. All 30 diagrams are standalone SVGs.

| Story | Use case | Boundary | Controller |
|---|---|---|---|
| #1 | [Create user profile](01-create-user-profiles.md) | `CreateUserProfilePg` | `CreateUserProfileC.createProfile(body)` |
| #2 | [View user profile](02-view-user-profiles.md) | `ViewUserProfilePg` | `ViewUserProfileC.viewProfile(id)` |
| #3 | [Update user profile](03-update-user-profiles.md) | `UpdateUserProfilePg` | `UpdateUserProfileC.updateProfile(id, body)` |
| #4 | [Suspend user profile](04-suspend-user-profiles.md) | `SuspendUserProfilePg` | `SuspendUserProfileC.suspendProfile(id)` |
| #5 | [Search user profile](05-search-user-profiles.md) | `SearchUserProfilePg` | `SearchUserProfileC.searchProfiles(keyword = '')` |
| #39 | [Create IDP category](39-create-idp-categories.md) | `CreateIDPCategoryPg` | `CreateIDPCategoryC.createCategory(body)` |
| #40 | [View IDP category](40-view-idp-categories.md) | `ViewIDPCategoryPg` | `ViewIDPCategoryC.viewCategory(id)` |
| #41 | [Update IDP category](41-update-idp-categories.md) | `UpdateIDPCategoryPg` | `UpdateIDPCategoryC.updateCategory(id, body)` |
| #42 | [Delete IDP category](42-delete-idp-categories.md) | `DeleteIDPCategoryPg` | `DeleteIDPCategoryC.deleteCategory(id)` |
| #43 | [Search IDP category](43-search-idp-categories.md) | `SearchIDPCategoryPg` | `SearchIDPCategoryC.searchCategories(keyword = '')` |

See `../christy-features.md` for integration and `../christy-schema.sql` for the unapplied database migration. Automated checks do not replace the manual UI, Supabase, PR/CI and live-site checks. The original workbook is unchanged.
