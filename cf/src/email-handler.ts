import { classifyEmail } from './services/classifier';
import { extractFromEmail } from './services/extractor';
import { renderTemplate } from './services/response-builder';
import { getExtractRules, getResponseTemplate } from './db';

function decodeMimeSubject(subject: string): string {
  return subject.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        const binary = atob(text);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder(charset).decode(bytes);
      }
      if (encoding.toUpperCase() === 'Q') {
        let decoded = '';
        for (let i = 0; i < text.length; i++) {
          if (text[i] === '=' && i + 2 < text.length) {
            decoded += String.fromCharCode(parseInt(text.substring(i + 1, i + 3), 16));
            i += 2;
          } else if (text[i] === '_') {
            decoded += ' ';
          } else {
            decoded += text[i];
          }
        }
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
        return new TextDecoder(charset).decode(bytes);
      }
      return text;
    } catch { return text; }
  });
}

function decodeQuotedPrintable(text: string): string {
  const bytes: number[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.endsWith('=')) {
      const decoded = decodeQPLine(line.slice(0, -1));
      bytes.push(...decoded);
    } else {
      const decoded = decodeQPLine(line);
      bytes.push(...decoded);
      if (i < lines.length - 1) bytes.push(10);
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function decodeQPLine(line: string): number[] {
  const result: number[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '=' && i + 2 < line.length) {
      const hex = line.substring(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        result.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    result.push(line.charCodeAt(i));
    i++;
  }
  return result;
}

function unfoldHeaders(headers: string): string {
  return headers.replace(/\n[ \t]+/g, ' ');
}

function getHeader(headers: string, name: string): string {
  const re = new RegExp(`^${name}:\\s*(.*)$`, 'im');
  const m = unfoldHeaders(headers).match(re);
  return m ? m[1].trim() : '';
}

function parseRawEmail(raw: string): { subject: string; bodyText: string; bodyHtml: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  const isQP = /content-transfer-encoding:\s*quoted-printable/i.test(normalized);

  const headerEnd = normalized.search(/\n\n/);
  const headers = headerEnd >= 0 ? normalized.slice(0, headerEnd) : normalized;
  const body = headerEnd >= 0 ? normalized.slice(headerEnd + 2) : '';

  const subject = decodeMimeSubject(getHeader(headers, 'Subject').replace(/\s+/g, ' '));

  let bodyText = '';
  let bodyHtml = '';

  if (body.includes('Content-Type: text/html') || /<html|<body|<div|<p>/i.test(body)) {
    bodyHtml = isQP ? decodeQuotedPrintable(body) : body;
    const textMatch = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    bodyText = textMatch;
  } else {
    bodyText = isQP ? decodeQuotedPrintable(body) : body;
  }

  return { subject, bodyText, bodyHtml };
}

export async function handleIncomingEmail(message: ForwardableEmailMessage, env: Env) {
  const db = env.DB;
  const from = message.from;
  const to = message.to;

  let rawText = '';
  try {
    rawText = await new Response(message.raw).text();
  } catch {
    console.error('Failed to read email raw content');
    return;
  }

  const { subject, bodyText, bodyHtml } = parseRawEmail(rawText);

  const emailData = { from_addr: from, to_addr: to, subject, body_text: bodyText, body_html: bodyHtml };

  const classification = await classifyEmail(db, emailData);

  let extractedData: Record<string, string> = {};
  let responseData: Record<string, any> = {};

  if (classification) {
    const rules = await getExtractRules(db, classification.groupId);
    extractedData = extractFromEmail(bodyHtml, bodyText, rules as any[]);

    const template = await getResponseTemplate(db, classification.groupId);
    if (template) {
      responseData = renderTemplate((template as any).template, extractedData, {
        from_addr: from, to_addr: to, subject, received_at: new Date().toISOString(),
      });
    }
  }

  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO emails (id, message_id, from_addr, to_addr, subject, body_text, body_html, group_id, extracted_data, response_cache)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, null, from, to, subject, bodyText, bodyHtml,
    classification?.groupId ?? null,
    JSON.stringify(extractedData),
    JSON.stringify(responseData)
  ).run();

  console.log(`Email processed: ${from} -> ${to} [${classification?.groupName || 'unclassified'}]`);
}
