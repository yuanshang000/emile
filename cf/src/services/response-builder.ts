export const DEFAULT_RESPONSE_TEMPLATE = `{
  "group": "{{分组名}}",
  "time": "{{接收时间}}",
  "code": "{{验证码}}"
}`;

export function renderTemplate(
  templateStr: string,
  variables: Record<string, string>,
  email: { from_addr: string; to_addr: string; subject: string; received_at: string; group_name?: string }
): Record<string, any> {
  try {
    const template = JSON.parse(templateStr);
    return resolveTemplate(template, variables, email);
  } catch {
    return { error: 'Invalid template JSON', raw: templateStr };
  }
}

function resolveTemplate(
  value: any,
  variables: Record<string, string>,
  email: { from_addr: string; to_addr: string; subject: string; received_at: string; group_name?: string }
): any {
  if (typeof value === 'string') {
    return value.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const k = String(key).trim();
      if (variables[k] !== undefined) return variables[k];
      const emailKey = k.toLowerCase();
      if (emailKey === '发件人' || emailKey === 'sender' || emailKey === 'from') return email.from_addr;
      if (emailKey === '收件人' || emailKey === 'recipient' || emailKey === 'to') return email.to_addr;
      if (emailKey === '主题' || emailKey === 'subject') return email.subject;
      if (emailKey === '接收时间' || emailKey === 'received_at' || emailKey === 'time') return email.received_at;
      if (emailKey === '分组名' || emailKey === 'group' || emailKey === 'group_name') return email.group_name || '';
      if (emailKey === '验证码' || emailKey === 'code') {
        return variables['验证码'] ?? variables['code'] ?? Object.values(variables)[0] ?? '';
      }
      return `{{${k}}}`;
    });
  }
  if (Array.isArray(value)) {
    return value.map(v => resolveTemplate(v, variables, email));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolveTemplate(v, variables, email);
    }
    return result;
  }
  return value;
}
