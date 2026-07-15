import { Hono } from 'hono';
import { uid } from '../uid';

export const emailsRoute = new Hono<{ Bindings: Env }>();

emailsRoute.get('/', async (c) => {
  const db = c.env.DB;
  const group = c.req.query('group');
  const from = c.req.query('from');
  const subject = c.req.query('subject');
  const senderContains = c.req.query('sender_contains');
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  const conditions: string[] = [];
  const params: string[] = [];

  if (group) { conditions.push('group_id = ?'); params.push(group); }
  if (from) { conditions.push('from_addr = ?'); params.push(from); }
  if (subject) { conditions.push('subject LIKE ?'); params.push(`%${subject}%`); }
  if (senderContains) { conditions.push('from_addr LIKE ?'); params.push(`%${senderContains}%`); }
  if (startDate) { conditions.push('received_at >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('received_at <= ?'); params.push(endDate); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult: any = await db.prepare(`SELECT COUNT(*) as count FROM emails ${where}`).bind(...params).first();
  const total = countResult?.count ?? 0;
  const { results } = await db.prepare(
    `SELECT * FROM emails ${where} ORDER BY received_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({ total, items: results });
});

emailsRoute.get('/:id', async (c) => {
  const email: any = await c.env.DB.prepare('SELECT * FROM emails WHERE id = ?').bind(c.req.param('id')).first();
  if (!email) return c.json({ error: 'Email not found' }, 404);
  return c.json({
    ...email,
    extracted_data: JSON.parse(email.extracted_data || '{}'),
    response_cache: JSON.parse(email.response_cache || '{}'),
  });
});
