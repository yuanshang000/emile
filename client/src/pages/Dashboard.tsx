import { useState, useEffect } from 'react';
import { groupsApi, emailsApi, GroupWithRules, EmailListResult } from '../api';

export default function Dashboard({ onNavigate }: { onNavigate: (page: string, id?: string) => void }) {
  const [groups, setGroups] = useState<GroupWithRules[]>([]);
  const [recentEmails, setRecentEmails] = useState<EmailListResult | null>(null);

  useEffect(() => {
    groupsApi.list().then(setGroups).catch(console.error);
    emailsApi.list({ limit: 10 }).then(setRecentEmails).catch(console.error);
  }, []);

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
          <button onClick={() => onNavigate('emails')}
            className="text-sm text-blue-600 hover:text-blue-800">
            查看全部 →
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {(!recentEmails || recentEmails.items.length === 0) && (
            <div className="p-5 text-gray-400 text-sm text-center">暂无邮件记录</div>
          )}
          {recentEmails?.items.map(e => (
            <div key={e.id} className="px-5 py-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-800 truncate">{e.subject || '(无主题)'}</div>
                <div className="text-sm text-gray-400 truncate">{e.from_addr}</div>
              </div>
              <div className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                {new Date(e.received_at).toLocaleString('zh-CN')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
