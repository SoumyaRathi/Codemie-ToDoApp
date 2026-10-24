# ToDoApp - Implementation Plan

## 1. Overview

Add a new UI sort option, "Sort by due date", to the todos list controls. Selecting it must sort todos by earliest due date first. Todos without due dates must appear after all todos with due dates. Sorting must be deterministic for ties and for items without due dates. Sorting must not interfere with completing or deleting todos from the list.

Repo note: Backend already supports sort=dueDate in GET /todos (todoServer.js). This story primarily surfaces the option in the UI and adds a small defensive client-side tie-breaker to guarantee deterministic ordering.

## 2. Inputs & Traceability (Story key and URL)

- Story: KAN-142 - Add "Sort by due date" option in ToDo UI
- URL: https://soumyarathi57.atlassian.net/browse/KAN-142

## 3. Planned File Edits (real repo paths only)

- index.html - Add "Sort by Due Date" option to the sort dropdown.
- public/script.js - Ensure UI sends sort=dueDate; optionally add client-side defensive sorting when selected for deterministic behavior.
- todoServer.js - No functional changes expected (already supports sort=dueDate); verify behavior matches acceptance criteria; only adjust if mismatch is found during QA.
- public/styles.css - No change expected (only if layout requires it).

## 4. Work Breakdown (outcome mapped to real files)

- Add new sort option in UI -> index.html
- Wire new option value to existing state/query parameter (currentSort -> sort=dueDate) -> public/script.js
- Deterministic/stable ordering safeguards -> public/script.js
  - When currentSort == "dueDate", apply comparator that:
    - Sorts valid due dates (YYYY-MM-DD) earliest -> latest
    - Places missing/invalid due dates last
    - Uses a deterministic tie-breaker when due dates are equal or both missing (e.g., id ascending)
- Keep list actions working (complete/delete) while sorted -> public/script.js (no changes expected; validate)

## 5. Implementation Sequence

1. Update index.html:
   - Add new <option value="dueDate">Sort by Due Date</option> in the existing #sort-select.
2. Update public/script.js:
   - Confirm #sort-select onchange already sets currentSort and calls fetchAndRenderTodos().
   - Confirm fetchAndRenderTodos() includes &sort=${currentSort} so selecting due date results in sort=dueDate.
   - Add optional defensive client-side sorting (future-proof):
     - In renderTodos(data) before rendering (or in the .then(renderTodos) chain), if currentSort == "dueDate", sort a copy of data using the acceptance criteria rules.
     - Validation for "valid dueDate": string matches ^\d{4}-\d{2}-\d{2}$. Do not parse with Date unless validated (avoid NaN/locale pitfalls).
     - Comparison: for YYYY-MM-DD, lexicographic compare works.
     - Ties: use id ascending (deterministic) to satisfy stable/deterministic expectations.
3. Backend verification only (no planned code change):
   - Verify todoServer.js already sorts by dueDate with "missing last" and deterministic tie-breakers.

## 6. QA Sequence

1. Start the app:
   - npm install
   - npm start
   - Open http://localhost:3000
2. Data setup for testing:
   - Create at least 5 todos for the same user with a mixture of dueDate present and absent.
   - Ensure at least two todos share the same dueDate.
   - Optional negative data: manually insert an invalid dueDate into todos.json (e.g., "2025-13-40") to confirm UI does not crash and the item is treated as "no due date".
3. Functional checks:
   - Verify sort dropdown includes "Sort by Due Date".
   - Select it and confirm network request to GET /todos includes sort=dueDate.
   - Verify ordering: earliest due date first; items without due date last.
   - Verify ties: items with same due date appear in deterministic order (e.g., id ascending) across refresh.
   - Verify items with no due date have deterministic order across refresh.
4. Regression checks:
   - Switch between different sort options (Created/Updated/Title/Due Date) and confirm behavior restores correctly.
   - While sorted by due date, mark a todo complete/active and delete a todo; confirm the actions succeed and list refresh still sorted.
   - Empty list still shows "No todos found." and no console errors.

## 7. Risks / Mitigations

- Risk: Existing data may contain missing or invalid dueDate fields. -> Mitigation: UI comparator treats invalid/missing dueDate as "no due date" and places at end; do not parse invalid dates.
- Risk: JS array sort stability can vary. -> Mitigation: explicit tie-breaker by id to guarantee deterministic ordering.
- Risk: Backend behavior might diverge (future refactor). -> Mitigation: defensive UI sorting when due date sort selected (keeps UX consistent).

## 8. Acceptance Criteria (Gherkin) mapping

- Sort option "Due date" is available in the ToDo list UI -> index.html add option in #sort-select.
- Selecting "Due date" sorts todos by earliest due date first -> public/script.js sends sort=dueDate and optional UI comparator enforces order.
- Todos without due dates appear after all todos with due dates -> public/script.js comparator rule; verify backend behavior in todoServer.js.
- Sorting is stable/deterministic when due dates are equal -> tie-breaker by id in UI comparator; backend already uses id.
- Sorting is stable/deterministic when both todos have no due date -> tie-breaker by id for missing/invalid due dates.
- Switching away from "Due date" restores other sort behavior without regression -> ensure currentSort continues to drive API param and no sticky comparator for other modes.
- Sorting does not prevent completing a todo from the list -> validate toggleComplete() works while sorted.
- Sorting does not prevent deleting a todo from the list -> validate confirmDelete() works while sorted.
- When due date data is missing/null in payload, UI does not error and places item at end -> comparator treats missing/invalid as "no due date" bucket.

## 9. Handoff Summary

- Add 1 new sort dropdown option and ensure it maps to sort=dueDate.
- Optional client-side deterministic sort for due dates to guarantee acceptance criteria even with unexpected backend data.
- Manual QA checklist provided.
