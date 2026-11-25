# KAN-155 QA Test Execution Results

Story: KAN-155 - Expose due date in Create/Edit Todo UI (https://soumyarathi57.atlassian.net/browse/KAN-155)
PR: #19 https://github.com/SoumyaRathi/Codemie-ToDoApp/pull/19 (branch `KAN-155`)

(This file replaces the KAN-154 report, which remains available in git history.)

## Summary

| Suite | Total | Passed | Failed | Skipped | Blocked |
|-------|------:|-------:|-------:|--------:|--------:|
| API (Jest + Supertest) | 46 | 46 | 0 | 0 | 0 |
| E2E (Playwright, Chromium) | 27 | 27 | 0 | 0 | 0 |
| **Overall (API + E2E)** | **73** | **73** | **0** | **0** | **0** |
| Unit/client (`node --test`, pre-existing, regression run) | 18 | 18 | 0 | 0 | 0 |

Of the 73 API + E2E tests, 56 are new for KAN-155 (37 API + 19 E2E). The other 17 are the KAN-154 regression tests (9 API + 8 E2E), which still pass.
Counting the 18 pre-existing unit tests as well (`npm test`): 91 total, 91 passed.

**QA Status: PASSED**

## Tested commit

`5d2507f6e3fd3b2dc5073ba2dd67c909a5a76e85` (`git rev-parse HEAD`). The two new test files were untracked at run time and are committed right after this SHA together with this report (a report cannot contain its own commit SHA). No application code was changed by the QA step.

## Environment

- Date/time: 2026-11-25 16:46 +05:30 (start of the final run)
- OS: Microsoft Windows 11 Enterprise, Version 10.0.26200.9974 (shell: Git Bash)
- Node: v24.21.0
- npm: 11.19.0
- Jest 30.5.2, Supertest 6.3.3, Playwright 1.65.1 (Chromium)

## Commands executed (in order)

```
git fetch origin
git branch --show-current            # KAN-155
git pull                             # Already up to date
npm install
npx playwright install chromium      # no download needed, browser already installed
npx jest --config jest.config.js test/api/dueDateCrud.test.js     # development run of the new API file
npx playwright test --config playwright.config.js dueDateUi        # development run of the new E2E file
npm run test:api
npm run test:e2e
npm run test:unit
```

`package.json` needed no change: the `test`, `test:unit`, `test:api` and `test:e2e` scripts, the Jest/Supertest/Playwright devDependencies and the untouched `start` script were already added on this branch's base by KAN-154.
The E2E server is started by `playwright.config.js` (`webServer`) on port 3101 with an isolated temp data directory (`TODO_DATA_DIR`) so it cannot clash with a dev server on port 3000 and never touches the repo's `todos.json`/`users.json`/`sessions.json`. API tests import the exported Express `app` (no listening port) with their own temp data directory.

## Files added

- `test/api/dueDateCrud.test.js` - Jest + Supertest, 37 tests
- `test/e2e/dueDateUi.spec.js` - Playwright + Chromium, 19 tests
- `qa/test-execution-results.md` - this report

## Acceptance criteria coverage

| AC | API test(s) | E2E test(s) |
|----|-------------|-------------|
| 1 Create with due date | POST with dueDate returns and persists it | create sends `dueDate` in the POST body; card shows `Due: 2030-05-17` |
| 2 Create without due date | POST without / `null` / `""` stores no `dueDate` | POST body has no dueDate; no `.todo-due-date` on the card |
| 3 Edit shows existing due date | GET returns the stored value | edit modal `#edit-due-date` prefilled; undated todo opens blank; create form is reset |
| 4 Update due date | PUT new date persists (GET + list) | PUT body carries the new date; card updates; persists after reload and prefills again |
| 5 Clear due date | PUT `""` and PUT `null` remove the field | PUT body has `dueDate` `""`/null; line disappears; stays gone after reload; API record has no `dueDate` |
| 6 Invalid due date (create) | 11 invalid inputs -> 400, `field: "dueDate"`, nothing created | 3 invalid values -> 400, `#todo-form-error` visible, modal open, no card created, nothing stored |
| 7 Invalid due date (edit) | 11 invalid inputs -> 400, `field: "dueDate"`, todo unchanged | 3 invalid values -> 400, inline error, modal open, stored title and dueDate unchanged |
| 8 Boundary: today | POST and PUT with today's date | create with today; shown on card and after reload |

Additional checks: leap day accepted; `2027-02-29`, month 13, ISO timestamp, number/boolean/object types rejected; omitting `dueDate` on PUT keeps the existing value; auth required (401); another user's todo cannot be changed (404); error text clears on reopen; user can correct the date after an error and save.

## Notes on AC6/AC7 (read this)

- A real `<input type="date">` cannot hold an unparseable string: Chromium sanitizes any invalid value to `""`. One E2E test asserts this. So the UI cannot be made to send an invalid date through the date control itself.
- To exercise the app's validation path, the E2E tests switch `#edit-due-date` to `type="text"` through `page.evaluate` and enter the invalid value, as suggested in the QA request.
- The AC text says "I cannot submit the form". Actual behavior: the form does submit, the server rejects it with 400 `{ field: "dueDate" }`, and the UI shows the error and keeps the modal open. The tests assert that real behavior (and that no data is created or changed), not a client-side block.
- Sanity check that the tests detect a missing feature: with `public/script.js` temporarily reverted to the pre-KAN-155 version, 6 of 6 selected E2E tests (AC1, AC3, AC5, AC6 x3) failed. The file was restored afterwards; the commit contains no such change.

## Terminal output

### API (`npm run test:api`)

```
> 02-nodejs@1.0.0 test:api
> jest --config jest.config.js

Test Suites: 2 passed, 2 total
Tests:       46 passed, 46 total
Snapshots:   0 total
Time:        1.342 s, estimated 2 s
Ran all test suites.
```

Per file: `test/api/dueDateCrud.test.js` 37 passed (first dev run: `Tests: 37 passed, 37 total`), `test/api/sortByDueDate.test.js` 9 passed.

### E2E (`npm run test:e2e`)

```
Running 27 tests using 1 worker

  ✓   1 ... KAN-155 due date in Create/Edit Todo UI › design: modal has an optional date input #edit-due-date and a hidden #todo-form-error (1.9s)
  ✓   2 ... › AC1: create todo with due date sends dueDate and shows it on the card (2.3s)
  ✓   3 ... › AC2: create todo without due date omits dueDate and shows no due line (2.4s)
  ✓   4 ... › AC3: edit form is pre-populated with the existing due date; undated todo opens blank (4.8s)
  ✓   5 ... › create form is reset after editing a dated todo (4.3s)
  ✓   6 ... › AC4: update due date sends the new value, updates the card and persists after reload (5.8s)
  ✓   7 ... › AC4: a due date can be added to a todo that had none (4.7s)
  ✓   8 ... › AC5: clearing the due date sends an empty dueDate, removes the line and persists after reload (4.5s)
  ✓   9 ... › AC8: today as the due date is sent, saved and displayed (2.5s)
  ✓  10 ... › due line appears only on todos that have a due date (3.4s)
  ✓  11 ... › native date control sanitizes unparseable strings to empty (cannot hold an invalid value) (1.9s)
  ✓  12 ... › AC6: create with invalid due date "2025-02-30" shows an inline error, keeps the modal open and creates nothing (2.3s)
  ✓  13 ... › AC6: create with invalid due date "not-a-date" ... (2.3s)
  ✓  14 ... › AC6: create with invalid due date "2025/01/01" ... (2.3s)
  ✓  15 ... › AC7: edit with invalid due date "2025-02-30" shows an inline error, keeps the modal open and saves nothing (4.3s)
  ✓  16 ... › AC7: edit with invalid due date "not-a-date" ... (3.9s)
  ✓  17 ... › AC7: edit with invalid due date "2025/01/01" ... (3.8s)
  ✓  18 ... › validation error is cleared when the modal is reopened (2.5s)
  ✓  19 ... › after an invalid-date error the user can correct the date and save (2.6s)
  ✓  20-27 ... KAN-154 Sort by due date (8 regression tests)

  27 passed (1.4m)
```

### Unit/client regression (`npm run test:unit`)

```
ℹ tests 18
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```
