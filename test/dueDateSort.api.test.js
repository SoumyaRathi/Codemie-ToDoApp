const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-sort-'));
process.env.TODO_DATA_DIR = dataDir;

const request = require('supertest');
const app = require('../todoServer');

const TOKEN = 'test-token';
const now = new Date().toISOString();
const todo = (id, dueDate, userId = 1) => ({
  id, userId, title: `t${id}`, description: 'd', completed: false, createdAt: now, updatedAt: now,
  ...(dueDate ? { dueDate } : {})
});

before(() => {
  // File order is intentionally shuffled so ordering cannot pass by insertion order.
  const todos = [
    todo(7, null),
    todo(4, '2026-12-31'),
    todo(2, '2026-06-01'),
    todo(6, null),
    todo(5, '2026-01-05'),
    todo(3, '2026-06-01'),
    todo(1, null),
    todo(99, '2020-01-01', 2)
  ];
  fs.writeFileSync(path.join(dataDir, 'todos.json'), JSON.stringify(todos));
  fs.writeFileSync(path.join(dataDir, 'users.json'), '[]');
  fs.writeFileSync(path.join(dataDir, 'sessions.json'), JSON.stringify({ [TOKEN]: 1 }));
});

after(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const get = (query) => request(app).get(`/todos${query}`).set('Authorization', TOKEN);

test('sort=dueDate orders todos by dueDate ascending', async () => {
  const res = await get('?sort=dueDate');
  assert.equal(res.status, 200);
  const dated = res.body.filter(t => t.dueDate).map(t => t.dueDate);
  assert.deepEqual(dated, ['2026-01-05', '2026-06-01', '2026-06-01', '2026-12-31']);
});

test('sort=dueDate places todos without dueDate after all dated todos', async () => {
  const res = await get('?sort=dueDate');
  const firstUndated = res.body.findIndex(t => !t.dueDate);
  assert.equal(firstUndated, 4);
  assert.ok(res.body.slice(firstUndated).every(t => !t.dueDate));
});

test('sort=dueDate breaks ties by id for equal and missing dueDates', async () => {
  const res = await get('?sort=dueDate');
  assert.deepEqual(res.body.map(t => t.id), [5, 2, 3, 4, 1, 6, 7]);
});

test('sort=dueDate only returns the authenticated user\'s todos', async () => {
  const res = await get('?sort=dueDate');
  assert.ok(res.body.every(t => t.userId === 1));
});

test('sort=dueDate still honours filter and search', async () => {
  const res = await get('?sort=dueDate&filter=active&search=t');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map(t => t.id), [5, 2, 3, 4, 1, 6, 7]);
  const none = await get('?sort=dueDate&filter=completed');
  assert.deepEqual(none.body, []);
});

test('sort=dueDate requires authentication', async () => {
  const res = await request(app).get('/todos?sort=dueDate');
  assert.equal(res.status, 401);
});

test('existing sort=title is unchanged', async () => {
  const res = await get('?sort=title');
  assert.deepEqual(res.body.map(t => t.title), ['t1', 't2', 't3', 't4', 't5', 't6', 't7']);
});
