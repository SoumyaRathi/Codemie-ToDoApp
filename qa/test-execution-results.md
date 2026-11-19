# KAN-154 QA Test Execution Results

Story: KAN-154 - Add "Sort by due date" option in todos list UI
PR: https://github.com/SoumyaRathi/Codemie-ToDoApp/pull/18 (branch `KAN-154`)

## Summary

| Suite | Total | Passed | Failed | Blocked | Skipped |
|-------|------:|-------:|-------:|--------:|--------:|
| API (Jest + Supertest) | 9 | 9 | 0 | 0 | 0 |
| E2E (Playwright, Chromium) | 8 | 8 | 0 | 0 | 0 |
| Unit/client (node:test, added in the review-fix commit) | 18 | 18 | 0 | 0 | 0 |
| **Overall (`npm test`)** | **35** | **35** | **0** | **0** | **0** |

Required QA suites only (API + E2E): 17 total, 17 passed, 0 failed, 0 blocked, 0 skipped.

**QA Status: PASSED**

## Tested commit

`784c27febe961a424e9860f323c30d66e72d0a95` (`git rev-parse HEAD` at the time of the run, clean tracked tree).
This report was added in the commit after it, so it cannot contain its own SHA.

## Environment

- Date/time: 2026-11-19 19:49-19:50 +05:30
- OS: Microsoft Windows 11 Enterprise 10.0.26200 (shell: Git Bash / MINGW64)
- Node: v24.21.0
- npm: 11.19.0
- Jest 30.5.2, Playwright 1.65.1 (Chromium)

## Commands executed (in order)

```
git fetch origin
git checkout KAN-154 && git pull          # up to date with origin/KAN-154
npm install -D jest @playwright/test      # added the two devDependencies
npx playwright install chromium
npm install
npx playwright install chromium
npm run test:api
npm run test:e2e
npm test                                  # test:unit && test:api && test:e2e
```

All commands exited with code 0.

Scripts added to `package.json`:

- `test`: `npm run test:unit && npm run test:api && npm run test:e2e`
- `test:unit`: `node --test "test/*.test.js"`
- `test:api`: `jest --config jest.config.js`
- `test:e2e`: `playwright test --config playwright.config.js`

## API tests (Jest + Supertest) - 9 / 9 passed

File: `test/api/sortByDueDate.test.js`. Each test authenticates through `/signup` and `/login` and sends the token in the `Authorization` header.

```
Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

Per-test results (from `npx jest --config jest.config.js --json`, 9 total / 9 passed / 0 failed / 0 pending):

```
PASSED - GET /todos?sort=dueDate AC2: due-dated todos are ordered earliest to latest
PASSED - GET /todos?sort=dueDate AC3: todos without dueDate come after every todo with a dueDate
PASSED - GET /todos?sort=dueDate tie-break: equal dueDates are ordered by id ascending
PASSED - GET /todos?sort=dueDate tie-break: todos without dueDate are ordered by id ascending
PASSED - GET /todos?sort=dueDate full order is deterministic across repeated requests
PASSED - GET /todos?sort=dueDate ordering is kept after editing and toggling a todo (AC4, API level)
PASSED - GET /todos?sort=dueDate requires authentication
PASSED - default ordering (AC5 regression) GET /todos?sort=createdAt returns newest first
PASSED - default ordering (AC5 regression) createdAt order differs from dueDate order
```

Note: in this non-interactive shell the default `npm run test:api` output showed only the summary lines. The per-test names above come from an additional `--json` run of the same suite, which also gave 9 / 9.

## E2E tests (Playwright + Chromium) - 8 / 8 passed

File: `test/e2e/sortByDueDate.spec.js`. Each test signs up and logs in through the UI with a unique email. The todos with due dates are seeded through `POST /todos`, because the UI cannot set a due date.

```
Running 8 tests using 1 worker

  ✓  1 [chromium] › sortByDueDate.spec.js:53:3 › AC1: sort dropdown shows a due date option (1.8s)
  ✓  2 [chromium] › sortByDueDate.spec.js:61:3 › AC2 + AC3: due date sort orders earliest to latest with undated todos last (1.8s)
  ✓  3 [chromium] › sortByDueDate.spec.js:68:3 › AC4: sorting persists after creating a todo (2.8s)
  ✓  4 [chromium] › sortByDueDate.spec.js:84:3 › AC4: sorting persists after completing a todo (2.8s)
  ✓  5 [chromium] › sortByDueDate.spec.js:95:3 › AC4: sorting persists after editing a todo (3.7s)
  ✓  6 [chromium] › sortByDueDate.spec.js:108:3 › AC4: sorting persists after deleting a todo (2.7s)
  ✓  7 [chromium] › sortByDueDate.spec.js:119:3 › AC5: switching back to the default sort restores createdAt ordering (1.7s)
  ✓  8 [chromium] › sortByDueDate.spec.js:129:3 › AC5: Clear filters resets the due date sort to the default (1.9s)

  8 passed (20.7s)
```

## Unit/client tests (node:test) - 18 / 18 passed

Files: `test/dueDateSort.api.test.js` and `test/sortPersistence.client.test.js`. These were added earlier in the review-fix commit `cba12d0` and run as part of `npm test`.

```
ℹ tests 18
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

## Acceptance criteria mapping

| AC | Covered by |
|----|------------|
| 1 Show sort option | E2E "AC1" |
| 2 Ascending by due date | API "AC2"; E2E "AC2 + AC3" |
| 3 Undated todos last | API "AC3"; E2E "AC2 + AC3" |
| 4 Sort persists (create / edit / complete) | E2E "AC4" create, complete, edit, plus delete; API edit/toggle check; node:test client tests |
| 5 Switch back to default | API "AC5 regression" (createdAt newest first); E2E "AC5" dropdown switch and "Clear filters" |

## Test data strategy

- **Isolation:** `todoServer.js` reads its JSON files from `TODO_DATA_DIR` (default: the repo folder, so `npm start` behaves as before). Tests never touch the real `todos.json`, `users.json` or `sessions.json`.
  - Jest API tests use a fresh `os.tmpdir()` directory created with `mkdtemp`. The directory is removed in `afterAll`.
  - E2E tests use `os.tmpdir()/todoapp-e2e-data-3101`. `test/e2e/start-test-server.js` recreates it empty at startup, and the global teardown deletes it.
- **Importability:** `todoServer.js` exports `app` and only calls `listen` when run directly (`require.main === module`). Supertest imports it without binding a port.
- **E2E server:** Playwright's `webServer` starts `node test/e2e/start-test-server.js` on port **3101** (override with `E2E_PORT`) with `reuseExistingServer: false`. Playwright stops it when the run ends. Playwright output goes to `os.tmpdir()`, so the repo's `test-results/` folder is not used.
- **Users:** the API tests use `qa-<timestamp>@example.com`. The E2E tests use `qa-<uuid>@example.com`, one per test.
- **Data shape:** the API tests seed due dates `2026-12-31`, `2026-01-05`, and two on `2026-06-01` (tie), plus todos with no due date. The E2E tests seed `2026-12-31` and two on `2026-01-05` (tie), plus one undated todo. Each signup also adds an undated "Welcome" todo.
- **Selectors:** the app already has stable element ids and classes, so no `data-testid` attributes or other HTML changes were needed.
- **Sensitivity check:** I ran both suites with the comparator and the `dueDate` option deliberately broken. The API suite failed 4 of 9 tests, and the E2E suite failed 8 of 8. I restored the files, and the suites pass on the tested commit.
- **Out of scope for this run:** only Chromium was run, with no other browsers or viewport sizes. No manual exploratory testing was done.
