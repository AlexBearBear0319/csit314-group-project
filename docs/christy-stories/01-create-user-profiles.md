# Story #1: Create user profile

Owner: Christy. Actor: User Admin. Sprint 1+2.

Source: uploaded `CSIT314_Project_Plan (1).xlsx`, Story Checklist row 13; Features rows 10–11. These descriptions document the current implementation. Input limits and duplicate handling follow the existing code; they are not new tutor-approved requirements.

## Use case diagram

![Story #1 use case](diagrams/01-use-case.svg)

## Use case description

Goal: create user profile in the Interior Design Platform.

Preconditions: an active account and profile, a valid server session with role `User Admin`.

Trigger: the actor selects create.

### Normal flow

1. The User Admin opens the create page.
2. They enter a name and optional description, then submit.
3. The API checks the session, role and CSRF token.
4. The controller trims and validates the fields.
5. The entity saves a new user profile.
6. The boundary opens its details and shows a success message.

### Alternative flows

- No session: 401; the shared client ends a protected session and the guard opens login.
- Wrong role: 403; no record is changed.
- Database/network failure: show an error and allow retry; do not show success.
- Missing or wrong CSRF token, or untrusted Origin: 403; no mutation.
- Blank/non-text name, name over 255 characters, or invalid description: 400 and field errors; preserve entered values.
- Duplicate name: 409 and a name error; preserve the original record.

Postcondition: the normal flow completes with HTTP 201; failed validation or access does not apply the requested change. Reads leave data unchanged.

## BCE class diagram

![Story #1 BCE](diagrams/01-bce.svg)

Boundary: `client/src/boundary/CreateUserProfilePg.jsx`. Controller: `server/src/controller/CreateUserProfileC.js`. Entity: `server/src/entity/UserProfile.js`.

The BCE diagram shows logical boundary/control/entity roles. Boundaries use React hooks and shared UI components; diagrams do not invent JavaScript classes or methods. Create/update boundaries define `displaySuccess()` and `displayError()`. View/search use `DetailsView`, `ResultsTable` and `RecordLoadState`; confirmation errors are handled by `ConfirmAction`.

## Sequence diagram

![Story #1 sequence](diagrams/01-sequence.svg)

API: `POST /api/user-profiles`. The boundary calls `api`, which carries the session cookie and CSRF token. The router invokes `CreateUserProfileC.createProfile(body)`; the controller invokes `UserProfile.createProfile(name, description)`.

## Test cases and automated checks

1. Create with trimmed fields → 201 and one new record.
2. Invalid input → 400 and no new record.
3. Duplicate → 409 and unchanged count.

Access cases for every route: anonymous → 401; another role → 403. Mutation cases: missing/wrong CSRF or untrusted Origin → 403; authorized owner with a valid token → normal flow. See `server/tests/christyAuthorization.test.js` and `server/tests/userProfiles.test.js`.

Manual UI cases still to record: complete the normal flow; preserve values after an error; cancel a confirmation; keyboard-only use and focus restoration; phone-width layout; retry a failed load. Live-site deployment has not been checked in this run.

## Evidence status

The feature code and tests existed before this run. Historical TDD screenshots cannot be reconstructed. This run added and ran 16 authorization integration tests before mounting the feature routers: all 16 failed (404). After integration, the full server suite passed (110 tests). This is integration evidence, not proof that the original feature used TDD.

The Supabase migration is prepared in `docs/christy-schema.sql` and has not been applied. PR merge, remote CI, live deployment and lab evidence remain pending.
