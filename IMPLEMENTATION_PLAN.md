# ToDoApp - Implementation Plan

## 1. Overview

Implement KAN-154: add a "Sort by due date" option in the todos list UI. When selected, todos are ordered by due date ascending (earliest -> latest) and todos without a due date are placed after those with due dates. Sorting should persist while the user remains on the page (across create/edit/complete actions) and the user can switch back to the default sort.

This phase adds planning documentation only (no production feature code).

## 2. Inputs & Traceability (Story key and URL)

- Story: KAN-154 - Add "Sort by due date" option in todos list UI
- URL: https://soumyarathi57.atlassian.net/browse/KAN-154

## 3. Planned File Edits (real repo paths only)

- index.html
  - Add a new sort dropdown option with value "dueDate".
- public/script.js
  - Ensure sort selection can be set to "dueDate" and is persisted in the existing client state (currentSort) while staying on page.
  - Ensure re-fetch actions (create/edit/toggle) reuse currentSort.
- todoServer.js
  - Verify and, if needed, adjust GET /todos sorting logic for sort=dueDate to match acceptance criteria.
- README.md (optional)
  - Mention the new "Sort by Due date" option.

## 4. Work Breakdown (outcome mapped to real files)

- UI exposes "Sort by due date" option -> index.html
- UI passes sort=dueDate and keeps selection across actions -> public/script.js
- Backend ordering rules for dueDate (ascending; missing dueDate last; deterministic ties) -> todoServer.js
- Docs update (optional) -> README.md

## 5. Implementation Sequence

1. Backend confirmation first (todoServer.js)
   - Inspect GET /todos and confirm it accepts query param sort=dueDate.
   - Confirm ordering rules:
     - Earliest dueDate first.
     - Todos without dueDate after all todos with dueDate.
     - Deterministic tie-break for same dueDate (e.g., by id).

2. UI control (index.html)
   - Add an option to the existing sort dropdown:
     - value: dueDate
     - label: Sort by Due date (or "Sort by Due Date" - keep consistent casing with existing options)

3. Frontend wiring and persistence (public/script.js)
   - Confirm currentSort is included in the fetch URL (it already is).
   - Confirm sort-select onchange sets currentSort to the option value.
   - Confirm actions call fetchAndRenderTodos() (and do not reset currentSort):
     - create todo
     - edit todo
     - toggle completion
     - delete
   - Confirm "Clear filters" resets sort to default (createdAt) and the dropdown reflects it.

4. Optional docs (README.md)
   - Update feature list or usage section to include "Sort by Due date".

## 6. QA Sequence

Manual UI
- Login -> navigate to todos list.
- Verify sort dropdown includes "Sort by due date".
- Select "Sort by due date" -> verify ordering is earliest -> latest for todos with dueDate.
- Verify todos without dueDate appear after all dueDate todos.
- While dueDate sort is active:
  - Create a todo -> list remains sorted by due date.
  - Edit a todo -> list remains sorted by due date.
  - Mark complete/incomplete -> list remains sorted by due date.
- Switch back to default sort -> verify list returns to default ordering.

API
- Call GET /todos?sort=dueDate with Authorization header.
- Verify ordering and missing-dueDate placement.

Regression
- Verify other sort options still work (createdAt, updatedAt, title).
- Verify search/filter still work in combination with sorting.

## 7. Risks / Mitigations

- Risk: dueDate values inconsistent formats leading to incorrect ordering.
  - Mitigation: server-side validation already expects YYYY-MM-DD; use consistent compare (string compare is valid for YYYY-MM-DD).

- Risk: ordering becomes unstable when multiple todos share same dueDate.
  - Mitigation: ensure comparator adds deterministic tie-break (id).

- Risk: UI option value mismatch with backend (e.g., "due_date" vs "dueDate").
  - Mitigation: use value exactly "dueDate" to match server handling.

## 8. Acceptance Criteria (Gherkin) mapping

Scenario 1: Show sort option
- UI control added in index.html and recognized by public/script.js.

Scenario 2: Sort by due date ascending
- todoServer.js: GET /todos comparator for sort=dueDate sorts earliest -> latest.

Scenario 3: Todos without due date handled consistently
- todoServer.js: comparator places missing dueDate after dueDate-present todos.

Scenario 4: Sorting persists while staying on page
- public/script.js: actions re-fetch using currentSort without resetting it.

Scenario 5: Switching back to default sorting
- public/script.js: allow selecting default option (createdAt) and clear-filters resets to createdAt.

## 9. Handoff Summary

- Small surface-area change: one new dropdown option plus verification of server sort behavior.
- No schema/migration required because dueDate is optional.
- Key validation points: ordering rules, missing dueDate placement, and persistence across in-page actions.
