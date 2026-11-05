# Xandra's functions

The code is implemented in the existing project. Apply docs/xandra-schema.sql to the configured PostgreSQL database before running these features. The migration was applied to the database used by the local app on 30 October 2026. Existing environment settings and image storage setup remain required.

## Implemented behavior

| Stories | Pages | API |
|---|---|---|
| #13–17 | /designer/company, /create, /mine, /mine/edit under that path | GET/POST /api/companies; GET/PUT/DELETE /api/companies/mine |
| #32–33 | /customer/search | GET /api/customer/idps; POST /api/customer/idps/:id/view |
| #44–46 | /manager/reports | GET /api/reports?period=daily\|weekly\|monthly&date=YYYY-MM-DD |

Company reads, updates, deletes and searches use the authenticated designer's account. A database unique constraint enforces one company per designer. The browser cannot choose the owner. Company deletion removes company information only; the existing project model continues to reference its designer account. No new Company-to-project foreign key or deletion cascade was invented.

Customer search covers project name, description, property type and design style. It treats wildcard characters as ordinary text, returns nine records per page, and uses a stable update-time/ID order. Both current and past projects belonging to active Interior Designer accounts with active profiles are searchable. The existing model has no publication flag. No login details, owner email, storage path or password is returned.

Opening a project makes a CSRF-protected POST and atomically increments its view count once per successful detail-open request. Search does not count as a view. Counts are not unique visitor totals; reopening a project counts again. This adds the count storage needed by Alex's #30, but does not implement Alex's count page or Kaz's shortlist feature.

The report is a real database summary of records **created** during the selected period: user accounts, companies, IDP categories, projects, and the project breakdown by current status. It is not a report of visits, shortlist events, revenue or historical status changes. Weekly periods run Monday–Sunday, monthly periods are calendar months, and all boundaries use Asia/Singapore (UTC+08). Each query uses an inclusive start and exclusive end, with a consistent database snapshot. The UI labels these measures and dates explicitly.

Company name/description, report measures, period conventions and browse visibility are initial implementation choices based on available code and the project plan. The referenced specification files were absent; confirm these choices against the brief before final submission. Field validation uses a 255-character company name and a 5,000-character description, following existing text-field patterns.

## Code structure

- Company: Company entity; Create/View/Update/Delete/SearchCompanyC controllers; corresponding boundary pages. Delete uses the shared confirmation component on the view page.
- Browse: CustomerProject query entity; SearchCustomerIDPC and ViewCustomerIDPC; SearchCustomerIDPPg and the shared ProjectPreviewDialog.
- Reports: PlatformReport query entity; GenerateReportC; GenerateReportPg.
- Existing role/session middleware protects each API; state-changing actions also require CSRF.

## Verification

The new tests were run before implementation and failed, then passed after implementation. The full server suite passed: 12 suites, 117 tests. Frontend production build and ESLint passed. Tests use in-memory SQLite, not the shared database. On 30 October, 22 feature checks passed against PostgreSQL. On 6 November, 22 HTTP checks passed against an isolated test database and the local login page loaded without a server error. Hosted deployment and project photo retrieval remain unverified.

Run from the project root:

    npm test
    npm run build
    npm run lint --workspace client
    npm run dev

The PostgreSQL checks used temporary QA records that were removed after verification.
