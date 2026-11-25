const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-api-duedate-'));
process.env.TODO_DATA_DIR = dataDir;

const request = require('supertest');
const app = require('../../todoServer');

let token;

const auth = (req) => req.set('Authorization', token);
const create = (body) => auth(request(app).post('/todos')).send(body);
const update = (id, body) => auth(request(app).put(`/todos/${id}`)).send(body);
const getOne = (id) => auth(request(app).get(`/todos/${id}`));
const listAll = async () => (await auth(request(app).get('/todos'))).body;
const base = (title) => ({ title, description: `${title} description`, completed: false });

function localToday() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

beforeAll(async () => {
  const email = `qa-duedate-${Date.now()}@example.com`;
  const signup = await request(app).post('/signup').send({ name: 'QA', email, password: 'secret' });
  expect(signup.status).toBe(201);
  const login = await request(app).post('/login').send({ email, password: 'secret' });
  expect(login.status).toBe(200);
  token = login.body.token;
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('KAN-155 create (POST /todos)', () => {
  test('AC1: creates a todo with a due date; it is returned and persisted', async () => {
    const res = await create({ ...base('AC1 with due'), dueDate: '2030-05-17' });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBe('2030-05-17');

    const fetched = await getOne(res.body.id);
    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBe('2030-05-17');
  });

  test('AC2: creates a todo without a due date; dueDate is absent', async () => {
    const res = await create(base('AC2 no due'));
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('dueDate');

    const fetched = await getOne(res.body.id);
    expect(fetched.body).not.toHaveProperty('dueDate');
  });

  test('AC2: dueDate null on create is accepted and stores no due date', async () => {
    const res = await create({ ...base('AC2 null due'), dueDate: null });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBeUndefined();
  });

  test('AC2: empty-string dueDate on create is accepted and stores no due date', async () => {
    const res = await create({ ...base('AC2 empty due'), dueDate: '' });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBeUndefined();
  });

  test('AC8: creates a todo whose due date is today', async () => {
    const today = localToday();
    const res = await create({ ...base('AC8 today'), dueDate: today });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBe(today);
    expect((await getOne(res.body.id)).body.dueDate).toBe(today);
  });

  test('accepts a leap day', async () => {
    const res = await create({ ...base('Leap day'), dueDate: '2028-02-29' });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBe('2028-02-29');
  });
});

describe('KAN-155 update (PUT /todos/:id)', () => {
  let todo;

  beforeEach(async () => {
    const res = await create({ ...base('Update target'), dueDate: '2030-01-10' });
    expect(res.status).toBe(201);
    todo = res.body;
  });

  test('AC3 (API level): GET returns the existing due date used to prefill the edit form', async () => {
    const res = await getOne(todo.id);
    expect(res.status).toBe(200);
    expect(res.body.dueDate).toBe('2030-01-10');
  });

  test('AC4: updates the due date to a new valid date and persists it', async () => {
    const res = await update(todo.id, { ...base('Update target'), dueDate: '2031-07-04' });
    expect(res.status).toBe(200);
    expect(res.body.dueDate).toBe('2031-07-04');
    expect((await getOne(todo.id)).body.dueDate).toBe('2031-07-04');
    const listed = (await listAll()).find((t) => t.id === todo.id);
    expect(listed.dueDate).toBe('2031-07-04');
  });

  test('AC5: dueDate "" clears the due date', async () => {
    const res = await update(todo.id, { ...base('Update target'), dueDate: '' });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('dueDate');
    const fetched = await getOne(todo.id);
    expect(fetched.body).not.toHaveProperty('dueDate');
  });

  test('AC5: dueDate null clears the due date', async () => {
    const res = await update(todo.id, { ...base('Update target'), dueDate: null });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('dueDate');
    const fetched = await getOne(todo.id);
    expect(fetched.body).not.toHaveProperty('dueDate');
  });

  test('omitting dueDate on update leaves the existing due date unchanged', async () => {
    const res = await update(todo.id, base('Renamed only'));
    expect(res.status).toBe(200);
    expect(res.body.dueDate).toBe('2030-01-10');
  });

  test('can set a due date on a todo that had none', async () => {
    const none = (await create(base('Had none'))).body;
    const res = await update(none.id, { ...base('Had none'), dueDate: '2032-03-03' });
    expect(res.status).toBe(200);
    expect((await getOne(none.id)).body.dueDate).toBe('2032-03-03');
  });

  test('AC8: updates the due date to today', async () => {
    const today = localToday();
    const res = await update(todo.id, { ...base('Update target'), dueDate: today });
    expect(res.status).toBe(200);
    expect(res.body.dueDate).toBe(today);
  });
});

describe('KAN-155 dueDate validation (API layer for AC6/AC7)', () => {
  const invalid = [
    ['non-existent calendar day', '2025-02-30'],
    ['non-leap-year Feb 29', '2027-02-29'],
    ['unparseable text', 'not-a-date'],
    ['slash separators', '2025/01/01'],
    ['US order', '01-31-2025'],
    ['single-digit month/day', '2025-1-5'],
    ['month 13', '2025-13-01'],
    ['full ISO timestamp', '2025-01-01T00:00:00Z'],
    ['number', 20250101],
    ['boolean', true],
    ['object', { y: 2025 }]
  ];

  test.each(invalid)('AC6: POST rejects %s with 400 and field=dueDate and creates nothing', async (_label, dueDate) => {
    const title = `Invalid create ${_label}`;
    const before = (await listAll()).length;
    const res = await create({ ...base(title), dueDate });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('dueDate');
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
    const after = await listAll();
    expect(after.length).toBe(before);
    expect(after.some((t) => t.title === title)).toBe(false);
  });

  test.each(invalid)('AC7: PUT rejects %s with 400 and field=dueDate and leaves the todo unchanged', async (_label, dueDate) => {
    const created = (await create({ ...base('Edit invalid'), dueDate: '2030-01-10' })).body;
    const res = await update(created.id, { ...base('Edit invalid CHANGED'), dueDate });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('dueDate');
    const after = (await getOne(created.id)).body;
    expect(after.title).toBe('Edit invalid');
    expect(after.dueDate).toBe('2030-01-10');
  });

  test('requires authentication to create with a due date', async () => {
    const res = await request(app).post('/todos').send({ ...base('No auth'), dueDate: '2030-01-01' });
    expect(res.status).toBe(401);
  });

  test("a user cannot change another user's due date", async () => {
    const owned = (await create({ ...base('Owned'), dueDate: '2030-01-01' })).body;
    const email = `qa-other-${Date.now()}@example.com`;
    await request(app).post('/signup').send({ name: 'Other', email, password: 'secret' }).expect(201);
    const otherToken = (await request(app).post('/login').send({ email, password: 'secret' })).body.token;
    const res = await request(app).put(`/todos/${owned.id}`).set('Authorization', otherToken)
      .send({ ...base('Hijack'), dueDate: '2099-12-31' });
    expect(res.status).toBe(404);
    expect((await getOne(owned.id)).body.dueDate).toBe('2030-01-01');
  });
});
