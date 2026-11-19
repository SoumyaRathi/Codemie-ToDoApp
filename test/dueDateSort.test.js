const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todoapp-test-'));
process.env.TODOS_FILE = path.join(tmpDir, 'todos.json');
process.env.USERS_FILE = path.join(tmpDir, 'users.json');
process.env.SESSIONS_FILE = path.join(tmpDir, 'sessions.json');

const { app, compareByDueDate } = require('../todoServer');

const TOKEN_MIXED = 'token-mixed';
const TOKEN_UNDATED = 'token-undated';
const USER_MIXED = 1;
const USER_UNDATED = 2;

function todo(id, userId, dueDate) {
  const t = {
    id,
    userId,
    title: `todo ${id}`,
    description: 'desc',
    completed: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };
  if (dueDate) t.dueDate = dueDate;
  return t;
}

function seed(todos) {
  fs.writeFileSync(process.env.TODOS_FILE, JSON.stringify(todos));
}

test.before(() => {
  fs.writeFileSync(process.env.USERS_FILE, '[]');
  fs.writeFileSync(
    process.env.SESSIONS_FILE,
    JSON.stringify({ [TOKEN_MIXED]: USER_MIXED, [TOKEN_UNDATED]: USER_UNDATED })
  );
});

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const ids = body => body.map(t => t.id);

test('GET /todos?sort=dueDate: dated first in ascending dueDate order', async () => {
  seed([
    todo(1, USER_MIXED, '2026-03-01'),
    todo(2, USER_MIXED, '2026-01-15'),
    todo(3, USER_MIXED, '2026-02-10')
  ]);
  const res = await request(app).get('/todos?sort=dueDate').set('Authorization', TOKEN_MIXED);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(ids(res.body), [2, 3, 1]);
});

test('GET /todos?sort=dueDate: undated todos come after all dated todos', async () => {
  seed([
    todo(1, USER_MIXED),
    todo(2, USER_MIXED, '2026-05-01'),
    todo(3, USER_MIXED),
    todo(4, USER_MIXED, '2026-01-01'),
    todo(5, USER_MIXED, '2026-03-01')
  ]);
  const res = await request(app).get('/todos?sort=dueDate').set('Authorization', TOKEN_MIXED);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(ids(res.body), [4, 5, 2, 1, 3]);
});

test('GET /todos?sort=dueDate: equal dueDate ties break by id ascending regardless of stored order', async () => {
  const fixtures = [
    [todo(7, USER_MIXED, '2026-02-01'), todo(3, USER_MIXED, '2026-02-01'), todo(5, USER_MIXED, '2026-02-01')],
    [todo(3, USER_MIXED, '2026-02-01'), todo(5, USER_MIXED, '2026-02-01'), todo(7, USER_MIXED, '2026-02-01')],
    [todo(5, USER_MIXED, '2026-02-01'), todo(7, USER_MIXED, '2026-02-01'), todo(3, USER_MIXED, '2026-02-01')]
  ];
  for (const fixture of fixtures) {
    seed(fixture);
    const res = await request(app).get('/todos?sort=dueDate').set('Authorization', TOKEN_MIXED);
    assert.deepStrictEqual(ids(res.body), [3, 5, 7]);
  }
});

test('GET /todos?sort=dueDate: repeated requests return identical order', async () => {
  seed([
    todo(9, USER_MIXED),
    todo(4, USER_MIXED, '2026-02-01'),
    todo(2, USER_MIXED),
    todo(8, USER_MIXED, '2026-02-01'),
    todo(6, USER_MIXED, '2026-01-01')
  ]);
  const first = await request(app).get('/todos?sort=dueDate').set('Authorization', TOKEN_MIXED);
  for (let i = 0; i < 5; i++) {
    const again = await request(app).get('/todos?sort=dueDate').set('Authorization', TOKEN_MIXED);
    assert.deepStrictEqual(again.body, first.body);
  }
  assert.deepStrictEqual(ids(first.body), [6, 4, 8, 2, 9]);
});

test('GET /todos?sort=dueDate: all-undated list returns 200 ordered by id ascending', async () => {
  seed([todo(30, USER_UNDATED), todo(10, USER_UNDATED), todo(20, USER_UNDATED)]);
  const res = await request(app).get('/todos?sort=dueDate').set('Authorization', TOKEN_UNDATED);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(ids(res.body), [10, 20, 30]);
});

test('GET /todos?sort=dueDate: empty list returns 200 and []', async () => {
  seed([]);
  const res = await request(app).get('/todos?sort=dueDate').set('Authorization', TOKEN_UNDATED);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, []);
});

test('GET /todos?sort=dueDate combines with filter and search', async () => {
  seed([
    { ...todo(1, USER_MIXED, '2026-03-01'), title: 'alpha' },
    { ...todo(2, USER_MIXED, '2026-01-01'), title: 'alpha', completed: true },
    { ...todo(3, USER_MIXED), title: 'alpha' },
    { ...todo(4, USER_MIXED, '2026-02-01'), title: 'beta' }
  ]);
  const res = await request(app)
    .get('/todos?filter=active&sort=dueDate&search=alpha')
    .set('Authorization', TOKEN_MIXED);
  assert.deepStrictEqual(ids(res.body), [1, 3]);
});

test('compareByDueDate: pairwise rules', () => {
  const a = { id: 1, dueDate: '2026-01-01' };
  const b = { id: 2, dueDate: '2026-02-01' };
  const sameDateLowerId = { id: 1, dueDate: '2026-01-01' };
  const sameDateHigherId = { id: 2, dueDate: '2026-01-01' };
  const undatedLow = { id: 1 };
  const undatedHigh = { id: 2 };

  assert.ok(compareByDueDate(a, b) < 0);
  assert.ok(compareByDueDate(b, a) > 0);
  assert.ok(compareByDueDate(sameDateLowerId, sameDateHigherId) < 0);
  assert.ok(compareByDueDate(sameDateHigherId, sameDateLowerId) > 0);
  assert.ok(compareByDueDate(b, undatedLow) < 0);
  assert.ok(compareByDueDate(undatedLow, b) > 0);
  assert.ok(compareByDueDate(undatedLow, undatedHigh) < 0);
  assert.ok(compareByDueDate(undatedHigh, undatedLow) > 0);
  assert.strictEqual(compareByDueDate(a, a), 0);
});
