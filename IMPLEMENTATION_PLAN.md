# ToDoApp - Implementation Plan

## 1. Overview
Implement KAN-159: add a secure "Change password" flow for authenticated users.

Key behaviors:
- Authenticated-only UI screen with form fields: current password, new password, confirm new password.
- Backend authenticated endpoint verifies current password and updates stored password securely.
- On success, invalidate current session and force re-login (old session must not remain usable).
- Errors must be non-sensitive (no password values/hashes/stack traces).

## 2. Inputs & Traceability (Story key and URL)
- Story key: KAN-159
- Story title: Add Change Password feature for logged-in users
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-159

## 3. Planned File Edits (real repo paths only)
Backend:
- todoServer.js
- users.json
- sessions.json

Frontend:
- index.html
- public/script.js
- public/styles.css

Docs:
- README.md (optional: document endpoint and UX)

## 4. Work Breakdown (outcome mapped to real files)
1) Backend: add authenticated change-password endpoint
- File: todoServer.js
  - Add route, e.g. POST /change-password (exact path to be finalized based on existing routing conventions in file).
  - Require authentication using the existing session mechanism (likely via session id/cookie stored in sessions.json).
  - Validate request body: currentPassword, newPassword, confirmNewPassword (server may accept confirm and enforce match).
  - Verify currentPassword matches the stored password for the authenticated user.
  - Update the user's stored password.
  - Invalidate active session(s) for this user (at minimum the current session) so user must log in again.
  - Return safe error messages (no internal details).

2) Backend: persist password update and session invalidation
- Files: users.json, sessions.json
  - Ensure password update is persisted.
  - Ensure session invalidation is persisted (remove session entry or mark invalid).

3) Frontend: add Change Password UI
- Files: index.html, public/script.js
  - Add navigation entry/button visible only when authenticated (based on existing auth state logic).
  - Add Change Password form markup (or dynamically render) with:
    - current password
    - new password
    - confirm new password
  - Client-side validation:
    - required fields
    - new password equals confirm
    - disable submit when invalid
  - Call backend endpoint; display success/error.
  - On success: clear auth state (cookie/local state as applicable), redirect to login, and show "please log in again" message.

4) Frontend: styling
- File: public/styles.css
  - Basic layout for Change Password form and validation messages consistent with existing UI.

5) Documentation
- File: README.md
  - Document endpoint, required auth, and the forced re-login behavior.

## 5. Implementation Sequence
1) Inspect current auth/session flow
- Read todoServer.js to identify:
  - how login is handled
  - how sessions are stored/validated (sessions.json)
  - how current user is identified for authenticated requests

2) Define API contract
- Endpoint: POST /change-password (or align with existing /auth routes if present).
- Request body:
  - currentPassword: string
  - newPassword: string
  - confirmNewPassword: string (optional but recommended for server-side match enforcement)
- Responses:
  - 200: { message: "Password updated" } and server invalidates session
  - 400: validation errors (missing fields, mismatch)
  - 401/403: unauthenticated
  - 400/401: wrong current password (use a safe message: "Current password is incorrect")

3) Implement backend route
- Add handler in todoServer.js:
  - authenticate request
  - validate body
  - verify current password against stored value
  - update user password
  - invalidate session(s)
  - return response

4) Implement frontend UI and wiring
- Update index.html and public/script.js:
  - add UI entry point
  - render form
  - validations
  - fetch POST to endpoint
  - handle logout/redirection on success

5) Update docs
- README.md

## 6. QA Sequence
API tests (manual via curl/Postman):
- Unauthenticated call to change-password endpoint -> 401/403.
- Missing fields -> 400 with validation message(s).
- New vs confirm mismatch -> client blocks submit; also verify server returns 400 if mismatch is sent.
- Wrong current password -> 400/401 with "Current password is incorrect" and no other sensitive info.
- Happy path:
  - change password returns 200
  - subsequent authenticated API calls using the old session should fail (session invalidated)
  - login with old password fails
  - login with new password succeeds

UI tests (manual):
- When logged in, Change Password option is visible and navigates to the form.
- When logged out, Change Password option is not visible and cannot be accessed.
- Form prevents submission when invalid and shows clear messages.
- After successful change, user is forced to log in again.

Regression:
- Existing login/logout, todo CRUD behaviors unaffected.

## 7. Risks / Mitigations
- Risk: passwords appear to be stored in plain text (users.json) and current login logic may rely on that.
  - Mitigation: Keep behavior consistent with current app design for now (do not introduce breaking hash change in this story). If hashing is already present, reuse the same algorithm.

- Risk: session invalidation may be implemented inconsistently.
  - Mitigation: centralize session removal in the same utility/path used by logout; add explicit test steps for session invalidation.

- Risk: Change Password page could be reachable without auth via direct UI manipulation.
  - Mitigation: enforce both frontend guards and backend auth checks.

## 8. Acceptance Criteria (Gherkin) mapping
Scenario 1: Navigate to Change Password when authenticated
- index.html, public/script.js: add route/view and form fields.

Scenario 2: Change password successfully and force re-login
- todoServer.js: update password + invalidate session
- public/script.js: on success clear auth state and redirect

Scenario 3: Reject when current password is incorrect
- todoServer.js: verify current password, return safe error
- public/script.js: surface message

Scenario 4: Reject when new password and confirmation do not match
- public/script.js: client-side validation prevents submit
- todoServer.js (optional): server-side mismatch handling if confirmNewPassword is included

Scenario 5: Reject missing required fields
- public/script.js: required validation
- todoServer.js: required validation

Scenario 6: Endpoint requires authentication
- todoServer.js: enforce auth middleware/check

Scenario 7: Old password no longer works after change
- todoServer.js: persist updated password in users.json
- Manual QA: login attempts

Scenario 8: Do not leak sensitive info in error responses
- todoServer.js: sanitize errors
- public/script.js: do not display raw server traces

## 9. Handoff Summary
- Adds authenticated Change Password UI and backend endpoint.
- Enforces validation and safe error handling.
- Forces re-login by invalidating session after password change.
- Files touched are limited to todoServer.js and existing static frontend assets (index.html, public/script.js, public/styles.css) plus optional README.md updates.