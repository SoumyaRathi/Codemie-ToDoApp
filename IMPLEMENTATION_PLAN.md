# ToDoApp - Implementation Plan

## 1. Overview
This plan implements KAN-147 by adding a "Sort by due date" option in the Todos list UI.

The application already supports a server-side `sort=dueDate` parameter in `GET /todos`, but the current behavior does not fully match the story acceptance criteria (ASC/DESC behavior + null placement rules). The work will:
- Add a UI sort option for due date.
- Add a sort direction control (asc/desc) so both behaviors can be selected.
- Update server-side dueDate sorting to be deterministic (stable) and to handle null/invalid values gracefully.

Note: No production code is written in this phase. This document is the execution plan for Phase 4.

## 2. Inputs & Traceability (Story key and URL)
- Story key: KAN-147
- Story title: Add "Sort by due date" option to Todos list UI
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-147

## 3. Planned File Edits (real repo paths only)
- `index.html`
  - Add a due date sort option in the sort dropdown.
  - Add a sort direction UI control (asc/desc).
- `public/script.js`
  - Add `currentSortDir` state (default `asc`).
  - Append `sortDir` query param to the existing `/todos` fetch URL.
  - Ensure UI feedback shows the new sort choice and direction.
- `todoServer.js`
  - Update `GET /todos` due date sorting to support `sortDir=asc|desc`.
  - Normalize invalid/empty dueDate values to null for sorting.
  - Ensure deterministic tie-breaking for stable sorting.
- `README.md` (optional)
  - Document the new sorting option and any new query param(s).

## 4. Work Breakdown (outcome mapped to real files)
- UI exposes "Due date" sort option
  - `index.html`: add `<option value="dueDate">Sort by Due date</option>` (label can be "Due date" depending on existing pattern).
  - `public/script.js`: no major structural changes; existing `#sort-select` onchange triggers `fetchAndRenderTodos()`.

- UI supports choosing ascending vs descending ordering
  - `index.html`: add a new control near the sort dropdown (recommended: a `<select id="sort-dir-select">` with values `asc` and `desc`).
  - `public/script.js`:
    - introduce `let currentSortDir = 'asc';`
    - set `#sort-dir-select` onchange -> update `currentSortDir` and refetch.
    - include `sortDir=${currentSortDir}` in request URL.

- Server implements due date sorting per acceptance criteria
  - `todoServer.js`:
    - Extend `GET /todos` to read `sortDir` query param (default to `asc` if missing).
    - Replace current `sort === 'dueDate'` comparator with one that:
      - treats missing/empty/invalid dueDate as null.
      - applies ordering rules:
        - asc -> earliest due date first, null last
        - desc -> latest due date first, null first
      - ties -> deterministic secondary order (e.g., by `createdAt` desc then `id` asc) to avoid jitter.

## 5. Implementation Sequence
1. Backend contract update (server first)
   - `todoServer.js`: implement `sortDir` handling (non-breaking: if absent, behaves as ascending).
   - `todoServer.js`: implement dueDate normalization and comparator.

2. UI changes
   - `index.html`: add "Sort by Due date" option.
   - `index.html`: add sort direction control.
   - `public/script.js`: wire up direction control; include `sortDir` in `/todos` URL.

3. UI feedback + polish
   - `public/script.js`: ensure `updateFilterSortFeedback()` reflects new selection (sort label already reads from selected option text; add direction text if new control is added).

4. Documentation (optional)
   - `README.md`: update sorting documentation.

## 6. QA Sequence
Manual QA (local):
1. Start app
   - `npm install`
   - `npm start`
   - Login, ensure todos render.

2. Verify new UI controls
   - Confirm "Due date" appears in sort dropdown.
   - Confirm direction control (asc/desc) is visible and changing it triggers a refetch.

3. Verify sorting rules
   - Create/edit todos so you have:
     - at least 3 with due dates spanning different dates
     - at least 2 with no due date
     - at least 2 with identical due dates
   - Asc + Due date:
     - earliest due dates at top
     - null due dates at bottom
   - Desc + Due date:
     - latest due dates at top
     - null due dates at top

4. Stability / no jitter
   - With identical due dates, refresh multiple times and confirm the relative order stays deterministic.

5. Invalid due date handling
   - Inject an invalid dueDate value into `todos.json` for a test todo (e.g., `"dueDate": "invalid"`) and restart.
   - Confirm:
     - UI does not crash
     - sorting still works
     - invalid is treated per null placement rules

6. Regression
   - Existing sorting (created/updated/title), filter, and search still work together.

## 7. Risks / Mitigations
- Risk: Acceptance criteria requires both ascending and descending behavior, but current UI only has one sort dropdown.
  - Mitigation: Add a minimal sort direction control (select or toggle) and keep default behavior unchanged for existing sorts.

- Risk: Current backend dueDate sorting logic does not match required null placement for asc/desc.
  - Mitigation: Implement explicit null handling rules and a direction-aware comparator.

- Risk: Sort stability may vary by JS engine if comparator returns 0 for ties.
  - Mitigation: Enforce a deterministic tie-breaker (createdAt and/or id) to guarantee stable outcomes.

## 8. Acceptance Criteria (Gherkin) mapping
- Sort control includes "Due date" option and can be selected
  - `index.html`: new `<option value="dueDate">...`
  - `public/script.js`: existing onchange triggers fetch

- Sorting ascending orders todos by earliest due date first; null due dates last
  - `todoServer.js`: `sort=dueDate` + `sortDir=asc` comparator with null-last

- Sorting descending orders todos by latest due date first; null due dates first
  - `todoServer.js`: `sort=dueDate` + `sortDir=desc` comparator with null-first
  - `index.html` + `public/script.js`: direction control sends `sortDir`

- Sorting is stable when due dates are equal (no jitter / preserves existing secondary order)
  - `todoServer.js`: tie-break by deterministic field(s) (e.g., createdAt then id)

- Switching sort option updates list immediately without page reload
  - `public/script.js`: onchange handlers call `fetchAndRenderTodos()` (already)

- When all todos have no due date, selecting due-date sort causes no error and list order remains deterministic
  - `todoServer.js`: all-null path uses tie-breaker (no NaN comparisons)

- When some todos have invalid/empty due date values, UI handles gracefully without crashing and applies null handling rule
  - `todoServer.js`: invalid/empty normalized to null for sorting
  - `public/script.js`: render uses returned data; no date parsing for dueDate required

## 9. Handoff Summary
- Add a "Due date" sort option and a sort direction selector in the UI.
- Extend `GET /todos` to support `sortDir=asc|desc` and implement dueDate sorting rules including null-first/last and deterministic tie-breaking.
- Validate using a focused manual QA checklist covering asc/desc, nulls, invalid values, and stability.
