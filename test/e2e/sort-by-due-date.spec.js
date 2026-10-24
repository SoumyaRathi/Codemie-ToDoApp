const { test, expect } = require('@playwright/test');
const { E2E_DATA_DIR, resetStore } = require('../helpers/store');

const CREDS = { name: 'E2E User', email: 'e2e@example.com', password: 'secret123' };

async function seed(request, todos) {
  resetStore(E2E_DATA_DIR);
  await request.post('/signup', { data: CREDS });
  const login = await request.post('/login', { data: { email: CREDS.email, password: CREDS.password } });
  const { token } = await login.json();
  const headers = { Authorization: token };

  const welcome = await (await request.get('/todos', { headers })).json();
  for (const todo of welcome) await request.delete(`/todos/${todo.id}`, { headers });

  for (const todo of todos) {
    const data = { title: todo.title, description: `${todo.title} description` };
    if (todo.dueDate) data.dueDate = todo.dueDate;
    const res = await request.post('/todos', { headers, data });
    expect(res.status()).toBe(201);
  }
  return token;
}

async function openLoggedIn(page, token) {
  await page.addInitScript(({ token, creds }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('name', creds.name);
    localStorage.setItem('email', creds.email);
  }, { token, creds: CREDS });
  await page.goto('/');
}

async function selectDueDateSort(page) {
  const response = page.waitForResponse((r) => r.url().includes('/todos?') && r.url().includes('sort=dueDate'));
  await page.selectOption('#sort-select', 'dueDate');
  await response;
}

const titles = (page) => page.locator('.outputData .output #title');
const card = (page, title) => page.locator('.outputData .output', { hasText: title });

test.describe('Sort by due date (UI)', () => {
  test('1. offers "Sort by due date" in the sort dropdown after logging in through the form', async ({ page, request }) => {
    await seed(request, [{ title: 'Only todo', dueDate: '2025-01-01' }]);
    await page.goto('/');
    await page.fill('#auth-email', CREDS.email);
    await page.fill('#auth-password', CREDS.password);
    await page.click('#auth-submit-btn');
    await expect(titles(page)).toHaveText(['Only todo']);

    const option = page.locator('#sort-select option[value="dueDate"]');
    await expect(option).toHaveCount(1);
    await expect(option).toHaveText('Sort by due date');
  });

  test('2. selecting the option requests GET /todos with sort=dueDate', async ({ page, request }) => {
    const token = await seed(request, [{ title: 'A', dueDate: '2025-01-01' }]);
    await openLoggedIn(page, token);
    await expect(titles(page)).toHaveText(['A']);

    const requestPromise = page.waitForRequest((r) => r.method() === 'GET' && /\/todos\?.*sort=dueDate/.test(r.url()));
    await page.selectOption('#sort-select', 'dueDate');
    const sent = await requestPromise;

    expect(new URL(sent.url()).searchParams.get('sort')).toBe('dueDate');
  });

  test('3. lists the earliest due date first', async ({ page, request }) => {
    const token = await seed(request, [
      { title: 'March task', dueDate: '2025-03-01' },
      { title: 'January task', dueDate: '2025-01-10' },
      { title: 'February task', dueDate: '2025-02-05' },
    ]);
    await openLoggedIn(page, token);
    await selectDueDateSort(page);

    await expect(titles(page)).toHaveText(['January task', 'February task', 'March task']);
  });

  test('4. places todos without a due date after all dated todos', async ({ page, request }) => {
    const token = await seed(request, [
      { title: 'Undated first' },
      { title: 'Dated late', dueDate: '2026-12-31' },
      { title: 'Undated second' },
      { title: 'Dated early', dueDate: '2024-01-01' },
    ]);
    await openLoggedIn(page, token);
    await selectDueDateSort(page);

    await expect(titles(page)).toHaveText(['Dated early', 'Dated late', 'Undated first', 'Undated second']);
  });

  test('5. keeps todos with the same due date in a deterministic (creation) order', async ({ page, request }) => {
    const token = await seed(request, [
      { title: 'Tie one', dueDate: '2025-05-05' },
      { title: 'Earlier', dueDate: '2025-01-01' },
      { title: 'Tie two', dueDate: '2025-05-05' },
      { title: 'Tie three', dueDate: '2025-05-05' },
    ]);
    await openLoggedIn(page, token);
    await selectDueDateSort(page);

    await expect(titles(page)).toHaveText(['Earlier', 'Tie one', 'Tie two', 'Tie three']);
  });

  test('6. keeps undated todos in the same order after a page reload', async ({ page, request }) => {
    const token = await seed(request, [
      { title: 'Undated A' },
      { title: 'Undated B' },
      { title: 'Dated', dueDate: '2025-02-02' },
      { title: 'Undated C' },
    ]);
    const expected = ['Dated', 'Undated A', 'Undated B', 'Undated C'];

    await openLoggedIn(page, token);
    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(expected);

    await page.reload();
    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(expected);
  });

  test('7. restores other sort behaviour when switching away from due date', async ({ page, request }) => {
    const token = await seed(request, [
      { title: 'Zebra', dueDate: '2025-01-01' },
      { title: 'Apple', dueDate: '2025-03-01' },
      { title: 'Mango', dueDate: '2025-02-01' },
    ]);
    await openLoggedIn(page, token);

    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(['Zebra', 'Mango', 'Apple']);

    await page.selectOption('#sort-select', 'title');
    await expect(titles(page)).toHaveText(['Apple', 'Mango', 'Zebra']);

    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(['Zebra', 'Mango', 'Apple']);
  });

  test('8. lets the user mark a todo complete while sorted, keeping the order', async ({ page, request }) => {
    const token = await seed(request, [
      { title: 'Second task', dueDate: '2025-02-01' },
      { title: 'First task', dueDate: '2025-01-01' },
      { title: 'Undated task' },
    ]);
    await openLoggedIn(page, token);
    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(['First task', 'Second task', 'Undated task']);

    await card(page, 'First task').getByRole('button', { name: 'Mark Complete' }).click();

    await expect(card(page, 'First task').locator('.status-badge')).toHaveText('Completed');
    await expect(titles(page)).toHaveText(['First task', 'Second task', 'Undated task']);
    await expect(page.locator('#sort-select')).toHaveValue('dueDate');
  });

  test('9. lets the user delete a todo while sorted, keeping the remaining order', async ({ page, request }) => {
    const token = await seed(request, [
      { title: 'Undated task' },
      { title: 'Middle task', dueDate: '2025-02-01' },
      { title: 'Earliest task', dueDate: '2025-01-01' },
      { title: 'Latest task', dueDate: '2025-03-01' },
    ]);
    await openLoggedIn(page, token);
    await selectDueDateSort(page);
    await expect(titles(page)).toHaveText(['Earliest task', 'Middle task', 'Latest task', 'Undated task']);

    page.once('dialog', (dialog) => dialog.accept());
    await card(page, 'Middle task').getByRole('button', { name: 'Delete' }).click();

    await expect(titles(page)).toHaveText(['Earliest task', 'Latest task', 'Undated task']);
    await expect(page.locator('#sort-select')).toHaveValue('dueDate');
  });

  test('10. shows "No todos found." without script errors when sorting an empty list', async ({ page, request }) => {
    const token = await seed(request, []);
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await openLoggedIn(page, token);
    await selectDueDateSort(page);

    await expect(page.locator('.empty-state')).toHaveText('No todos found.');
    expect(pageErrors).toEqual([]);
  });
});
