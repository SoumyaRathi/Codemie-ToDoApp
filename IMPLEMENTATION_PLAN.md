# ToDoApp - Implementation Plan

## 1. Overview

Add a new UI sort option "Sort by due date" to the todos list controls. The backend already supports GET /todos?sort=dueDate and implements deterministic ordering for missing due dates and ties; this change exposes the option in the UI and ensures it is wired end-to-end without breaking existing sorting, filtering, or empty-list states.

## 2. Inputs & Traceability (Story key and URL)

- Story key: KAN-138
- Story title: Add "Sort by due date" option in todos list UI
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-138

## 3. Planned File Edits (real repo paths only)

- index.html -> add a new option to the existing sort dropdown (#sort-select) for due date.
- public/script.js -> ensure the new option value sets currentSort to dueDate and triggers a refresh (already handled by existing onchange, but verify and keep deterministic behavior if any client-side fallback sorting exists).
- todoServer.js -> no functional change expected (already supports sort=dueDate); verify comparator meets AC for stability, undated placement, and invalid/missing values not breaking sorting.

## 4. Work Breakdown (outcome mapped to real files)

- Add "Sort by Due date" option in UI -> index.html
- Wire option to API query /todos?sort=dueDate -> public/script.js
- Confirm deterministic and stable ordering requirements are met via backend response ordering -> todoServer.js (verification only)
- Confirm empty list is handled gracefully (no UI errors) -> public/script.js (renderTodos already shows empty-state)

## 5. Implementation Sequence

1. UI: add sort option
   - In index.html, locate the existing sort dropdown (contains "Sort by Created", "Sort by Updated", "Sort by Title").
   - Add a new option: <option value="dueDate">Sort by Due date</option>.
   - Keep labels ASCII-only and consistent with existing copy (capitalize as desired, but keep value exactly dueDate).

2. JS wiring: verify select -> state -> fetch
   - In public/script.js, confirm document.getElementById('sort-select').onchange sets currentSort to the selected value and calls fetchAndRenderTodos().
   - Confirm fetchAndRenderTodos() builds URL containing sort=${currentSort}. No change expected beyond ensuring dueDate is accepted.
   - Confirm the filter/sort feedback banner uses the selected option text; no change needed unless copy must match AC wording.

3. Sorting behavior verification (server already sorts)
   - In todoServer.js under GET /todos, verify existing sort === 'dueDate' comparator:
     - Earliest due date first: compares YYYY-MM-DD strings (lexicographically safe for ISO date) -> ascending.
     - Items with no due date: placed after dated items.
     - Stable boundary for same due date: breaks ties by id (deterministic).
     - Invalid/missing due date values: confirm they will be treated as "no due date" or will not exist because backend validates inputs on create/update.
   - If legacy data can contain non-string dueDate, harden comparator in implementation phase (treat invalid as missing). Do not do production refactors in this phase.

## 6. QA Sequence

- Sort option available
  - Login -> verify sort dropdown contains "Sort by Due date".

- Earliest due date first
  - Create or seed multiple todos with different due dates.
  - Select "Sort by Due date" -> verify UI order matches ascending due date (earliest at top/first card).

- Deterministic placement of items with no due date
  - Ensure some todos have no dueDate.
  - Select "Sort by Due date" -> verify undated todos appear after all dated todos and ordering among them is deterministic.

- Stable sorting for same due date (boundary)
  - Create two todos with the same due date.
  - Select "Sort by Due date" multiple times / refresh -> verify their relative order remains consistent (tie-breaker by id from backend).

- Handles empty list (negative)
  - Use a user account with 0 todos (or delete all) -> select "Sort by Due date" -> verify empty-state "No todos found." and no errors.

- Invalid/missing due date values do not break sorting (negative)
  - Confirm UI does not crash if backend returns todos without dueDate (expected) -> sort still works.
  - If possible (manual file edit in todos.json in local dev only), introduce a todo with malformed dueDate and verify selecting sort does not crash the UI (backend may still sort but should not throw; document outcome).

## 7. Risks / Mitigations

- Copy mismatch: UI label might differ from AC wording.
  - Mitigation: keep label close to "Sort by due date" while matching existing pattern ("Sort by Due date").

- Legacy malformed dueDate in data file: backend comparator assumes comparable values when dueDate exists.
  - Mitigation: during implementation, guard with typeof dueDate === 'string' and basic regex before comparing; treat invalid as missing.

- Assuming stable sort: JS sort stability varies, but sorting is performed server-side, and server tie-breaks by id, so UI remains deterministic.
  - Mitigation: rely on server ordering; do not re-sort client-side for dueDate.

## 8. Acceptance Criteria (Gherkin) mapping

- Sort option is available -> index.html adds option value="dueDate"
- Sorting orders by earliest due date first -> todoServer.js existing sort comparator; UI uses sort=dueDate
- Deterministic placement of items with no due date -> todoServer.js comparator puts missing dueDate last; UI displays in server order
- Sorting is stable for same due date (boundary) -> todoServer.js tie-breaker by id; UI refreshes keep same order
- Handles empty list (negative) -> public/script.js renderTodos empty-state remains correct when sort changes
- Invalid/missing due date values do not break sorting (negative) -> UI handles missing dueDate; backend validation prevents invalid dueDate on writes; optionally harden comparator if legacy data exists

## 9. Handoff Summary

- User-visible change: a new dropdown option to sort todos by due date.
- Integration: reuses existing backend /todos?sort=dueDate; no new endpoints.
- Determinism/stability: ensured by backend ordering and id tie-breaker; UI should not apply additional client-side dueDate sorting.
