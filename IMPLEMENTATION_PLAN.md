# ToDoApp - Implementation Plan

## 1. Overview

This plan implements KAN-146 by adding a new UI sort option "Sort by Due Date" for the todos list.

Backend support for `GET /todos?sort=dueDate` already exists in `todoServer.js`. The planned work is to expose the option in the UI and verify/adjust the backend comparator to strictly meet acceptance criteria:
- Earliest due date first
- Todos with missing due date last
- Invalid due date values treated as missing
- Stable ordering for equal due dates and deterministic ordering when all due dates are missing
- Switching away from due date sort restores other sort behavior

## 2. Inputs & Traceability (Story key and URL)

- Story key: KAN-146
- Story title: Add "Sort by due date" option in ToDo list UI
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-146

## 3. Planned File Edits (real repo paths only)

- index.html
  - Add "Sort by Due Date" option to the sort dropdown
- public/script.js
  - Ensure selecting the new option sets `currentSort = "dueDate"` and triggers refetch
  - Ensure the existing feedback banner correctly displays the selected label
- todoServer.js
  - Verify `sort=dueDate` comparator meets AC (stable ordering and invalid-date-as-missing)
  - Adjust comparator only if needed
- README.md (optional)
  - Document that due date sort is available

## 4. Work Breakdown (outcome mapped to real files)

1) Add UI option for due date sort
- Outcome: User can pick "Sort by Due Date" from the sort dropdown
- Files:
  - index.html

2) Wire UI option into existing fetch flow
- Outcome: Selecting due date sort triggers `/todos?...&sort=dueDate`
- Files:
  - public/script.js

3) Ensure server-side ordering semantics are correct
- Outcome: API response is sorted by due date ascending, missing/invalid last, stable ties
- Files:
  - todoServer.js

4) Regression verification for existing sort/filter/search
- Outcome: Existing sort options still work and remain unchanged
- Files:
  - public/script.js
  - todoServer.js

## 5. Implementation Sequence

1. Update UI dropdown
- Edit `index.html` and add an `<option value="dueDate">Sort by Due Date</option>` in the existing sort select.

2. UI wiring verification
- Confirm in `public/script.js`:
  - `document.getElementById('sort-select').onchange` sets `currentSort = e.target.value`.
  - `fetchAndRenderTodos()` includes `sort=${currentSort}`.
- No logic changes expected; only ensure the new option value matches backend: `dueDate`.

3. Server comparator verification / hardening
- Review `todoServer.js` in the `if (sort === 'dueDate')` branch.
- Ensure acceptance criteria are met:
  - Earliest due date first: compare valid dueDate strings lexicographically (YYYY-MM-DD) or by parsed date.
  - Missing dueDate last.
  - Invalid dueDate treated as missing (for legacy data already in todos.json).
  - Stable ordering for same due date and deterministic when all missing.

If the current implementation uses `id` as tie-breaker and that is considered not "stable relative order", adjust using a stable-sort strategy:
- Decorate: map each todo to `{ todo, idx }` where `idx` is the original index from the filtered list.
- Sort by:
  - validDueDate flag (valid first)
  - dueDate ascending
  - idx ascending
- Undecorate back to todos.

4. Optional documentation update
- If needed, update `README.md` to mention due date sort.

## 6. QA Sequence

Manual UI checks:
1. Login and confirm the sort dropdown shows "Sort by Due Date".
2. Select "Sort by Due Date" and verify visible ordering:
   - Earliest due date first.
   - Todos with no due date are after those with due date.
3. Switch to other sorts (Created, Updated, Title) and confirm expected behavior resumes.

API checks:
- Call `GET /todos?sort=dueDate` with Authorization header and verify ordering.

Edge cases:
- Same due date:
  - Create/edit multiple todos with identical dueDate and confirm their relative order is stable.
- All missing due dates:
  - Ensure the list order does not jitter across refreshes.
- Invalid dueDate (simulate by manually editing `todos.json` for one record):
  - Confirm it is treated as missing and placed last; no crash.
- Empty list:
  - Ensure UI shows "No todos found." and no errors when choosing due date sort.

## 7. Risks / Mitigations

- Risk: "Stable ordering" requirement conflicts with current tie-breaker (id-based) and may not reflect "relative order".
  - Mitigation: Implement stable sort using original index tie-breaker for `sort=dueDate` on the server.

- Risk: Invalid dueDate values in persisted JSON cause incorrect comparisons.
  - Mitigation: Treat any non-YYYY-MM-DD or non-real date as missing for sorting purposes.

- Risk: UI option value does not match server sort key.
  - Mitigation: Use `value="dueDate"` exactly and verify network request includes `sort=dueDate`.

## 8. Acceptance Criteria (Gherkin) mapping

- Given I am on the todos list page
  When I open the sort dropdown
  Then I should see an option "Sort by due date"
  - index.html

- Given I have todos with due dates
  When I select "Sort by due date"
  Then the todos should be ordered from earliest due date to latest due date
  - todoServer.js (GET /todos sorting)
  - public/script.js (passes sort param)

- Given I have some todos without a due date
  When I select "Sort by due date"
  Then todos without a due date should appear after todos with a due date
  - todoServer.js

- Given I have multiple todos with the same due date
  When I sort by due date
  Then those todos should keep their relative order
  - todoServer.js (stable tie-break by original index)

- Given all todos have no due date
  When I sort by due date
  Then the ordering should be deterministic
  - todoServer.js (stable tie-break by original index)

- Given I previously selected "Sort by due date"
  When I change the sort back to another option
  Then the list should follow that selected sort behavior
  - public/script.js

- Given a todo has an invalid due date value
  When I sort by due date
  Then it should be treated as if it has no due date
  - todoServer.js

## 9. Handoff Summary

- UI: Add "Sort by Due Date" to the existing sort dropdown in `index.html`.
- Client: Ensure the existing sort-select onchange flow fetches `/todos?sort=dueDate`.
- Server: Verify or update dueDate sorting to be stable and to treat invalid due dates as missing.
- QA: Validate ordering rules, stability/determinism, and regress existing sorts/filters/search.
