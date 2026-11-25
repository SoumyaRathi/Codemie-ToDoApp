# ToDoApp - Implementation Plan

## 1. Overview

Implement KAN-156 "Add Due Date create/edit support in ToDo UI" by adding an optional due date field to the Add/Edit modal, sending it to the existing backend API (which already supports dueDate validation + persistence), and rendering due date on todo cards. No production refactors beyond what is required for this story.

Data contract: dueDate is optional and stored as a string in YYYY-MM-DD format on the todo object.

## 2. Inputs & Traceability (Story key and URL)

- Story: KAN-156 - Add Due Date create/edit support in ToDo UI
- URL: https://soumyarathi57.atlassian.net/browse/KAN-156

## 3. Planned File Edits (real repo paths only)

- index.html -> add due date field to the Add/Edit To-Do modal form and an inline error container
- public/script.js -> populate due date in edit mode, send dueDate on create/update, render due date on cards, and surface validation / API errors
- public/styles.css -> style the new due date input, inline error, and due date display on cards
- todoServer.js -> no change planned (already supports dueDate on POST/PUT and sort=dueDate)

## 4. Work Breakdown (outcome mapped to real files)

- UI: Add due date input + error placeholder -> index.html
  - Add a labeled input (type="date") with id "edit-due-date"
  - Add a small error block in the todo modal (hidden by default), id "todo-error"

- Create flow: send dueDate -> public/script.js
  - Read dueDate from the input
  - Include dueDate only when non-empty on POST /todos

- Edit flow: prefill + update + clear dueDate -> public/script.js
  - openEditModal(todo) sets edit-due-date value to todo.dueDate || ""
  - On PUT /todos/:id include dueDate key
  - If user clears due date (empty input) send dueDate: "" so backend removes it

- Card rendering: show due date -> public/script.js + public/styles.css
  - Render a "Due: YYYY-MM-DD" line only when element.dueDate exists

- User-facing error behavior for create/edit failures -> public/script.js
  - If POST/PUT response !ok, read JSON when possible and show data.error in todo-error
  - Keep modal open and preserve current inputs
  - If data.field == "dueDate" focus the due date input

## 5. Implementation Sequence

1. index.html
   - Add "Due date" field inside the Add/Edit todo modal form
   - Add an inline error container for todo submit errors (todo-error)

2. public/script.js
   - Reset due date and hide todo-error in openCreateModal()
   - Prefill due date and hide todo-error in openEditModal(todo)
   - Update todo-form onsubmit to:
     - Read dueDate value from edit-due-date
     - POST: include dueDate only when set
     - PUT: always send dueDate (value or empty string for clearing)
     - Handle non-OK responses by showing todo-error and not closing modal
   - Update renderTodos() to display dueDate when present

3. public/styles.css
   - Style the due date input to match existing modal input styles
   - Style the inline todo-error message (similar to auth error)
   - Style the due date line on cards

## 6. QA Sequence

- Manual happy paths
  - Create todo with due date -> due date displays on card and persists after refresh
  - Create todo without due date -> no due date shown
  - Edit todo to add a due date -> persists and displays
  - Edit todo to change due date -> persists and displays updated value
  - Edit todo to clear due date -> due date removed and stays removed after refresh

- Negative paths
  - Send invalid dueDate via devtools (e.g., "2025-02-30") on POST/PUT -> expect 400; UI shows error; modal stays open; values preserved
  - Simulate server/network error -> UI shows user-facing error; no silent failure

## 7. Risks / Mitigations

- Risk: Clearing due date does not work if client omits dueDate field.
  - Mitigation: On edit submit, always send dueDate key; send "" when empty.

- Risk: Existing create/edit handlers ignore non-OK responses and close the modal anyway.
  - Mitigation: Gate closeEditModal() behind resp.ok; display todo-error otherwise.

- Risk: Date/timezone confusion.
  - Mitigation: Use YYYY-MM-DD everywhere; treat as a date-only field (backend already expects this).

## 8. Acceptance Criteria (Gherkin) mapping

- Create todo with due date
  - index.html: edit-due-date input
  - public/script.js: POST includes dueDate
  - public/script.js: renderTodos shows dueDate

- Create todo without due date
  - public/script.js: POST omits dueDate when empty
  - public/script.js: conditional rendering hides due date line

- Edit todo to add due date
  - public/script.js: PUT sends dueDate for empty -> set

- Edit todo to change due date
  - public/script.js: PUT sends updated dueDate

- Edit todo to clear due date
  - public/script.js: PUT sends dueDate: ""; todoServer.js clears it

- Validation prevents invalid due date
  - todoServer.js: returns 400 { error, field: "dueDate" }
  - public/script.js: shows inline error and preserves input

- API error on create with due date shows error
  - public/script.js: handles non-OK POST, show todo-error, keep modal open

- API error on edit due date shows error and preserves input
  - public/script.js: handles non-OK PUT, show todo-error, keep modal open

## 9. Handoff Summary

- Adds optional due date input to the Add/Edit todo modal.
- Sends dueDate to existing backend endpoints; supports clearing due date during edit.
- Displays due date on todo cards.
- Adds user-facing error display for create/edit failures relevant to dueDate acceptance criteria.