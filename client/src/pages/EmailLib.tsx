import { useState, useEffect } from 'react';
import { emailLibApi, EmailLibCategory } from '../api';

export default function EmailLib() {
  const [categories, setCategories] = useState<EmailLibCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emailsText, setEmailsText] = useState('');
  const [savingEmails, setSavingEmails] = useState(false);
  const [nextResult, setNextResult] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    emailLibApi.listCategories().then(setCategories).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await emailLibApi.createCategory(newName.trim());
    setNewName('');
    load();
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await emailLibApi.updateCategory(id, editName.trim());
    setEditingCat(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此分类？其下的所有邮箱将被一并删除。')) return;
    await emailLibApi.deleteCategory(id);
    if (expandedId === id) setExpandedId(null);
    load();
  };

  const toggleExpand = async (cat: EmailLibCategory) => {
    if (expandedId === cat.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(cat.id);
    const entries = await emailLibApi.getEmails(cat.id);
    setEmailsText(entries.map(e => e.email).join('\n'));
    setNextResult(null);
  };

  const handleSaveEmails = async (categoryId: string) => {
    setSavingEmails(true);
    try {
      const lines = emailsText.split('\n').map(l => l.trim()).filter(Boolean);
      await emailLibApi.setEmails(categoryId, lines);
      load();
    } catch (e: any) {
      alert(e.message || '保存失败');
    } finally {
      setSavingEmails(false);
    }
  };

  const handleNext = async (categoryId: string) => {
    try {
      const result = await emailLibApi.next(categoryId);
      setNextResult(result.email);
      load();
    } catch (e: any) {
      alert(e.message || '获取失败');
    }
  };

  const handleReset = async (categoryId: string) => {
    await emailLibApi.reset(categoryId);
    setNextResult(null);
    load();
  };

  const apiUrl = (categoryId: string) => {
    const base = window.location.origin;
    return `${base}/api/email-lib/next/${categoryId}`;
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">邮箱库</h1>
          <p className="text-sm text-gray-400 mt-1">
            管理固定邮箱，每个分类拥有独立的 API，按顺序依次返回邮箱
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="新分类名称"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button onClick={handleCreate}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 新增分类
          </button>
        </div>
      </div>

      {categories.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-400 text-sm">
          暂无分类，请输入名称并点击「新增分类」
        </div>
      )}

      {categories.map(cat => (
        <div key={cat.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => toggleExpand(cat)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <span className={`inline-block transition-transform ${expandedId === cat.id ? 'rotate-90' : ''}`}>▶</span>
              </button>

              {editingCat === cat.id ? (
                <div className="flex gap-2 items-center">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(cat.id);
                      if (e.key === 'Escape') setEditingCat(null);
                    }}
                    className="px-2 py-1 border border-blue-300 rounded text-sm"
                    autoFocus
                  />
                  <button onClick={() => handleRename(cat.id)}
                    className="text-xs text-blue-600 hover:text-blue-800">保存</button>
                  <button onClick={() => setEditingCat(null)}
                    className="text-xs text-gray-500 hover:text-gray-700">取消</button>
                </div>
              ) : (
                <span className="font-medium text-gray-800 text-sm">{cat.name}</span>
              )}

              <span className="text-xs text-gray-400">
                {cat.total} 个邮箱 | 当前位置: {cat.current_index}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleNext(cat.id)}
                title="获取下一个邮箱"
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                API 获取
              </button>
              <button
                onClick={() => copyText(apiUrl(cat.id))}
                title="复制 API 地址"
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                复制 API
              </button>
              <button
                onClick={() => handleReset(cat.id)}
                title="重置当前位置"
                className="px-3 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
              >
                重置
              </button>
              <button
                onClick={() => { setEditingCat(cat.id); setEditName(cat.name); }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                重命名
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                删除
              </button>
            </div>
          </div>

          <div className="px-4 pb-2">
            <code className="text-xs text-gray-500 break-all select-all">
              {apiUrl(cat.id)}
            </code>
          </div>

          {nextResult && (
            <div className="mx-4 mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-800 font-mono flex items-center justify-between">
              <span>{nextResult}</span>
              <button
                onClick={() => copyText(nextResult)}
                className="text-xs text-green-600 hover:text-green-800 ml-2"
              >
                复制
              </button>
            </div>
          )}

          {expandedId === cat.id && (
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-500 font-medium">邮箱列表（一行一个邮箱）</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEmails(cat.id)}
                    disabled={savingEmails}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingEmails ? '保存中...' : '保存邮箱'}
                  </button>
                </div>
              </div>
              <textarea
                value={emailsText}
                onChange={e => setEmailsText(e.target.value)}
                placeholder="一行一个邮箱，例如：&#10;user1@example.com&#10;user2@example.com&#10;user3@example.com"
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                spellCheck={false}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
