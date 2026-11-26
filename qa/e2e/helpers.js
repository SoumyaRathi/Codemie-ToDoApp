const { expect } = require('@playwright/test');
const crypto = require('crypto');

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const card = (page, title) =>
  page
    .locator('.outputData .output')
    .filter({ has: page.locator('#title', { hasText: new RegExp(`^${escapeRegExp(title)}$`) }) });

const dueDateOf = (cardLocator) => cardLocator.locator('.todo-due-date');

async function signUpAndLogin(page) {
  const email = `kan158-${crypto.randomUUID()}@example.com`;
  const password = 'secret123';
  await page.goto('/');
  await expect(page.locator('#auth-modal')).toBeVisible();
  await page.locator('#auth-toggle-link').click();
  await page.locator('#auth-name').fill('QA User');
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.locator('#auth-submit-btn').click();
  await expect(page.locator('#auth-error')).toHaveText('Signup successful! Please login.');
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.locator('#auth-submit-btn').click();
  await expect(page.locator('#auth-modal')).toBeHidden();
  await expect(page.locator('#user-info')).toContainText(email);
  return email;
}

async function seedTodo(page, title, dueDate) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const data = { title, description: `${title} description`, completed: false };
  if (dueDate) data.dueDate = dueDate;
  const res = await page.request.post('/todos', { headers: { Authorization: token }, data });
  expect(res.status()).toBe(201);
}

async function openCreateModal(page) {
  await page.locator('#add-todo-btn').click();
  await expect(page.locator('#edit-modal')).toBeVisible();
}

async function openEditModal(page, title) {
  await card(page, title).locator('.todo-btn.edit').click();
  await expect(page.locator('#edit-modal')).toBeVisible();
}

// dueDate: string to type into the date input; undefined leaves the field untouched.
async function fillForm(page, { title, dueDate }) {
  if (title !== undefined) {
    await page.locator('#edit-title').fill(title);
    await page.locator('#edit-desc').fill(`${title} description`);
  }
  if (dueDate !== undefined) await page.locator('#edit-due-date').fill(dueDate);
}

const isTodoWrite = (method) => (r) =>
  r.method() === method && /\/todos(\/\d+)?$/.test(new URL(r.url()).pathname);

module.exports = { card, dueDateOf, signUpAndLogin, seedTodo, openCreateModal, openEditModal, fillForm, isTodoWrite };
