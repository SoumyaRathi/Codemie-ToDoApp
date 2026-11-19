const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-api-'));
process.env.TODO_DATA_DIR = dataDir;

const request = require('supertest');
const app = require('../../todoServer');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let token;
let seeded;

async function createTodo(title, dueDate) {
  const body = { title, description: `${title} description`, completed: false };
  if (dueDate) body.dueDate = dueDate;
  const res = await request(app).post('/todos').set('Authorization', token).send(body);
  expect(res.status).toBe(201);
  await sleep(5); // distinct createdAt timestamps for the default-sort check
  return res.body;
}

const list = async (query) => {
  const res = await request(app).get(`/todos${query}`).set('Authorization', token);
  expect(res.status).toBe(200);
  return res.body;
};

beforeAll(async () => {
  const email = `qa-${Date.now()}@example.com`;
  const signup = await request(app).post('/signup').send({ name: 'QA', email, password: 'secret' });
  expect(signup.status).toBe(201);
  const login = await request(app).post('/login').send({ email, password: 'secret' });
  expect(login.status).toBe(200);
  token = login.body.token;

  // Creation order differs from due date order on purpose. Signup also adds a
  // "Welcome" todo (no dueDate) that is the oldest item for this user.
  seeded = {
    late: await createTodo('Late', '2026-12-31'),
    early: await createTodo('Early', '2026-01-05'),
    tieFirst: await createTodo('Tie first', '2026-06-01'),
    noDueA: await createTodo('No due A'),
    tieSecond: await createTodo('Tie second', '2026-06-01'),
    noDueB: await createTodo('No due B')
  };
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('GET /todos?sort=dueDate', () => {
  test('AC2: due-dated todos are ordered earliest to latest', async () => {
    const todos = await list('?sort=dueDate');
    const dates = todos.filter((t) => t.dueDate).map((t) => t.dueDate);
    expect(dates).toEqual(['2026-01-05', '2026-06-01', '2026-06-01', '2026-12-31']);
    expect(dates).toEqual([...dates].sort());
  });

  test('AC3: todos without dueDate come after every todo with a dueDate', async () => {
    const todos = await list('?sort=dueDate');
    const firstUndated = todos.findIndex((t) => !t.dueDate);
    expect(firstUndated).toBe(4);
    expect(todos.slice(0, firstUndated).every((t) => t.dueDate)).toBe(true);
    expect(todos.slice(firstUndated).every((t) => !t.dueDate)).toBe(true);
  });

  test('tie-break: equal dueDates are ordered by id ascending', async () => {
    const todos = await list('?sort=dueDate');
    const tied = todos.filter((t) => t.dueDate === '2026-06-01').map((t) => t.id);
    expect(seeded.tieFirst.id).toBeLessThan(seeded.tieSecond.id);
    expect(tied).toEqual([seeded.tieFirst.id, seeded.tieSecond.id]);
  });

  test('tie-break: todos without dueDate are ordered by id ascending', async () => {
    const todos = await list('?sort=dueDate');
    const undatedIds = todos.filter((t) => !t.dueDate).map((t) => t.id);
    expect(undatedIds.length).toBe(3); // Welcome todo + 2 seeded
    expect(undatedIds).toEqual([...undatedIds].sort((a, b) => a - b));
  });

  test('full order is deterministic across repeated requests', async () => {
    const first = (await list('?sort=dueDate')).map((t) => t.id);
    const second = (await list('?sort=dueDate')).map((t) => t.id);
    expect(second).toEqual(first);
    expect(first.slice(0, 4)).toEqual([
      seeded.early.id, seeded.tieFirst.id, seeded.tieSecond.id, seeded.late.id
    ]);
  });

  test('ordering is kept after editing and toggling a todo (AC4, API level)', async () => {
    await request(app).put(`/todos/${seeded.late.id}`).set('Authorization', token)
      .send({ title: 'Late edited', description: 'edited', completed: false }).expect(200);
    await request(app).patch(`/todos/${seeded.early.id}/toggle`).set('Authorization', token).expect(200);
    const todos = await list('?sort=dueDate');
    expect(todos.slice(0, 4).map((t) => t.id)).toEqual([
      seeded.early.id, seeded.tieFirst.id, seeded.tieSecond.id, seeded.late.id
    ]);
    expect(todos.find((t) => t.id === seeded.late.id).dueDate).toBe('2026-12-31');
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/todos?sort=dueDate');
    expect(res.status).toBe(401);
  });
});

describe('default ordering (AC5 regression)', () => {
  test('GET /todos?sort=createdAt returns newest first', async () => {
    const todos = await list('?sort=createdAt');
    const created = todos.map((t) => new Date(t.createdAt).getTime());
    expect(created).toEqual([...created].sort((a, b) => b - a));
    expect(todos[0].id).toBe(seeded.noDueB.id);
    expect(todos[todos.length - 1].title).toBe('Welcome to your To-Do List!');
  });

  test('createdAt order differs from dueDate order', async () => {
    const byCreated = (await list('?sort=createdAt')).map((t) => t.id);
    const byDue = (await list('?sort=dueDate')).map((t) => t.id);
    expect(byCreated).not.toEqual(byDue);
  });
});
