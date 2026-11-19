# ToDoApp - Implementation Plan

## 1. Overview
This plan implements KAN-149: add a UI option to sort todos by due date.

Key design points:
- Use existing backend support: GET /todos already accepts sort=dueDate.
- Sorting behavior is server-driven (no client-side sorting).
- Expected ordering for sort=dueDate:
  - Earliest due date first (ascending)
  - Todos without dueDate appear after all dated todos
  - Deterministic ordering for ties and for missing dueDate (tie-break by id)

NOTE: This phase is planning only. Do not implement production code yet.

## 2. Inputs & Traceability (Story key and URL)
- Story key: KAN-149
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-149
- Story summary: Add "Sort by due date" option in Todos UI

## 3. Planned File Edits (real repo paths only)
- index.html
  - Add "Sort by Due Date" option in the sort dropdown with value "dueDate".
- public/script.js
  - Ensure the sort dropdown change handler supports the new value (no special-case code expected).
  - Ensure filter/sort feedback banner shows the correct selected label.
- README.md (optional)
  - Update user documentation to mention the new sort option.

## 4. Work Breakdown (outcome mapped to real files)
- Add the sort option control in UI -> index.html
- Wire UI selection to existing fetch flow -> public/script.js
- Validate backend behavior aligns with acceptance criteria (review only) -> todoServer.js
- Update docs / QA notes -> README.md (optional)

## 5. Implementation Sequence
1. Confirm current behavior and API contract
   - Review todoServer.js GET /todos handler.
   - Verify the supported sort keys include dueDate.
   - Verify comparator behavior for dueDate:
     - both dueDate present -> compare as YYYY-MM-DD strings (lexicographic works)
     - one missing -> missing sorts last
     - both missing or same date -> compare by id

2. UI change: add "Sort by Due Date" option
   - File: index.html
   - Add an option to the existing sort select control:
     - value: dueDate
     - label: Sort by Due Date
   - Ensure placement is consistent with other options.

3. Client wiring: no new endpoint, reuse existing query param
   - File: public/script.js
   - Verify currentSort can be set to "dueDate" via sort-select onchange.
   - Verify fetchAndRenderTodos composes URL with sort=<currentSort>.
   - Verify clear-filters resets sort to createdAt (existing behavior) and does not break.
   - Verify updateFilterSortFeedback shows the selected option text.

4. (Optional) Documentation update
   - File: README.md
   - Mention the new sort option in the "Usage" or "Search/Filter/Sort" section.

## 6. QA Sequence
Manual QA (browser):
1. Login and baseline
   - Login with valid credentials.
   - Confirm todos list loads and other sort options still work.

2. UI presence
   - Confirm "Sort by Due Date" appears in the Sort dropdown.

3. Sorting correctness (core)
   - Prepare test data (at least 4 todos):
     - Todo A: dueDate = 2026-01-01
     - Todo B: dueDate = 2026-01-10
     - Todo C: dueDate missing
     - Todo D: dueDate missing
   - Select "Sort by Due Date".
   - Verify ordering:
     - A appears before B
     - C and D appear after A and B
   - Refresh the page and confirm ordering remains stable (deterministic).

4. Switching sort
   - Switch between Created, Updated, Title, Due Date.
   - Confirm no todos disappear and list count remains the same.

5. Resilience / malformed due dates
   - Server prevents malformed dueDate via API, but legacy data may exist.
   - For resilience testing only, inject a malformed dueDate into todos.json and confirm:
     - UI still loads
     - sorting by dueDate does not crash the server
     - ordering is stable (document observed behavior)

## 7. Risks / Mitigations
- Risk: UI option value does not match backend sort key.
  - Mitigation: Use exact value "dueDate".

- Risk: Deterministic ordering differs from acceptance criteria.
  - Mitigation: Confirm server comparator behavior during QA and keep it stable.

- Risk: Malformed dueDate values in stored JSON produce unexpected ordering.
  - Mitigation: Add a follow-up hardening task if needed: normalize/ignore invalid dueDate during sort.

## 8. Acceptance Criteria (Gherkin) mapping
- AC: Sorting option is visible
  - Implementation: index.html adds the "Sort by Due Date" option.
  - QA: Verify option exists in dropdown.

- AC: Sort by due date orders earliest first
  - Implementation: public/script.js passes sort=dueDate to GET /todos.
  - QA: Create dated todos and confirm ascending order.

- AC: Items with no due date are placed after dated items
  - Implementation: rely on existing comparator in todoServer.js.
  - QA: Mix dated and undated todos.

- AC: Deterministic ordering among items with no due date
  - Implementation: server tie-break uses id.
  - QA: Confirm stable ordering across refreshes.

- AC: Sorting can be changed without losing items
  - Implementation: existing fetchAndRenderTodos and renderTodos.
  - QA: Switch sort values and confirm consistent item count.

- AC: Sorting gracefully handles invalid/malformed due dates
  - Implementation: server validation prevents creation/update with invalid dueDate; for legacy malformed stored values, verify no crash.
  - QA: Manual injection test (non-production) + verify UI still functions.

## 9. Handoff Summary
- The backend already supports sort=dueDate; the change is primarily adding a UI dropdown option and ensuring the selection flows through to the existing GET /todos query.
- QA focus: ordering rules (dated asc, missing last, deterministic ties) and regressions for other sort options.
- No production code should be written in this phase; this plan is ready for Phase 4 implementation.
