import { useState, useEffect } from 'react';
import { emailsApi, groupsApi, EmailListResult, GroupWithRules } from '../api';

export default function Emails() {
  const [data, setData] = useState<EmailListResult | null>(null);
  const [groups, setGroups] = useState<GroupWithRules[]>([]);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterSender, setFilterSender] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const load = () => {
    const params: Record<string, string | number> = { limit: pageSize, offset: page * pageSize };
    if (filterGroup) params.group = filterGroup;
    if (filterSender) params.sender_contains = filterSender;
    emailsApi.list(params).then(setData).catch(console.error);
  };

  useEffect(() => {
    groupsApi.list().then(setGroups).catch(console.error);
  }, []);

  useEffect(() => {
    load();
  }, [filterGroup, filterSender, page]);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">邮件记录</h1>

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
        <div className="text-sm text-gray-400">
          共 {data?.total ?? 0} 条
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-100">
          {(!data || data.items.length === 0) && (
            <div className="p-8 text-center text-gray-400">暂无邮件记录</div>
          )}
          {data?.items.map(e => {
            const group = groups.find(g => g.id === e.group_id);
            const extracted: Record<string, string> = JSON.parse(e.extracted_data || '{}');
            return (
              <div key={e.id} className="px-5 py-3 hover:bg-gray-50">
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
