import { getDb } from '../db';
import type { MatchRule } from './groups';

export interface ClassificationResult {
  groupId: string;
  groupName: string;
  matched: boolean;
}

function compilePattern(pattern: string, operator: string): RegExp {
  switch (operator) {
    case 'contains':
      return new RegExp(escapeRegex(pattern), 'i');
    case 'equals':
      return new RegExp(`^${escapeRegex(pattern)}$`, 'i');
    case 'starts_with':
      return new RegExp(`^${escapeRegex(pattern)}`, 'i');
    case 'ends_with':
      return new RegExp(`${escapeRegex(pattern)}$`, 'i');
    case 'regex':
      return new RegExp(pattern, 'i');
    default:
      return new RegExp(escapeRegex(pattern), 'i');
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFieldValue(email: {
  from_addr: string;
  subject: string;
  body_text: string;
  body_html: string;
}, field: string): string {
  switch (field) {
    case 'sender': return email.from_addr;
    case 'subject': return email.subject;
    case 'body_html': return email.body_html;
    case 'body_text': return email.body_text;
    default: return '';
  }
}

export function classifyEmail(email: {
  from_addr: string;
  subject: string;
  body_text: string;
  body_html: string;
}): ClassificationResult | null {
  const db = getDb();

  const groups = db.prepare(`
    SELECT g.id, g.name
    FROM groups g
    WHERE g.enabled = 1
    ORDER BY g.priority DESC, g.created_at ASC
  `).all() as { id: string; name: string }[];

  for (const group of groups) {
    const rules = db.prepare('SELECT * FROM match_rules WHERE group_id = ?').all(group.id) as MatchRule[];

    if (rules.length === 0) continue;

    let allMatched = true;
    for (const rule of rules) {
      const value = getFieldValue(email, rule.field);
      let matched = false;
      try {
        const regex = compilePattern(rule.pattern, rule.operator);
        matched = regex.test(value);
      } catch {
        matched = false;
      }
      if (!matched) {
        allMatched = false;
        break;
      }
    }

    if (allMatched) {
      return { groupId: group.id, groupName: group.name, matched: true };
    }
  }

  return null;
}
