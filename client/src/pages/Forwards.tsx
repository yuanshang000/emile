import { useState, useEffect } from 'react';
import { forwardsApi, ForwardAccount } from '../api';

const emptyForm = {
  site_name: '',
  site_url: '',
  domain: '',
  usage: '',
  note: '',
};

export default function Forwards() {
  const [items, setItems] = useState<ForwardAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    forwardsApi.list().then(setItems).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const startEdit = (item: ForwardAccount) => {
    setEditingId(item.id);
    setForm({
      site_name: item.site_name || '',
      site_url: item.site_url || '',
      domain: item.domain || '',
      usage: item.usage || '',
      note: item.note || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await forwardsApi.update(editingId, form);
      } else {
        await forwardsApi.create(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      load();
    } catch (e: any) {
      alert(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条转发邮箱记录？')) return;
    await forwardsApi.delete(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">转发邮箱</h1>
          <p className="text-sm text-gray-400 mt-1">
            记录绑定了域名邮箱的网站、转发域名与用法，方便自己管理
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {loading ? '刷新中...' : '刷新'}
          </button>
          <button onClick={startCreate}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 新增
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">{editingId ? '编辑记录' : '新增记录'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">网站名称</label>
              <input value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))}
                placeholder="如 OpenAI / 某注册站"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">网站网址</label>
              <input value={form.site_url} onChange={e => setForm(f => ({ ...f, site_url: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">转发 / 接收邮箱域名</label>
              <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                placeholder="如 ysyxopq.eu.cc 或 xxx@ysyxopq.eu.cc"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">用法</label>
              <input value={form.usage} onChange={e => setForm(f => ({ ...f, usage: e.target.value }))}
                placeholder="如：注册验证 / 登录验证码"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">备注</label>
              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="可选备注"
                className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
              取消
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {loading ? '加载中...' : '暂无记录，点击右上角「新增」添加'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">网站</th>
                  <th className="px-4 py-3 font-medium">域名 / 邮箱</th>
                  <th className="px-4 py-3 font-medium">用法</th>
                  <th className="px-4 py-3 font-medium">备注</th>
                  <th className="px-4 py-3 font-medium w-28">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-800">{item.site_name || '—'}</div>
                      {item.site_url && (
                        <a href={item.site_url.startsWith('http') ? item.site_url : `https://${item.site_url}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline break-all">
                          {item.site_url}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <code className="text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100 text-gray-700 break-all">
                        {item.domain || '—'}
                      </code>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-600">{item.usage || '—'}</td>
                    <td className="px-4 py-3 align-top text-gray-500 text-xs whitespace-pre-wrap max-w-xs">
                      {item.note || '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(item)}
                          className="text-xs text-blue-600 hover:text-blue-800">编辑</button>
                        <button onClick={() => handleDelete(item.id)}
                          className="text-xs text-red-500 hover:text-red-700">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
