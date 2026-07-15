import { useState, useEffect } from 'react';
import { groupsApi, emailsApi, GroupWithRules, EmailListResult, EmailRecord } from '../api';

function decodeMime(text: string): string {
  return text.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, encoding, content) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        const binary = atob(content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder(charset).decode(bytes);
      }
      return content;
    } catch { return content; }
  });
}

export default function Dashboard({ onNavigate }: { onNavigate: (page: string, id?: string) => void }) {
  const [groups, setGroups] = useState<GroupWithRules[]>([]);
  const [recentEmails, setRecentEmails] = useState<EmailListResult | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<EmailRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      groupsApi.list().then(setGroups),
      emailsApi.list({ limit: 10 }).then(setRecentEmails),
    ]).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleEmail = (id: string) => {
    if (expandedEmail?.id === id) { setExpandedEmail(null); return; }
    emailsApi.get(id).then(setExpandedEmail).catch(() => {});
  };

  const totalEmails = recentEmails?.total ?? 0;
  const enabledGroups = groups.filter(g => g.enabled);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">系统概览</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500">分组总数</div>
          <div className="text-3xl font-bold text-gray-800 mt-1">{groups.length}</div>
          <div className="text-xs text-gray-400 mt-1">{enabledGroups.length} 个已启用</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500">已接收邮件</div>
          <div className="text-3xl font-bold text-gray-800 mt-1">{totalEmails}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500">已分类邮件</div>
          <div className="text-3xl font-bold text-gray-800 mt-1">
            {recentEmails?.items.filter(e => e.group_id).length ?? 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">来自已配置的分组</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">分组列表</h2>
          <button onClick={() => onNavigate('groups')}
            className="text-sm text-blue-600 hover:text-blue-800">
            管理分组 →
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {groups.length === 0 && (
            <div className="p-5 text-gray-400 text-sm text-center">暂无分组，点击右上角创建</div>
          )}
          {groups.map(g => (
            <div key={g.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
              onClick={() => onNavigate('group-detail', g.id)}>
              <div>
                <span className="font-medium text-gray-800">{g.name}</span>
                {g.description && <span className="text-gray-400 text-sm ml-2">{g.description}</span>}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>{g.match_rules.length} 匹配规则</span>
                <span>{g.extract_rules.length} 提取规则</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${g.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {g.enabled ? '启用' : '暂停'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">最近邮件</h2>
          <div className="flex items-center gap-3">
            <button onClick={load} disabled={loading}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">
              {loading ? '刷新中...' : '刷新'}
            </button>
            <button onClick={() => onNavigate('emails')}
              className="text-sm text-blue-600 hover:text-blue-800">
              查看全部 →
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {(!recentEmails || recentEmails.items.length === 0) && (
            <div className="p-5 text-gray-400 text-sm text-center">暂无邮件记录</div>
          )}
          {recentEmails?.items.map(e => {
            const isOpen = expandedEmail?.id === e.id;
            return (
              <div key={e.id}>
                <div className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleEmail(e.id)}>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-800 truncate">{decodeMime(e.subject || '(无主题)')}</div>
                    <div className="text-sm text-gray-400 truncate">{e.from_addr}</div>
                  </div>
                  <div className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                    {new Date(e.received_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                {isOpen && expandedEmail && (
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-gray-600">邮件详情</span>
                      <button onClick={(ev) => { ev.stopPropagation(); setExpandedEmail(null); }}
                        className="text-xs text-gray-400 hover:text-gray-600">关闭</button>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-700">
                      <div><span className="text-gray-400">收件人：</span>{expandedEmail.to_addr}</div>
                      <div><span className="text-gray-400">主题：</span>{decodeMime(expandedEmail.subject)}</div>
                      <div><span className="text-gray-400">时间：</span>{new Date(expandedEmail.received_at).toLocaleString('zh-CN')}</div>
                      {expandedEmail.body_html ? (
                        <div>
                          <span className="text-gray-400">正文：</span>
                          <iframe className="mt-1 w-full bg-white rounded border" style={{ height: '300px' }}
                            srcDoc={expandedEmail.body_html} sandbox="allow-same-origin" />
                        </div>
                      ) : expandedEmail.body_text ? (
                        <div>
                          <span className="text-gray-400">正文：</span>
                          <div className="mt-1 bg-white p-2 rounded border max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                            {expandedEmail.body_text}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
