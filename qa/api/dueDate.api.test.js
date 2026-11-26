// KAN-158 API tests (AC1-AC8). Runs against the Express app in-process with an isolated data dir.
const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kan158-api-'));
process.env.TODO_DATA_DIR = dataDir;

const request = require('supertest');
const app = require('../../todoServer');

let token;

const auth = (req) => req.set('Authorization', token);
const create = (body) => auth(request(app).post('/todos')).send({ title: 't', description: 'd', completed: false, ...body });
const update = (id, body) => auth(request(app).put(`/todos/${id}`)).send({ title: 't', description: 'd', completed: false, ...body });
const list = async () => (await auth(request(app).get('/todos'))).body;

beforeAll(async () => {
  const email = `kan158-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const signup = await request(app).post('/signup').send({ name: 'QA', email, password: 'secret' });
  expect(signup.status).toBe(201);
  const login = await request(app).post('/login').send({ email, password: 'secret' });
  expect(login.status).toBe(200);
  token = login.body.token;
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('KAN-158 due date API', () => {
  test('AC1: POST /todos with a valid dueDate returns 201 and echoes it, and it persists', async () => {
    const res = await create({ title: 'AC1', dueDate: '2026-12-01' });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBe('2026-12-01');
    const stored = (await list()).find((t) => t.id === res.body.id);
    expect(stored.dueDate).toBe('2026-12-01');
  });

  test('AC2: POST /todos without dueDate returns 201 and no dueDate property', async () => {
    const res = await create({ title: 'AC2' });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('dueDate');
    const stored = (await list()).find((t) => t.id === res.body.id);
    expect(stored).not.toHaveProperty('dueDate');
  });

  test('AC3: PUT sets a dueDate on a todo that had none, and can change it afterwards', async () => {
    const created = (await create({ title: 'AC3' })).body;
    expect(created).not.toHaveProperty('dueDate');

    const set = await update(created.id, { title: 'AC3', dueDate: '2026-12-01' });
    expect(set.status).toBe(200);
    expect(set.body.dueDate).toBe('2026-12-01');

    const changed = await update(created.id, { title: 'AC3', dueDate: '2027-01-15' });
    expect(changed.status).toBe(200);
    expect(changed.body.dueDate).toBe('2027-01-15');
    expect((await list()).find((t) => t.id === created.id).dueDate).toBe('2027-01-15');
  });

  test.each([
    ['empty string', ''],
    ['null', null]
  ])('AC4: PUT with dueDate = %s clears an existing dueDate', async (_label, value) => {
    const created = (await create({ title: 'AC4', dueDate: '2026-12-01' })).body;
    expect(created.dueDate).toBe('2026-12-01');

    const res = await update(created.id, { title: 'AC4', dueDate: value });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('dueDate');
    expect((await list()).find((t) => t.id === created.id)).not.toHaveProperty('dueDate');
  });

  test('AC5: GET /todos returns dueDate only on todos that have one', async () => {
    const withDue = (await create({ title: 'AC5 with', dueDate: '2026-03-04' })).body;
    const without = (await create({ title: 'AC5 without' })).body;

    const todos = await list();
    const a = todos.find((t) => t.id === withDue.id);
    const b = todos.find((t) => t.id === without.id);
    expect(a.dueDate).toBe('2026-03-04');
    expect(a).toEqual(expect.objectContaining({ title: 'AC5 with', description: 'd', completed: false }));
    expect(b).not.toHaveProperty('dueDate');
    expect(b).toEqual(expect.objectContaining({ title: 'AC5 without', description: 'd', completed: false }));
  });

  describe('AC6: invalid dueDate is rejected with 400 and field=dueDate', () => {
    test.each([
      ['impossible calendar date', '2025-02-30'],
      ['not a date', 'not-a-date'],
      ['wrong format', '12/01/2026'],
      ['five digit year', '10000-01-01'],
      ['non-string value', 20250101]
    ])('POST rejects %s', async (_label, value) => {
      const before = (await list()).length;
      const res = await create({ title: 'AC6', dueDate: value });
      expect(res.status).toBe(400);
      expect(res.body.field).toBe('dueDate');
      expect(typeof res.body.error).toBe('string');
      expect((await list()).length).toBe(before);
    });

    test('PUT rejects an invalid dueDate and leaves the stored value unchanged', async () => {
      const created = (await create({ title: 'AC6 put', dueDate: '2026-12-01' })).body;
      const res = await update(created.id, { title: 'AC6 put', dueDate: '2025-02-30' });
      expect(res.status).toBe(400);
      expect(res.body.field).toBe('dueDate');
      expect((await list()).find((t) => t.id === created.id).dueDate).toBe('2026-12-01');
    });
  });

  describe('AC7/AC8: boundary dates', () => {
    test.each([
      ['AC7 earliest', '0001-01-01'],
      ['AC8 latest', '9999-12-31']
    ])('%s (%s): POST returns 201, echoes, persists; PUT accepts it', async (_label, date) => {
      const res = await create({ title: `boundary ${date}`, dueDate: date });
      expect(res.status).toBe(201);
      expect(res.body.dueDate).toBe(date);
      expect((await list()).find((t) => t.id === res.body.id).dueDate).toBe(date);

      const plain = (await create({ title: `boundary put ${date}` })).body;
      const put = await update(plain.id, { title: plain.title, dueDate: date });
      expect(put.status).toBe(200);
      expect(put.body.dueDate).toBe(date);
    });
  });
});
