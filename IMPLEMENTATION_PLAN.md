# ToDoApp - Implementation Plan

## 1. Overview
Implement KAN-144 by adding a new UI sort option, "Sort by Due Date", to the Todos list sort dropdown. When selected, the UI must request todos sorted by due date (earliest first). Todos without due dates must appear after todos with due dates. Sorting must be deterministic for ties and the selection must persist while staying on the list page.

Repo note: Backend already supports `GET /todos?sort=dueDate` with missing-last behavior and deterministic tie-breaking. This story primarily surfaces the option in the UI (no production feature changes beyond UI wiring).

## 2. Inputs & Traceability (Story key and URL)
- Story: KAN-144 - Add "Sort by due date" option in Todos UI
- URL: https://soumyarathi57.atlassian.net/browse/KAN-144

## 3. Planned File Edits (real repo paths only)
- index.html
  - Add a new option to the existing sort dropdown: `value="dueDate"` with label "Sort by Due Date".
- public/script.js
  - Confirm dropdown change sets `currentSort` to `dueDate` and triggers `fetchAndRenderTodos()`, which calls `GET /todos?sort=dueDate`.
- todoServer.js
  - No planned changes (already supports `sort=dueDate`); verify comparator behavior matches acceptance criteria.

## 4. Work Breakdown (outcome mapped to real files)
- Expose "Sort by Due Date" in sort dropdown -> index.html
- Trigger fetch and re-render on sort selection change -> public/script.js (`#sort-select onchange`)
- Ensure API query param uses new sort key -> public/script.js (fetchAndRenderTodos URL builder)
- Deterministic ordering and missing-last behavior -> verification in todoServer.js (tie-breaker by id; missing dueDate last)

## 5. Implementation Sequence
1. index.html
   - Locate the existing sort dropdown (select with `id="sort-select"`).
   - Add: `<option value="dueDate">Sort by Due Date</option>`.
   - Keep existing default selection as-is (currently `createdAt`).

2. public/script.js
   - Confirm handler: `document.getElementById('sort-select').onchange` sets `currentSort` and calls `fetchAndRenderTodos()`.
   - Confirm `fetchAndRenderTodos()` includes `&sort=${currentSort}` in request URL.
   - No client-side re-sorting required (server already returns sorted list for `sort=dueDate`).

3. todoServer.js (verification only)
   - Verify `sort === 'dueDate'` comparator:
     - Orders by dueDate ascending (earliest first).
     - Places todos with missing dueDate after all todos with dueDate.
     - Uses deterministic tie-breaker (id ascending) for equal due dates and for both-missing cases.

## 6. QA Sequence
1. Local run
   - npm install
   - npm start
   - Open http://localhost:3000

2. Prepare test data with due dates
   - Option A (recommended): Use API calls to create/update todos with `dueDate` in `YYYY-MM-DD` format.
   - Option B: Temporarily edit `todos.json` locally to add `dueDate` fields for QA only.

3. UI validation
   - Login.
   - Open sort dropdown -> verify "Sort by Due Date" is present.
   - Select it -> confirm list refreshes immediately and network request contains `sort=dueDate`.
   - Verify ordering: earliest due date first.
   - Verify todos without due dates appear after those with due dates.
   - Verify deterministic ordering for identical due dates by refreshing / re-selecting the sort option.

4. Regression checks
   - Switch back to other sort modes (Created, Updated, Title) and confirm they still work.
   - Empty list: apply "Sort by Due Date" and ensure empty-state renders without errors.

## 7. Risks / Mitigations
- Risk: Many todos may not have dueDate, making it appear that sorting "does nothing".
  - Mitigation: QA with mixed data; ensure missing-last behavior is correct.
- Risk: Users may expect due date visibility in the UI cards, but this story is only about sorting.
  - Mitigation: Keep scope strictly to sort option per KAN-144.
- Risk: Legacy/malformed dueDate values (manual edits) could cause inconsistent ordering.
  - Mitigation: Backend validates dueDate on create/update; for falsy values, comparator treats as missing and sorts last.

## 8. Acceptance Criteria (Gherkin) mapping
- User can choose "Sort by due date" in the todos list UI
  - index.html: add option in `#sort-select`.
- Sorting by due date orders earliest due date first
  - public/script.js: send `sort=dueDate`.
  - todoServer.js: dueDate comparator sorts ascending.
- Todos without due dates appear after todos with due dates
  - todoServer.js: missing dueDate sorted last.
- Sorting by due date is stable for identical due dates
  - todoServer.js: tie-breaker by id ascending.
- Sorting selection persists while staying on the list page
  - public/script.js: `currentSort` retains selection until page reload/navigation.
- Selecting another sort option replaces due-date sorting
  - public/script.js: onchange overwrites `currentSort` and refetches.
- Empty list does not error when sorting by due date
  - public/script.js: renderTodos empty-state unchanged.
- Invalid due date values are handled gracefully
  - todoServer.js: validates dueDate on write; missing/falsy values treated as no dueDate in sort.

## 9. Handoff Summary
- UI: Add a new sort dropdown option "Sort by Due Date".
- API: Use existing backend support `GET /todos?sort=dueDate`.
- QA: Verify option presence, ordering rules (ascending + missing-last), determinism for ties, and regressions for other sort modes.
