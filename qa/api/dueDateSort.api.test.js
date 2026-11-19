const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todoapp-qa-api-'));
process.env.TODOS_FILE = path.join(tmpDir, 'todos.json');
process.env.USERS_FILE = path.join(tmpDir, 'users.json');
process.env.SESSIONS_FILE = path.join(tmpDir, 'sessions.json');

const { app } = require('../../todoServer');

const PASSWORD = 'Passw0rd!';
let token;
let otherToken;
const created = [];

async function registerAndLogin(email) {
  const signup = await request(app).post('/signup').send({ name: 'QA User', email, password: PASSWORD });
  expect(signup.status).toBe(201);
  const login = await request(app).post('/login').send({ email, password: PASSWORD });
  expect(login.status).toBe(200);
  return login.body.token;
}

async function createTodo(authToken, title, dueDate) {
  const body = { title, description: `desc ${title}`, completed: false };
  if (dueDate !== undefined) body.dueDate = dueDate;
  const res = await request(app).post('/todos').set('Authorization', authToken).send(body);
  expect(res.status).toBe(201);
  created.push({ authToken, id: res.body.id });
  return res.body;
}

async function listSorted(authToken, query = 'sort=dueDate') {
  const res = await request(app).get(`/todos?${query}`).set('Authorization', authToken);
  expect(res.status).toBe(200);
  return res.body;
}

const titles = list => list.map(t => t.title);

beforeAll(async () => {
  fs.writeFileSync(process.env.USERS_FILE, '[]');
  fs.writeFileSync(process.env.SESSIONS_FILE, '{}');
  fs.writeFileSync(process.env.TODOS_FILE, '[]');
  token = await registerAndLogin('qa-api-main@example.com');
  otherToken = await registerAndLogin('qa-api-other@example.com');

  // Mixed data, created in an order that differs from due-date order.
  await createTodo(token, 'D-march', '2026-03-01');
  await createTodo(token, 'U-first');
  await createTodo(token, 'D-january', '2026-01-15');
  await createTodo(token, 'D-feb-a', '2026-02-10');
  await createTodo(token, 'D-feb-b', '2026-02-10');
  await createTodo(token, 'U-second');
  await createTodo(otherToken, 'OTHER-user-todo', '2025-01-01');
});

afterAll(async () => {
  for (const { authToken, id } of created) {
    await request(app).delete(`/todos/${id}`).set('Authorization', authToken);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('KAN-152 API: due date data and sorting', () => {
  test('[API-01][AC2] POST /todos with dueDate stores and returns the dueDate field', async () => {
    const todo = await createTodo(token, 'API-01 dated', '2026-07-04');
    expect(todo.dueDate).toBe('2026-07-04');
    const fetched = await request(app).get(`/todos/${todo.id}`).set('Authorization', token);
    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBe('2026-07-04');
  });

  test('[API-02][AC3] POST /todos without dueDate is retrievable and has no dueDate value', async () => {
    const todo = await createTodo(token, 'API-02 undated');
    expect(todo.dueDate).toBeUndefined();
    const list = await listSorted(token, '');
    const found = list.find(t => t.id === todo.id);
    expect(found).toBeDefined();
    expect(found.dueDate).toBeUndefined();
  });

  test('[API-03][AC2] GET /todos?sort=dueDate returns dated todos in ascending dueDate order', async () => {
    const list = await listSorted(token);
    const dated = list.filter(t => t.dueDate).map(t => t.dueDate);
    expect(dated.length).toBeGreaterThanOrEqual(4);
    expect(dated).toEqual([...dated].sort());
  });

  test('[API-04][AC3] GET /todos?sort=dueDate places every undated todo after all dated todos', async () => {
    const list = await listSorted(token);
    const firstUndated = list.findIndex(t => !t.dueDate);
    expect(firstUndated).toBeGreaterThan(0);
    expect(list.slice(firstUndated).every(t => !t.dueDate)).toBe(true);
    expect(list.slice(0, firstUndated).every(t => !!t.dueDate)).toBe(true);
    expect(titles(list).slice(-3)).toEqual(expect.arrayContaining(['U-first', 'U-second']));
  });

  test('[API-05][AC2][AC3] Seeded data produces the exact expected order (ties and undated by id asc)', async () => {
    const list = await listSorted(token);
    const seeded = titles(list).filter(t => /^(D-|U-)/.test(t));
    expect(seeded).toEqual(['D-january', 'D-feb-a', 'D-feb-b', 'D-march', 'U-first', 'U-second']);
  });

  test('[API-06][AC3] Repeated requests return an identical order (deterministic)', async () => {
    const first = await listSorted(token);
    for (let i = 0; i < 5; i++) {
      expect(await listSorted(token)).toEqual(first);
    }
  });

  test('[API-07][AC2] sort=dueDate combined with filter and search keeps due-date ordering', async () => {
    const list = await listSorted(token, 'filter=active&sort=dueDate&search=D-feb');
    expect(titles(list)).toEqual(['D-feb-a', 'D-feb-b']);
  });

  test('[API-08][AC3] User with only undated todos gets 200, all todos listed, ordered by id', async () => {
    const lonelyToken = await registerAndLogin('qa-api-undated@example.com');
    await createTodo(lonelyToken, 'L-1');
    await createTodo(lonelyToken, 'L-2');
    const list = await listSorted(lonelyToken);
    expect(list.every(t => !t.dueDate)).toBe(true);
    expect(list.length).toBe(3); // signup welcome todo + two created
    const ids = list.map(t => t.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  test('[API-09][AC2] Todos of other users are never included in the sorted list', async () => {
    const list = await listSorted(token);
    expect(titles(list)).not.toContain('OTHER-user-todo');
  });

  test('[API-10][AC2] PUT with a new dueDate re-positions the todo; PUT with null clears it to the end', async () => {
    const todo = await createTodo(token, 'API-10 movable', '2030-01-01');
    let list = await listSorted(token);
    expect(list.filter(t => t.dueDate).pop().title).toBe('API-10 movable');

    let res = await request(app)
      .put(`/todos/${todo.id}`)
      .set('Authorization', token)
      .send({ title: todo.title, description: todo.description, completed: false, dueDate: '2000-01-01' });
    expect(res.status).toBe(200);
    list = await listSorted(token);
    expect(list[0].title).toBe('API-10 movable');

    res = await request(app)
      .put(`/todos/${todo.id}`)
      .set('Authorization', token)
      .send({ title: todo.title, description: todo.description, completed: false, dueDate: null });
    expect(res.status).toBe(200);
    expect(res.body.dueDate).toBeUndefined();
    list = await listSorted(token);
    expect(list.findIndex(t => t.title === 'API-10 movable')).toBeGreaterThanOrEqual(list.findIndex(t => !t.dueDate));
  });

  test('[API-11][AC2] Invalid dueDate values are rejected with 400', async () => {
    for (const bad of ['2026-13-40', '01/02/2026', 'tomorrow', 20260101]) {
      const res = await request(app)
        .post('/todos')
        .set('Authorization', token)
        .send({ title: 'bad', description: 'bad', completed: false, dueDate: bad });
      expect(res.status).toBe(400);
      expect(res.body.field).toBe('dueDate');
    }
  });

  test('[API-12][AC2] GET /todos?sort=dueDate without auth returns 401', async () => {
    const res = await request(app).get('/todos?sort=dueDate');
    expect(res.status).toBe(401);
  });
});
