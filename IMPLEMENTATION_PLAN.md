# ToDoApp - Implementation Plan

## 1. Overview
This plan implements KAN-150: add a Change Password capability for an authenticated (logged-in) user in the ToDoApp.

Current architecture notes (from repo):
- Backend: Node.js + Express in todoServer.js
- Auth: token-based sessions stored in sessions.json, token passed via Authorization header
- Users: stored in users.json with password hashed via SHA-256
- Frontend: static index.html + public/script.js + public/styles.css

In-scope:
- Backend endpoint to change password (requires valid session token)
- Frontend modal/form to collect current password, new password, confirm new password
- Validation and error handling aligned to acceptance criteria

Out-of-scope:
- Forgot password / password reset flow
- Logout from all devices
- Changing password hashing algorithm (keep SHA-256 for compatibility with existing accounts)

## 2. Inputs & Traceability (Story key and URL)
- Story key: KAN-150
- Story title: Add "Change password" for logged-in user
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-150

## 3. Planned File Edits (real repo paths only)
- todoServer.js
  - Add authenticated change password endpoint
  - Add password policy validation helper(s)
- public/script.js
  - Add Change Password UI open/close handlers
  - Add submit handler to call backend using fetchWithAuth
  - Handle error/success UI states
- index.html
  - Add Change Password modal markup
  - Add header button/link to open the modal (visible only when authenticated)
- public/styles.css
  - Style the Change Password modal consistent with existing modal patterns
- README.md (optional)
  - Document the endpoint and basic usage

## 4. Work Breakdown (outcome mapped to real files)
- Backend: Change password API
  - Add route: PUT /me/password (preferred) or POST /change-password (pick one)
  - Protect with requireAuth middleware
  - Request body: { currentPassword, newPassword, confirmNewPassword }
  - Validate:
    - required fields
    - newPassword == confirmNewPassword
    - password policy
    - currentPassword matches stored hash
  - Update users.json with new hashed password
  - Decide on session invalidation after password change
  -> todoServer.js

- Frontend: Change Password UI
  - Add a "Change password" control in header (shown only when logged in)
  - Add modal with three inputs + submit + cancel/close
  - Inline error message region (similar to auth modal error)
  - Submit calls endpoint via fetchWithAuth and shows response
  - On success: show success message and optionally log user out
  -> index.html, public/script.js, public/styles.css

- Docs (optional)
  - Add short section in README.md
  -> README.md

## 5. Implementation Sequence
1. todoServer.js
   - Add helper validatePasswordPolicy(newPassword) returning { valid, message }.
   - Add endpoint (recommend: PUT /me/password):
     - requireAuth
     - validate body
     - verify currentPassword by comparing hashPassword(currentPassword) with stored user.password
     - update stored hash to hashPassword(newPassword)
     - (security decision) invalidate current token by deleting sessions[authToken] and writing sessions.json
     - respond 200 { message: "Password updated" }

2. index.html
   - Add new modal container similar to existing edit/auth modals:
     - id: change-password-modal
     - form id: change-password-form
     - fields: current-password, new-password, confirm-new-password
     - error region: change-password-error

3. public/styles.css
   - Add styles for new modal using existing modal classes/patterns.

4. public/script.js
   - Add showChangePasswordModal() / closeChangePasswordModal().
   - Add click handler for header button.
   - Add onsubmit handler:
     - client-side required checks
     - client-side new/confirm match
     - fetchWithAuth(`${API_BASE}/me/password`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(...) })
     - handle status codes and show inline messages
     - on success: if backend invalidated token, call clearAuth() and showAuthModal(false)

5. README.md (optional)
   - Document endpoint and expected request/response.

## 6. QA Sequence
- Backend (manual API verification)
  - Login -> get token
  - PUT /me/password with valid token:
    - correct currentPassword, strong newPassword, matching confirm -> 200
    - wrong currentPassword -> 401
    - mismatch confirm -> 400
    - weak newPassword -> 400
    - no/invalid token -> 401

- Frontend (manual)
  - Ensure Change password button/link is hidden when logged out
  - Modal open/close works (X, outside click, Esc) consistent with other modals
  - Error messages display inline, no console errors
  - After successful change:
    - if session invalidated, user is logged out and must login with new password
    - login with old password fails
    - login with new password succeeds

- Regression
  - Signup/login/logout still works
  - Todos list + CRUD still works for authenticated users

## 7. Risks / Mitigations
- Risk: Password hashing uses SHA-256 (no salt) and is not secure for production.
  - Mitigation: keep existing scheme for compatibility; propose bcrypt migration as separate story.

- Risk: Session token may remain valid after password change (security risk).
  - Mitigation: invalidate current token on successful password change; require re-login.

- Risk: JSON file concurrent writes could cause data corruption.
  - Mitigation: keep write operations minimal and synchronous as current implementation; avoid multiple writes when possible.

## 8. Acceptance Criteria (Gherkin) mapping
Note: The following maps the story acceptance criteria (as created in Phase 2) to planned implementation.

- Successful change password
  - Backend updates users.json when currentPassword is correct and newPassword passes validation.
  - UI shows success and (if token invalidated) forces re-login.
  -> todoServer.js, public/script.js, index.html

- Wrong current password
  - Backend returns 401 with error message; UI displays inline error.
  -> todoServer.js, public/script.js

- New password confirmation mismatch
  - Frontend prevents submit and/or backend returns 400; UI displays inline error.
  -> public/script.js (and defensive check in todoServer.js)

- New password violates policy
  - Backend checks policy (example: min 8 chars, at least 1 letter and 1 number) and returns 400.
  -> todoServer.js, public/script.js

- Unauthenticated access blocked
  - Endpoint protected by requireAuth returns 401; UI hides entry point when not authenticated.
  -> todoServer.js, public/script.js, index.html

## 9. Handoff Summary
- Add a new authenticated API endpoint for changing password in todoServer.js.
- Add a new Change Password modal in index.html styled in public/styles.css.
- Implement client-side integration in public/script.js using fetchWithAuth and inline message handling.
- Recommended security behavior: invalidate the current session token after successful password change.
