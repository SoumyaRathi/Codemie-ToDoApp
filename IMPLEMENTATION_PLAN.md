# ToDoApp - Implementation Plan

## 1. Overview
This plan implements KAN-145 by adding a "Sort by Due Date" option in the Todos UI. The backend already supports `sort=dueDate` in `GET /todos` and places todos without `dueDate` after those with `dueDate`. Work in this phase is planning only (no production code).

## 2. Inputs & Traceability (Story key and URL)
- Story key: KAN-145
- Story title: Add "Sort by due date" option in Todos UI
- Story URL: https://soumyarathi57.atlassian.net/browse/KAN-145

## 3. Planned File Edits (real repo paths only)
- index.html
  - Add an option to the sort control: label "Sort by Due Date", value `dueDate`.
- public/script.js
  - Ensure the sort dropdown change handler correctly sets `currentSort` to `dueDate` and triggers refresh.
  - Verify the filter/sort feedback banner shows the new option text.
- todoServer.js
  - Verify existing `sort === 'dueDate'` behavior meets acceptance criteria.
  - If stable ordering is strictly required, adjust dueDate sort implementation to be explicitly stable (see Risks).
- README.md (optional)
  - Update feature list or usage notes if desired.

## 4. Work Breakdown (outcome mapped to real files)
- UI exposes the new sort option -> index.html
- UI requests correct API query param when selected -> public/script.js
- API returns correctly ordered list for due date sort -> todoServer.js
- Regression check that existing sort options still work -> public/script.js, todoServer.js

## 5. Implementation Sequence
1. UI: add "Sort by Due Date" option
   - Update the sort dropdown markup in index.html.
   - Ensure the option value matches backend expected value exactly: `dueDate`.
2. UI wiring verification
   - Confirm public/script.js uses `document.getElementById('sort-select').onchange` to set `currentSort`.
   - Confirm fetchAndRenderTodos composes URL with `&sort=${currentSort}`.
3. Backend verification
   - Confirm todoServer.js supports `sort=dueDate`.
   - Verify ordering:
     - earliest due date -> latest due date
     - missing dueDate -> last
     - ties are stable (see stable-sort risk below)
4. Documentation (optional)
   - If README mentions available sorts, add due date sort.

## 6. QA Sequence
- Manual UI
  - Login -> open Todos -> verify sort dropdown contains "Sort by Due Date".
  - Select "Sort by Due Date" -> verify list reorders.
- Data scenarios
  - Mix todos with dueDate and without dueDate -> confirm no-dueDate items are last.
  - Create multiple todos with the same dueDate -> confirm their relative order is preserved.
  - Single todo -> sorting does not change anything.
  - Empty list -> does not error; shows empty state message.
- Regression
  - Verify sort by Created, Updated, Title still work.
  - Verify search and filter still work when dueDate sort is selected.

## 7. Risks / Mitigations
- Risk: "Stable sort" requirement may not be met if comparator uses a tie-breaker that changes original order.
  - Current server comparator uses `return a.id - b.id` for ties, which can violate "keep relative order".
  - Mitigation: implement an explicitly stable sort on the server for dueDate sorting:
    - decorate: todosWithIndex = todos.map((t, idx) -> ({ t, idx }))
    - sort by (dueDate presence, dueDate value asc, idx asc)
    - undecorate back to todos
- Risk: Relying on JS engine sort stability can be ambiguous.
  - Mitigation: use decorate/sort/undecorate approach so stability is guaranteed.
- Risk: UI option value mismatch causes backend to ignore the sort.
  - Mitigation: keep option value exactly `dueDate` and verify request URL in dev tools.

## 8. Acceptance Criteria (Gherkin) mapping
- AC: Sort option is available in the sort control
  - index.html: add option "Sort by Due Date".
- AC: Selecting "Sort by due date" orders todos from earliest to latest due date
  - public/script.js: pass `sort=dueDate`.
  - todoServer.js: dueDate comparator returns ascending by dueDate.
- AC: Todos without a due date are displayed after todos with a due date
  - todoServer.js: comparator treats missing dueDate as greater than any present dueDate.
- AC: Items with the same due date keep their relative order (stable sort)
  - todoServer.js: ensure stable tie handling (prefer original index, not id).
- AC: Single-item list remains unchanged when sorting by due date
  - Verified via UI QA with one todo.
- AC: Empty list does not error when sorting by due date
  - public/script.js: empty-state rendering; ensure no exceptions when sort is `dueDate`.

## 9. Handoff Summary
- Add a new sort option to the UI (index.html) that triggers existing backend capability.
- Validate end-to-end behavior and adjust backend sort to be explicitly stable if needed.
- QA covers ordering, null-last behavior, stability for ties, and regressions for existing filters/sorts.
