import { getEnabledGroupsByPriority, getActiveMatchRules } from '../db';

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

export async function classifyEmail(
  db: D1Database,
  email: { from_addr: string; subject: string; body_text: string; body_html: string }
): Promise<ClassificationResult | null> {
  const groups = await getEnabledGroupsByPriority(db);

  for (const group of groups) {
    const rules: any[] = await getActiveMatchRules(db, (group as any).id);
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
      return { groupId: (group as any).id, groupName: (group as any).name, matched: true };
    }
  }

  return null;
}
