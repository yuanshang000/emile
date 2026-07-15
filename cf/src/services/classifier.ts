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

function decodeMime(text: string): string {
  return text.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, encoding, content) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        const binary = atob(content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder(charset).decode(bytes);
      }
      if (encoding.toUpperCase() === 'Q') {
        let decoded = '';
        for (let i = 0; i < content.length; i++) {
          if (content[i] === '=' && i + 2 < content.length) {
            decoded += String.fromCharCode(parseInt(content.substring(i + 1, i + 3), 16));
            i += 2;
          } else if (content[i] === '_') {
            decoded += ' ';
          } else {
            decoded += content[i];
          }
        }
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
        return new TextDecoder(charset).decode(bytes);
      }
      return content;
    } catch {
      return content;
    }
  });
}

function getFieldValue(email: {
  from_addr: string;
  subject: string;
  body_text: string;
  body_html: string;
}, field: string): string {
  switch (field) {
    case 'sender': return email.from_addr;
    case 'subject': return decodeMime(email.subject || '');
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

export async function reclassifyEmails(db: D1Database): Promise<number> {
  const { results } = await db.prepare(
    "SELECT id, from_addr, subject, body_text, body_html FROM emails WHERE group_id IS NULL"
  ).all();

  let changed = 0;
  for (const email of results as any[]) {
    const result = await classifyEmail(db, email);
    if (result) {
      await db.prepare("UPDATE emails SET group_id = ? WHERE id = ?").bind(result.groupId, email.id).run();
      changed++;
    }
  }
  return changed;
}
