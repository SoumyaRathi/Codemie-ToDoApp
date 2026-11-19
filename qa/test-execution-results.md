# QA Test Execution Results - KAN-152 "Add 'Sort by due date' option in ToDo UI"

| Item | Value |
|------|-------|
| PR | #16 (https://github.com/SoumyaRathi/Codemie-ToDoApp/pull/16) |
| Branch | KAN-152 |
| Tested commit SHA | `57a4ef6ef8c64f0383b3a1f6038a3239a313ab6c` |
| Executed | 2026-11-19, about 18:31 IST |
| Environment | Windows 11 Enterprise 10.0.26200, Node v24.21.0, npm 11.19.0 |
| Tooling | Jest 30.5.2 + Supertest 6.3.3, Playwright 1.65.1 (Chromium, headless) |

The tests ran on a clean tracked tree at the SHA above. The commit that adds this report changes only this file and the regenerated screenshots in `qa/screenshots/`. No code under test differs from the tested SHA.

## Findings from the code (what the tests are based on)

- Sort control: `<select id="sort-select" data-testid="sort-select">` in `index.html`. Options: `Sort by Created`, `Sort by Updated`, `Sort by Title`, and the new `Due date` (value `dueDate`). **The new option is labelled "Due date", not "Sort by due date".** The tests assert the label that is actually in the PR.
- Due date field: `dueDate`, a `YYYY-MM-DD` string. It is omitted from the todo object when not set. The API accepts a valid value, `null` or `""` (clears it), and rejects anything else with 400 `{ field: "dueDate" }`.
- Ordering rule (`compareByDueDate` in `todoServer.js`): ascending by `dueDate`, undated todos last, ties and undated-vs-undated broken by `id` ascending. The tests assert exactly this.
- Persistence: the selected sort is stored in `sessionStorage` (`todoapp.sort`) and restored on reload.
- Auth: the UI requires login. E2E tests register a unique user through the API, then log in through the UI login form. Each new user automatically gets one undated "Welcome to your To-Do List!" todo, which the expected orders account for.
- The UI has no due-date input and does not display `dueDate` on cards. Todos with due dates are therefore created through the API in the E2E setup, and ordering is asserted via card titles.

## Commands executed (exact)

```
git fetch origin
git checkout KAN-152
git pull
npm ci
npm install --save-dev jest@^30.5.2 @playwright/test@^1.64.1
npx playwright install chromium
npx jest --config qa/jest.config.js --verbose      # also available as: npm run test:api
npm run test:e2e                                   # = playwright test --config qa/playwright.config.js
npm test                                           # existing suite: node --test "test/**/*.test.js"
```

Isolation: both suites use temporary data files through the `TODOS_FILE`, `USERS_FILE` and `SESSIONS_FILE` env overrides, so the repo's real `todos.json`, `users.json` and `sessions.json` are never touched. The E2E server runs on port 3100 (`PORT` env). Temp data is removed in teardown.

## Results summary

| Suite | Total | Passed | Failed | Skipped | Blocked |
|-------|------:|-------:|-------:|--------:|--------:|
| API (Jest + Supertest) | 12 | 12 | 0 | 0 | 0 |
| E2E (Playwright, Chromium) | 6 | 6 | 0 | 0 | 0 |
| **Overall** | **18** | **18** | **0** | **0** | **0** |

Regression check (not counted above): the existing `npm test` suite (node:test, from the review-blocker commit) passed 8 of 8.

Overall status: **PASS**

## Test case detail

### API (Jest + Supertest) - `qa/api/dueDateSort.api.test.js`

| ID | Title | AC | Type | Result |
|----|-------|----|------|--------|
| API-01 | POST /todos with dueDate stores and returns the dueDate field | AC2 | API | PASS |
| API-02 | POST /todos without dueDate is retrievable and has no dueDate value | AC3 | API | PASS |
| API-03 | GET /todos?sort=dueDate returns dated todos in ascending dueDate order | AC2 | API | PASS |
| API-04 | GET /todos?sort=dueDate places every undated todo after all dated todos | AC3 | API | PASS |
| API-05 | Seeded data produces the exact expected order (ties and undated by id asc) | AC2, AC3 | API | PASS |
| API-06 | Repeated requests return an identical order (deterministic) | AC3 | API | PASS |
| API-07 | sort=dueDate combined with filter and search keeps due-date ordering | AC2 | API | PASS |
| API-08 | User with only undated todos gets 200, all todos listed, ordered by id | AC3 | API | PASS |
| API-09 | Todos of other users are never included in the sorted list | AC2 | API | PASS |
| API-10 | PUT with a new dueDate re-positions the todo; PUT with null clears it to the end | AC2 | API | PASS |
| API-11 | Invalid dueDate values are rejected with 400 | AC2 | API | PASS |
| API-12 | GET /todos?sort=dueDate without auth returns 401 | AC2 | API | PASS |

Evidence: Jest JSON result `numTotalTests: 12, numPassedTests: 12, numFailedTests: 0, numPendingTests: 0`; console summary `Tests: 12 passed, 12 total`.

### E2E (Playwright, Chromium headless) - `qa/e2e/dueDateSort.spec.js`

| ID | Title | AC | Type | Result | Evidence |
|----|-------|----|------|--------|----------|
| E2E-AC1-01 | Sort control is visible and offers a selectable "Due date" option | AC1 | E2E | PASS | `qa/screenshots/ac1-sort-control.png` |
| E2E-AC2-01 | Selecting "Due date" reorders todos by due date ascending | AC2 | E2E | PASS | `qa/screenshots/ac2-sorted-by-due-date.png` |
| E2E-AC2-02 | Due date sort stays applied after a page reload (session persistence) | AC2 | E2E | PASS | assertions in spec |
| E2E-AC3-01 | Todos without a due date stay visible and are placed after dated todos | AC3 | E2E | PASS | `qa/screenshots/ac3-undated-last.png` |
| E2E-AC3-02 | Placement of undated todos is deterministic across re-sorts and reloads | AC3 | E2E | PASS | assertions in spec |
| E2E-AC3-03 | A user with only undated todos sees them all, without errors | AC3 | E2E | PASS | assertions in spec |

Console summary of the final run: `6 passed (11.2s)`.

What the E2E tests assert:
- **AC1:** the select is visible and enabled, exactly one `Due date` option with value `dueDate`, the full option list is `Sort by Created / Updated / Title / Due date`, selecting it works, and the feedback banner shows `Sort: Due date`.
- **AC2:** three todos are created out of due-date order. The default (created) order is `Middle, Soonest, Later, Welcome`. After selecting Due date the UI shows `Soonest (2026-01-05), Middle (2026-05-20), Later (2026-09-30), Welcome`.
- **AC3:** undated todos are all displayed, after the dated ones, in id order. The order is identical after switching to Title and back, and after a reload. An all-undated user gets the list with no page errors.

## Notes and defects

1. **No product defects found** against the KAN-152 acceptance criteria.
2. **First E2E run: 6 of 6 failed, due to a test-setup bug, not a product bug.** The temporary data directory did not exist, so the server could not write `users.json`, and login after signup returned 401. Fixed in `qa/playwright.config.js` by creating the directory; the rerun and the final run passed 6 of 6. The final figures above are from the final run on the tested SHA.
3. **Label mismatch with the planning documents:** the PR label is "Due date"; `IMPLEMENTATION_PLAN.md` and the Confluence Plan page say "Sort by Due Date". The story AC says "Due date", so this is consistent with the AC.
4. **Observation (out of scope, not changed):** `POST /signup` returns 201 even when writing `users.json` fails (the write error is swallowed). This is what hid the setup problem in note 2.
5. **Observation (out of scope, not changed):** the UI cannot set or display a due date, so the sort can only be exercised with todos created through the API. The sort's effect is not visible to a user except through card order.
6. **Test hooks added to product code (behavior unchanged):** `data-testid="sort-select"` (`index.html`), `data-testid="todo-card"` and `data-testid="todo-title"` (`public/script.js`), and `PORT` env override (`todoServer.js`).
7. **Dependencies:** `jest` and `@playwright/test` were added to `devDependencies`. They were already installed locally but not declared. `package-lock.json` shows large churn from regenerating the lockfile with npm 11.

## Artifacts

- Screenshots: `qa/screenshots/ac1-sort-control.png`, `qa/screenshots/ac2-sorted-by-due-date.png`, `qa/screenshots/ac3-undated-last.png`
- Playwright is configured to keep a screenshot and trace on failure under `qa/.artifacts/` (git-ignored). The final run had no failures, so none were produced.
