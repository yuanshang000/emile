import { useState, useEffect } from 'react';
import { groupsApi, GroupWithRules } from '../api';

const FIELD_LABELS: Record<string, string> = {
  sender: '发件人',
  subject: '主题',
  body_html: 'HTML 正文',
  body_text: '纯文本正文',
};
const OPERATOR_LABELS: Record<string, string> = {
  contains: '包含',
  equals: '等于',
  regex: '正则匹配',
  starts_with: '开头是',
  ends_with: '结尾是',
};

export default function GroupDetail({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const [group, setGroup] = useState<GroupWithRules | null>(null);

  const load = () => groupsApi.get(groupId).then(setGroup).catch(console.error);
  useEffect(() => { load(); }, [groupId]);

  if (!group) return <div className="text-gray-400 text-center py-12">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">&larr; 返回</button>
        <h1 className="text-2xl font-bold text-gray-800">{group.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs ${group.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
          {group.enabled ? '已启用' : '已暂停'}
        </span>
      </div>
      {group.description && <p className="text-gray-400 text-sm -mt-4">{group.description}</p>}

      <MatchRulesSection group={group} onUpdate={load} />
      <ExtractRulesSection group={group} onUpdate={load} />
      <ResponseTemplateSection group={group} onUpdate={load} />
      <ApiUsageSection group={group} />
    </div>
  );
}

function MatchRulesSection({ group, onUpdate }: { group: GroupWithRules; onUpdate: () => void }) {
  const [adding, setAdding] = useState(false);
  const [field, setField] = useState('sender');
  const [operator, setOperator] = useState('contains');
  const [pattern, setPattern] = useState('');

  const handleAdd = async () => {
    if (!pattern.trim()) return;
    await groupsApi.addMatchRule(group.id, { field, operator, pattern: pattern.trim() });
    setPattern('');
    setAdding(false);
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await groupsApi.deleteMatchRule(id);
    onUpdate();
  };

  return (
    <Section title="🎯 匹配规则" subtitle="判断邮件是否属于此分组">
      {group.match_rules.map(r => (
        <div key={r.id} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg mb-2">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium min-w-[60px] text-center">
            {FIELD_LABELS[r.field] || r.field}
          </span>
          <span className="text-xs text-gray-500 min-w-[50px]">{OPERATOR_LABELS[r.operator] || r.operator}</span>
          <code className="flex-1 text-sm text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 truncate">{r.pattern}</code>
          <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">删除</button>
        </div>
      ))}
      {group.match_rules.length === 0 && (
        <div className="text-sm text-gray-400 py-2">暂无匹配规则，添加后系统将自动识别此类型邮件</div>
      )}
      {adding ? (
        <div className="space-y-2 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2">
            <select value={field} onChange={e => setField(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm">
              <option value="sender">发件人</option>
              <option value="subject">主题</option>
              <option value="body_html">HTML 正文</option>
              <option value="body_text">纯文本正文</option>
            </select>
            <select value={operator} onChange={e => setOperator(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm">
              <option value="contains">包含</option>
              <option value="equals">等于</option>
              <option value="regex">正则匹配</option>
              <option value="starts_with">开头是</option>
              <option value="ends_with">结尾是</option>
            </select>
            <input value={pattern} onChange={e => setPattern(e.target.value)}
              placeholder="匹配内容" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium">添加</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs">取消</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-sm text-blue-600 hover:text-blue-800 mt-2">+ 添加匹配规则</button>
      )}
    </Section>
  );
}

function patternToRegex(template: string): RegExp {
  const parts = template.split('~');
  if (parts.length < 2) throw new Error('Pattern must contain at least one ~');
  const regexStr = parts.map((part, i) => {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (i === parts.length - 1) return escaped;
    const nextPart = parts[i + 1] || '';
    return escaped + (nextPart === '' ? '([\\s\\S]*)' : '([\\s\\S]*?)');
  }).join('');
  return new RegExp(regexStr);
}

function previewExtract(sourceText: string, rules: { field_name: string; pattern: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rule of rules) {
    try {
      const match = sourceText.match(patternToRegex(rule.pattern));
      result[rule.field_name] = match?.[1] !== undefined
        ? match[1].replace(/^[\s\u00a0\u200b]+|[\s\u00a0\u200b]+$/g, '')
        : '';
    } catch {
      result[rule.field_name] = '';
    }
  }
  return result;
}

function ExtractRulesSection({ group, onUpdate }: { group: GroupWithRules; onUpdate: () => void }) {
  const [adding, setAdding] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [source, setSource] = useState<'html' | 'text'>('html');
  const [pattern, setPattern] = useState('');
  const [previewSource, setPreviewSource] = useState('');
  const [previewResult, setPreviewResult] = useState<Record<string, string> | null>(null);

  const handleAdd = async () => {
    if (!fieldName.trim() || !pattern.trim()) return;
    await groupsApi.addExtractRule(group.id, { field_name: fieldName.trim(), source, pattern });
    setFieldName('');
    setPattern('');
    setAdding(false);
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await groupsApi.deleteExtractRule(id);
    onUpdate();
  };

  const runPreview = () => {
    if (!previewSource.trim()) {
      setPreviewResult(null);
      return;
    }
    const rules = group.extract_rules.map(r => ({ field_name: r.field_name, pattern: r.pattern }));
    if (adding && fieldName.trim() && pattern.includes('~')) {
      rules.push({ field_name: fieldName.trim() || '预览', pattern });
    }
    setPreviewResult(previewExtract(previewSource, rules));
  };

  return (
    <Section title="🔧 提取规则" subtitle="用 ~ 替代动态内容，系统自动提取（结果自动去除前后空格）">
      <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
        💡 复制邮件正文片段，用 <code className="bg-amber-100 px-1 rounded">~</code> 替代验证码等动态内容。
        例如: <code className="bg-amber-100 px-1 rounded">输入此临时验证码以继续： ~如果并非你本人</code>
      </div>
      {group.extract_rules.map(r => (
        <div key={r.id} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg mb-2">
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium min-w-[60px] text-center">
            {r.field_name}
          </span>
          <span className="text-xs text-gray-500 min-w-[30px]">{r.source === 'html' ? 'HTML' : '文本'}</span>
          <code className="flex-1 text-sm text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 truncate">{r.pattern}</code>
          <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">删除</button>
        </div>
      ))}
      {adding ? (
        <div className="space-y-2 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <input value={fieldName} onChange={e => setFieldName(e.target.value)}
            placeholder="字段名（如 验证码）" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
          <div className="flex gap-2">
            <select value={source} onChange={e => setSource(e.target.value as 'html' | 'text')}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm">
              <option value="html">HTML 正文</option>
              <option value="text">纯文本正文</option>
            </select>
            <input value={pattern} onChange={e => setPattern(e.target.value)}
              placeholder={'用 ~ 替代动态值，如 验证码： ~ 如果'}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium">添加</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs">取消</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-sm text-blue-600 hover:text-blue-800 mt-2">+ 添加提取规则</button>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="text-sm font-medium text-gray-700 mb-2">🧪 提取预览</div>
        <p className="text-xs text-gray-400 mb-2">粘贴邮件正文源文本，按当前规则（及下方正在编辑的规则）预览提取结果</p>
        <textarea
          value={previewSource}
          onChange={e => setPreviewSource(e.target.value)}
          placeholder={'粘贴邮件正文，例如：\n输入此临时验证码以继续： 873853 如果并非你本人尝试创建 ChatGPT 帐户，请忽略此电子邮件'}
          className="w-full h-28 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 mt-2">
          <button onClick={runPreview}
            className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700">
            预览提取
          </button>
          <button onClick={() => { setPreviewSource(''); setPreviewResult(null); }}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs">
            清空
          </button>
        </div>
        {previewResult && (
          <div className="mt-3">
            <div className="text-xs text-gray-400 mb-1">提取结果：</div>
            {Object.keys(previewResult).length === 0 ? (
              <div className="text-sm text-gray-400">暂无提取规则</div>
            ) : (
              <div className="space-y-1">
                {Object.entries(previewResult).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">{k}</span>
                    <code className="bg-white px-2 py-1 rounded border border-gray-200 text-gray-800">
                      {v === '' ? '(未匹配)' : v}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function ResponseTemplateSection({ group, onUpdate }: { group: GroupWithRules; onUpdate: () => void }) {
  const [template, setTemplate] = useState(group.response_template?.template || '{\n  \n}');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTemplate(group.response_template?.template || '{\n  \n}');
  }, [group.response_template]);

  const handleSave = async () => {
    try {
      JSON.parse(template);
      await groupsApi.setResponseTemplate(group.id, template);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdate();
    } catch {
      alert('JSON 格式错误，请检查');
    }
  };

  const handleDelete = async () => {
    await groupsApi.deleteResponseTemplate(group.id);
    onUpdate();
  };

  return (
    <Section title="📦 响应模板" subtitle="自定义 API 返回格式，用 {{变量名}} 引用提取结果">
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">
        💡 可用变量: <code className="bg-gray-200 px-1 rounded">{'{{验证码}}'}</code>（提取规则字段名）、
        <code className="bg-gray-200 px-1 rounded">{'{{发件人}}'}</code>、
        <code className="bg-gray-200 px-1 rounded">{'{{主题}}'}</code>、
        <code className="bg-gray-200 px-1 rounded">{'{{接收时间}}'}</code>
      </div>
      <textarea value={template} onChange={e => setTemplate(e.target.value)}
        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder='{"platform": "openai", "code": "{{验证码}}"}'
      />
      <div className="flex gap-2 mt-2">
        <button onClick={handleSave}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {saved ? '✓ 已保存' : '保存模板'}
        </button>
        <button onClick={handleDelete}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">
          清除模板
        </button>
      </div>
      <div className="mt-3">
        <div className="text-xs text-gray-400 mb-1">预览效果：</div>
        <pre className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 border border-gray-200 overflow-auto">
          {(() => {
            try {
              const parsed = JSON.parse(template);
              return JSON.stringify(parsed, null, 2);
            } catch {
              return 'JSON 格式错误';
            }
          })()}
        </pre>
      </div>
    </Section>
  );
}

function ApiUsageSection({ group }: { group: GroupWithRules }) {
  const baseUrl = window.location.origin;
  return (
    <Section title="🔌 API 调用示例" subtitle="程序直接调用的接口">
      <div className="space-y-2 text-sm">
        <div>
          <div className="text-gray-500 mb-1">获取最新邮件（含自定义响应）：</div>
          <code className="block bg-gray-50 rounded-lg px-3 py-2 text-blue-700 border border-gray-200">
            GET {baseUrl}/api/codes/latest?group={group.id}
          </code>
        </div>
        <div>
          <div className="text-gray-500 mb-1">仅获取验证码：</div>
          <code className="block bg-gray-50 rounded-lg px-3 py-2 text-blue-700 border border-gray-200">
            GET {baseUrl}/api/codes/latest/code?group={group.id}
          </code>
        </div>
        <div>
          <div className="text-gray-500 mb-1">查询所有邮件：</div>
          <code className="block bg-gray-50 rounded-lg px-3 py-2 text-blue-700 border border-gray-200">
            GET {baseUrl}/api/emails?group={group.id}&limit=10
          </code>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Cloudflare Email Worker 推送邮件接口：</div>
          <code className="block bg-gray-50 rounded-lg px-3 py-2 text-blue-700 border border-gray-200">
            POST {baseUrl}/api/webhook/email
          </code>
        </div>
      </div>
    </Section>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
