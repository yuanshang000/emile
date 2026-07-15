import { Hono } from 'hono';
import { classifyEmail } from '../services/classifier';
import { extractFromEmail } from '../services/extractor';
import { renderTemplate } from '../services/response-builder';
import {
  getExtractRules,
  getResponseTemplate,
  getGroup,
} from '../db';

export const webhookRoute = new Hono<{ Bindings: Env }>();

webhookRoute.post('/webhook/email', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json<{
    message_id?: string;
    from: string;
    to: string;
    subject?: string;
    body_text?: string;
    body_html?: string;
  }>();

  if (!body.from || !body.to) {
    return c.json({ error: 'Missing required fields: from, to' }, 400);
  }

  const emailData = {
    message_id: body.message_id || undefined,
    from_addr: body.from,
    to_addr: body.to,
    subject: body.subject || '',
    body_text: body.body_text || '',
    body_html: body.body_html || '',
  };

  const classification = await classifyEmail(db, emailData);

  let extractedData: Record<string, string> = {};
  let responseData: Record<string, any> = {};

  if (classification) {
    const rules = await getExtractRules(db, classification.groupId);
    extractedData = extractFromEmail(
      emailData.body_html,
      emailData.body_text,
      rules as any[]
    );

    const receivedAt = new Date().toISOString();
    const template = await getResponseTemplate(db, classification.groupId);
    if (template) {
      responseData = renderTemplate(
        (template as any).template,
        extractedData,
        {
          from_addr: emailData.from_addr,
          to_addr: emailData.to_addr,
          subject: emailData.subject,
          received_at: receivedAt,
          group_name: classification.groupName,
        }
      );
    }
  }

  const id = crypto.randomUUID();
  const receivedAt = new Date().toISOString();
  await db.prepare(
    'INSERT INTO emails (id, message_id, from_addr, to_addr, subject, body_text, body_html, group_id, extracted_data, response_cache, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id,
    body.message_id || null,
    emailData.from_addr,
    emailData.to_addr,
    emailData.subject || '',
    emailData.body_text || '',
    emailData.body_html || '',
    classification?.groupId ?? null,
    JSON.stringify(extractedData),
    JSON.stringify(responseData),
    receivedAt
  ).run();

  return c.json({
    id,
    group: classification
      ? { id: classification.groupId, name: classification.groupName }
      : null,
    extracted: extractedData,
    response: responseData,
  }, 201);
});
