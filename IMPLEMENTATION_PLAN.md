# ToDoApp - Implementation Plan

## 1. Overview
This plan implements KAN-157: password reset ("forgot password") flow.

The implementation adds:
- Backend endpoints to request a password reset and to confirm it using a time-limited reset token.
- Frontend UI (inside the existing auth modal) for requesting a reset and for setting a new password.

Constraints / notes:
- No real email delivery in this scope. The system returns a generic success message to avoid account enumeration.
- For local/dev usability, the API may return the reset token when NODE_ENV != "production" (documented and guarded).

## 2. Inputs & Traceability
- Story key: KAN-157
- Story title: Implement password reset ("forgot password") flow
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-157

## 3. Planned File Edits (real repo paths only)
- todoServer.js
  - Add reset-token storage helpers (read/write JSON)
  - Add routes:
    - POST /password-reset/request
    - POST /password-reset/confirm
  - Add validation and token lifecycle utilities
- index.html
  - Add "Forgot password?" entry point on Login
  - Add reset-request and reset-confirm panels (forms) in the auth modal
- public/script.js
  - Add auth modal mode/state handling for reset screens
  - Add fetch calls to new endpoints + inline error/success messaging
- public/styles.css
  - Style new auth modal sections and link/button text
- (Optional new file) passwordResets.json
  - New JSON store for reset tokens (recommended to avoid mutating users.json schema)

## 4. Work Breakdown (outcome mapped to real files)
1) Persist password reset tokens
- File(s): todoServer.js (+ passwordResets.json)
- Outcome:
  - Add PASSWORD_RESETS_FILE constant
  - Implement readPasswordResets()/writePasswordResets()
  - Token record schema:
    - { "<token>": { "userId": <number>, "expiresAt": "<ISO string>" } }

2) Request password reset
- File(s): todoServer.js
- Outcome:
  - POST /password-reset/request
  - Input: { email }
  - Behavior:
    - If email missing -> 400 { error: "Email required." }
    - Always respond with 200 generic message to avoid user enumeration
    - If user exists, create token + expiry and persist it
    - Optional (dev-only) include token in response: { message, token }

3) Confirm password reset
- File(s): todoServer.js
- Outcome:
  - POST /password-reset/confirm
  - Input: { token, newPassword, confirmPassword }
  - Behavior:
    - Missing fields -> 400
    - newPassword != confirmPassword -> 400 { error, field: "confirmPassword" }
    - Invalid/expired token -> 400 (or 401) { error: "Invalid or expired token." }
    - Update users.json password hash (sha256, consistent with existing logic)
    - Invalidate token (remove from passwordResets.json)
    - Return 200 { message: "Password reset successful." }

4) Add frontend entry point and reset forms
- File(s): index.html
- Outcome:
  - Add a "Forgot password?" link in the login portion of the auth modal
  - Add two panels:
    - Reset request panel: email input + submit + back-to-login link
    - Reset confirm panel: token + new password + confirm password + submit + back-to-login link

5) Frontend modal state machine + API wiring
- File(s): public/script.js
- Outcome:
  - Add modal modes:
    - login
    - signup
    - reset-request
    - reset-confirm
  - Add UI functions:
    - showAuthModal(mode) or extend existing showAuthModal(isSignup) into a more explicit mode handler
    - showResetRequest(), showResetConfirm()
  - Add submit handlers:
    - reset-request form submit -> POST /password-reset/request
    - reset-confirm form submit -> POST /password-reset/confirm
  - Add client-side validation:
    - email non-empty
    - newPassword non-empty (and optional min length)
    - confirmPassword matches newPassword
  - Error handling:
    - Display inline messages (reuse #auth-error or introduce new containers per panel)
    - Network failures -> "Network error."

6) Styling
- File(s): public/styles.css
- Outcome:
  - Add styles for:
    - "Forgot password?" link
    - panel visibility toggling
    - success message vs error message

## 5. Implementation Sequence
1. Backend: add passwordResets.json helpers and token lifecycle utilities in todoServer.js
2. Backend: implement POST /password-reset/request with generic response and dev-only token return
3. Backend: implement POST /password-reset/confirm with validation, password update, token invalidation
4. Frontend: extend index.html auth modal with reset panels + navigation links
5. Frontend: update public/script.js to manage auth modal modes and call new endpoints
6. Frontend: add/adjust CSS in public/styles.css
7. Manual QA pass following Section 6

## 6. QA Sequence
- Pre-check: existing flows
  - Signup, login, logout still work
  - Auth token still required for /todos

- Password reset request
  - Missing email -> UI blocks; server returns 400 if bypassed
  - Unknown email -> 200 generic message, no account enumeration
  - Known email -> 200 generic message; in dev, token returned

- Password reset confirm
  - Missing fields -> 400 and UI shows error
  - Password mismatch -> UI validation + server 400
  - Invalid token -> UI shows "Invalid or expired token."
  - Expired token -> same error
  - Valid token -> password updated; login works with new password, fails with old password

- Resilience
  - Stop server / simulate network error -> UI shows "Network error."

## 7. Risks / Mitigations
- User enumeration risk
  - Mitigation: always return 200 generic response from /password-reset/request

- Token leakage risk
  - Mitigation: only return token in response when NODE_ENV != "production"; avoid logging token

- Token reuse / stale token risk
  - Mitigation: store expiresAt; validate and delete token after success; optionally cleanup expired tokens on each request/confirm

- Storage/race risk with JSON files
  - Mitigation: follow existing synchronous read/write pattern; minimize writes; handle write failures and return 500 errors

## 8. Acceptance Criteria (Gherkin) mapping
- Forgot password link navigates to reset request screen
  - index.html: link
  - public/script.js: mode switch to reset-request

- Submit reset request with valid identifier
  - public/script.js -> todoServer.js POST /password-reset/request

- Submit reset request with missing identifier (validation)
  - public/script.js: block submit and show message
  - todoServer.js: 400 on missing email

- Reset request handles unknown user (negative)
  - todoServer.js: 200 generic message regardless of user existence

- Open reset password screen with token
  - index.html: reset-confirm panel includes token input
  - public/script.js: allow navigation to reset-confirm

- Reset password succeeds with matching passwords
  - todoServer.js: confirm updates users.json password
  - public/script.js: route back to login with success banner

- Reset password blocks when passwords do not match (validation)
  - public/script.js validation + todoServer.js 400

- Reset password handles invalid/expired token (negative)
  - todoServer.js: invalid/expired token response
  - public/script.js: display error

- Network/server error handling (boundary/negative)
  - public/script.js: catch() and inline "Network error."

## 9. Handoff Summary
- Deliverables
  - New password reset endpoints in todoServer.js
  - New reset panels and navigation in index.html
  - New JS logic in public/script.js to drive the flow
  - Minor CSS updates in public/styles.css
  - Optional new passwordResets.json file for token persistence

- How to demo
  - Signup/login -> logout
  - Click "Forgot password?" -> request reset
  - Use returned token (dev) in Reset Password screen
  - Set new password -> login with new password