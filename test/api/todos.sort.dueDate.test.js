const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { resetStore } = require('../helpers/store');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-api-'));
process.env.TODO_DATA_DIR = dataDir;
const app = require('../../todoServer');

let token;

async function signupAndLogin() {
  const creds = { name: 'Tester', email: 'tester@example.com', password: 'secret123' };
  await request(app).post('/signup').send(creds).expect(201);
  const res = await request(app).post('/login').send({ email: creds.email, password: creds.password }).expect(200);
  const auth = res.body.token;
  const seeded = await request(app).get('/todos').set('Authorization', auth).expect(200);
  for (const todo of seeded.body) {
    await request(app).delete(`/todos/${todo.id}`).set('Authorization', auth).expect(200);
  }
  return auth;
}

async function createTodo(title, dueDate) {
  const body = { title, description: `${title} description` };
  if (dueDate !== undefined) body.dueDate = dueDate;
  const res = await request(app).post('/todos').set('Authorization', token).send(body).expect(201);
  return res.body;
}

async function listTitles(query = 'sort=dueDate') {
  const res = await request(app).get(`/todos?${query}`).set('Authorization', token).expect(200);
  return res.body.map((t) => t.title);
}

beforeEach(async () => {
  resetStore(dataDir);
  token = await signupAndLogin();
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('GET /todos?sort=dueDate', () => {
  test('1. returns todos with the earliest due date first', async () => {
    await createTodo('March', '2025-03-01');
    await createTodo('January', '2025-01-10');
    await createTodo('February', '2025-02-05');

    expect(await listTitles()).toEqual(['January', 'February', 'March']);
  });

  test('2. places todos without a due date after all todos with a due date', async () => {
    await createTodo('No date A');
    await createTodo('Late', '2026-12-31');
    await createTodo('No date B');
    await createTodo('Early', '2024-01-01');

    expect(await listTitles()).toEqual(['Early', 'Late', 'No date A', 'No date B']);
  });

  test('3. orders todos sharing the same due date by id ascending', async () => {
    const first = await createTodo('Same day first', '2025-05-05');
    const second = await createTodo('Same day second', '2025-05-05');
    const third = await createTodo('Same day third', '2025-05-05');
    expect(first.id).toBeLessThan(second.id);
    expect(second.id).toBeLessThan(third.id);

    expect(await listTitles()).toEqual(['Same day first', 'Same day second', 'Same day third']);
  });

  test('4. orders todos that all lack a due date by id ascending', async () => {
    await createTodo('Undated one');
    await createTodo('Undated two', null);
    await createTodo('Undated three', '');

    expect(await listTitles()).toEqual(['Undated one', 'Undated two', 'Undated three']);
  });

  test('5. returns the identical order on repeated requests', async () => {
    await createTodo('Undated', undefined);
    await createTodo('Tie B', '2025-04-01');
    await createTodo('Earliest', '2025-01-01');
    await createTodo('Tie A', '2025-04-01');

    const runs = [];
    for (let i = 0; i < 5; i++) runs.push(await listTitles());

    expect(runs[0]).toEqual(['Earliest', 'Tie B', 'Tie A', 'Undated']);
    runs.forEach((run) => expect(run).toEqual(runs[0]));
  });

  test('6. moves a todo to the end once its due date is cleared via PUT', async () => {
    const dated = await createTodo('Will be cleared', '2025-01-01');
    await createTodo('Stays dated', '2025-06-01');
    expect(await listTitles()).toEqual(['Will be cleared', 'Stays dated']);

    await request(app)
      .put(`/todos/${dated.id}`)
      .set('Authorization', token)
      .send({ title: dated.title, description: dated.description, completed: false, dueDate: null })
      .expect(200);

    expect(await listTitles()).toEqual(['Stays dated', 'Will be cleared']);
  });

  test('7. rejects an invalid due date with 400 and does not store the todo', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', token)
      .send({ title: 'Bad date', description: 'x', dueDate: '2025-13-40' })
      .expect(400);

    expect(res.body.field).toBe('dueDate');
    expect(await listTitles()).toEqual([]);
  });

  test('8. keeps other sort modes working and independent of the due date order', async () => {
    await createTodo('Zebra', '2025-01-01');
    await createTodo('Apple', '2025-03-01');
    await createTodo('Mango', '2025-02-01');

    expect(await listTitles('sort=dueDate')).toEqual(['Zebra', 'Mango', 'Apple']);
    expect(await listTitles('sort=title')).toEqual(['Apple', 'Mango', 'Zebra']);
    expect(await listTitles('sort=dueDate')).toEqual(['Zebra', 'Mango', 'Apple']);
  });

  test('9. keeps due date order after toggling completion and honours filter=active', async () => {
    await createTodo('Third', '2025-03-01');
    const first = await createTodo('First', '2025-01-01');
    await createTodo('Second', '2025-02-01');

    await request(app).patch(`/todos/${first.id}/toggle`).set('Authorization', token).expect(200);

    expect(await listTitles('sort=dueDate')).toEqual(['First', 'Second', 'Third']);
    expect(await listTitles('filter=active&sort=dueDate')).toEqual(['Second', 'Third']);
    expect(await listTitles('filter=completed&sort=dueDate')).toEqual(['First']);
  });

  test('10. keeps the remaining todos in due date order after a delete', async () => {
    await createTodo('Undated');
    const middle = await createTodo('Middle', '2025-02-01');
    await createTodo('Earliest', '2025-01-01');
    await createTodo('Latest', '2025-03-01');
    expect(await listTitles()).toEqual(['Earliest', 'Middle', 'Latest', 'Undated']);

    await request(app).delete(`/todos/${middle.id}`).set('Authorization', token).expect(200);

    expect(await listTitles()).toEqual(['Earliest', 'Latest', 'Undated']);
  });
});
