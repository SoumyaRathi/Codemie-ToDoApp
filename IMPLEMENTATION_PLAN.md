# ToDoApp - Implementation Plan

## 1. Overview
Implement KAN-153 by adding a new "Sort by due date" option in the Todos UI and ensuring the backend sorts todos by due date with the required ordering rules.

This repo is a Node.js/Express app with a vanilla JS frontend. Todos are served from `GET /todos` with query params for `filter`, `search`, and `sort`.

## 2. Inputs & Traceability (Story key and URL)
- Story: KAN-153 - Add "Sort by due date" option in Todos UI
- URL: https://soumyarathi57.atlassian.net/browse/KAN-153

## 3. Planned File Edits (real repo paths only)
- `index.html`
  - Add an option to the sort dropdown: value `dueDate`, label "Sort by Due date".
- `public/script.js`
  - Ensure the sort dropdown can select `dueDate` and that `currentSort` is set accordingly.
  - Confirm sorting persists after actions (toggle complete/edit) because the UI re-fetch uses `currentSort`.
- `todoServer.js`
  - Validate/adjust `GET /todos` sorting logic for `sort=dueDate`:
    - earliest due date first
    - todos without due date last
    - stable/deterministic ordering when due dates are equal
- `README.md` (optional)
  - Mention the new sort option under usage/features.

## 4. Work Breakdown (outcome mapped to real files)
- Add "Sort by due date" option in UI control
  - Files: `index.html`
- Wire UI selection -> API query param
  - Files: `public/script.js`
- Implement/confirm due-date sort semantics on backend
  - Files: `todoServer.js`
- Documentation update (optional)
  - Files: `README.md`

## 5. Implementation Sequence
1. Backend: update `todoServer.js` `GET /todos` to support `sort=dueDate` with correct ordering.
   - Comparator rules:
     - If both have `dueDate` (YYYY-MM-DD), sort ascending.
     - If only one has `dueDate`, that one comes first.
     - If neither has `dueDate`, keep deterministic order.
     - Tie-breaker for equal `dueDate`: `id` ascending (or preserve original index + id as a final tie-break).
2. Frontend UI control: add the new dropdown option in `index.html`.
3. Frontend behavior: ensure `public/script.js` uses `currentSort='dueDate'` when selected.
   - Confirm `fetchAndRenderTodos()` includes `&sort=${currentSort}`.
   - Confirm toggle complete uses `fetchAndRenderTodos()` and therefore preserves sorting.
4. Optional: update `README.md`.

## 6. QA Sequence
Manual UI:
- Login.
- Open Sort dropdown -> verify "Sort by Due date" option exists.
- Select it -> confirm ordering is by soonest due date.
- Verify todos with no due date are listed after those with due dates.
- Toggle completion on a todo -> list remains sorted by due date (sort selection persists).

API checks (authorized request with `Authorization: <token>`):
- `GET /todos?sort=dueDate`
  - Validate ordering:
    - dueDate ascending
    - missing dueDate last
    - equal dueDate ordering deterministic (stable) via tie-break

Regression:
- Confirm other sorts still work: `createdAt`, `updatedAt`, `title`.
- Confirm filter/search still work when sort=dueDate.

## 7. Risks / Mitigations
- Risk: dueDate values inconsistent or invalid could break sorting.
  - Mitigation: keep backend validation for dueDate format (YYYY-MM-DD) and treat missing dueDate explicitly.
- Risk: unstable ordering when due dates match.
  - Mitigation: deterministic tie-break (e.g., `id`) in the comparator.
- Risk: UI option value mismatch with backend expected query string.
  - Mitigation: use exact value `dueDate` in `index.html`.

## 8. Acceptance Criteria (Gherkin) mapping
- "Sort by due date" option is available
  - `index.html` adds option; `public/script.js` reads selected value.
- Sorting orders todos by earliest due date first
  - `todoServer.js` comparator sorts `dueDate` ascending.
- Todos without due date are listed after all todos with due dates
  - `todoServer.js` comparator places missing `dueDate` last.
- Sorting is stable for equal due dates
  - `todoServer.js` tie-break rule (id or original index).
- Sorting persists after marking a todo complete
  - `public/script.js` toggle calls `fetchAndRenderTodos()` which uses `currentSort`.
- Default ordering remains when sort by due date is not selected
  - `public/script.js` default `currentSort = 'createdAt'` and clear-filters resets to createdAt.

## 9. Handoff Summary
- Change adds a new sort option in the UI and relies on backend support for `sort=dueDate`.
- No data migration required; dueDate is optional and missing values are handled.
- Primary validation focus: ordering rules + regression for existing sort/filter/search and persistence after interactions.
