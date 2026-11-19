const { test, expect } = require('@playwright/test');
const crypto = require('crypto');

const WELCOME = 'Welcome to your To-Do List!';

// Expected orders for the data seeded in beforeEach.
// Seed order (oldest -> newest): Welcome (no due, from signup), Gamma late, Alpha early, Alpha tie, Beta no due.
const BY_DUE_DATE = ['Alpha early', 'Alpha tie', 'Gamma late', WELCOME, 'Beta no due'];
const BY_CREATED_DESC = ['Beta no due', 'Alpha tie', 'Alpha early', 'Gamma late', WELCOME];

const titles = (page) => page.locator('.outputData .output #title');
const card = (page, title) =>
  page.locator('.outputData .output').filter({ has: page.locator('#title', { hasText: new RegExp(`^${title}$`) }) });

async function signUpAndLogin(page) {
  const email = `qa-${crypto.randomUUID()}@example.com`;
  const password = 'secret123';
  await page.goto('/');
  await expect(page.locator('#auth-modal')).toBeVisible();
  await page.locator('#auth-toggle-link').click();
  await page.locator('#auth-name').fill('QA User');
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.locator('#auth-submit-btn').click();
  await expect(page.locator('#auth-error')).toHaveText('Signup successful! Please login.');
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.locator('#auth-submit-btn').click();
  await expect(page.locator('#auth-modal')).toBeHidden();
  await expect(page.locator('#user-info')).toContainText(email);
}

async function seedTodo(page, token, title, dueDate) {
  const data = { title, description: `${title} description`, completed: false };
  if (dueDate) data.dueDate = dueDate;
  const res = await page.request.post('/todos', { headers: { Authorization: token }, data });
  expect(res.status()).toBe(201);
  await page.waitForTimeout(15); // distinct createdAt values
}

test.describe('KAN-154 Sort by due date', () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    await seedTodo(page, token, 'Gamma late', '2026-12-31');
    await seedTodo(page, token, 'Alpha early', '2026-01-05');
    await seedTodo(page, token, 'Alpha tie', '2026-01-05');
    await seedTodo(page, token, 'Beta no due');
    await page.reload();
    await expect(titles(page)).toHaveCount(5);
  });

  test('AC1: sort dropdown shows a due date option', async ({ page }) => {
    await expect(page.locator('#sort-select')).toBeVisible();
    const option = page.locator('#sort-select option[value="dueDate"]');
    await expect(option).toHaveCount(1);
    await expect(option).toHaveText('Sort by Due date');
    await expect(page.locator('#sort-select')).toHaveValue('createdAt');
  });

  test('AC2 + AC3: due date sort orders earliest to latest with undated todos last', async ({ page }) => {
    await expect(titles(page)).toHaveText(BY_CREATED_DESC);
    await page.locator('#sort-select').selectOption({ label: 'Sort by Due date' });
    await expect(page.locator('#sort-select')).toHaveValue('dueDate');
    await expect(titles(page)).toHaveText(BY_DUE_DATE);
  });

  test('AC4: sorting persists after creating a todo', async ({ page }) => {
    const sortedRequests = [];
    page.on('request', (r) => { if (r.method() === 'GET' && r.url().includes('/todos?')) sortedRequests.push(r.url()); });
    await page.locator('#sort-select').selectOption('dueDate');
    await expect(titles(page)).toHaveText(BY_DUE_DATE);

    await page.locator('#add-todo-btn').click();
    await page.locator('#edit-title').fill('Zeta new');
    await page.locator('#edit-desc').fill('created while sorted by due date');
    await page.locator('#save-edit-btn').click();

    await expect(titles(page)).toHaveText([...BY_DUE_DATE, 'Zeta new']);
    await expect(page.locator('#sort-select')).toHaveValue('dueDate');
    expect(sortedRequests[sortedRequests.length - 1]).toContain('sort=dueDate');
  });

  test('AC4: sorting persists after completing a todo', async ({ page }) => {
    await page.locator('#sort-select').selectOption('dueDate');
    await expect(titles(page)).toHaveText(BY_DUE_DATE);

    await card(page, 'Gamma late').getByRole('button', { name: 'Mark Complete' }).click();

    await expect(card(page, 'Gamma late').locator('.status-badge')).toHaveText('Completed');
    await expect(titles(page)).toHaveText(BY_DUE_DATE);
    await expect(page.locator('#sort-select')).toHaveValue('dueDate');
  });

  test('AC4: sorting persists after editing a todo', async ({ page }) => {
    await page.locator('#sort-select').selectOption('dueDate');
    await expect(titles(page)).toHaveText(BY_DUE_DATE);

    await card(page, 'Alpha tie').getByRole('button', { name: 'Edit' }).click();
    await page.locator('#edit-title').fill('Alpha tie edited');
    await page.locator('#edit-desc').fill('edited while sorted by due date');
    await page.locator('#save-edit-btn').click();

    await expect(titles(page)).toHaveText(['Alpha early', 'Alpha tie edited', 'Gamma late', WELCOME, 'Beta no due']);
    await expect(page.locator('#sort-select')).toHaveValue('dueDate');
  });

  test('AC4: sorting persists after deleting a todo', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.locator('#sort-select').selectOption('dueDate');
    await expect(titles(page)).toHaveText(BY_DUE_DATE);

    await card(page, 'Alpha early').getByRole('button', { name: 'Delete' }).click();

    await expect(titles(page)).toHaveText(['Alpha tie', 'Gamma late', WELCOME, 'Beta no due']);
    await expect(page.locator('#sort-select')).toHaveValue('dueDate');
  });

  test('AC5: switching back to the default sort restores createdAt ordering', async ({ page }) => {
    await page.locator('#sort-select').selectOption('dueDate');
    await expect(titles(page)).toHaveText(BY_DUE_DATE);

    await page.locator('#sort-select').selectOption('createdAt');
    await expect(page.locator('#sort-select')).toHaveValue('createdAt');
    await expect(titles(page)).toHaveText(BY_CREATED_DESC);
    expect(BY_CREATED_DESC).not.toEqual(BY_DUE_DATE);
  });

  test('AC5: Clear filters resets the due date sort to the default', async ({ page }) => {
    await page.locator('#sort-select').selectOption('dueDate');
    await expect(titles(page)).toHaveText(BY_DUE_DATE);

    await page.locator('#clear-filters-btn').click();
    await expect(page.locator('#sort-select')).toHaveValue('createdAt');
    await expect(titles(page)).toHaveText(BY_CREATED_DESC);
  });
});
