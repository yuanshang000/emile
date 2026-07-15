import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Emails from './pages/Emails';

type Page = 'dashboard' | 'groups' | 'group-detail' | 'emails';

const EMAIL_DOMAIN = 'ysyxopq.eu.cc';
const QUICK_EMAIL = `ys@${EMAIL_DOMAIN}`;

function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { }
  };
  return (
    <button
      onClick={copy}
      title={`点击复制 ${value}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-xs transition-colors"
    >
      <span className="text-gray-400">{label}</span>
      <span className="font-mono text-gray-700">{value}</span>
      <span className={`text-[10px] ${copied ? 'text-green-600' : 'text-gray-400'}`}>
        {copied ? '已复制' : '复制'}
      </span>
    </button>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const nav = (p: string, groupId?: string) => {
    if (groupId) setSelectedGroupId(groupId);
    setPage(p as Page);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">📧</span>
              <span className="font-semibold text-gray-800">Manyme API</span>
              <div className="hidden sm:flex items-center gap-2 ml-3">
                <CopyChip label="域名" value={EMAIL_DOMAIN} />
                <CopyChip label="快速邮箱" value={QUICK_EMAIL} />
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => nav('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${page === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                概览
              </button>
              <button onClick={() => nav('groups')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${page === 'groups' || page === 'group-detail' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                分组管理
              </button>
              <button onClick={() => nav('emails')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${page === 'emails' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                邮件记录
              </button>
            </div>
          </div>
          <div className="sm:hidden flex items-center gap-2 pb-2 flex-wrap">
            <CopyChip label="域名" value={EMAIL_DOMAIN} />
            <CopyChip label="快速邮箱" value={QUICK_EMAIL} />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {page === 'dashboard' && <Dashboard onNavigate={(p, id) => { if (id) setSelectedGroupId(id); setPage(p as Page); }} />}
        {page === 'groups' && <Groups onSelectGroup={(id) => nav('group-detail', id)} />}
        {page === 'group-detail' && selectedGroupId && (
          <GroupDetail groupId={selectedGroupId} onBack={() => nav('groups')} />
        )}
        {page === 'emails' && <Emails />}
      </main>

      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        Build: {__BUILD_TIME__}
      </footer>
    </div>
  );
}
