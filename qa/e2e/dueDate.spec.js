// KAN-158 E2E tests (AC1-AC8) against the real server and UI in Chromium.
const { test, expect } = require('@playwright/test');
const {
  card, dueDateOf, signUpAndLogin, seedTodo, openCreateModal, openEditModal, fillForm, isTodoWrite
} = require('./helpers');

test.describe('KAN-158 Due date in ToDo UI', () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndLogin(page);
  });

  test('AC1: create todo with a due date sends it to the API and shows it on the card', async ({ page }) => {
    await openCreateModal(page);
    await fillForm(page, { title: 'AC1 with due', dueDate: '2026-12-01' });
    const requestPromise = page.waitForRequest(isTodoWrite('POST'));
    await page.locator('#save-edit-btn').click();
    const request = await requestPromise;

    expect(request.postDataJSON().dueDate).toBe('2026-12-01');
    await expect(page.locator('#edit-modal')).toBeHidden();
    await expect(dueDateOf(card(page, 'AC1 with due'))).toHaveText('Due: 2026-12-01');
  });

  test('AC2: create todo without a due date shows no due date and omits it from the request', async ({ page }) => {
    await openCreateModal(page);
    await fillForm(page, { title: 'AC2 no due' });
    const requestPromise = page.waitForRequest(isTodoWrite('POST'));
    await page.locator('#save-edit-btn').click();
    const request = await requestPromise;

    expect(request.postDataJSON()).not.toHaveProperty('dueDate');
    await expect(card(page, 'AC2 no due')).toHaveCount(1);
    await expect(dueDateOf(card(page, 'AC2 no due'))).toHaveCount(0);
  });

  test('AC3: edit a todo without a due date, set one, and see it displayed', async ({ page }) => {
    await seedTodo(page, 'AC3 todo');
    await page.reload();
    await expect(dueDateOf(card(page, 'AC3 todo'))).toHaveCount(0);

    await openEditModal(page, 'AC3 todo');
    await expect(page.locator('#edit-due-date')).toHaveValue('');
    await fillForm(page, { dueDate: '2026-12-01' });
    const requestPromise = page.waitForRequest(isTodoWrite('PUT'));
    await page.locator('#save-edit-btn').click();

    expect((await requestPromise).postDataJSON().dueDate).toBe('2026-12-01');
    await expect(dueDateOf(card(page, 'AC3 todo'))).toHaveText('Due: 2026-12-01');
  });

  test('AC4: clearing the due date sends an empty dueDate and removes it from the card', async ({ page }) => {
    await seedTodo(page, 'AC4 todo', '2026-12-01');
    await page.reload();
    await expect(dueDateOf(card(page, 'AC4 todo'))).toHaveText('Due: 2026-12-01');

    await openEditModal(page, 'AC4 todo');
    await expect(page.locator('#edit-due-date')).toHaveValue('2026-12-01');
    await fillForm(page, { dueDate: '' });
    const requestPromise = page.waitForRequest(isTodoWrite('PUT'));
    await page.locator('#save-edit-btn').click();

    expect((await requestPromise).postDataJSON().dueDate).toBe('');
    await expect(dueDateOf(card(page, 'AC4 todo'))).toHaveCount(0);
    await page.reload();
    await expect(card(page, 'AC4 todo')).toHaveCount(1);
    await expect(dueDateOf(card(page, 'AC4 todo'))).toHaveCount(0);
  });

  test('AC5: after refresh, todos with a due date show it and todos without show no placeholder', async ({ page }) => {
    await seedTodo(page, 'AC5 dated', '2026-03-04');
    await seedTodo(page, 'AC5 undated');
    await page.reload();

    await expect(dueDateOf(card(page, 'AC5 dated'))).toHaveText('Due: 2026-03-04');
    await expect(card(page, 'AC5 undated')).toHaveCount(1);
    await expect(dueDateOf(card(page, 'AC5 undated'))).toHaveCount(0);
    await expect(card(page, 'AC5 undated')).not.toContainText('Due');
    await expect(page.locator('.todo-due-date')).toHaveCount(1);
  });

  test.describe('AC6: invalid due date', () => {
    test('client-side: malformed values block saving, show an inline error and send nothing', async ({ page }) => {
      const writes = [];
      page.on('request', (r) => { if (isTodoWrite('POST')(r) || isTodoWrite('PUT')(r)) writes.push(r.url()); });

      await openCreateModal(page);
      await fillForm(page, { title: 'AC6 client' });
      // A date control cannot be typed into with invalid text, so bypass it like devtools would.
      for (const bad of ['12/01/2026', '2026-02-31', 'not-a-date']) {
        await page.evaluate((value) => {
          const input = document.getElementById('edit-due-date');
          input.type = 'text';
          input.value = value;
        }, bad);
        await page.locator('#save-edit-btn').click();
        await expect(page.locator('#due-date-error')).toBeVisible();
        await expect(page.locator('#due-date-error')).toContainText('valid due date');
        await expect(page.locator('#edit-modal')).toBeVisible();
      }
      expect(writes).toEqual([]);
      await expect(card(page, 'AC6 client')).toHaveCount(0);
    });

    test('server-side: a 400 with field=dueDate shows the inline error, keeps the modal open, and recovers on retry', async ({ page }) => {
      const message = 'Invalid dueDate. Expected a valid date in YYYY-MM-DD format.';
      const isTodosPath = (url) => url.pathname === '/todos';
      await page.route(isTodosPath, (route) =>
        route.request().method() === 'POST'
          ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: message, field: 'dueDate' }) })
          : route.continue()
      );

      await openCreateModal(page);
      await fillForm(page, { title: 'AC6 server', dueDate: '2026-12-01' });
      await page.locator('#save-edit-btn').click();

      await expect(page.locator('#due-date-error')).toHaveText(message);
      await expect(page.locator('#edit-modal')).toBeVisible();
      await expect(card(page, 'AC6 server')).toHaveCount(0);

      await page.unroute(isTodosPath);
      await page.locator('#save-edit-btn').click();
      await expect(page.locator('#edit-modal')).toBeHidden();
      await expect(dueDateOf(card(page, 'AC6 server'))).toHaveText('Due: 2026-12-01');
    });
  });

  for (const [ac, label, date] of [
    ['AC7', 'earliest', '0001-01-01'],
    ['AC8', 'latest', '9999-12-31']
  ]) {
    test(`${ac}: ${label} date ${date} can be created, edited to, and is displayed correctly`, async ({ page }) => {
      // Create flow
      await openCreateModal(page);
      await fillForm(page, { title: `${ac} create`, dueDate: date });
      await expect(page.locator('#edit-due-date')).toHaveValue(date);
      await page.locator('#save-edit-btn').click();
      await expect(page.locator('#edit-modal')).toBeHidden();
      await expect(dueDateOf(card(page, `${ac} create`))).toHaveText(`Due: ${date}`);

      // Edit flow
      await seedTodo(page, `${ac} edit`);
      await page.reload();
      await openEditModal(page, `${ac} edit`);
      await fillForm(page, { dueDate: date });
      await expect(page.locator('#edit-due-date')).toHaveValue(date);
      await page.locator('#save-edit-btn').click();
      await expect(page.locator('#edit-modal')).toBeHidden();
      await expect(dueDateOf(card(page, `${ac} edit`))).toHaveText(`Due: ${date}`);

      // Persisted
      await page.reload();
      await expect(dueDateOf(card(page, `${ac} create`))).toHaveText(`Due: ${date}`);
      await expect(dueDateOf(card(page, `${ac} edit`))).toHaveText(`Due: ${date}`);
    });
  }
});
