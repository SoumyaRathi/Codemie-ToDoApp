# KAN-142 - Test Execution Results (Phase 7)

- Story: KAN-142 - Sort by due date (https://soumyarathi57.atlassian.net/browse/KAN-142)
- PR: https://github.com/SoumyaRathi/Codemie-ToDoApp/pull/6
- Branch: `KAN-142`

## Run details

| Item | Value |
|---|---|
| Executed (UTC) | 2026-10-24, 16:57:21Z to 16:58:23Z |
| Base commit (`git rev-parse HEAD`) | `300f41cc16cb48d0daae3dce9badf4870a898c17` |
| Code under test | The base commit plus the uncommitted test and testability changes, which are included in the commit that adds this file. A file cannot contain the SHA of the commit that contains it, so the SHA above is the parent. |
| Node / npm | v24.21.0 / 11.19.0 |
| Jest / supertest | 30.5.2 / ^6.3.3 |
| Playwright | 1.64.1 (Chromium) |
| OS | Microsoft Windows 11 Enterprise, version 10.0.26200 |

## Commands executed

```
git fetch origin
git checkout KAN-142
git pull --ff-only origin KAN-142
npm install --save-dev jest @playwright/test
npx playwright install chromium
npm ci
npm run test:api
npm run test:e2e
npm run test:all
```

All commands exited with code 0.

## Results summary

| Suite | Tool | Total | Passed | Failed | Skipped | Blocked |
|---|---|---|---|---|---|---|
| API | Jest + supertest | 10 | 10 | 0 | 0 | 0 |
| E2E | Playwright (Chromium) | 10 | 10 | 0 | 0 | 0 |
| **Total** | | **20** | **20** | **0** | **0** | **0** |

`npm run test:all` (API then E2E) also finished with 10/10 + 10/10 passed.

## Test inventory

The 20 scenarios were derived from the acceptance criteria in `IMPLEMENTATION_PLAN.md`. The Phase 7 scenario list referenced by the prompt was not supplied to the executor, so map these names to the Phase 7 scenarios during Phase 8 validation.

### API - `test/api/todos.sort.dueDate.test.js`

1. returns todos with the earliest due date first
2. places todos without a due date after all todos with a due date
3. orders todos sharing the same due date by id ascending
4. orders todos that all lack a due date by id ascending
5. returns the identical order on repeated requests
6. moves a todo to the end once its due date is cleared via PUT
7. rejects an invalid due date with 400 and does not store the todo
8. keeps other sort modes working and independent of the due date order
9. keeps due date order after toggling completion and honours filter=active
10. keeps the remaining todos in due date order after a delete

### E2E - `test/e2e/sort-by-due-date.spec.js`

1. offers "Sort by due date" in the sort dropdown after logging in through the form
2. selecting the option requests GET /todos with sort=dueDate
3. lists the earliest due date first
4. places todos without a due date after all dated todos
5. keeps todos with the same due date in a deterministic (creation) order
6. keeps undated todos in the same order after a page reload
7. restores other sort behaviour when switching away from due date
8. lets the user mark a todo complete while sorted, keeping the order
9. lets the user delete a todo while sorted, keeping the remaining order
10. shows "No todos found." without script errors when sorting an empty list

## Test sensitivity check (mutation)

To confirm the tests are not vacuous, two temporary mutations were applied (and then reverted) before the final runs:

- Server due date comparison reversed: 6 of 10 API tests failed.
- `<option value="dueDate">` removed from `index.html`: 10 of 10 E2E tests failed (test 1 on the missing option; 2-10 on the timeout waiting for the `sort=dueDate` request).

## Hermetic setup

- `todoServer.js` now reads `TODO_DATA_DIR` (data directory, default unchanged) and `PORT` (default 3000), exports `app`, and only calls `listen` when run directly. Default behavior of `npm start` is unchanged.
- API tests use a temporary OS directory and reset `todos.json`, `users.json` and `sessions.json` before every test.
- E2E tests run the server on port 3100 with data in `test/.tmp/e2e-data` (git-ignored), reset before every test, with a single worker.
- Tracked data files (`todos.json`, `users.json`, `sessions.json`) are not touched by the tests.

## Failures

None.

## Notes and limitations

- The UI does not display or accept a due date, so E2E tests seed due dates through the API and assert on the visible card order.
- Known gap carried over from Phase 6, not covered by a test: the server treats any non-empty stored `dueDate` as valid, so a hand-edited invalid value (for example `2025-13-40` in `todos.json`) would sort among valid dates. The API rejects such values on create and update (API test 7).
- Google Fonts links in `index.html` need network access; the tests do not depend on them loading.
