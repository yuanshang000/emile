import { Hono } from 'hono';
import { getGroup, getExtractRules, getResponseTemplate } from '../db';
import { extractFromEmail } from '../services/extractor';
import { renderTemplate, DEFAULT_RESPONSE_TEMPLATE } from '../services/response-builder';

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

async function liveExtract(db: D1Database, groupId: string, email: any) {
  const rules = await getExtractRules(db, groupId);
  return extractFromEmail(email.body_html || '', email.body_text || '', rules as any[]);
}

function pickCode(extracted: Record<string, string>): string {
  if (extracted['验证码'] !== undefined) return String(extracted['验证码'] || '');
  if (extracted['code'] !== undefined) return String(extracted['code'] || '');
  const first = Object.values(extracted)[0];
  return first !== undefined ? String(first) : '';
}

codesRoute.get('/latest', async (c) => {
  const db = c.env.DB;
  const groupId = c.req.query('group');
  const after = c.req.query('after');
  if (!groupId) return c.json({ error: 'group query parameter is required' }, 400);

  const group: any = await getGroup(db, groupId);
  if (!group) return c.json({ error: 'Group not found' }, 404);

  const email: any = await findEmail(db, groupId, after || undefined);
  if (!email) {
    return c.json({
      error: after ? 'No emails found after the given time' : 'No emails found for this group',
    }, 404);
  }

  const extracted = await liveExtract(db, groupId, email);
  const tplRow: any = await getResponseTemplate(db, groupId);
  const templateStr = tplRow?.template || DEFAULT_RESPONSE_TEMPLATE;
  const rendered = renderTemplate(templateStr, extracted, {
    from_addr: email.from_addr,
    to_addr: email.to_addr,
    subject: email.subject,
    received_at: email.received_at,
    group_name: group.name,
  });

  // Fully replace default response with template output
  return c.json(rendered);
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

  const extracted = await liveExtract(db, groupId, email);
  return c.json({
    email_id: email.id,
    from: email.from_addr,
    subject: email.subject,
    code: pickCode(extracted),
    received_at: email.received_at,
  });
});
