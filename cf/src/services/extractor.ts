export interface ExtractionResult {
  [fieldName: string]: string;
}

function patternToRegex(template: string): RegExp {
  const parts = template.split('~');
  if (parts.length < 2) {
    throw new Error('Pattern must contain at least one ~ placeholder');
  }

  const regexStr = parts.map((part, i) => {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (i === parts.length - 1) return escaped;
    const nextPart = parts[i + 1] || '';
    return escaped + (nextPart === '' ? '([\\s\\S]*)' : '([\\s\\S]*?)');
  }).join('');

  return new RegExp(regexStr);
}

export interface ExtractRuleDef {
  field_name: string;
  source: 'html' | 'text';
  pattern: string;
}

export function extractFromEmail(
  bodyHtml: string,
  bodyText: string,
  rules: ExtractRuleDef[]
): ExtractionResult {
  const result: ExtractionResult = {};

  for (const rule of rules) {
    const source = rule.source === 'html' ? bodyHtml : bodyText;
    if (!source) continue;

    try {
      const regex = patternToRegex(rule.pattern);
      const match = source.match(regex);
      if (match && match[1] !== undefined) {
        result[rule.field_name] = match[1].replace(/^[\s\u00a0\u200b]+|[\s\u00a0\u200b]+$/g, '');
      } else {
        result[rule.field_name] = '';
      }
    } catch {
      result[rule.field_name] = '';
    }
  }

  return result;
}
