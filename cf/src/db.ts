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
