# Story #43: Search IDP category

Owner: Christy. Actor: Platform Manager. Sprint 1+2.

Source: uploaded `CSIT314_Project_Plan (1).xlsx`, Story Checklist row 32; Features rows 10–11. These descriptions document the current implementation. Input limits and duplicate handling follow the existing code; they are not new tutor-approved requirements.

## Use case diagram

![Story #43 use case](diagrams/43-use-case.svg)

## Use case description

Goal: search idp category in the Interior Design Platform.

Preconditions: an active account and profile, a valid server session with role `Platform Manager`.

Trigger: the actor selects search.

### Normal flow

1. The Platform Manager opens the search page.
2. They enter a keyword and submit.
3. The API checks the session and role.
4. The controller checks that the keyword is text.
5. The entity matches name or description, ignoring case and treating % and _ literally.
6. The boundary displays results sorted by name then ID; the keyword stays in the URL.

### Alternative flows

- No session: 401; the shared client ends a protected session and the guard opens login.
- Wrong role: 403; no record is changed.
- Database/network failure: show an error and allow retry; do not show success.
- Blank keyword: list all records. No match: show “No results found.”
- Repeated query parameter (non-text keyword): 400. A superseded search is cancelled.

Postcondition: the normal flow completes with HTTP 200; failed validation or access does not apply the requested change. Reads leave data unchanged.

## BCE class diagram

![Story #43 BCE](diagrams/43-bce.svg)

Boundary: `client/src/boundary/SearchIDPCategoryPg.jsx`. Controller: `server/src/controller/SearchIDPCategoryC.js`. Entity: `server/src/entity/IDPCategory.js`.

The BCE diagram shows logical boundary/control/entity roles. Boundaries use React hooks and shared UI components; diagrams do not invent JavaScript classes or methods. Create/update boundaries define `displaySuccess()` and `displayError()`. View/search use `DetailsView`, `ResultsTable` and `RecordLoadState`; confirmation errors are handled by `ConfirmAction`.

## Sequence diagram

![Story #43 sequence](diagrams/43-sequence.svg)

API: `GET /api/idp-categories/?keyword=...`. The boundary calls `api`, which carries the session cookie and CSRF token. The router invokes `SearchIDPCategoryC.searchCategories(keyword = '')`; the controller invokes `IDPCategory.searchCategories(keyword = '')`.

## Test cases and automated checks

1. Name or description matches ignoring case → correct list.
2. Empty → all; absent term → empty list.
3. Literal %/_ and repeated query parameters → literal match / 400.

Access cases for every route: anonymous → 401; another role → 403. Mutation cases: missing/wrong CSRF or untrusted Origin → 403; authorized owner with a valid token → normal flow. See `server/tests/christyAuthorization.test.js` and `server/tests/idpCategories.test.js`.

Manual UI cases still to record: complete the normal flow; preserve values after an error; cancel a confirmation; keyboard-only use and focus restoration; phone-width layout; retry a failed load. Live-site deployment has not been checked in this run.

## Evidence status

The feature code and tests existed before this run. Historical TDD screenshots cannot be reconstructed. This run added and ran 16 authorization integration tests before mounting the feature routers: all 16 failed (404). After integration, the full server suite passed (110 tests). This is integration evidence, not proof that the original feature used TDD.

The Supabase migration is prepared in `docs/christy-schema.sql` and has not been applied. PR merge, remote CI, live deployment and lab evidence remain pending.
