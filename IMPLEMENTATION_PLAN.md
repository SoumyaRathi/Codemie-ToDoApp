# ToDoApp - Implementation Plan

## 1. Overview
Add a new UI sort option, "Sort by due date", to the todos list controls. Selecting it must sort todos by earliest due date first. Sorting must be deterministic for todos with no due date and stable when multiple todos share the same due date. Sorting must handle empty lists and invalid/missing dueDate values without breaking.

Note: The backend already supports sort=dueDate and dueDate validation/parsing. This story focuses on exposing the option in the UI and ensuring stable/deterministic behavior end-to-end.

## 2. Inputs & Traceability
- Story key: KAN-138
- Story title: Add "Sort by due date" option in todos list UI
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-138

## 3. Planned File Edits (real repo paths only)
- index.html
  - Add a new option under the sort select for due date.
- public/script.js
  - Ensure sort select supports "dueDate" value and that it is passed to the API as sort=dueDate.
  - Add a UI-side defensive sorting fallback (stable + deterministic) for dueDate in case backend behavior changes or legacy data contains invalid dueDate.
- public/styles.css
  - No planned changes; only adjust if layout needs it after adding the option.

## 4. Work Breakdown (outcome mapped to real files)
- Add "Sort by Due Date" option to sort dropdown -> index.html
- Wire dropdown value to existing state currentSort and API query param sort=dueDate -> public/script.js
- Stability/determinism and negative-data handling -> public/script.js
  - Treat missing/empty/invalid dueDate as "no due date" bucket.
  - Ensure stable ordering for same dueDate (tie-breaker) and deterministic ordering for no-dueDate items.

## 5. Implementation Sequence
1. index.html
   - Add a new <option> under the existing sort dropdown:
     - value="dueDate"
     - label "Sort by Due Date"
2. public/script.js
   - Confirm existing listener on #sort-select sets currentSort and calls fetchAndRenderTodos().
   - Confirm fetchAndRenderTodos() includes &sort=${currentSort} in the request URL.
   - Add client-side fallback sorting when currentSort === "dueDate":
     - Implement a safe dueDate validator for YYYY-MM-DD.
     - Comparator rules:
       - Valid dueDate sorts before missing/invalid dueDate.
       - Earlier dueDate first (lexicographic compare works for YYYY-MM-DD).
       - Tie-breaker: original list index (stable) OR id ascending (deterministic).
     - Apply fallback sort right before rendering (e.g., in renderTodos(data)) so it covers both initial load and later refreshes.
3. Verify empty list path remains unchanged (renderTodos already shows "No todos found.").

## 6. QA Sequence
Manual QA (local):
1. Run: npm install, npm start
2. Login/register.
3. Create/seed todos:
   - At least 2-3 todos with dueDate values (YYYY-MM-DD), including different dates.
   - At least 2 todos without dueDate.
   - (Optional legacy/negative) Manually edit todos.json to include an invalid dueDate on one item (e.g., "2025-99-99").
4. UI checks:
   - Sort dropdown contains "Sort by Due Date".
   - Selecting it triggers a network request to /todos?...&sort=dueDate.
5. Sorting checks:
   - Earliest dueDate appears first.
   - Todos with no dueDate appear last and keep consistent ordering across refresh.
   - Todos with same dueDate remain stable (no jitter) across refresh.
6. Negative checks:
   - Empty list still shows "No todos found.".
   - Invalid dueDate values do not crash the UI and are treated as missing.

## 7. Risks / Mitigations
- Risk: Backend sorting changes or regression could break UI expectations.
  - Mitigation: Client-side dueDate fallback sorting when selected.
- Risk: Legacy todos.json contains invalid dueDate values.
  - Mitigation: Validate dueDate before comparing; treat invalid as missing.
- Risk: JS engine sort stability differences.
  - Mitigation: Include stable tie-breaker using original index in fallback comparator.

## 8. Acceptance Criteria (Gherkin) mapping
- Sort option is available
  - index.html: add new option in #sort-select.
- Sorting orders by earliest due date first
  - public/script.js: pass sort=dueDate; optional UI fallback comparator.
- Deterministic placement of items with no due date
  - public/script.js: comparator groups missing/invalid dueDate last with deterministic tie-break.
- Sorting is stable for same due date (boundary)
  - public/script.js: tie-break by original index (stable) or id.
- Handles empty list (negative)
  - public/script.js: renderTodos empty-state remains.
- Invalid/missing due date values do not break sorting (negative)
  - public/script.js: validate dueDate; treat invalid as missing.

## 9. Handoff Summary
- UI: Adds one new sort option "Sort by Due Date".
- Behavior: End-to-end dueDate sorting uses existing API and includes client-side fallback for stability/determinism.
- No production code beyond minimal UI wiring and safe fallback comparator.
- QA: Manual verification steps included for normal, boundary, and negative scenarios.
