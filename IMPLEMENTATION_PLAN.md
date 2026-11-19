# ToDoApp - Implementation Plan

## 1. Overview
Implement KAN-151 by adding a "Sort by Due Date" option in the Todos UI. Selecting it must sort todos by dueDate ascending, place undated todos after dated todos, maintain stable ordering when due dates are equal, and apply without a full page refresh.

## 2. Inputs & Traceability (Story key and URL)
- Story key: KAN-151
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-151
- Story title: Add "Sort by due date" option in Todos UI

## 3. Planned File Edits (real repo paths only)
- index.html
  - Add a new option to the existing sort dropdown: value "dueDate" with label "Sort by Due Date".
- public/script.js
  - Ensure selecting the new sort option sets currentSort to "dueDate" and reuses existing fetchAndRenderTodos() flow.
  - (Optional) Render due date in each todo card when available so users can verify the sort visually.
- todoServer.js
  - Confirm GET /todos supports sort=dueDate and enforces ordering rules: dueDate ascending, undated last, deterministic ties.
- README.md (optional)
  - Document the new sort behavior.

## 4. Work Breakdown (outcome mapped to real files)
- Add "Sort by Due Date" option in UI -> index.html
- Ensure UI sort selection triggers a re-fetch and re-render -> public/script.js
- Implement/verify back-end dueDate sort comparator behavior -> todoServer.js
- Optional: show dueDate on todo cards -> public/script.js (and public/styles.css only if needed)
- Optional: update docs -> README.md

## 5. Implementation Sequence
1. UI change: add sort dropdown option
   - index.html
     - Add a new <option value="dueDate">Sort by Due Date</option> in the existing sort select.

2. Front-end wiring: reuse existing sort mechanics
   - public/script.js
     - Verify #sort-select onchange already sets currentSort and calls fetchAndRenderTodos().
     - Since fetchAndRenderTodos() already passes &sort=${currentSort}, no further changes should be required for the request.
     - Verify the banner/feedback text uses selected option text (it does), so adding the option should make feedback correct.

3. Back-end behavior: dueDate sorting
   - todoServer.js
     - In GET /todos handler, ensure sort === "dueDate" sorts as follows:
       - If both have dueDate: compare ascending by dueDate (YYYY-MM-DD lexical compare).
       - If only one has dueDate: the one with dueDate comes first.
       - If both missing dueDate: keep deterministic order via id ascending.
       - If both have same dueDate: tie-break by id ascending for stable ordering.

4. Optional UX improvement: show due date on todo cards
   - public/script.js
     - In renderTodos(), add a small line such as "Due: YYYY-MM-DD" when element.dueDate exists.
   - public/styles.css
     - Only if needed, add minimal styling for the due date line.

5. Optional documentation
   - README.md
     - Add a bullet under Features: "Sort by Due Date".

## 6. QA Sequence
- Auth smoke test
  - Login, ensure todos load.

- Sort by Due Date behavior
  - Create/edit a few todos so that:
    - At least two todos have dueDate (different dates).
    - At least one todo has no dueDate.
  - Select "Sort by Due Date".
  - Verify:
    - Todos with dueDate come first.
    - They are ordered ascending (earliest first).
    - Todos without dueDate appear after all dated todos.

- Stable ordering
  - Ensure two todos share the same dueDate.
  - Verify their relative order remains stable across repeated fetches and across filter/search changes.

- No refresh requirement
  - Change sort selection and confirm list updates immediately (triggered by JS, may involve a network request).

- Regression
  - Verify existing sorts (Created/Updated/Title) still work.
  - Verify filter (All/Active/Completed) and search still work with sort=dueDate.

## 7. Risks / Mitigations
- Risk: Many existing todos may not have dueDate so sort effect is subtle.
  - Mitigation: Undated go last; optionally display dueDate in UI.

- Risk: Comparator stability differs between JS engines if no tie-breaker.
  - Mitigation: Always include id tie-breaker when dueDate is equal or missing.

- Risk: Incorrect dueDate formats break sorting.
  - Mitigation: Keep server-side validation (YYYY-MM-DD) and compare as strings.

## 8. Acceptance Criteria (Gherkin) mapping
- AC: Sort control is available
  - index.html (new dropdown option), public/script.js (existing onchange wiring)

- AC: Sort by due date ascending
  - todoServer.js (GET /todos sort=dueDate comparator)

- AC: Undated todos are placed after dated todos
  - todoServer.js (comparator branch for missing dueDate)

- AC: Stable ordering for identical due dates
  - todoServer.js (tie-breaker by id ascending)

- AC: Sorting applies without page refresh
  - public/script.js (#sort-select onchange calls fetchAndRenderTodos())

- AC: Sort option disabled/hidden when due date is not available
  - Note: dueDate is an optional field already supported by the API. If the UI must enforce this, add a check after fetchAndRenderTodos() to disable/hide the option when no returned todos have dueDate. Otherwise, leave enabled.

## 9. Handoff Summary
- Adds "Sort by Due Date" to the sort dropdown.
- Reuses current fetch-and-render approach (no full refresh).
- Confirms server-side ordering rules: dueDate ascending, undated last, stable tie ordering.
- QA validates ordering, stability, and regressions for existing sort/filter/search.
