# ToDoApp - Implementation Plan

## 1. Overview

This plan implements KAN-158: add Due Date support in the ToDo UI (input + display).

Backend status (already implemented):
- API accepts optional `dueDate` (string, YYYY-MM-DD) on POST /todos and PUT /todos/:id
- API supports clearing `dueDate` when the client sends null or empty string
- API returns `dueDate` in todo payloads and supports `sort=dueDate`

UI work to implement:
- Add Due Date input control to the Add/Edit To-Do modal
- Send dueDate in create/update calls and support clearing it
- Display dueDate on the todo card
- Add client-side validation and inline error feedback

## 2. Inputs & Traceability (Story key and URL)

- Story key: KAN-158
- Story title: Add Due Date field support in ToDo UI (input + display)
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-158

## 3. Planned File Edits (real repo paths only)

- index.html
  - Add Due Date field to the existing Add/Edit To-Do modal form

- public/script.js
  - Read Due Date field in modal open/submit flows
  - Include `dueDate` in POST /todos and PUT /todos/:id requests
  - Allow clearing existing dueDate
  - Render dueDate on todo cards
  - Validate dueDate (YYYY-MM-DD) and show inline errors (including mapping server 400 field errors)

- public/styles.css
  - Style the Due Date field group in the modal
  - Style dueDate display row/badge on todo cards

## 4. Work Breakdown (outcome mapped to real files)

- Add Due Date input to modal
  - index.html
    - Add a new form field in `#todo-form`:
      - `input type="date" id="edit-due-date" name="dueDate"`
      - A label consistent with existing modal field patterns

- Populate dueDate in Edit modal and clear in Create modal
  - public/script.js
    - openCreateModal(): set `#edit-due-date.value = ""`
    - openEditModal(todo): set `#edit-due-date.value = todo.dueDate || ""`

- Include dueDate in API requests
  - public/script.js
    - On create submit:
      - Build request body with title/description/completed
      - If due date value is non-empty: include `dueDate: <YYYY-MM-DD>`
      - If empty: omit dueDate for create
    - On edit submit:
      - Always include `dueDate` either:
        - `<YYYY-MM-DD>` to set/update, or
        - `""` to clear (backend interprets as clear)

- Client-side validation and server error mapping
  - public/script.js
    - Validate dueDate string when non-empty:
      - Regex: `^\d{4}-\d{2}-\d{2}$`
      - (Optional) also validate with Date parsing to avoid impossible dates
    - Show validation error inline near due date input (do not use alert)
    - If server responds 400 with `{ field: "dueDate" }`, display that error next to due date input

- Display dueDate on todo cards
  - public/script.js
    - In renderTodos(), create an element (e.g., div with class `todo-due-date`) if `element.dueDate` exists
    - Display as `Due: YYYY-MM-DD` (avoid timezone conversions; treat as date-only)

- Styling
  - public/styles.css
    - Add styles for `.todo-due-date`
    - Ensure spacing and typography match existing card and modal styles

## 5. Implementation Sequence

1. Update index.html
   - Add Due Date input field to modal form
   - Ensure label association and ids are consistent

2. Update public/script.js
   - Add `edit-due-date` reset/populate in openCreateModal/openEditModal
   - Extend todo-form onsubmit handler to include dueDate in request bodies
   - Add client-side dueDate validation + inline error display
   - Extend renderTodos() to show due date on cards

3. Update public/styles.css
   - Add styling for due date field group and due date display in cards

4. Manual verification
   - Validate create/edit/clear/display across reloads

## 6. QA Sequence

- Regression
  - Login/logout
  - Create/edit/delete/toggle complete works as before

- Due date scenarios
  - Create todo with due date -> due date visible on card and persists after refresh
  - Create todo without due date -> no due date visible
  - Edit todo: set due date -> updated due date visible
  - Edit todo: clear due date -> due date removed

- Validation
  - Attempt invalid dueDate (simulate via devtools by setting an invalid string) -> client blocks submit or displays server 400 error

## 7. Risks / Mitigations

- Risk: Date-only values displayed incorrectly due to timezone conversion
  - Mitigation: treat dueDate as a plain YYYY-MM-DD string; display as-is or format without converting to local time

- Risk: Clearing due date does not clear server-side value
  - Mitigation: on edit, send `dueDate: ""` when input is empty (backend parseDueDate clears on empty string)

- Risk: Browser differences for `input type="date"`
  - Mitigation: keep regex validation as fallback; ensure server-side validation remains authoritative

## 8. Acceptance Criteria (Gherkin) mapping

Note: The following maps to the Gherkin scenarios captured in KAN-158.

- Create ToDo with due date
  - index.html: Due Date field in modal
  - public/script.js: POST body includes dueDate when provided
  - public/script.js: renderTodos displays dueDate

- Create ToDo without due date
  - public/script.js: POST omits dueDate when empty
  - public/script.js: renderTodos hides dueDate row when missing

- Edit ToDo due date
  - public/script.js: openEditModal pre-fills dueDate
  - public/script.js: PUT includes dueDate value

- Clear an existing due date
  - public/script.js: PUT includes `dueDate: ""` when cleared

- Display due date from API response
  - public/script.js: renderTodos reads element.dueDate and displays it

- Reject invalid due date input
  - public/script.js: client-side format validation + server 400 field mapping

- Boundary - earliest allowed date
  - index.html: optional `min` attribute (if product defines a min)
  - public/script.js: format validation

- Boundary - latest allowed date
  - index.html: optional `max` attribute (if product defines a max)
  - public/script.js: format validation

## 9. Handoff Summary

- Primary files to change: index.html, public/script.js, public/styles.css
- Contract: `dueDate` is a YYYY-MM-DD string; optional; cleared by sending empty string or null
- Manual test checklist: create with due date, create without, edit set, edit clear, refresh, verify display and validation