const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const scriptSource = fs.readFileSync(path.join(root, 'public', 'script.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

function makeElement() {
  return {
    style: {},
    value: '',
    textContent: '',
    innerHTML: '',
    checked: false,
    validity: { valid: true },
    selectedOptions: [{ text: 'Sort by Due date' }],
    classList: { add() {}, remove() {} },
    parentNode: { insertBefore() {} },
    setAttribute() {},
    append() {},
    appendChild() {},
    after() {},
    focus() {}
  };
}

let ctx;
let elements;
let calls;

function todoListCalls() {
  return calls.filter(c => !c.options.method && c.url.includes('/todos?'));
}

function lastListUrl() {
  const list = todoListCalls();
  return list[list.length - 1].url;
}

const el = (id) => ctx.document.getElementById(id);
const run = (code) => vm.runInContext(code, ctx);

beforeEach(async () => {
  elements = {};
  calls = [];
  const byKey = (key) => (elements[key] = elements[key] || makeElement());
  const handlers = {};
  const document = {
    getElementById: byKey,
    querySelector: byKey,
    createElement: makeElement,
    body: makeElement(),
    addEventListener: (name, fn) => { handlers[name] = fn; }
  };
  const response = (body) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body)
  });
  ctx = vm.createContext({
    document,
    window: { location: { origin: 'http://localhost:3000' }, addEventListener() {} },
    localStorage: {
      getItem: (k) => ({ token: 'tok', name: 'n', email: 'e@e.com' })[k] || null,
      setItem() {},
      removeItem() {}
    },
    fetch: (url, options = {}) => {
      calls.push({ url, options });
      return Promise.resolve(response(options.method === 'PUT' || options.method === 'POST' ? {} : []));
    },
    alert() {},
    confirm: () => true,
    setTimeout,
    console: { log() {}, error() {} },
    Promise
  });
  vm.runInContext(scriptSource, ctx);
  handlers.DOMContentLoaded();
  await settle();
  calls.length = 0;
});

test('index.html exposes a dueDate option in #sort-select', () => {
  const select = indexHtml.match(/<select id="sort-select">([\s\S]*?)<\/select>/);
  assert.ok(select, '#sort-select not found');
  assert.match(select[1], /<option value="dueDate">[^<]*[Dd]ue [Dd]ate[^<]*<\/option>/);
  assert.match(select[1], /<option value="createdAt">/);
});

test('default sort is createdAt', async () => {
  run('fetchAndRenderTodos()');
  await settle();
  assert.match(lastListUrl(), /sort=createdAt/);
});

test('selecting dueDate sends sort=dueDate to the API', async () => {
  el('sort-select').onchange({ target: { value: 'dueDate' } });
  await settle();
  assert.match(lastListUrl(), /\/todos\?filter=&sort=dueDate/);
  assert.equal(run('currentSort'), 'dueDate');
});

test('dueDate sort persists after creating a todo', async () => {
  el('sort-select').onchange({ target: { value: 'dueDate' } });
  await settle();
  el('edit-title').value = 'New';
  el('edit-desc').value = 'Desc';
  const before = todoListCalls().length;
  el('todo-form').onsubmit({ preventDefault() {} });
  await settle();
  assert.ok(calls.some(c => c.options.method === 'POST'), 'create request not sent');
  assert.ok(todoListCalls().length > before, 'list was not re-fetched after create');
  assert.match(lastListUrl(), /sort=dueDate/);
  assert.equal(run('currentSort'), 'dueDate');
});

test('dueDate sort persists after editing a todo', async () => {
  el('sort-select').onchange({ target: { value: 'dueDate' } });
  await settle();
  run("openEditModal({ id: 5, title: 'T', description: 'D', completed: false })");
  const before = todoListCalls().length;
  el('todo-form').onsubmit({ preventDefault() {} });
  await settle();
  assert.ok(calls.some(c => c.options.method === 'PUT' && c.url.endsWith('/todos/5')), 'edit request not sent');
  assert.ok(todoListCalls().length > before, 'list was not re-fetched after edit');
  assert.match(lastListUrl(), /sort=dueDate/);
  assert.equal(run('currentSort'), 'dueDate');
});

test('dueDate sort persists after toggling completion', async () => {
  el('sort-select').onchange({ target: { value: 'dueDate' } });
  await settle();
  const before = todoListCalls().length;
  run('toggleComplete(5)');
  await settle();
  assert.ok(calls.some(c => c.options.method === 'PATCH'), 'toggle request not sent');
  assert.ok(todoListCalls().length > before, 'list was not re-fetched after toggle');
  assert.match(lastListUrl(), /sort=dueDate/);
  assert.equal(run('currentSort'), 'dueDate');
});

test('dueDate sort persists after deleting a todo', async () => {
  el('sort-select').onchange({ target: { value: 'dueDate' } });
  await settle();
  const before = todoListCalls().length;
  run('confirmDelete(5)');
  await settle();
  assert.ok(calls.some(c => c.options.method === 'DELETE'), 'delete request not sent');
  assert.ok(todoListCalls().length > before, 'list was not re-fetched after delete');
  assert.match(lastListUrl(), /sort=dueDate/);
  assert.equal(run('currentSort'), 'dueDate');
});

test('dueDate sort persists while search and filter change', async () => {
  el('sort-select').onchange({ target: { value: 'dueDate' } });
  await settle();
  el('filter-select').onchange({ target: { value: 'active' } });
  await settle();
  assert.match(lastListUrl(), /filter=active&sort=dueDate/);
  el('search-input').oninput({ target: { value: 'abc' } });
  await settle();
  assert.match(lastListUrl(), /sort=dueDate&search=abc/);
});

test('switching back to createdAt uses the default sort again', async () => {
  el('sort-select').onchange({ target: { value: 'dueDate' } });
  await settle();
  el('sort-select').onchange({ target: { value: 'createdAt' } });
  await settle();
  assert.match(lastListUrl(), /sort=createdAt/);
});

test('Clear filters resets dueDate sort to createdAt and the dropdown', async () => {
  el('sort-select').onchange({ target: { value: 'dueDate' } });
  await settle();
  el('clear-filters-btn').onclick();
  await settle();
  assert.match(lastListUrl(), /sort=createdAt/);
  assert.equal(el('sort-select').value, 'createdAt');
  assert.equal(run('currentSort'), 'createdAt');
});

test('script.js does not hardcode a sort value outside currentSort', () => {
  const lines = scriptSource.split('\n').filter(l => l.includes('/todos?') && !l.trim().startsWith('//'));
  assert.ok(lines.length > 0);
  for (const l of lines) assert.ok(l.includes('sort=${currentSort}'), `hardcoded sort in: ${l.trim()}`);
});
