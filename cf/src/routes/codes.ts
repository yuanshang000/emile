import { Hono } from 'hono';
import { getGroup } from '../db';

export const codesRoute = new Hono<{ Bindings: Env }>();

async function findEmail(db: D1Database, groupId: string, after?: string) {
  if (after) {
    return db.prepare(
      'SELECT * FROM emails WHERE group_id = ? AND received_at > ? ORDER BY received_at ASC LIMIT 1'
    ).bind(groupId, after).first();
  }
  return db.prepare(
    'SELECT * FROM emails WHERE group_id = ? ORDER BY received_at DESC LIMIT 1'
  ).bind(groupId).first();
}

codesRoute.get('/latest', async (c) => {
  const db = c.env.DB;
  const groupId = c.req.query('group');
  const after = c.req.query('after');
  if (!groupId) return c.json({ error: 'group query parameter is required' }, 400);

  const group = await getGroup(db, groupId);
  if (!group) return c.json({ error: 'Group not found' }, 404);

  const email: any = await findEmail(db, groupId, after || undefined);
  if (!email) {
    return c.json({
      error: after ? 'No emails found after the given time' : 'No emails found for this group',
    }, 404);
  }

  const cache = JSON.parse(email.response_cache || '{}');
  return c.json({
    email_id: email.id,
    from: email.from_addr,
    subject: email.subject,
    received_at: email.received_at,
    ...cache,
  });
});

codesRoute.get('/latest/code', async (c) => {
  const db = c.env.DB;
  const groupId = c.req.query('group');
  const after = c.req.query('after');
  if (!groupId) return c.json({ error: 'group query parameter is required' }, 400);

  const group = await getGroup(db, groupId);
  if (!group) return c.json({ error: 'Group not found' }, 404);

  const email: any = await findEmail(db, groupId, after || undefined);
  if (!email) {
    return c.json({
      error: after ? 'No emails found after the given time' : 'No emails found for this group',
    }, 404);
  }

  const extracted = JSON.parse(email.extracted_data || '{}');
  const firstValue = Object.values(extracted)[0] || '';
  return c.json({
    email_id: email.id,
    from: email.from_addr,
    subject: email.subject,
    code: String(firstValue),
    received_at: email.received_at,
  });
});
