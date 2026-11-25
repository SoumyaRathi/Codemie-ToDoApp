# ToDoApp - Implementation Plan

## 1. Overview
Implement KAN-155 "Expose due date in Create/Edit Todo UI" by adding an optional due date field to the Add/Edit modal, sending it to the existing backend API (which already supports dueDate validation + persistence), and rendering due date on todo cards.

Data contract:
- todo.dueDate is optional
- when present, it is stored as a string in YYYY-MM-DD format

## 2. Inputs & Traceability (Story key and URL)
- Story: KAN-155 - Expose due date in Create/Edit Todo UI
- URL: https://soumyarathi57.atlassian.net/browse/KAN-155

## 3. Planned File Edits (real repo paths only)
- index.html
  - Add due date field to the Add/Edit To-Do modal form
- public/script.js
  - Populate due date in edit mode
  - Send dueDate on create/update
  - Render due date in the todo cards
  - Surface backend validation errors for dueDate
- public/styles.css
  - Style the due date input in the modal
  - Style due date display line in todo card
- todoServer.js
  - No planned changes (already supports dueDate parsing/validation and PUT clearing)

## 4. Work Breakdown (outcome mapped to real files)
- Add due date input to modal (index.html)
  - Add input type="date" with id "edit-due-date"
  - Keep optional (no required attribute)

- Prefill due date on edit + reset on create (public/script.js)
  - openCreateModal(): set edit-due-date to ""
  - openEditModal(todo): set edit-due-date to todo.dueDate || ""

- Send dueDate to API (public/script.js)
  - On create POST /todos:
    - Include dueDate only when user provided a date
  - On edit PUT /todos/:id:
    - If field has a date, send it
    - If user cleared it, explicitly send dueDate: "" (or null) so server deletes it

- Render due date on todo card (public/script.js + public/styles.css)
  - Add a small "Due: YYYY-MM-DD" line only when dueDate exists

- Validation error display (public/script.js)
  - If server returns 400 with { field: "dueDate" }, display message in modal and do not close modal

## 5. Implementation Sequence
1. index.html
   - Add a new form row for Due date in the Add/Edit modal
   - Ensure the element has a stable id: edit-due-date

2. public/script.js
   - Wire due date in openCreateModal() and openEditModal(todo)
   - Update todo-form onsubmit handler:
     - Read dueDate from edit-due-date input
     - Add it to POST/PUT request bodies per rules above
     - Handle non-OK responses; for dueDate 400, show inline error and return
   - Update renderTodos() to include due date display when present

3. public/styles.css
   - Style the new date input consistent with existing inputs
   - Add styles for due date line in card (muted text)

4. Regression sanity
   - Verify existing create/edit/toggle/delete still work

## 6. QA Sequence
- Manual UI
  - Create todo with due date -> due date shown on card
  - Create todo without due date -> no due date shown
  - Edit todo with due date -> due date field prefilled
  - Update due date -> card updated and persists after refresh
  - Clear due date -> due date removed and persists after refresh
  - Boundary: set due date to today -> saved successfully

- Negative
  - Submit invalid date via devtools (e.g., dueDate: "2025-02-30") -> server 400, UI shows error

## 7. Risks / Mitigations
- Risk: Clearing due date does not work if client omits the field.
  - Mitigation: On edit submit, explicitly send dueDate: "" (or null) when cleared.

- Risk: No consistent place to show todo-form validation errors.
  - Mitigation: Add a small error container in the modal (similar pattern to auth error) and reuse it.

## 8. Acceptance Criteria (Gherkin) mapping
- Create todo with due date
  - index.html: add due date input
  - public/script.js: include dueDate in POST body
  - public/script.js: render due date on card

- Create todo without due date
  - public/script.js: omit dueDate in POST body
  - public/script.js: conditional render

- Edit todo shows existing due date
  - public/script.js: openEditModal() sets edit-due-date

- Update due date on edit
  - public/script.js: PUT includes dueDate

- Clear due date on edit
  - public/script.js: PUT sends dueDate: "" (or null)

- Invalid due date validation (create)
  - todoServer.js: returns 400 for invalid dueDate
  - public/script.js: show inline error

- Invalid due date validation (edit)
  - todoServer.js: returns 400 for invalid dueDate
  - public/script.js: show inline error

- Boundary: today's date
  - public/script.js: dueDate from input type="date" is sent and displayed

## 9. Handoff Summary
- Adds an optional due date field to the Add/Edit todo modal.
- Uses the existing backend support for dueDate validation and persistence.
- Ensures edit can both update and clear dueDate.
- Displays dueDate on todo cards and shows validation errors when backend rejects input.