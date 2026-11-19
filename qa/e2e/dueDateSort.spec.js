const { test, expect } = require('@playwright/test');
const path = require('path');

const PASSWORD = 'Passw0rd!';
const SORT_LABEL = 'Due date';
const WELCOME = 'Welcome to your To-Do List!';
const SHOT_DIR = path.join(__dirname, '..', 'screenshots');

// The UI has no due-date input, so todos with due dates are created through the API.
async function createUser(request, label) {
  const email = `qa-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const signup = await request.post('/signup', { data: { name: 'QA User', email, password: PASSWORD } });
  expect(signup.status()).toBe(201);
  const login = await request.post('/login', { data: { email, password: PASSWORD } });
  expect(login.status()).toBe(200);
  const { token } = await login.json();
  return { email, token };
}

async function createTodo(request, token, title, dueDate) {
  const data = { title, description: `desc ${title}`, completed: false };
  if (dueDate) data.dueDate = dueDate;
  const res = await request.post('/todos', { headers: { Authorization: token }, data });
  expect(res.status()).toBe(201);
}

async function loginViaUi(page, email) {
  await page.goto('/');
  await expect(page.locator('#auth-modal')).toBeVisible();
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(PASSWORD);
  await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/login') && r.status() === 200),
    page.locator('#auth-submit-btn').click()
  ]);
  await expect(page.locator('#auth-modal')).toBeHidden();
  await expect(page.getByTestId('todo-card').first()).toBeVisible();
}

async function selectDueDateSort(page) {
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/todos?') && r.url().includes('sort=dueDate') && r.status() === 200),
    page.getByTestId('sort-select').selectOption({ label: SORT_LABEL })
  ]);
}

const titles = page => page.getByTestId('todo-title');

test.describe('KAN-152 E2E: Due date sort', () => {
  test('[E2E-AC1-01] Sort control is visible and offers a selectable "Due date" option', async ({ page, request }) => {
    const { email } = await createUser(request, 'ac1');
    await loginViaUi(page, email);

    const sort = page.getByTestId('sort-select');
    await expect(sort).toBeVisible();
    await expect(sort).toBeEnabled();

    const option = sort.locator('option', { hasText: SORT_LABEL });
    await expect(option).toHaveCount(1);
    await expect(option).toHaveAttribute('value', 'dueDate');

    // Pre-existing sort options are still offered (regression).
    await expect(sort.locator('option')).toHaveText(['Sort by Created', 'Sort by Updated', 'Sort by Title', SORT_LABEL]);

    await selectDueDateSort(page);
    await expect(sort).toHaveValue('dueDate');
    await expect(page.locator('#filter-sort-feedback')).toContainText(`Sort: ${SORT_LABEL}`);
    await page.screenshot({ path: path.join(SHOT_DIR, 'ac1-sort-control.png') });
  });

  test('[E2E-AC2-01] Selecting "Due date" reorders todos by due date ascending', async ({ page, request }) => {
    const { email, token } = await createUser(request, 'ac2');
    // Created out of due-date order on purpose.
    await createTodo(request, token, 'QA Later', '2026-09-30');
    await createTodo(request, token, 'QA Soonest', '2026-01-05');
    await createTodo(request, token, 'QA Middle', '2026-05-20');
    await loginViaUi(page, email);

    // Default sort is createdAt (newest first), which differs from due-date order.
    await expect(titles(page)).toHaveText(['QA Middle', 'QA Soonest', 'QA Later', WELCOME]);

    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(['QA Soonest', 'QA Middle', 'QA Later', WELCOME]);
    await page.screenshot({ path: path.join(SHOT_DIR, 'ac2-sorted-by-due-date.png') });
  });

  test('[E2E-AC2-02] Due date sort stays applied after a page reload (session persistence)', async ({ page, request }) => {
    const { email, token } = await createUser(request, 'ac2persist');
    await createTodo(request, token, 'QA Later', '2026-09-30');
    await createTodo(request, token, 'QA Soonest', '2026-01-05');
    await loginViaUi(page, email);
    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(['QA Soonest', 'QA Later', WELCOME]);

    // Reload keeps the session (sessionStorage) and the stored token (localStorage).
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/todos?') && r.url().includes('sort=dueDate') && r.status() === 200),
      page.reload()
    ]);
    await expect(page.getByTestId('sort-select')).toHaveValue('dueDate');
    await expect(titles(page)).toHaveText(['QA Soonest', 'QA Later', WELCOME]);
  });

  test('[E2E-AC3-01] Todos without a due date stay visible and are placed after dated todos', async ({ page, request }) => {
    const { email, token } = await createUser(request, 'ac3');
    await createTodo(request, token, 'QA Undated A');
    await createTodo(request, token, 'QA Dated Late', '2026-12-01');
    await createTodo(request, token, 'QA Undated B');
    await createTodo(request, token, 'QA Dated Early', '2026-02-01');
    await loginViaUi(page, email);

    await selectDueDateSort(page);

    // Dated first (ascending), then every undated todo in id order (welcome todo was created first).
    const expected = ['QA Dated Early', 'QA Dated Late', WELCOME, 'QA Undated A', 'QA Undated B'];
    await expect(titles(page)).toHaveText(expected);
    for (const t of ['QA Undated A', 'QA Undated B', WELCOME]) {
      await expect(page.getByTestId('todo-card').filter({ hasText: t }).first()).toBeVisible();
    }
    await page.screenshot({ path: path.join(SHOT_DIR, 'ac3-undated-last.png') });
  });

  test('[E2E-AC3-02] Placement of undated todos is deterministic across re-sorts and reloads', async ({ page, request }) => {
    const { email, token } = await createUser(request, 'ac3det');
    await createTodo(request, token, 'QA Undated A');
    await createTodo(request, token, 'QA Same Day 1', '2026-04-10');
    await createTodo(request, token, 'QA Same Day 2', '2026-04-10');
    await createTodo(request, token, 'QA Undated B');
    await loginViaUi(page, email);

    const expected = ['QA Same Day 1', 'QA Same Day 2', WELCOME, 'QA Undated A', 'QA Undated B'];
    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(expected);

    // Switch to another sort and back: same order again.
    await page.getByTestId('sort-select').selectOption({ label: 'Sort by Title' });
    await expect(page.getByTestId('sort-select')).toHaveValue('title');
    await expect(titles(page)).toHaveText(['QA Same Day 1', 'QA Same Day 2', 'QA Undated A', 'QA Undated B', WELCOME]);
    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(expected);

    // Reload: same order again.
    await page.reload();
    await expect(titles(page)).toHaveText(expected);
  });

  test('[E2E-AC3-03] A user with only undated todos sees them all, without errors', async ({ page, request }) => {
    const { email, token } = await createUser(request, 'ac3none');
    await createTodo(request, token, 'QA Undated A');
    await createTodo(request, token, 'QA Undated B');
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await loginViaUi(page, email);

    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText([WELCOME, 'QA Undated A', 'QA Undated B']);
    expect(pageErrors).toEqual([]);
  });
});
