import { Hono } from 'hono';
import {
  listEmailLibCategories,
  getEmailLibCategory,
  createEmailLibCategory,
  updateEmailLibCategory,
  deleteEmailLibCategory,
  getEmailLibEntries,
  setEmailLibEntries,
  getEmailLibNext,
  resetEmailLibState,
} from '../db';

export const emailLibRoute = new Hono<{ Bindings: Env }>();

emailLibRoute.get('/categories', async (c) => {
  const items = await listEmailLibCategories(c.env.DB);
  return c.json(items);
});

emailLibRoute.get('/categories/:id', async (c) => {
  const item = await getEmailLibCategory(c.env.DB, c.req.param('id'));
  if (!item) return c.json({ error: 'Category not found' }, 404);
  return c.json(item);
});

emailLibRoute.post('/categories', async (c) => {
  const body = await c.req.json();
  if (!body.name || !body.name.trim()) return c.json({ error: 'name is required' }, 400);
  const item = await createEmailLibCategory(c.env.DB, body.name.trim());
  return c.json(item, 201);
});

emailLibRoute.put('/categories/:id', async (c) => {
  const body = await c.req.json();
  if (!body.name || !body.name.trim()) return c.json({ error: 'name is required' }, 400);
  const item = await updateEmailLibCategory(c.env.DB, c.req.param('id'), body.name.trim());
  if (!item) return c.json({ error: 'Category not found' }, 404);
  return c.json(item);
});

emailLibRoute.delete('/categories/:id', async (c) => {
  const ok = await deleteEmailLibCategory(c.env.DB, c.req.param('id'));
  if (!ok) return c.json({ error: 'Category not found' }, 404);
  return c.json({ success: true });
});

emailLibRoute.get('/categories/:id/emails', async (c) => {
  const entries = await getEmailLibEntries(c.env.DB, c.req.param('id'));
  return c.json(entries);
});

emailLibRoute.put('/categories/:id/emails', async (c) => {
  const body = await c.req.json();
  if (!Array.isArray(body.emails)) return c.json({ error: 'emails must be an array of strings' }, 400);
  const entries = await setEmailLibEntries(c.env.DB, c.req.param('id'), body.emails);
  return c.json(entries);
});

emailLibRoute.get('/next/:categoryId', async (c) => {
  const result = await getEmailLibNext(c.env.DB, c.req.param('categoryId'));
  if (!result) return c.json({ error: 'No emails in this category or category not found' }, 404);
  return c.json(result);
});

emailLibRoute.post('/categories/:id/reset', async (c) => {
  const ok = await resetEmailLibState(c.env.DB, c.req.param('id'));
  if (!ok) return c.json({ error: 'Category not found' }, 404);
  return c.json({ success: true });
});
