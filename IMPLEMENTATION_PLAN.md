# ToDoApp - Implementation Plan

## 1. Overview

Add a "Sort by due date" option in the ToDo list UI. When selected, the visible list is ordered by due date ascending; items without a due date appear after dated items; ordering is deterministic when due dates are identical. No API contract changes or persistence of preference are introduced.

## 2. Inputs & Traceability (Story key and URL)

- Story key: KAN-139
- Story title: Add "Sort by due date" option in ToDo list UI
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-139

## 3. Planned File Edits (real repo paths only)

- index.html
  - Add a new sort option in the sort dropdown labeled "Sort by due date" with value "dueDate".
- public/script.js
  - Ensure selecting the new sort option triggers list reload and sends sort=dueDate.
  - Ensure sort feedback banner shows the selected label.
- todoServer.js
  - Verify/align server-side sort implementation for sort=dueDate to meet acceptance criteria (ascending, nulls last, deterministic tie-break).

## 4. Work Breakdown (outcome mapped to real files)

- UI control: expose "Sort by due date" in list sort options -> index.html
- Wire-up: choosing option sets currentSort = "dueDate" and triggers fetchAndRenderTodos() -> public/script.js
- Behavior: list reorders as per dueDate sorting rules (ascending; nulls last; deterministic ties) -> todoServer.js
- Manual test data: ensure there is at least one dated and one undated todo for validation during QA (no persistence changes) -> todos.json (optional, only if needed for local testing)

## 5. Implementation Sequence

1. Confirm existing sort dropdown and currentSort wiring in UI.
2. Add a new sort option value "dueDate" with label "Sort by due date" in index.html.
3. Confirm public/script.js uses #sort-select onchange to set currentSort and calls fetchAndRenderTodos(); ensure default remains createdAt.
4. Verify todoServer.js GET /todos supports sort=dueDate and that its comparator matches acceptance criteria (ascending; nulls last; deterministic ties). Adjust comparator if needed without changing API contract.
5. Run through QA sequence with representative data sets (mixed dueDate/null, identical dueDate, all null, single item).

## 6. QA Sequence

- UI QA
  - Open ToDo list view -> open sort dropdown -> verify "Sort by due date" is visible and selectable.
  - Select "Sort by due date" -> verify list reorders.
  - Verify items with due dates are ordered earliest -> latest.
  - Verify items with no dueDate appear after all dated items.
  - Verify deterministic ordering for identical due dates (expected tie-break: numeric id ascending, or existing order if stable; see Risks below).
  - Verify behavior when all todos have no dueDate: ordering does not change and no error is shown.
  - Verify behavior when only a single todo exists: list remains unchanged and no error is shown.

- API QA (supporting)
  - Observe network call: GET /todos?...&sort=dueDate returns 200 and items are ordered correctly.

## 7. Risks / Mitigations

- Risk: Deterministic tie-break expectation could be interpreted as "preserve current ordering" vs "sort by id".
  - Mitigation: Align with current backend implementation (it already uses id as a deterministic tie-break when dueDate values are equal). If acceptance requires preserving pre-sort order specifically, adopt a stable sort approach (e.g., carry original index in UI) without changing API contract.

- Risk: Some todos may not have dueDate present in data.
  - Mitigation: Comparator treats missing/empty as "no due date" and places them last.

- Risk: UI label casing mismatch with acceptance wording.
  - Mitigation: Use exact label text "Sort by due date" in the dropdown.

## 8. Acceptance Criteria (Gherkin) mapping

- 1) Sort by due date orders ascending
  - index.html (option)
  - public/script.js (select triggers sort=dueDate)
  - todoServer.js (ascending comparator)

- 2) Items with no due date appear after dated items
  - todoServer.js comparator branch for missing dueDate

- 3) Deterministic order for identical due dates
  - todoServer.js tie-break (a.id - b.id) and/or stable ordering expectation

- 4) Sorting works when all items have no due date
  - todoServer.js comparator returns a.id - b.id
  - public/script.js UI shows no error

- 5) Sorting works with a single item
  - public/script.js existing rendering path plus server response

- 6) Sorting option is visible and selectable
  - index.html + public/script.js onchange

## 9. Handoff Summary

- Deliverable: new "Sort by due date" option in the UI that triggers existing server-side sort=dueDate behavior.
- Key behavior: due dates ascending; missing due dates last; deterministic ties.
- Out of scope (per story): adding/editing due dates, backend/schema changes, new endpoints, persistence of sort preference.
