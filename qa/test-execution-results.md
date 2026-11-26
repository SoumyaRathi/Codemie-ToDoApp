# KAN-158 QA Test Execution Results

Story: KAN-158 - Add Due Date field support in ToDo UI (input + display)
Jira: https://soumyarathi57.atlassian.net/browse/KAN-158
PR: https://github.com/SoumyaRathi/Codemie-ToDoApp/pull/22 (branch `KAN-158`)

This file replaces the KAN-154 report that was previously at this path (still available in git history, PR #18).

## Summary

| Suite | Total | Passed | Failed | Blocked | Skipped |
|-------|------:|-------:|-------:|--------:|--------:|
| API (Jest + Supertest) | 23 | 23 | 0 | 0 | 0 |
| E2E (Playwright, Chromium) | 17 | 17 | 0 | 0 | 0 |
| **Overall required QA suites (API + E2E)** | **40** | **40** | **0** | **0** | **0** |
| Unit/client (node:test, informational, from KAN-154) | 18 | 18 | 0 | 0 | 0 |

Of those, the tests written for KAN-158 are: API 14 (`qa/api/dueDate.api.test.js`) and E2E 9 (`qa/e2e/dueDate.spec.js`), 23 in total, all passed.
The remaining 9 API and 8 E2E tests are the existing KAN-154 regression tests, which still pass.

**QA Status: PASSED**

## Tested commit

`f82cb5c585289add22a8dd25926cf3ab0bb00011` (`git rev-parse HEAD`, branch `KAN-158`).
The run used that commit plus the uncommitted QA files in this change (`qa/api/`, `qa/e2e/`, and the two config edits below). A report cannot contain the SHA of the commit that adds it.

## Environment

- Date/time: 2026-11-26 12:20 +05:30
- OS: Microsoft Windows 11 Enterprise 10.0.26200 (shell: Git Bash)
- Node: v24.21.0
- npm: 11.19.0
- Jest 30.5.2, supertest 6.3.3, @playwright/test 1.65.1 (Chromium, headless)

## Setup

`npm install` was run and reported `up to date, audited 406 packages`. Jest, Supertest and Playwright were already devDependencies and the scripts `test`, `test:unit`, `test:api` and `test:e2e` already existed, so `package.json` and `package-lock.json` are unchanged.

Changes made for QA enablement:

- `jest.config.js`: `testMatch` also includes `qa/api/**/*.test.js`.
- `playwright.config.js`: `testDir` is `.` and `testMatch` covers `test/e2e/**/*.spec.js` and `qa/e2e/**/*.spec.js`.
- `todoServer.js` was not changed. It already exports `app` and only calls `listen` under `require.main === module`.

Deviations from the request, and why:

- **No `wait-on` or `cross-env`.** Playwright's `webServer` starts the real server with `node` (not nodemon) and waits for the URL itself, and no env var syntax needed cross-platform handling.
- **E2E server runs on port 3101, not 3000.** The existing harness (`test/e2e/start-test-server.js`) runs `todoServer.js` with `node` on 3101, so the tests cannot collide with a developer's server on 3000.
- **No backup/restore of `todos.json`, `users.json`, `sessions.json`.** Both API and E2E tests point the server at a throwaway directory via `TODO_DATA_DIR`, so the repo files are never opened. SHA-256 checksums of the three files were taken before and after the full run and matched (`sha256sum -c` reported OK for all three).

## Commands executed and output

### `npm install`

```
up to date, audited 406 packages in 3s
60 packages are looking for funding
```

### `npm run test:api`

```
> jest --config jest.config.js

Test Suites: 2 passed, 2 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        1.045 s
```

KAN-158 API tests (`npx jest --config jest.config.js qa/api --json`):

```
PASS  AC1: POST /todos with a valid dueDate returns 201 and echoes it, and it persists
PASS  AC2: POST /todos without dueDate returns 201 and no dueDate property
PASS  AC3: PUT sets a dueDate on a todo that had none, and can change it afterwards
PASS  AC4: PUT with dueDate = empty string clears an existing dueDate
PASS  AC4: PUT with dueDate = null clears an existing dueDate
PASS  AC5: GET /todos returns dueDate only on todos that have one
PASS  AC6: POST rejects impossible calendar date (2025-02-30)
PASS  AC6: POST rejects not a date (not-a-date)
PASS  AC6: POST rejects wrong format (12/01/2026)
PASS  AC6: POST rejects five digit year (10000-01-01)
PASS  AC6: POST rejects non-string value (20250101)
PASS  AC6: PUT rejects an invalid dueDate and leaves the stored value unchanged
PASS  AC7 earliest (0001-01-01): POST returns 201, echoes, persists; PUT accepts it
PASS  AC8 latest (9999-12-31): POST returns 201, echoes, persists; PUT accepts it
total 14 passed 14 failed 0 pending 0
```

### `npm run test:e2e`

```
> playwright test --config playwright.config.js

Running 17 tests using 1 worker

  ✓   1 qa\e2e\dueDate.spec.js › AC1: create todo with a due date sends it to the API and shows it on the card (2.7s)
  ✓   2 qa\e2e\dueDate.spec.js › AC2: create todo without a due date shows no due date and omits it from the request (2.8s)
  ✓   3 qa\e2e\dueDate.spec.js › AC3: edit a todo without a due date, set one, and see it displayed (3.7s)
  ✓   4 qa\e2e\dueDate.spec.js › AC4: clearing the due date sends an empty dueDate and removes it from the card (3.7s)
  ✓   5 qa\e2e\dueDate.spec.js › AC5: after refresh, todos with a due date show it and todos without show no placeholder (1.7s)
  ✓   6 qa\e2e\dueDate.spec.js › AC6: invalid due date › client-side: malformed values block saving, show an inline error and send nothing (3.0s)
  ✓   7 qa\e2e\dueDate.spec.js › AC6: invalid due date › server-side: a 400 with field=dueDate shows the inline error, keeps the modal open, and recovers on retry (2.9s)
  ✓   8 qa\e2e\dueDate.spec.js › AC7: earliest date 0001-01-01 can be created, edited to, and is displayed correctly (4.7s)
  ✓   9 qa\e2e\dueDate.spec.js › AC8: latest date 9999-12-31 can be created, edited to, and is displayed correctly (4.7s)
  ✓  10-17 test\e2e\sortByDueDate.spec.js (8 KAN-154 regression tests)

  17 passed (51.0s)
```

(Tests 10-17 are condensed here; all 8 showed a passing mark in the raw run.)

### `npm run test:unit` (informational)

```
ℹ tests 18
ℹ pass 18
ℹ fail 0
ℹ skipped 0
```

### Test sensitivity check

To confirm the E2E tests can fail, `public/script.js` was temporarily broken (due date label given a wrong class, and the edit request stopped sending `dueDate`). Result: 7 failed, 2 passed. The two that passed (AC2 and AC6 client-side) do not depend on either change. The file was then restored and no diff against HEAD remained. This is not part of the counts above.

## Acceptance criteria mapping

| AC | Scenario | API test | E2E test | Outcome |
|----|----------|----------|----------|---------|
| AC1 | Create ToDo with due date | `AC1: POST /todos with a valid dueDate...` | `AC1: create todo with a due date sends it to the API and shows it on the card` (asserts POST body `dueDate` and card text `Due: 2026-12-01`) | PASSED |
| AC2 | Create ToDo without due date | `AC2: POST /todos without dueDate...` | `AC2: create todo without a due date...` (asserts POST body has no `dueDate`, no `.todo-due-date` element) | PASSED |
| AC3 | Edit ToDo due date | `AC3: PUT sets a dueDate...` | `AC3: edit a todo without a due date, set one...` (asserts PUT body and displayed text) | PASSED |
| AC4 | Clear an existing due date | `AC4` x2 (`""` and `null`) | `AC4: clearing the due date sends an empty dueDate...` (asserts PUT sends `""`, removed from card, still absent after reload) | PASSED |
| AC5 | Display due date from API response | `AC5: GET /todos returns dueDate only on todos that have one` | `AC5: after refresh...` (one dated and one undated todo; exactly one `.todo-due-date` on the page, no "Due" text on the undated card) | PASSED |
| AC6 | Reject invalid due date | `AC6` x6 (400 plus `field: "dueDate"`, nothing stored or changed) | `AC6 client-side` (values set programmatically; inline error shown, modal stays open, zero POST/PUT requests) and `AC6 server-side` (network-intercepted 400 `{ field: "dueDate" }`; inline error shown with the server message, modal stays open, then retry succeeds) | PASSED |
| AC7 | Earliest date | `AC7 earliest (0001-01-01)` POST and PUT | `AC7: earliest date 0001-01-01...` (create, edit, and persists after reload) | PASSED |
| AC8 | Latest date | `AC8 latest (9999-12-31)` POST and PUT | `AC8: latest date 9999-12-31...` (create, edit, and persists after reload) | PASSED |

No test was blocked, skipped or failed, so there is no blocked-evidence to attach.

## Notes and limitations

- **Boundary definition (AC7/AC8):** the date input in `index.html` has no `min` or `max` attribute, so the "earliest/latest allowed by the UI control" is the browser's own range. `0001-01-01` and `9999-12-31` were accepted by Chromium and by the API. Values beyond year 9999 were not tested through the UI. The API rejects five-digit years (covered in AC6). The server's `parseDueDate` logic also accepts year `0000` (checked by evaluating its date check in Node, not by an HTTP test), so the API has no real lower bound beyond the format; no test asserts this.
- **AC6 client-side:** a native date control cannot hold invalid text, so the test changes the input to `type="text"` and sets the value, which is what editing the DOM in devtools would do. The server-side path is covered separately by intercepting the response.
- **Browser coverage:** Chromium only, as requested.
- **Not covered:** the label floating behavior fixed in `f82cb5c` is a visual check and has no automated test here.
