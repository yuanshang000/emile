import { getDb } from '../db';
import { uid } from '../uid';

export interface EmailRecord {
  id: string;
  message_id: string | null;
  from_addr: string;
  to_addr: string;
  subject: string;
  body_text: string;
  body_html: string;
  group_id: string | null;
  extracted_data: string;
  response_cache: string;
  received_at: string;
  created_at: string;
}

export interface EmailFilters {
  group?: string;
  from?: string;
  to?: string;
  subject?: string;
  sender_contains?: string;
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

export function saveEmail(data: {
  message_id?: string;
  from_addr: string;
  to_addr: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  group_id?: string | null;
  extracted_data?: Record<string, string>;
  response_cache?: Record<string, string>;
}): EmailRecord {
  const id = uid();
  getDb().prepare(`
    INSERT INTO emails (id, message_id, from_addr, to_addr, subject, body_text, body_html, group_id, extracted_data, response_cache)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.message_id || null,
    data.from_addr,
    data.to_addr,
    data.subject || '',
    data.body_text || '',
    data.body_html || '',
    data.group_id ?? null,
    JSON.stringify(data.extracted_data || {}),
    JSON.stringify(data.response_cache || {}),
  );
  return getEmail(id)!;
}

export function getEmail(id: string): EmailRecord | undefined {
  return getDb().prepare('SELECT * FROM emails WHERE id = ?').get(id) as EmailRecord | undefined;
}

export function getEmails(filters: EmailFilters): { total: number; items: EmailRecord[] } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.group) {
    conditions.push('group_id = ?');
    params.push(filters.group);
  }
  if (filters.from) {
    conditions.push('from_addr = ?');
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push('to_addr = ?');
    params.push(filters.to);
  }
  if (filters.subject) {
    conditions.push('subject LIKE ?');
    params.push(`%${filters.subject}%`);
  }
  if (filters.sender_contains) {
    conditions.push('from_addr LIKE ?');
    params.push(`%${filters.sender_contains}%`);
  }
  if (filters.start_date) {
    conditions.push('received_at >= ?');
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    conditions.push('received_at <= ?');
    params.push(filters.end_date);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const total = (getDb().prepare(`SELECT COUNT(*) as count FROM emails ${where}`).get(...params) as any).count;
  const items = getDb().prepare(`SELECT * FROM emails ${where} ORDER BY received_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as EmailRecord[];

  return { total, items };
}

export function getLatestEmailByGroup(groupId: string): EmailRecord | undefined {
  return getDb().prepare(`
    SELECT * FROM emails WHERE group_id = ? ORDER BY received_at DESC LIMIT 1
  `).get(groupId) as EmailRecord | undefined;
}

export function getLatestCodeByGroup(groupId: string): { code: string; email: EmailRecord } | undefined {
  const email = getLatestEmailByGroup(groupId);
  if (!email) return undefined;
  const extracted = JSON.parse(email.extracted_data || '{}');
  const firstValue = Object.values(extracted)[0];
  return { code: String(firstValue || ''), email };
}

export function updateEmailGroup(id: string, groupId: string | null): void {
  getDb().prepare('UPDATE emails SET group_id = ? WHERE id = ?').run(groupId, id);
}

export function updateEmailExtracted(id: string, extracted: Record<string, string>, responseCache: Record<string, string>): void {
  getDb().prepare('UPDATE emails SET extracted_data = ?, response_cache = ? WHERE id = ?').run(
    JSON.stringify(extracted), JSON.stringify(responseCache), id
  );
}

export function deleteOldEmails(beforeDays: number = 30): number {
  const result = getDb().prepare(`
    DELETE FROM emails WHERE received_at < datetime('now', ?)
  `).run(`-${beforeDays} days`);
  return result.changes;
}
