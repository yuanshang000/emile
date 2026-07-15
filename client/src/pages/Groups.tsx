import { useState, useEffect } from 'react';
import { groupsApi, GroupWithRules } from '../api';

export default function Groups({ onSelectGroup }: { onSelectGroup: (id: string) => void }) {
  const [groups, setGroups] = useState<GroupWithRules[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('0');

  const load = () => groupsApi.list().then(setGroups).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await groupsApi.create({ name: newName.trim(), description: newDesc.trim(), priority: parseInt(newPriority) || 0 });
    setNewName('');
    setNewDesc('');
    setNewPriority('0');
    setShowCreate(false);
    load();
  };

  const handleToggle = async (g: GroupWithRules) => {
    await groupsApi.update(g.id, { enabled: g.enabled ? 0 : 1 });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此分组？相关规则也会一并删除。')) return;
    await groupsApi.delete(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">分组管理</h1>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + 新建分组
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-3">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="分组名称（如 OpenAI）"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="描述（可选）"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">优先级:</span>
            <input type="number" value={newPriority} onChange={e => setNewPriority(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <span className="text-xs text-gray-400">数值越大越优先匹配</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">创建</button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectGroup(g.id)}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{g.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${g.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {g.enabled ? '已启用' : '已暂停'}
                  </span>
                  {g.priority > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-600">
                      P{g.priority}
                    </span>
                  )}
                </div>
                {g.description && <div className="text-sm text-gray-400 mt-0.5">{g.description}</div>}
                <div className="text-xs text-gray-400 mt-1 flex gap-3">
                  <span>🎯 {g.match_rules.length} 条匹配规则</span>
                  <span>🔧 {g.extract_rules.length} 条提取规则</span>
                  <span>📦 {g.response_template ? '已配置响应模板' : '未配置响应模板'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => handleToggle(g)}
                  className={`px-3 py-1.5 rounded text-xs font-medium ${g.enabled ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                  {g.enabled ? '暂停' : '启用'}
                </button>
                <button onClick={() => handleDelete(g.id)}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            还没有分组，点击右上角 "新建分组" 开始配置
          </div>
        )}
      </div>
    </div>
  );
}
