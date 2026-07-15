import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Emails from './pages/Emails';

type Page = 'dashboard' | 'groups' | 'group-detail' | 'emails';

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
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl">📧</span>
              <span className="font-semibold text-gray-800">Manyme API</span>
            </div>
            <div className="flex gap-1">
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
    </div>
  );
}
