const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

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

export interface EmailListResult {
  total: number;
  items: EmailRecord[];
}

// ---- Groups API ----
export const groupsApi = {
  list: () => request<GroupWithRules[]>('/groups'),
  get: (id: string) => request<GroupWithRules>(`/groups/${id}`),
  create: (data: { name: string; description?: string; priority?: number }) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Group>) =>
    request<Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/groups/${id}`, { method: 'DELETE' }),

  addMatchRule: (groupId: string, data: { field: string; operator: string; pattern: string }) =>
    request<MatchRule>(`/groups/${groupId}/match-rules`, { method: 'POST', body: JSON.stringify(data) }),
  updateMatchRule: (id: string, data: Partial<MatchRule>) =>
    request<MatchRule>(`/groups/match-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMatchRule: (id: string) =>
    request<{ success: boolean }>(`/groups/match-rules/${id}`, { method: 'DELETE' }),

  addExtractRule: (groupId: string, data: { field_name: string; source?: string; pattern: string }) =>
    request<ExtractRule>(`/groups/${groupId}/extract-rules`, { method: 'POST', body: JSON.stringify(data) }),
  updateExtractRule: (id: string, data: Partial<ExtractRule>) =>
    request<ExtractRule>(`/groups/extract-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExtractRule: (id: string) =>
    request<{ success: boolean }>(`/groups/extract-rules/${id}`, { method: 'DELETE' }),

  setResponseTemplate: (groupId: string, template: string) =>
    request<ResponseTemplate>(`/groups/${groupId}/response-template`, { method: 'PUT', body: JSON.stringify({ template }) }),
  deleteResponseTemplate: (groupId: string) =>
    request<{ success: boolean }>(`/groups/${groupId}/response-template`, { method: 'DELETE' }),
};

// ---- Emails API ----
export const emailsApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request<EmailListResult>(`/emails${qs}`);
  },
  get: (id: string) => request<EmailRecord>(`/emails/${id}`),
};

// ---- Codes API ----
export const codesApi = {
  latest: (groupId: string) => request<any>(`/codes/latest?group=${groupId}`),
  latestCode: (groupId: string) => request<{ code: string }>(`/codes/latest/code?group=${groupId}`),
};

// ---- Forward accounts API ----
export interface ForwardAccount {
  id: string;
  site_name: string;
  site_url: string;
  domain: string;
  usage: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export const forwardsApi = {
  list: () => request<ForwardAccount[]>('/forwards'),
  get: (id: string) => request<ForwardAccount>(`/forwards/${id}`),
  create: (data: Partial<ForwardAccount>) =>
    request<ForwardAccount>('/forwards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ForwardAccount>) =>
    request<ForwardAccount>(`/forwards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/forwards/${id}`, { method: 'DELETE' }),
};
