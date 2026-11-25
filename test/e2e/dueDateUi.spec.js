const { test, expect } = require('@playwright/test');
const crypto = require('crypto');

const WELCOME = 'Welcome to your To-Do List!';

const cards = (page) => page.locator('.outputData .output');
const card = (page, title) =>
  cards(page).filter({ has: page.locator('#title', { hasText: new RegExp(`^${title}$`) }) });
const dueLine = (page, title) => card(page, title).locator('.todo-due-date');

function localToday() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
  await expect(card(page, WELCOME)).toBeVisible();
}

const isTodoWrite = (method) => (req) => {
  const url = new URL(req.url());
  return req.method() === method && /^\/todos(\/\d+)?$/.test(url.pathname);
};

async function addTodo(page, title, dueDate) {
  const requestPromise = page.waitForRequest(isTodoWrite('POST'));
  await page.locator('#add-todo-btn').click();
  await expect(page.locator('#edit-modal')).toBeVisible();
  await page.locator('#edit-title').fill(title);
  await page.locator('#edit-desc').fill(`${title} description`);
  if (dueDate) await page.locator('#edit-due-date').fill(dueDate);
  await page.locator('#save-edit-btn').click();
  const request = await requestPromise;
  await expect(card(page, title)).toBeVisible();
  await expect(page.locator('#edit-modal')).toBeHidden();
  return request.postDataJSON();
}

async function openEdit(page, title) {
  await card(page, title).locator('.todo-btn.edit').click();
  await expect(page.locator('#edit-modal')).toBeVisible();
}

// A real <input type="date"> sanitizes any non-date string to "", so to push an
// unparseable value through the form the test switches the control to a text input.
async function forceDueDateText(page, value) {
  await page.locator('#edit-due-date').evaluate((el, v) => {
    el.type = 'text';
    el.value = v;
  }, value);
}

async function apiTodos(page) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const res = await page.request.get('/todos', { headers: { Authorization: token } });
  expect(res.status()).toBe(200);
  return res.json();
}

test.describe('KAN-155 due date in Create/Edit Todo UI', () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndLogin(page);
  });

  test('design: modal has an optional date input #edit-due-date and a hidden #todo-form-error', async ({ page }) => {
    await page.locator('#add-todo-btn').click();
    const input = page.locator('#edit-due-date');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'date');
    await expect(input).not.toHaveAttribute('required', /.*/);
    await expect(input).toHaveValue('');
    await expect(page.locator('#todo-form-error')).toBeHidden();
  });

  test('AC1: create todo with due date sends dueDate and shows it on the card', async ({ page }) => {
    const body = await addTodo(page, 'AC1 with due', '2030-05-17');
    expect(body.dueDate).toBe('2030-05-17');
    await expect(dueLine(page, 'AC1 with due')).toHaveText('Due: 2030-05-17');
  });

  test('AC2: create todo without due date omits dueDate and shows no due line', async ({ page }) => {
    const body = await addTodo(page, 'AC2 no due');
    expect(body.dueDate === undefined || body.dueDate === null).toBe(true);
    await expect(dueLine(page, 'AC2 no due')).toHaveCount(0);
    await expect(page.locator('#todo-form-error')).toBeHidden();
  });

  test('AC3: edit form is pre-populated with the existing due date; undated todo opens blank', async ({ page }) => {
    await addTodo(page, 'AC3 dated', '2030-08-09');
    await addTodo(page, 'AC3 undated');

    await openEdit(page, 'AC3 dated');
    await expect(page.locator('#edit-due-date')).toHaveValue('2030-08-09');
    await page.locator('#close-modal').click();

    await openEdit(page, 'AC3 undated');
    await expect(page.locator('#edit-due-date')).toHaveValue('');
  });

  test('create form is reset after editing a dated todo', async ({ page }) => {
    await addTodo(page, 'Reset check', '2030-08-09');
    await openEdit(page, 'Reset check');
    await expect(page.locator('#edit-due-date')).toHaveValue('2030-08-09');
    await page.locator('#close-modal').click();
    await page.locator('#add-todo-btn').click();
    await expect(page.locator('#edit-due-date')).toHaveValue('');
  });

  test('AC4: update due date sends the new value, updates the card and persists after reload', async ({ page }) => {
    await addTodo(page, 'AC4 update', '2030-01-10');
    await openEdit(page, 'AC4 update');
    await page.locator('#edit-due-date').fill('2031-07-04');
    const requestPromise = page.waitForRequest(isTodoWrite('PUT'));
    await page.locator('#save-edit-btn').click();
    const request = await requestPromise;
    expect(request.postDataJSON().dueDate).toBe('2031-07-04');

    await expect(dueLine(page, 'AC4 update')).toHaveText('Due: 2031-07-04');
    await page.reload();
    await expect(dueLine(page, 'AC4 update')).toHaveText('Due: 2031-07-04');
    await openEdit(page, 'AC4 update');
    await expect(page.locator('#edit-due-date')).toHaveValue('2031-07-04');
  });

  test('AC4: a due date can be added to a todo that had none', async ({ page }) => {
    await addTodo(page, 'AC4 add later');
    await openEdit(page, 'AC4 add later');
    await page.locator('#edit-due-date').fill('2032-03-03');
    await page.locator('#save-edit-btn').click();
    await expect(dueLine(page, 'AC4 add later')).toHaveText('Due: 2032-03-03');
  });

  test('AC5: clearing the due date sends an empty dueDate, removes the line and persists after reload', async ({ page }) => {
    await addTodo(page, 'AC5 clear', '2030-01-10');
    await expect(dueLine(page, 'AC5 clear')).toHaveCount(1);

    await openEdit(page, 'AC5 clear');
    await page.locator('#edit-due-date').fill('');
    const requestPromise = page.waitForRequest(isTodoWrite('PUT'));
    await page.locator('#save-edit-btn').click();
    const request = await requestPromise;
    const sent = request.postDataJSON();
    expect(Object.prototype.hasOwnProperty.call(sent, 'dueDate')).toBe(true);
    expect(sent.dueDate === '' || sent.dueDate === null).toBe(true);

    await expect(dueLine(page, 'AC5 clear')).toHaveCount(0);
    await page.reload();
    await expect(card(page, 'AC5 clear')).toBeVisible();
    await expect(dueLine(page, 'AC5 clear')).toHaveCount(0);
    const stored = (await apiTodos(page)).find((t) => t.title === 'AC5 clear');
    expect(stored).not.toHaveProperty('dueDate');
  });

  test('AC8: today as the due date is sent, saved and displayed', async ({ page }) => {
    const today = localToday();
    const body = await addTodo(page, 'AC8 today', today);
    expect(body.dueDate).toBe(today);
    await expect(dueLine(page, 'AC8 today')).toHaveText(`Due: ${today}`);
    await page.reload();
    await expect(dueLine(page, 'AC8 today')).toHaveText(`Due: ${today}`);
  });

  test('due line appears only on todos that have a due date', async ({ page }) => {
    await addTodo(page, 'Dated', '2030-02-02');
    await addTodo(page, 'Undated');
    await expect(page.locator('.outputData .todo-due-date')).toHaveCount(1);
    await expect(dueLine(page, WELCOME)).toHaveCount(0);
  });

  test('native date control sanitizes unparseable strings to empty (cannot hold an invalid value)', async ({ page }) => {
    await page.locator('#add-todo-btn').click();
    for (const bad of ['not-a-date', '2025/01/01', '2025-02-30']) {
      await page.locator('#edit-due-date').evaluate((el, v) => { el.value = v; }, bad);
      await expect(page.locator('#edit-due-date')).toHaveValue('');
    }
  });

  for (const bad of ['2025-02-30', 'not-a-date', '2025/01/01']) {
    test(`AC6: create with invalid due date "${bad}" shows an inline error, keeps the modal open and creates nothing`, async ({ page }) => {
      const before = await cards(page).count();
      await page.locator('#add-todo-btn').click();
      await page.locator('#edit-title').fill('AC6 invalid');
      await page.locator('#edit-desc').fill('should not be created');
      await forceDueDateText(page, bad);

      const responsePromise = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/todos');
      await page.locator('#save-edit-btn').click();
      const response = await responsePromise;
      expect(response.status()).toBe(400);
      expect((await response.json()).field).toBe('dueDate');

      await expect(page.locator('#todo-form-error')).toBeVisible();
      await expect(page.locator('#todo-form-error')).toContainText('Invalid dueDate');
      await expect(page.locator('#edit-modal')).toBeVisible();
      await expect(page.locator('#edit-modal')).toHaveAttribute('aria-hidden', 'false');
      await expect(page.locator('#edit-title')).toHaveValue('AC6 invalid');

      await expect(cards(page)).toHaveCount(before);
      await expect(card(page, 'AC6 invalid')).toHaveCount(0);
      expect((await apiTodos(page)).some((t) => t.title === 'AC6 invalid')).toBe(false);
    });
  }

  for (const bad of ['2025-02-30', 'not-a-date', '2025/01/01']) {
    test(`AC7: edit with invalid due date "${bad}" shows an inline error, keeps the modal open and saves nothing`, async ({ page }) => {
      await addTodo(page, 'AC7 original', '2030-01-10');
      await openEdit(page, 'AC7 original');
      await page.locator('#edit-title').fill('AC7 changed');
      await forceDueDateText(page, bad);

      const responsePromise = page.waitForResponse((r) => r.request().method() === 'PUT');
      await page.locator('#save-edit-btn').click();
      const response = await responsePromise;
      expect(response.status()).toBe(400);
      expect((await response.json()).field).toBe('dueDate');

      await expect(page.locator('#todo-form-error')).toBeVisible();
      await expect(page.locator('#todo-form-error')).toContainText('Invalid dueDate');
      await expect(page.locator('#edit-modal')).toBeVisible();
      await expect(page.locator('#edit-modal')).toHaveAttribute('aria-hidden', 'false');

      const stored = (await apiTodos(page)).find((t) => t.title === 'AC7 original');
      expect(stored).toBeTruthy();
      expect(stored.dueDate).toBe('2030-01-10');
      expect((await apiTodos(page)).some((t) => t.title === 'AC7 changed')).toBe(false);
      await expect(dueLine(page, 'AC7 original')).toHaveText('Due: 2030-01-10');
    });
  }

  test('validation error is cleared when the modal is reopened', async ({ page }) => {
    await page.locator('#add-todo-btn').click();
    await page.locator('#edit-title').fill('Err reset');
    await page.locator('#edit-desc').fill('d');
    await forceDueDateText(page, '2025-02-30');
    await page.locator('#save-edit-btn').click();
    await expect(page.locator('#todo-form-error')).toBeVisible();
    await page.locator('#close-modal').click();

    await page.reload();
    await page.locator('#add-todo-btn').click();
    await expect(page.locator('#todo-form-error')).toBeHidden();
  });

  test('after an invalid-date error the user can correct the date and save', async ({ page }) => {
    await page.locator('#add-todo-btn').click();
    await page.locator('#edit-title').fill('Recover');
    await page.locator('#edit-desc').fill('d');
    await forceDueDateText(page, '2025-02-30');
    await page.locator('#save-edit-btn').click();
    await expect(page.locator('#todo-form-error')).toBeVisible();

    await page.locator('#edit-due-date').evaluate((el) => { el.type = 'date'; el.value = '2030-04-04'; });
    await page.locator('#save-edit-btn').click();
    await expect(page.locator('#edit-modal')).toBeHidden();
    await expect(dueLine(page, 'Recover')).toHaveText('Due: 2030-04-04');
  });
});
