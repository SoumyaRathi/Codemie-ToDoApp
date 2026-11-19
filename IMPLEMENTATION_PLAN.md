# ToDoApp - Implementation Plan

## 1. Overview

This plan implements Jira story KAN-152: add a UI option to sort the todos list by due date (ascending). Sorting must work without a page refresh, place undated todos after dated todos, keep deterministic ordering for equal due dates, work when all todos have no due date, and keep the chosen sort for the current browser session.

## 2. Inputs & Traceability (Story key and URL)

- Story key: KAN-152
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-152
- Summary: Add "Sort by due date" option in ToDo UI

## 3. Planned File Edits (real repo paths only)

- index.html
- public/script.js
- todoServer.js
- README.md (optional)

## 4. Work Breakdown (outcome mapped to real files)

- Add "Sort by Due Date" to the Sort dropdown -> index.html
- Send sort=dueDate to the server when selected -> public/script.js
- Persist sort selection during the session (sessionStorage) -> public/script.js
- Ensure backend sorting behavior meets rules (asc by dueDate, undated last, stable tie-break) -> todoServer.js
- Document new sort option (optional) -> README.md

## 5. Implementation Sequence

1. UI: add new sort option
   - Update index.html:
     - Locate the existing select control for sort ("Sort by Created", "Sort by Updated", "Sort by Title").
     - Add a new option:
       - value = "dueDate"
       - label = "Sort by Due Date"

2. Front-end: session persistence for sort
   - Update public/script.js:
     - Define a sessionStorage key (example: "todoapp.sort").
     - On DOMContentLoaded, before initial fetchAndRenderTodos():
       - Read sessionStorage.getItem("todoapp.sort").
       - If present and matches an existing option value in #sort-select, set currentSort to it.
       - Set document.getElementById("sort-select").value = currentSort.
     - In the #sort-select onchange handler:
       - After setting currentSort, call sessionStorage.setItem("todoapp.sort", currentSort).
       - Continue to call fetchAndRenderTodos().

3. Front-end: wiring to existing fetch
   - Confirm fetchAndRenderTodos() includes sort=${currentSort} in the query string.
   - Confirm updateFilterSortFeedback uses selected option text (no change expected once the new option exists).

4. Back-end: verify dueDate sort behavior
   - Update todoServer.js (GET /todos handler):
     - Confirm sort === "dueDate" is implemented and matches required behavior:
       - If both have dueDate -> compare ascending (YYYY-MM-DD lexical compare).
       - If only one has dueDate -> the one with dueDate comes first.
       - If neither has dueDate -> compare by id ascending.
       - If dueDate equal -> compare by id ascending.
     - No behavior changes for other sort options.

5. Docs (optional)
   - Update README.md Features list to include "Sort by due date".

## 6. QA Sequence

1. Sort option visible
   - Login.
   - Verify "Sort by Due Date" appears in the sort dropdown.

2. Sort by due date ordering
   - Ensure dataset has:
     - At least 3 todos with dueDate (different dates)
     - At least 2 todos without dueDate
   - Select "Sort by Due Date".
   - Verify:
     - Dated todos appear first.
     - Dated todos are in ascending dueDate order.
     - Undated todos appear after all dated todos.

3. Stable ordering for same dueDate
   - Create/edit two todos to have the same dueDate.
   - Select "Sort by Due Date".
   - Repeat fetch triggers (change filter to Active/Completed and back, or type in search and clear) and confirm the relative order of equal-dueDate todos remains stable.

4. All-undated scenario
   - Use a user account where all todos have no dueDate.
   - Select "Sort by Due Date".
   - Confirm list renders and order is deterministic (id ascending).

5. Session persistence
   - Select "Sort by Due Date".
   - Reload the page in the same tab/session -> selection should remain "dueDate".
   - Close the tab/browser and reopen -> selection may reset (expected).

6. Regression
   - Verify "Sort by Created", "Sort by Updated", "Sort by Title" still behave as before.
   - Verify search and filter still work in combination with dueDate sort.

## 7. Risks / Mitigations

- Risk: Existing todos do not have dueDate so sorting appears unchanged.
  - Mitigation: Comparator places undated last; QA includes mixed dataset scenario.

- Risk: Sort persistence implemented too broadly (localStorage persists across sessions).
  - Mitigation: Use sessionStorage only.

- Risk: Non-deterministic ordering across runs when dueDate is equal or missing.
  - Mitigation: Tie-break by id ascending for equal-dueDate and both-missing cases.

## 8. Acceptance Criteria (Gherkin) mapping

- AC: Sort option is visible
  - index.html (adds the option)

- AC: Sorts ascending by due date
  - public/script.js (passes sort=dueDate)
  - todoServer.js (sort comparator asc)

- AC: Deterministic placement of todos without due date
  - todoServer.js (undated last)

- AC: Stable ordering for equal due dates
  - todoServer.js (tie-break by id asc)

- AC: Works when all todos have no due date
  - todoServer.js (both-missing -> id ordering)

- AC: Sort selection persists during the session
  - public/script.js (sessionStorage init + persist on change)

## 9. Handoff Summary

- Adds a new "Sort by Due Date" UI option in the existing sort dropdown.
- Uses sessionStorage to persist the selected sort for the active session.
- Reuses existing GET /todos sorting; backend comparator ensures dueDate asc, undated last, and deterministic ties.
