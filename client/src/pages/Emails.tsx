import { useState, useEffect } from 'react';
import { emailsApi, groupsApi, EmailListResult, GroupWithRules, EmailRecord } from '../api';

function safeParse(data: any): Record<string, string> {
  if (!data) return {};
  if (typeof data === 'object') return data;
  try { return JSON.parse(data); } catch { return {}; }
}

function decodeQP(text: string): string {
  if (!text || !/=[0-9A-Fa-f]{2}/.test(text)) return text;
  const bytes: number[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const end = line.endsWith('=') ? line.length - 1 : line.length;
    let j = 0;
    while (j < end) {
      if (line[j] === '=' && j + 2 < end) {
        const hex = line.substring(j + 1, j + 3);
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) { bytes.push(parseInt(hex, 16)); j += 3; continue; }
      }
      bytes.push(line.charCodeAt(j));
      j++;
    }
    if (!line.endsWith('=') && i < lines.length - 1) bytes.push(10);
  }
  try { return new TextDecoder().decode(new Uint8Array(bytes)); } catch { return text; }
}

export default function Emails() {
  const [data, setData] = useState<EmailListResult | null>(null);
  const [groups, setGroups] = useState<GroupWithRules[]>([]);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterSender, setFilterSender] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<EmailRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  const load = (showLoading = false) => {
    if (showLoading) setLoading(true);
    const params: Record<string, string | number> = { limit: pageSize, offset: page * pageSize };
    if (filterGroup) params.group = filterGroup;
    if (filterSender) params.sender_contains = filterSender;
    emailsApi.list(params).then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    groupsApi.list().then(setGroups).catch(console.error);
  }, []);

  useEffect(() => {
    load();
  }, [filterGroup, filterSender, page]);

  const toggleDetail = (id: string) => {
    if (selected?.id === id) { setSelected(null); return; }
    emailsApi.get(id).then(setSelected).catch(() => { });
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">邮件记录</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex gap-3 items-end">
        <div>
          <label className="text-xs text-gray-400 block mb-1">分组筛选</label>
          <select value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">发件人包含</label>
          <input value={filterSender} onChange={e => { setFilterSender(e.target.value); setPage(0); }}
            placeholder="输入发件人关键词..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div className="text-sm text-gray-400 whitespace-nowrap">
          共 {data?.total ?? 0} 条
        </div>
        <button onClick={() => load(true)} disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-100">
          {(!data || data.items.length === 0) && (
            <div className="p-8 text-center text-gray-400">暂无邮件记录</div>
          )}
          {data?.items.map(e => {
            const group = groups.find(g => g.id === e.group_id);
            const extracted = safeParse(e.extracted_data);
            const isOpen = selected?.id === e.id;
            return (
              <div key={e.id}>
                <div
                  onClick={() => toggleDetail(e.id)}
                  className={`px-5 py-3 cursor-pointer transition-colors ${isOpen ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-800 truncate">{e.subject || '(无主题)'}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        <span className="text-blue-600">{e.from_addr}</span>
                        <span className="mx-2 text-gray-300">→</span>
                        <span className="text-gray-400">{e.to_addr}</span>
                      </div>
                      {Object.keys(extracted).length > 0 && (
                        <div className="flex gap-2 mt-1.5">
                          {Object.entries(extracted).map(([k, v]) => (
                            <span key={k} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                              {k}: {v || '(空)'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {group && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{group.name}</span>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(e.received_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                </div>

                {isOpen && selected && (
                  <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-800">邮件详情</h3>
                      <button onClick={() => setSelected(null)}
                        className="text-xs text-gray-400 hover:text-gray-600">关闭</button>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-400">发件人：</span>
                        <span className="text-gray-800">{selected.from_addr}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">收件人：</span>
                        <span className="text-gray-800">{selected.to_addr}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">主题：</span>
                        <span className="text-gray-800">{selected.subject || '(无主题)'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">接收时间：</span>
                        <span className="text-gray-800">{new Date(selected.received_at).toLocaleString('zh-CN')}</span>
                      </div>

                      {Object.keys(safeParse(selected.extracted_data)).length > 0 && (
                        <div>
                          <span className="text-gray-400">提取数据：</span>
                          <pre className="mt-1 bg-white p-2 rounded border text-xs overflow-x-auto">
                            {JSON.stringify(safeParse(selected.extracted_data), null, 2)}
                          </pre>
                        </div>
                      )}

                      {(selected.body_text || selected.body_html) && (
                        <div>
                          <span className="text-gray-400">正文：</span>
                          <div className="mt-1 bg-white p-3 rounded border max-h-64 overflow-y-auto text-xs whitespace-pre-wrap break-all">
                            {decodeQP(selected.body_text || selected.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded text-sm bg-white border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
            上一页
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded text-sm bg-white border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
