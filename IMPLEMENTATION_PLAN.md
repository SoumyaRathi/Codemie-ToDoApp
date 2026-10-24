# ToDoApp - Implementation Plan

## 1. Overview

Add UI support for optional todo due dates end-to-end:
- Create and edit a due date (optional)
- Display due date on todo cards only when present
- Add a new sort option that uses existing backend sort=dueDate

Backend already supports dueDate parsing/validation (YYYY-MM-DD) and dueDate sorting. This work is UI wiring + validation + display + error handling. No new endpoints.

## 2. Inputs & Traceability (Story key and URL)

- Story key: KAN-141
- Story title: Add Due Date field to Todos UI (create/edit, display, and sorting)
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-141

## 3. Planned File Edits (real repo paths only)

- index.html
  - Add Due Date input in Add/Edit To-Do modal
  - Add new sort dropdown option value "dueDate"
- public/script.js
  - Populate/reset dueDate field in create/edit modal
  - Include dueDate in POST/PUT payloads per rules
  - Render dueDate on cards conditionally
  - Add client-side validation and field-level error UI
  - Ensure sorting uses sort=dueDate
- public/styles.css
  - Minimal styling for the new modal field and due date display on cards
- todoServer.js
  - No changes expected; verify existing dueDate behavior matches UI needs (create/edit/clear + sort)

## 4. Work Breakdown (outcome mapped to real files)

- Add modal field "Due date" (optional) -> index.html, public/styles.css
- Create todo with due date -> public/script.js (POST payload), index.html (input)
- Create todo without due date -> public/script.js (omit dueDate)
- Edit todo add/change/clear due date -> public/script.js (openEditModal + PUT payload), index.html
- Display due date on cards only when present -> public/script.js, public/styles.css
- Add sort option and wire to backend -> index.html, public/script.js
- Block invalid due date before calling API -> public/script.js
- Show server-side dueDate validation error without closing modal -> public/script.js, public/styles.css

## 5. Implementation Sequence

1. Update HTML for due date input and sort option
   - Add input type="date" in todo modal with id "edit-dueDate"
   - Add label "Due date" and helper/error container element near it (e.g., <div class="field-error" id="edit-dueDate-error">)
   - Add <option value="dueDate">Sort by Due date</option> to #sort-select

2. Update modal open flows
   - openCreateModal(): set due date input value to "" and clear any due date error state
   - openEditModal(todo): set due date input value to todo.dueDate if present, else ""; clear any due date error state

3. Update submit handler payload logic
   - Read dueDateInput = document.getElementById('edit-dueDate').value
   - Validate dueDateInput:
     - Allow empty
     - If provided, must match YYYY-MM-DD and be a real date
     - If invalid -> show inline error and return (no fetch)

   - Create (POST /todos):
     - body includes { title, description, completed: false }
     - If dueDateInput is non-empty -> add dueDate: dueDateInput
     - If empty -> omit dueDate from JSON entirely

   - Edit (PUT /todos/:id):
     - body includes { title, description, completed }
     - If dueDateInput non-empty -> dueDate: dueDateInput
     - If dueDateInput empty -> dueDate: "" to clear (backend treats '' as clear)

4. Add response/error handling for create/update
   - Current code ignores non-ok responses; update to:
     - If resp.ok -> close modal + refresh list
     - Else parse JSON error; if error.field == "dueDate" -> show inline error on due date field
     - Keep modal open on error

5. Render due date on todo cards
   - In renderTodos(), after description or timestamps, add an element like:
     - If element.dueDate exists -> show "Due: YYYY-MM-DD" (stable format)
     - Else do not create/render the due date element

6. Sorting
   - Ensure #sort-select onchange continues to set currentSort and fetchAndRenderTodos()
   - Verify choosing the new option results in GET /todos?sort=dueDate

7. Verify backend compatibility
   - Confirm todoServer.js parseDueDate supports:
     - undefined -> omit
     - "" or null -> clear
     - invalid -> 400 with field:"dueDate"
   - Confirm GET /todos sort=dueDate ordering is ascending and missing dueDate last

## 6. QA Sequence

- Create flow
  - Create with due date
    - Expect: POST payload contains dueDate
    - Expect: card shows due date
  - Create without due date
    - Expect: POST payload omits dueDate
    - Expect: card does not show due date

- Edit flow
  - Add due date to undated todo
    - Expect: PUT payload contains dueDate
    - Expect: card shows due date after refresh
  - Change due date
    - Expect: updated value displayed
  - Clear due date
    - Expect: PUT payload contains dueDate:""
    - Expect: backend removes dueDate and UI stops showing it

- Sort flow
  - Select "Sort by Due date"
    - Expect: network call includes sort=dueDate
    - Expect: earliest due dates first; undated todos last
  - Switch between sort options
    - Expect: list refreshes and order changes accordingly

- Validation
  - Force invalid due date (simulate via devtools or programmatically setting value)
    - Expect: inline error
    - Expect: no API request is sent
  - Force server 400 (send invalid dueDate via fetch)
    - Expect: modal stays open and shows server error at due date field

## 7. Risks / Mitigations

- Risk: Browser/date input inconsistencies across locales
  - Mitigation: use type="date" but validate and normalize to YYYY-MM-DD; keep display format stable

- Risk: Clearing dueDate semantics differ between create vs edit
  - Mitigation: POST omits dueDate when empty; PUT explicitly sends dueDate:"" to clear

- Risk: Current UI silently ignores failed create/update
  - Mitigation: implement consistent non-ok handling and field-level error messages

- Risk: Display format disagreements
  - Mitigation: choose "Due: YYYY-MM-DD" (ASCII-only) and document it; can be adjusted later without API impact

## 8. Acceptance Criteria (Gherkin) mapping

- Create todo with a due date sends dueDate and displays it
  - index.html (due date input)
  - public/script.js (POST payload + renderTodos)

- Create todo without a due date omits/clears dueDate and displays none
  - public/script.js (omit dueDate) + renderTodos conditional

- Edit todo to add a due date persists and displays it
  - public/script.js (openEditModal + PUT payload + renderTodos)

- Edit todo to change a due date persists and displays the updated value
  - public/script.js (PUT payload + renderTodos)

- Edit todo to clear a due date removes it from API/UI
  - public/script.js (PUT dueDate:""), todoServer.js (parseDueDate clear behavior)

- Todos without due dates do not render any due date UI
  - public/script.js (conditional rendering)

- Todos with due dates render due date in agreed format
  - public/script.js + public/styles.css

- Selecting "Due date" sort orders todos by backend dueDate sort
  - index.html (sort option value dueDate)
  - public/script.js (currentSort=dueDate -> GET /todos?sort=dueDate)
  - todoServer.js (existing sort=dueDate implementation)

- Switching sort options refreshes list and updates ordering
  - public/script.js (sort-select onchange)

- Invalid due date is blocked with validation and no API call is made
  - public/script.js (validate due date before fetch)

## 9. Handoff Summary

- What will be added: optional Due Date field in Add/Edit modal, due date display on todo cards, and a due date sort option.
- What will not change: API endpoints and data storage design.
- Key integration detail: dueDate is a string in YYYY-MM-DD; omit on create when empty; send empty string on edit to clear.
