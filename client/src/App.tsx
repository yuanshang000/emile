import { useState, useEffect, useRef } from 'react';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Emails from './pages/Emails';

type Page = 'dashboard' | 'groups' | 'group-detail' | 'emails';

const DEFAULT_DOMAIN = 'ysyxopq.eu.cc';
const DEFAULT_QUICK_EMAIL = 'ys@ysyxopq.eu.cc';
const LS_DOMAIN = 'manyme_email_domain';
const LS_QUICK = 'manyme_quick_email';

function loadSetting(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function EditableChip({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!menuOpen && !editing) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        if (editing) {
          const next = draft.trim() || value;
          onChange(next);
          setEditing(false);
        }
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen, editing, draft, value, onChange]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { }
    setMenuOpen(false);
  };

  const startEdit = () => {
    setDraft(value);
    setMenuOpen(false);
    setEditing(true);
  };

  const saveEdit = () => {
    const next = draft.trim() || value;
    onChange(next);
    setEditing(false);
  };

  if (editing) {
    return (
      <div ref={wrapRef} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-blue-300 text-xs shadow-sm">
        <span className="text-gray-400">{label}</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') { setDraft(value); setEditing(false); }
          }}
          className="font-mono text-gray-800 outline-none min-w-[120px] max-w-[200px] bg-transparent"
        />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setMenuOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-xs transition-colors"
      >
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-gray-700">{value}</span>
        <span className={`text-[10px] ${copied ? 'text-green-600' : 'text-gray-400'}`}>
          {copied ? '已复制' : '▾'}
        </span>
      </button>
      {menuOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[100px]">
          <button type="button" onClick={copy}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
            复制
          </button>
          <button type="button" onClick={startEdit}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
            修改
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [domain, setDomain] = useState(() => loadSetting(LS_DOMAIN, DEFAULT_DOMAIN));
  const [quickEmail, setQuickEmail] = useState(() => loadSetting(LS_QUICK, DEFAULT_QUICK_EMAIL));

  const saveDomain = (v: string) => {
    setDomain(v);
    try { localStorage.setItem(LS_DOMAIN, v); } catch { }
  };
  const saveQuick = (v: string) => {
    setQuickEmail(v);
    try { localStorage.setItem(LS_QUICK, v); } catch { }
  };

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
              <button type="button" onClick={() => nav('dashboard')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-xl">📧</span>
                <span className="font-semibold text-gray-800">Manyme API</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 ml-3">
                <EditableChip label="域名" value={domain} onChange={saveDomain} />
                <EditableChip label="快速邮箱" value={quickEmail} onChange={saveQuick} />
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
            <EditableChip label="域名" value={domain} onChange={saveDomain} />
            <EditableChip label="快速邮箱" value={quickEmail} onChange={saveQuick} />
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
