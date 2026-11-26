# ToDoApp - Implementation Plan

## 1. Overview

This plan implements KAN-160: Change Password for a logged-in user.

Backend status (already implemented):
- Authenticated endpoint exists to change the current user's password
- Validates current password, enforces password rules, and returns field-level 400 errors
- Returns 401 if the session is not authenticated

UI work to implement:
- Add a Change Password UI for logged-in users
- Call the change-password API endpoint with current and new passwords
- Provide client-side validation and inline error feedback
- Handle success (clear form, show success message) and failure (field errors and generic errors)
- Ensure the feature is accessible and does not expose password values

## 2. Inputs & Traceability (Story key and URL)

- Story key: KAN-160
- Story title: Add Change Password support for logged-in user
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-160

## 3. Planned File Edits (real repo paths only)

- index.html
  - Add Change Password section (or modal) accessible only when logged in
  - Add inputs for current password, new password, confirm new password
  - Add inline validation message containers and a submit button

- public/script.js
  - Add UI show/hide logic based on auth state
  - Wire submit handler to call change-password API
  - Add client-side validation (required fields, new/confirm match, basic length)
  - Map server 400 field errors to the correct inputs
  - Show success and error banners/messages without alerts
  - Clear sensitive fields on success and on logout

- public/styles.css
  - Style Change Password form to match existing UI
  - Style inline errors and success messages consistently

## 4. Work Breakdown (outcome mapped to real files)

- Add Change Password UI
  - index.html
    - Add a new section/container (e.g., #change-password-section) near other account/user controls
    - Add a form (e.g., #change-password-form) with:
      - input type="password" id="current-password" name="currentPassword" autocomplete="current-password"
      - input type="password" id="new-password" name="newPassword" autocomplete="new-password"
      - input type="password" id="confirm-new-password" name="confirmNewPassword" autocomplete="new-password"
    - Add per-field inline error containers (e.g., small elements under each input)
    - Add a form-level message area for success/error (e.g., #change-password-message)

- Auth-aware visibility and lifecycle
  - public/script.js
    - When user is not logged in:
      - Hide/disable the change password section
      - Ensure password inputs are cleared
    - When user logs in:
      - Show the change password section

- Client-side validation
  - public/script.js
    - On submit:
      - Require currentPassword, newPassword, confirmNewPassword non-empty
      - Enforce newPassword rules aligned with backend expectations (at minimum: length check; do not over-restrict if backend is source of truth)
      - Ensure newPassword === confirmNewPassword
      - If invalid -> prevent submit and show inline errors (no alert)

- API integration
  - public/script.js
    - POST (or PUT) to the backend change password endpoint for the current user
    - Send JSON body:
      - currentPassword
      - newPassword
    - Do not send confirmNewPassword to the server
    - Include credentials/cookies if required by existing auth setup

- Server error mapping and messaging
  - public/script.js
    - If server returns 400 with a structured payload (examples):
      - { field: "currentPassword", message: "..." }
      - { field: "newPassword", message: "..." }
    - Map to the relevant inline error container
    - If server returns 401 -> show a message and prompt re-login, then hide the section
    - For unexpected errors -> show a generic message in the form-level message area

- Success handling
  - public/script.js
    - On success:
      - Show non-intrusive success message
      - Clear all password inputs
      - Clear any inline errors
      - Keep the user logged in unless backend invalidates session (handle either case)

- Styling
  - public/styles.css
    - Match existing form layout and spacing
    - Ensure error text is readable and accessible
    - Add a subtle success style for the message area

## 5. Implementation Sequence

1. Update index.html
   - Add Change Password section/form with required inputs and message placeholders
   - Ensure labels are associated to inputs via for/id
   - Add containers for inline errors

2. Update public/script.js
   - Add helpers to set/clear inline errors and form-level message
   - Add validation for current/new/confirm fields
   - Add submit handler that calls the change-password endpoint and maps errors
   - Integrate with existing auth state logic to show/hide section and clear sensitive fields

3. Update public/styles.css
   - Add styles for the change password section, inputs, inline errors, and success messages

4. Manual verification
   - Verify success path, error mapping, and auth-state behavior

## 6. QA Sequence

- Regression
  - Login/logout works as before
  - Existing ToDo create/edit/delete/toggle complete works as before

- Change password scenarios
  - Logged-in user changes password with correct current password -> success message and fields cleared
  - Wrong current password -> inline error displayed for current password
  - Weak/invalid new password -> inline error displayed for new password (server-driven)
  - New password and confirm do not match -> client-side inline error for confirm field
  - Not logged in -> change password section hidden and cannot submit

- Security and UX checks
  - Ensure password fields use type="password" and appropriate autocomplete attributes
  - Ensure no password values are logged to console
  - Ensure fields are cleared on logout and after success

## 7. Risks / Mitigations

- Risk: UI validation diverges from backend rules
  - Mitigation: keep client-side rules minimal (required + confirm match + basic length), rely on backend for definitive validation, and surface server messages inline

- Risk: Sensitive data exposure in logs or persisted state
  - Mitigation: do not log request bodies; do not store passwords in localStorage; clear fields on submit completion and logout

- Risk: Session invalidation after password change may confuse users
  - Mitigation: handle 401/forced logout gracefully -> show message -> redirect to login or refresh auth state

- Risk: Inconsistent error payload shape from server
  - Mitigation: implement robust parsing with fallback to generic error message

## 8. Acceptance Criteria (Gherkin) mapping

Note: The following maps to the Gherkin scenarios captured in KAN-160.

- Change password successfully
  - index.html: Change Password form exists for logged-in users
  - public/script.js: submits currentPassword + newPassword to API
  - public/script.js: shows success message and clears inputs

- Reject incorrect current password
  - public/script.js: maps server 400 field error (currentPassword) -> inline error under current password input

- Reject invalid new password
  - public/script.js: maps server 400 field error (newPassword) -> inline error under new password input

- Prevent submit when confirm does not match
  - public/script.js: client-side validation blocks submit -> inline error under confirm field

- Hide change password when logged out
  - public/script.js: auth-state logic hides/clears the section when unauthenticated

- Do not expose passwords
  - index.html: inputs are password type and use safe autocomplete
  - public/script.js: no logging/storage of password values

## 9. Handoff Summary

- Primary files to change: index.html, public/script.js, public/styles.css
- Contract: Authenticated change password endpoint accepts currentPassword and newPassword; returns field-level 400 errors; returns 401 when unauthenticated
- Manual test checklist:
  - Logged-in -> change password success -> message + cleared fields
  - Wrong current password -> inline error
  - Invalid new password -> inline error
  - Confirm mismatch -> client-side inline error
  - Logout -> section hidden and inputs cleared