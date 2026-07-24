import { uid } from './uid';

export async function getGroup(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM groups WHERE id = ?').bind(id).first();
}

export async function getAllGroups(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM groups ORDER BY priority DESC, created_at ASC').all();
  return results;
}

export async function getMatchRules(db: D1Database, groupId: string) {
  const { results } = await db.prepare('SELECT * FROM match_rules WHERE group_id = ? ORDER BY created_at ASC').bind(groupId).all();
  return results;
}

export async function getExtractRules(db: D1Database, groupId: string) {
  const { results } = await db.prepare('SELECT * FROM extract_rules WHERE group_id = ? ORDER BY created_at ASC').bind(groupId).all();
  return results;
}

export async function getResponseTemplate(db: D1Database, groupId: string) {
  return db.prepare('SELECT * FROM response_templates WHERE group_id = ?').bind(groupId).first();
}

export async function getAllGroupsWithRules(db: D1Database) {
  const groups = await getAllGroups(db);
  const result = [];
  for (const g of groups) {
    result.push({
      ...(g as any),
      match_rules: await getMatchRules(db, (g as any).id),
      extract_rules: await getExtractRules(db, (g as any).id),
      response_template: await getResponseTemplate(db, (g as any).id),
    });
  }
  return result;
}

export async function createGroup(db: D1Database, data: { name: string; description?: string; priority?: number }) {
  const id = uid();
  await db.prepare(
    'INSERT INTO groups (id, name, description, priority) VALUES (?, ?, ?, ?)'
  ).bind(id, data.name, data.description || '', data.priority ?? 0).run();
  const defaultTemplate = `{
  "group": "${data.name.replace(/"/g, '\\"')}",
  "time": "{{接收时间}}",
  "code": "{{验证码}}"
}`;
  await upsertResponseTemplate(db, id, defaultTemplate);
  return getGroup(db, id);
}

export async function updateGroup(db: D1Database, id: string, data: any) {
  const existing: any = await getGroup(db, id);
  if (!existing) return null;
  await db.prepare(
    "UPDATE groups SET name=?, description=?, priority=?, enabled=?, updated_at=datetime('now') WHERE id=?"
  ).bind(
    data.name ?? existing.name,
    data.description ?? existing.description,
    data.priority ?? existing.priority,
    data.enabled ?? existing.enabled,
    id
  ).run();
  return getGroup(db, id);
}

export async function deleteGroup(db: D1Database, id: string) {
  const { meta } = await db.prepare('DELETE FROM groups WHERE id = ?').bind(id).run();
  return meta.changes > 0;
}

export async function createMatchRule(db: D1Database, data: any) {
  const id = uid();
  await db.prepare(
    'INSERT INTO match_rules (id, group_id, field, operator, pattern) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, data.group_id, data.field, data.operator, data.pattern).run();
  return { id, ...data };
}

export async function updateMatchRule(db: D1Database, id: string, data: any) {
  const existing: any = await db.prepare('SELECT * FROM match_rules WHERE id = ?').bind(id).first();
  if (!existing) return null;
  await db.prepare(
    'UPDATE match_rules SET field=?, operator=?, pattern=? WHERE id=?'
  ).bind(
    data.field ?? existing.field,
    data.operator ?? existing.operator,
    data.pattern ?? existing.pattern,
    id
  ).run();
  return db.prepare('SELECT * FROM match_rules WHERE id = ?').bind(id).first();
}

export async function deleteMatchRule(db: D1Database, id: string) {
  const { meta } = await db.prepare('DELETE FROM match_rules WHERE id = ?').bind(id).run();
  return meta.changes > 0;
}

export async function createExtractRule(db: D1Database, data: any) {
  const id = uid();
  await db.prepare(
    'INSERT INTO extract_rules (id, group_id, field_name, source, pattern) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, data.group_id, data.field_name, data.source || 'html', data.pattern).run();
  return { id, ...data };
}

export async function updateExtractRule(db: D1Database, id: string, data: any) {
  const existing: any = await db.prepare('SELECT * FROM extract_rules WHERE id = ?').bind(id).first();
  if (!existing) return null;
  await db.prepare(
    'UPDATE extract_rules SET field_name=?, source=?, pattern=? WHERE id=?'
  ).bind(
    data.field_name ?? existing.field_name,
    data.source ?? existing.source,
    data.pattern ?? existing.pattern,
    id
  ).run();
  return db.prepare('SELECT * FROM extract_rules WHERE id = ?').bind(id).first();
}

export async function deleteExtractRule(db: D1Database, id: string) {
  const { meta } = await db.prepare('DELETE FROM extract_rules WHERE id = ?').bind(id).run();
  return meta.changes > 0;
}

export async function upsertResponseTemplate(db: D1Database, groupId: string, template: string) {
  const existing = await getResponseTemplate(db, groupId);
  if (existing) {
    await db.prepare("UPDATE response_templates SET template=?, updated_at=datetime('now') WHERE group_id=?").bind(template, groupId).run();
  } else {
    const id = uid();
    await db.prepare('INSERT INTO response_templates (id, group_id, template) VALUES (?, ?, ?)').bind(id, groupId, template).run();
  }
  return getResponseTemplate(db, groupId);
}

export async function deleteResponseTemplate(db: D1Database, groupId: string) {
  await db.prepare('DELETE FROM response_templates WHERE group_id = ?').bind(groupId).run();
}

export async function getEnabledGroupsByPriority(db: D1Database) {
  const { results } = await db.prepare(
    'SELECT id, name FROM groups WHERE enabled = 1 ORDER BY priority DESC, created_at ASC'
  ).all();
  return results;
}

export async function getActiveMatchRules(db: D1Database, groupId: string) {
  const { results } = await db.prepare(
    'SELECT * FROM match_rules WHERE group_id = ?'
  ).bind(groupId).all();
  return results;
}

export async function cleanupOldEmails(db: D1Database) {
  const { meta } = await db.prepare("DELETE FROM emails WHERE received_at < datetime('now', '-7 days')").run();
  return meta.changes;
}

export async function listForwardAccounts(db: D1Database) {
  const { results } = await db.prepare(
    'SELECT * FROM forward_accounts ORDER BY updated_at DESC, created_at DESC'
  ).all();
  return results;
}

export async function getForwardAccount(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM forward_accounts WHERE id = ?').bind(id).first();
}

export async function createForwardAccount(db: D1Database, data: {
  site_name?: string;
  site_url?: string;
  domain?: string;
  usage?: string;
  note?: string;
}) {
  const id = uid();
  await db.prepare(
    'INSERT INTO forward_accounts (id, site_name, site_url, domain, usage, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    id,
    data.site_name || '',
    data.site_url || '',
    data.domain || '',
    data.usage || '',
    data.note || ''
  ).run();
  return getForwardAccount(db, id);
}

export async function updateForwardAccount(db: D1Database, id: string, data: any) {
  const existing: any = await getForwardAccount(db, id);
  if (!existing) return null;
  await db.prepare(
    "UPDATE forward_accounts SET site_name=?, site_url=?, domain=?, usage=?, note=?, updated_at=datetime('now') WHERE id=?"
  ).bind(
    data.site_name ?? existing.site_name,
    data.site_url ?? existing.site_url,
    data.domain ?? existing.domain,
    data.usage ?? existing.usage,
    data.note ?? existing.note,
    id
  ).run();
  return getForwardAccount(db, id);
}

export async function deleteForwardAccount(db: D1Database, id: string) {
  const { meta } = await db.prepare('DELETE FROM forward_accounts WHERE id = ?').bind(id).run();
  return meta.changes > 0;
}

// ---- Email Library ----

export async function listEmailLibCategories(db: D1Database) {
  const { results } = await db.prepare(`
    SELECT c.*,
      COALESCE(s.current_index, 0) AS current_index,
      (SELECT COUNT(*) FROM email_lib_entries WHERE category_id = c.id) AS total
    FROM email_lib_categories c
    LEFT JOIN email_lib_state s ON s.category_id = c.id
    ORDER BY c.created_at ASC
  `).all();
  return results;
}

export async function getEmailLibCategory(db: D1Database, id: string) {
  return db.prepare(`
    SELECT c.*,
      COALESCE(s.current_index, 0) AS current_index,
      (SELECT COUNT(*) FROM email_lib_entries WHERE category_id = c.id) AS total
    FROM email_lib_categories c
    LEFT JOIN email_lib_state s ON s.category_id = c.id
    WHERE c.id = ?
  `).bind(id).first();
}

export async function createEmailLibCategory(db: D1Database, name: string) {
  const id = uid();
  await db.prepare('INSERT INTO email_lib_categories (id, name) VALUES (?, ?)').bind(id, name).run();
  await db.prepare('INSERT INTO email_lib_state (category_id, current_index) VALUES (?, 0)').bind(id).run();
  return getEmailLibCategory(db, id);
}

export async function updateEmailLibCategory(db: D1Database, id: string, name: string) {
  const existing = await getEmailLibCategory(db, id);
  if (!existing) return null;
  await db.prepare("UPDATE email_lib_categories SET name=?, updated_at=datetime('now') WHERE id=?").bind(name, id).run();
  return getEmailLibCategory(db, id);
}

export async function deleteEmailLibCategory(db: D1Database, id: string) {
  const { meta } = await db.prepare('DELETE FROM email_lib_categories WHERE id = ?').bind(id).run();
  return meta.changes > 0;
}

export async function getEmailLibEntries(db: D1Database, categoryId: string) {
  const { results } = await db.prepare(
    'SELECT * FROM email_lib_entries WHERE category_id = ? ORDER BY sort_order ASC, created_at ASC'
  ).bind(categoryId).all();
  return results;
}

export async function setEmailLibEntries(db: D1Database, categoryId: string, emails: string[]) {
  const existing = await getEmailLibCategory(db, categoryId);
  if (!existing) return [];

  await db.prepare('DELETE FROM email_lib_entries WHERE category_id = ?').bind(categoryId).run();
  await db.prepare("UPDATE email_lib_state SET current_index = 0 WHERE category_id = ?").bind(categoryId).run();

  const insert = db.prepare('INSERT INTO email_lib_entries (id, category_id, email, sort_order) VALUES (?, ?, ?, ?)');
  for (let i = 0; i < emails.length; i++) {
    const e = emails[i].trim();
    if (e) {
      await insert.bind(uid(), categoryId, e, i).run();
    }
  }

  return getEmailLibEntries(db, categoryId);
}

export async function getEmailLibNext(db: D1Database, categoryId: string) {
  const entries = await getEmailLibEntries(db, categoryId);
  if (entries.length === 0) return null;

  const state: any = await db.prepare('SELECT * FROM email_lib_state WHERE category_id = ?').bind(categoryId).first();
  let idx = state ? state.current_index : 0;
  if (idx >= entries.length) idx = 0;

  const entry: any = entries[idx];
  const nextIdx = (idx + 1) % entries.length;
  await db.prepare('UPDATE email_lib_state SET current_index = ? WHERE category_id = ?').bind(nextIdx, categoryId).run();

  return { email: entry.email, index: idx, total: entries.length };
}

export async function resetEmailLibState(db: D1Database, categoryId: string) {
  const existing = await getEmailLibCategory(db, categoryId);
  if (!existing) return false;
  await db.prepare('UPDATE email_lib_state SET current_index = 0 WHERE category_id = ?').bind(categoryId).run();
  return true;
}
