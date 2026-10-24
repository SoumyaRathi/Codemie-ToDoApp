# ToDoApp - Implementation Plan

## 1. Overview
Add a new UI sort option, "Sort by Due Date", to the ToDo list sort dropdown. Selecting it must sort todos by earliest due date first (ascending). Todos without due dates must appear after all todos with due dates. Sorting must apply immediately (no page refresh) and must be deterministic for ties and items without due dates.

Repo note: Backend already supports sort=dueDate in GET /todos with missing-last and deterministic tie-breaker. This story primarily surfaces the option in the UI; optionally add a defensive client-side comparator to guarantee deterministic ordering even if backend/data changes.

## 2. Inputs & Traceability (Story key and URL)
- Story: KAN-137 - Add "Sort by due date" option to ToDo list UI
- URL: https://soumyarathi57.atlassian.net/browse/KAN-137

## 3. Planned File Edits (real repo paths only)
- index.html - Add "Sort by Due Date" option (value="dueDate") to the existing sort dropdown.
- public/script.js - Ensure UI sends sort=dueDate when selected; optionally add client-side deterministic comparator for due-date sorting.
- todoServer.js - No functional changes planned (already supports sort=dueDate); verify behavior aligns to acceptance criteria.
- public/styles.css - No change expected (only if layout requires minor adjustment).

## 4. Work Breakdown (outcome mapped to real files)
- Expose due-date sort option in UI -> index.html
- Wire dropdown selection to API query param -> public/script.js (currentSort -> fetchAndRenderTodos() -> GET /todos?...&sort=dueDate)
- Immediate application of sorting without refresh -> public/script.js (existing #sort-select onchange calls fetchAndRenderTodos())
- Stable/deterministic ordering for equal due dates and no due dates -> public/script.js (optional defensive sort) and verify todoServer.js comparator

## 5. Implementation Sequence
1. index.html
   - Locate the existing #sort-select options (currently: Created, Updated, Title).
   - Add: <option value="dueDate">Sort by Due Date</option>
2. public/script.js
   - Confirm existing handler: document.getElementById('sort-select').onchange sets currentSort and calls fetchAndRenderTodos().
   - Confirm fetchAndRenderTodos() already includes &sort=${currentSort}.
   - Optional defensive UI sorting (recommended to guarantee deterministic behavior end-to-end):
     - In renderTodos(data), before assigning/rendering, if currentSort === "dueDate" apply comparator that:
       - Sorts by dueDate ascending for valid dueDate strings (YYYY-MM-DD). (Lexicographic compare is correct for this format.)
       - Places missing/invalid dueDate last.
       - Tie-breaker: id ascending (deterministic) when due dates equal OR both missing/invalid.
     - Do not mutate server response unexpectedly for other sort modes; apply only within dueDate mode.
3. todoServer.js verification only
   - Confirm backend comparator for sort=dueDate is ascending, missing-last, and tie-breaks by id.

## 6. QA Sequence
1. Run locally:
   - npm install
   - npm start
   - Open http://localhost:3000
2. Test data setup (single user):
   - Create multiple todos with a mix of dueDate present and absent (if UI does not expose dueDate input, set via API or temporarily edit todos.json).
   - Ensure at least two todos share the same due date.
3. UI checks:
   - Verify "Sort by Due Date" is visible in the sort dropdown and selectable.
   - Select it -> confirm list reorders immediately (no page refresh) and the network call includes sort=dueDate.
   - Verify ordering: earliest due dates first.
   - Verify todos with no due date are at the end.
   - Verify stability: two todos with equal due dates keep deterministic order across repeated fetches (tie-breaker by id).
4. Edge/regression:
   - Empty list remains empty and shows the existing empty-state message.
   - Switch between sort options (Created/Updated/Title/Due Date) and verify each works.
   - While sorted by due date, toggle completion and delete items; verify list refresh remains correctly sorted.

## 7. Risks / Mitigations
- Risk: Some todos may not have dueDate (or might be malformed if manually edited). -> Mitigation: Treat missing/invalid dueDate as "no due date" and place last; avoid unsafe Date parsing unless validated.
- Risk: Non-stable sort behavior assumptions. -> Mitigation: Always apply explicit tie-breaker (id ascending) when dates match or both missing.
- Risk: UI currently does not allow setting dueDate, making QA harder. -> Mitigation: Use API payload (POST /todos with dueDate) or edit todos.json for test data only.

## 8. Acceptance Criteria (Gherkin) mapping
- Sort by due date orders items ascending -> ensure value=dueDate is sent and comparator uses ascending ordering (todoServer.js already does; optional UI comparator mirrors it).
- Todos without due dates are placed last -> backend and optional UI comparator: missing/invalid dueDate last.
- Sorting applies immediately without page refresh -> #sort-select onchange triggers fetchAndRenderTodos().
- Stable ordering for equal due dates -> tie-breaker by id ascending.
- Empty list remains empty -> renderTodos empty-state path unchanged.
- Sort option is visible and selectable -> new dropdown option in index.html.

## 9. Handoff Summary
- UI: add "Sort by Due Date" dropdown option and route selection to sort=dueDate.
- Behavior: ascending due-date sort; missing due dates last; deterministic ordering for ties.
- QA: manual test checklist included; no production code beyond UI wiring and optional safe client-side comparator.
