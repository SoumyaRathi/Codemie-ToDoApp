const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const request = require('supertest');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-test-'));
process.env.DATA_DIR = dataDir;
const app = require('../todoServer');

const hash = (p) => crypto.createHash('sha256').update(p).digest('hex');
const OLD_PASSWORD = 'oldpass123';
const EMAIL = 'tester@example.com';

let token;

function readUsers() {
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
}

beforeEach(async () => {
  for (const f of ['users.json', 'sessions.json', 'todos.json']) {
    fs.rmSync(path.join(dataDir, f), { force: true });
  }
  await request(app).post('/signup').send({ name: 'Tester', email: EMAIL, password: OLD_PASSWORD });
  const res = await request(app).post('/login').send({ email: EMAIL, password: OLD_PASSWORD });
  token = res.body.token;
});

after(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const change = (body, auth = token) => {
  const req = request(app).put('/me/password');
  if (auth) req.set('Authorization', auth);
  return req.send(body);
};

test('changes password with correct current password and valid new password', async () => {
  const res = await change({ currentPassword: OLD_PASSWORD, newPassword: 'newpass456', confirmNewPassword: 'newpass456' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(readUsers()[0].password, hash('newpass456'));

  const oldLogin = await request(app).post('/login').send({ email: EMAIL, password: OLD_PASSWORD });
  assert.strictEqual(oldLogin.status, 401);
  const newLogin = await request(app).post('/login').send({ email: EMAIL, password: 'newpass456' });
  assert.strictEqual(newLogin.status, 200);

  const staleToken = await request(app).get('/todos').set('Authorization', token);
  assert.strictEqual(staleToken.status, 401);
});

test('rejects wrong current password and leaves password unchanged', async () => {
  const res = await change({ currentPassword: 'wrongpass1', newPassword: 'newpass456', confirmNewPassword: 'newpass456' });
  assert.strictEqual(res.status, 401);
  assert.match(res.body.error, /current password is incorrect/i);
  assert.strictEqual(readUsers()[0].password, hash(OLD_PASSWORD));
});

test('rejects new password that violates policy', async () => {
  for (const weak of ['short1', 'allletters', '12345678']) {
    const res = await change({ currentPassword: OLD_PASSWORD, newPassword: weak, confirmNewPassword: weak });
    assert.strictEqual(res.status, 400, `expected 400 for "${weak}"`);
    assert.strictEqual(readUsers()[0].password, hash(OLD_PASSWORD));
  }
});

test('rejects confirmation mismatch', async () => {
  const res = await change({ currentPassword: OLD_PASSWORD, newPassword: 'newpass456', confirmNewPassword: 'different789' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(readUsers()[0].password, hash(OLD_PASSWORD));
});

test('blocks unauthenticated access', async () => {
  const noToken = await change({ currentPassword: OLD_PASSWORD, newPassword: 'newpass456', confirmNewPassword: 'newpass456' }, null);
  assert.ok([401, 403].includes(noToken.status));
  const badToken = await change({ currentPassword: OLD_PASSWORD, newPassword: 'newpass456', confirmNewPassword: 'newpass456' }, 'not-a-token');
  assert.ok([401, 403].includes(badToken.status));
  assert.strictEqual(readUsers()[0].password, hash(OLD_PASSWORD));
});
