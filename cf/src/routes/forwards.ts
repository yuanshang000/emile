import { Hono } from 'hono';
import {
  listForwardAccounts,
  getForwardAccount,
  createForwardAccount,
  updateForwardAccount,
  deleteForwardAccount,
} from '../db';

export const forwardsRoute = new Hono<{ Bindings: Env }>();

forwardsRoute.get('/', async (c) => {
  const items = await listForwardAccounts(c.env.DB);
  return c.json(items);
});

forwardsRoute.get('/:id', async (c) => {
  const item = await getForwardAccount(c.env.DB, c.req.param('id'));
  if (!item) return c.json({ error: 'Not found' }, 404);
  return c.json(item);
});

forwardsRoute.post('/', async (c) => {
  const body = await c.req.json();
  const item = await createForwardAccount(c.env.DB, body);
  return c.json(item, 201);
});

forwardsRoute.put('/:id', async (c) => {
  const body = await c.req.json();
  const item = await updateForwardAccount(c.env.DB, c.req.param('id'), body);
  if (!item) return c.json({ error: 'Not found' }, 404);
  return c.json(item);
});

forwardsRoute.delete('/:id', async (c) => {
  const ok = await deleteForwardAccount(c.env.DB, c.req.param('id'));
  if (!ok) return c.json({ error: 'Not found' }, 404);
  return c.json({ success: true });
});
