import { getDb } from '../db';
import { uid } from '../uid';

// ---- Types ----

export interface Group {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface MatchRule {
  id: string;
  group_id: string;
  field: 'sender' | 'subject' | 'body_html' | 'body_text';
  operator: 'contains' | 'equals' | 'regex' | 'starts_with' | 'ends_with';
  pattern: string;
}

export interface ExtractRule {
  id: string;
  group_id: string;
  field_name: string;
  source: 'html' | 'text';
  pattern: string;
}

export interface ResponseTemplate {
  id: string;
  group_id: string;
  template: string;
}

export interface GroupWithRules extends Group {
  match_rules: MatchRule[];
  extract_rules: ExtractRule[];
  response_template: ResponseTemplate | null;
}

// ---- Groups ----

export function getAllGroups(): Group[] {
  return getDb().prepare('SELECT * FROM groups ORDER BY priority DESC, created_at ASC').all() as Group[];
}

export function getAllGroupsWithRules(): GroupWithRules[] {
  const groups = getAllGroups();
  const result: GroupWithRules[] = [];
  for (const g of groups) {
    result.push({
      ...g,
      match_rules: getMatchRules(g.id),
      extract_rules: getExtractRules(g.id),
      response_template: getResponseTemplate(g.id),
    });
  }
  return result;
}

export function getGroup(id: string): Group | undefined {
  return getDb().prepare('SELECT * FROM groups WHERE id = ?').get(id) as Group | undefined;
}

export function getGroupWithRules(id: string): GroupWithRules | undefined {
  const g = getGroup(id);
  if (!g) return undefined;
  return {
    ...g,
    match_rules: getMatchRules(id),
    extract_rules: getExtractRules(id),
    response_template: getResponseTemplate(id),
  };
}

export function createGroup(data: { name: string; description?: string; priority?: number }): Group {
  const id = uid();
  getDb().prepare(`
    INSERT INTO groups (id, name, description, priority)
    VALUES (?, ?, ?, ?)
  `).run(id, data.name, data.description || '', data.priority ?? 0);
  return getGroup(id)!;
}

export function updateGroup(id: string, data: { name?: string; description?: string; priority?: number; enabled?: number }): Group | undefined {
  const existing = getGroup(id);
  if (!existing) return undefined;
  getDb().prepare(`
    UPDATE groups SET name=?, description=?, priority=?, enabled=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    data.name ?? existing.name,
    data.description ?? existing.description,
    data.priority ?? existing.priority,
    data.enabled ?? existing.enabled,
    id
  );
  return getGroup(id);
}

export function deleteGroup(id: string): boolean {
  const result = getDb().prepare('DELETE FROM groups WHERE id = ?').run(id);
  return result.changes > 0;
}

// ---- Match Rules ----

export function getMatchRules(groupId: string): MatchRule[] {
  return getDb().prepare('SELECT * FROM match_rules WHERE group_id = ? ORDER BY created_at ASC').all(groupId) as MatchRule[];
}

export function createMatchRule(data: Omit<MatchRule, 'id'>): MatchRule {
  const id = uid();
  getDb().prepare(`
    INSERT INTO match_rules (id, group_id, field, operator, pattern)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.group_id, data.field, data.operator, data.pattern);
  return { id, ...data };
}

export function updateMatchRule(id: string, data: { field?: string; operator?: string; pattern?: string }): MatchRule | undefined {
  const existing = getDb().prepare('SELECT * FROM match_rules WHERE id = ?').get(id) as MatchRule | undefined;
  if (!existing) return undefined;
  getDb().prepare(`
    UPDATE match_rules SET field=?, operator=?, pattern=? WHERE id=?
  `).run(data.field ?? existing.field, data.operator ?? existing.operator, data.pattern ?? existing.pattern, id);
  return getDb().prepare('SELECT * FROM match_rules WHERE id = ?').get(id) as MatchRule;
}

export function deleteMatchRule(id: string): boolean {
  return getDb().prepare('DELETE FROM match_rules WHERE id = ?').run(id).changes > 0;
}

// ---- Extract Rules ----

export function getExtractRules(groupId: string): ExtractRule[] {
  return getDb().prepare('SELECT * FROM extract_rules WHERE group_id = ? ORDER BY created_at ASC').all(groupId) as ExtractRule[];
}

export function createExtractRule(data: Omit<ExtractRule, 'id'>): ExtractRule {
  const id = uid();
  getDb().prepare(`
    INSERT INTO extract_rules (id, group_id, field_name, source, pattern)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.group_id, data.field_name, data.source, data.pattern);
  return { id, ...data };
}

export function updateExtractRule(id: string, data: { field_name?: string; source?: string; pattern?: string }): ExtractRule | undefined {
  const existing = getDb().prepare('SELECT * FROM extract_rules WHERE id = ?').get(id) as ExtractRule | undefined;
  if (!existing) return undefined;
  getDb().prepare(`
    UPDATE extract_rules SET field_name=?, source=?, pattern=? WHERE id=?
  `).run(data.field_name ?? existing.field_name, data.source ?? existing.source, data.pattern ?? existing.pattern, id);
  return getDb().prepare('SELECT * FROM extract_rules WHERE id = ?').get(id) as ExtractRule;
}

export function deleteExtractRule(id: string): boolean {
  return getDb().prepare('DELETE FROM extract_rules WHERE id = ?').run(id).changes > 0;
}

// ---- Response Templates ----

export function getResponseTemplate(groupId: string): ResponseTemplate | null {
  const row = getDb().prepare('SELECT * FROM response_templates WHERE group_id = ?').get(groupId) as ResponseTemplate | undefined;
  return row ?? null;
}

export function upsertResponseTemplate(groupId: string, template: string): ResponseTemplate {
  const existing = getResponseTemplate(groupId);
  if (existing) {
    getDb().prepare('UPDATE response_templates SET template=?, updated_at=datetime(\'now\') WHERE group_id=?').run(template, groupId);
    return getResponseTemplate(groupId)!;
  }
  const id = uid();
  getDb().prepare('INSERT INTO response_templates (id, group_id, template) VALUES (?, ?, ?)').run(id, groupId, template);
  return getResponseTemplate(groupId)!;
}

export function deleteResponseTemplate(groupId: string): boolean {
  return getDb().prepare('DELETE FROM response_templates WHERE group_id = ?').run(groupId).changes > 0;
}
