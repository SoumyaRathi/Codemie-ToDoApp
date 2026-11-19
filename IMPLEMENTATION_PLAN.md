# ToDoApp - Implementation Plan

## 1. Overview

This plan implements KAN-148 by adding a "Sort by due date" option in the Todos list UI. The UI will request sorting from the existing GET /todos API via a query parameter (sort=dueDate). Server-side sorting behavior will be aligned with the story rules for ascending and descending ordering, stable sorting, and graceful handling of missing/invalid due dates.

No production code is written in this phase; this document describes the intended changes.

## 2. Inputs & Traceability (Story key and URL)

- Story: KAN-148 - Add "Sort by due date" option in Todos UI
- URL: https://soumyarathi57.atlassian.net/browse/KAN-148

## 3. Planned File Edits (real repo paths only)

- index.html
  - Add new sort dropdown option for due date.
  - Potentially add direction controls (ASC/DESC) if required by acceptance criteria (see Risks/Mitigations).

- public/script.js
  - Update sort state management to support due date and (if implemented) direction.
  - Ensure switching sort option updates list immediately with no reload (already fetches and re-renders).
  - Update UI feedback banner text via updateFilterSortFeedback so new option label appears.

- todoServer.js
  - Update GET /todos sorting logic for dueDate to match AC: ascending/descending, null placement rules, stable tie-breaking, and invalid/empty handling.
  - Potentially extend query params to accept sortDir=asc|desc while remaining backward compatible.

- README.md (optional)
  - Document new sort option usage and query parameters if changed.

## 4. Work Breakdown (outcome mapped to real files)

- UI: expose "Due date" in sort dropdown
  - index.html -> add option value "dueDate" with label "Sort by due date" (or "Due date").
  - public/script.js -> ensure currentSort can take "dueDate" and triggers fetchAndRenderTodos on change.

- UI: allow ascending vs descending selection (if required)
  - index.html -> add secondary dropdown or toggle for direction (e.g., "Asc" / "Desc").
  - public/script.js -> add currentSortDir state and include sortDir query param in the GET /todos URL.

- API: implement deterministic, stable dueDate sort and null handling
  - todoServer.js -> update sort=dueDate branch to:
    - Interpret dueDate as ISO date string YYYY-MM-DD; treat missing/empty/invalid as null.
    - Apply direction handling (default asc if sortDir not present).
    - Stable sorting: when dueDates are equal (including both null), tie-break by an existing deterministic field (id, or createdAt then id).

## 5. Implementation Sequence

1. Server first: align GET /todos sorting contract
   - todoServer.js: define direction support for dueDate (proposed: accept sortDir=asc|desc; default asc).
   - todoServer.js: centralize dueDate normalization in GET /todos (helper function inside route or module-level) to avoid inconsistencies.
   - todoServer.js: implement comparator for dueDate:
     - Parse dueDate values, treat invalid as null.
     - Asc: earliest first; null last.
     - Desc: latest first; null first.
     - Ties: keep deterministic order via secondary sort key (createdAt and/or id) to avoid jitter.

2. UI: add dueDate sort option
   - index.html: add "Sort by due date" option in the sort select.
   - public/script.js: validate that sort-select values map to server query param values.

3. UI: direction controls (if implemented)
   - index.html: add direction control (select/toggle) for asc/desc.
   - public/script.js: include sortDir in request URL and update filter/sort feedback text.

4. Documentation (optional)
   - README.md: update "Search/Filter/Sort" notes to mention due date sort and direction behavior.

## 6. QA Sequence

1. Local smoke test
   - npm install, npm start, login, verify todos load.
   - Select "Due date" sort and verify list refreshes immediately (network call to /todos).

2. Data setup for testing
   - Create or edit multiple todos with dueDate values spanning different dates; also create todos without dueDate.
   - If possible, inject an invalid dueDate in the data store for negative testing (e.g., "2025-99-99" or "invalid").

3. Functional verification
   - Asc order: earliest dueDate at top; null dueDate items placed last.
   - Desc order: latest dueDate at top; null dueDate items placed first (if direction implemented).
   - Equal dueDate: confirm stable/deterministic ordering (no jitter between refreshes).
   - All null due dates: selecting due-date sort does not error; ordering remains deterministic.
   - Invalid due dates present: UI does not crash; invalid treated per null rules.

4. Regression
   - Existing sort options still work.
   - Filter and search still combine correctly with sort.

## 7. Risks / Mitigations

- Risk: UI currently has only one sort dropdown, but AC mentions both ascending and descending behaviors.
  - Mitigation: implement a lightweight sort direction control (toggle or secondary select) and extend server API with sortDir, keeping backward compatibility.

- Risk: Existing server dueDate sort may not match null placement and direction rules.
  - Mitigation: update comparator and add explicit rules per AC; validate via QA checklist.

- Risk: JS Array.sort stability historically varied across engines.
  - Mitigation: enforce deterministic tie-breaker (createdAt and/or id) so results are stable regardless of engine stability guarantees.

## 8. Acceptance Criteria (Gherkin) mapping

- Sort option is visible in the Todos UI
  - index.html: add dueDate option.

- Sorting by due date orders items ascending by due date
  - todoServer.js: implement asc comparator, null-last.

- Sorting by due date orders items descending by due date (if direction toggle exists)
  - index.html + public/script.js: direction toggle/select and pass sortDir.
  - todoServer.js: implement desc comparator, null-first.

- Todos without a due date are handled consistently when sorting (e.g., last)
  - todoServer.js: explicit null placement rules.

- Selecting "Sort by due date" updates ordering without data loss
  - public/script.js: existing fetch and render flow; verify no client-side mutation of todo objects.

- Invalid/malformed due date values do not break sorting and are handled gracefully
  - todoServer.js: normalize invalid/empty to null; do not throw.

- Sorting persists for the current session/view when navigating within the list
  - public/script.js: keep currentSort/currentSortDir in module state; ensure re-render respects it.

- Reverting from "Sort by due date" returns to the previous/default sort
  - index.html + public/script.js: selecting a different sort option triggers fetch with that option.

## 9. Handoff Summary

- Add a new "Due date" sort option in the UI (index.html) and ensure selection triggers the existing fetch-and-render flow (public/script.js).
- Adjust server-side /todos sorting for dueDate to follow acceptance criteria, including direction support and null placement (todoServer.js).
- Validate with manual QA steps covering asc/desc, nulls, invalid values, and stability.
