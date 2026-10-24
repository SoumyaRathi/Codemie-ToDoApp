# ToDoApp - Implementation Plan

## 1. Overview
This plan delivers the "List ToDo items" capability end-to-end (UI + API) for the ToDoApp.

The application already includes a todos list experience in the main UI and a backend endpoint `GET /todos` that returns the authenticated user's ToDo items. This story will focus on:
- Making the list view behavior explicit and robust (success, empty, error states)
- Adding API response validation in the UI
- Adding automated API tests for the list endpoint behavior (including unauthorized and shape validation expectations)

No production feature beyond listing ToDo items will be introduced.

## 2. Inputs & Traceability (Story key and URL)
- Story: KAN-140
- URL: https://soumyarathi57.atlassian.net/browse/KAN-140
- Summary: Add "List ToDo items" view (UI + API)

## 3. Planned File Edits (real repo paths only)
- todoServer.js
- public/script.js
- public/styles.css (only if needed for new error/empty UI state styling)
- package.json (test script wiring if needed)
- IMPLEMENTATION_PLAN.md (this document)
- (new) test/todos.list.test.js

## 4. Work Breakdown (outcome mapped to real files)
- Confirm and document list API contract and error behaviors -> todoServer.js
- Add/strengthen API response validation on the client and show error state -> public/script.js, public/styles.css
- Ensure empty state is shown when API returns [] -> public/script.js, public/styles.css
- Add API tests for list endpoint (auth, filtering, and response shape) -> test/todos.list.test.js
- Ensure npm scripts support running tests -> package.json

## 5. Implementation Sequence
1) Backend: verify and (if necessary) harden `GET /todos` endpoint
- File: todoServer.js
- Actions:
  - Confirm `GET /todos` uses `requireAuth` and filters by `req.userId` (already present).
  - Ensure consistent JSON response: always an array (already present), including for empty results.
  - Ensure error responses are JSON with `{ error: "..." }` (already used across server).
  - If needed: add a small helper to validate todo shape before returning (optional; only if tests reveal malformed persisted data). Keep minimal to avoid scope creep.

2) Frontend: implement explicit list view behavior backed by API
- File: public/script.js
- Actions:
  - Update `fetchAndRenderTodos()` to handle non-OK statuses besides 401:
    - If `!resp.ok` -> render an error state instead of `alert()`.
  - Add client-side response validation before calling `renderTodos()`:
    - Validate response is an array.
    - For each item validate required fields: `id`, `title`, `description`, `completed`, `createdAt`, `updatedAt`.
    - If invalid -> render an error state message (Scenario 4).
  - Ensure empty list renders the empty state (already exists: "No todos found.").
  - Add a dedicated `renderErrorState(message)` function to avoid using blocking alerts.

3) UI styling for error/empty states
- File: public/styles.css
- Actions:
  - Add styles for `.error-state` similar to `.empty-state` for consistent UX.
  - Ensure error state is readable and does not break layout in `.outputData` grid.

4) Automated tests for list endpoint
- File: test/todos.list.test.js
- Actions:
  - Add supertest-based tests covering:
    - 401 when no Authorization header
    - 200 with JSON array when authorized
    - Empty array for a user with no todos (create a new user and ensure no todos exist, or remove seeded todo for that user within test setup)
    - Optional: validate each todo contains required fields (shape contract)
  - Keep tests isolated by creating users/todos in the JSON files in setup/teardown (backup original files, restore after).

5) Test command wiring
- File: package.json
- Actions:
  - Add `"test": "node --test"` if using Node test runner OR add a simple mocha/jest dependency is out of scope.
  - Prefer Node built-in test runner only if repository Node version supports it; otherwise, implement supertest tests with a minimal harness executed via `node test/...`.
  - If current environment is unknown, keep plan to add `"test": "node test/todos.list.test.js"` and write the test file accordingly.

## 6. QA Sequence
Manual QA
1) Start server: `npm install`, `npm start`.
2) Login with valid user.
3) Navigate to main list view (existing landing page):
- Verify todos render from API (Scenario 1).
4) Empty state:
- Use a user with no todos (or delete all todos for the user) -> verify empty-state message shown (Scenario 2).
5) API error handling:
- Temporarily stop server or simulate non-OK response -> verify UI shows error state and does not crash (Scenario 3).
6) API response validation:
- Temporarily corrupt one todo in `todos.json` for logged-in user (remove `title` or `id`) -> verify UI shows invalid response error state (Scenario 4).

Automated QA
- Run: `npm test`
- Ensure all list endpoint tests pass.

## 7. Risks / Mitigations
- Risk: Persisted `todos.json` data may not match required fields (dueDate optional, legacy entries).
  - Mitigation: Client-side validation should allow optional fields but enforce required fields only.
- Risk: Tests that modify JSON files can be flaky if not properly restored.
  - Mitigation: In tests, snapshot original `users.json`, `todos.json`, `sessions.json` contents and restore in `afterAll/afterEach`.
- Risk: UI currently uses `alert()` for some error paths.
  - Mitigation: Replace list-fetch errors with non-blocking inline error rendering to meet "does not crash" acceptance criteria.

## 8. Acceptance Criteria (Gherkin) mapping
Scenario 1: List view displays ToDo items from API
- Backend: `GET /todos` returns authenticated user's items -> todoServer.js
- Frontend: `fetchAndRenderTodos()` calls API and `renderTodos()` renders each item -> public/script.js

Scenario 2: Empty state when no ToDo items
- Backend: `GET /todos` returns `[]` -> todoServer.js
- Frontend: `renderTodos([])` shows empty-state message -> public/script.js (+ optional styling in public/styles.css)

Scenario 3: API error handling
- Frontend: handle `!resp.ok` and network errors by rendering `.error-state` without throwing -> public/script.js, public/styles.css

Scenario 4: API response validation
- Frontend: validate response is array and items contain required fields; invalid -> `.error-state` -> public/script.js

## 9. Handoff Summary
- Primary endpoints and UI entry points:
  - API: `GET /todos` (requires Authorization token)
  - UI: `public/script.js` -> `fetchAndRenderTodos()` -> `renderTodos()`
- Deliverables:
  - Robust list fetching with inline empty/error states
  - Response shape validation to prevent rendering malformed payloads
  - Automated API coverage for list endpoint
- Out of scope confirmed: create/update/delete behavior changes, new filtering features, or data model extensions.
