import { useState, useEffect } from 'react';
import { groupsApi, emailsApi, GroupWithRules, EmailRecord } from '../api';

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

function extractWithRule(sourceText: string, pattern: string): string {
  try {
    const match = sourceText.match(patternToRegex(pattern));
    if (match?.[1] === undefined) return '';
    return match[1].replace(/^[\s\u00a0\u200b]+|[\s\u00a0\u200b]+$/g, '');
  } catch {
    return '';
  }
}

function generatePatternFromCode(sourceText: string, code: string): { pattern: string; source: 'html' | 'text' } | null {
  const sources: { text: string; source: 'html' | 'text' }[] = [
    { text: sourceText, source: 'html' },
  ];
  for (const { text, source } of sources) {
    if (!text) continue;
    const idx = text.indexOf(code);
    if (idx < 0) continue;
    const beforeLen = Math.min(16, idx);
    const afterLen = Math.min(16, text.length - idx - code.length);
    let before = text.slice(idx - beforeLen, idx);
    let after = text.slice(idx + code.length, idx + code.length + afterLen);
    before = before.replace(/^[\s\S]*?([\u4e00-\u9fffA-Za-z0-9：:，,。.！!？?\s]{6,16})$/, '$1');
    after = after.replace(/^([\u4e00-\u9fffA-Za-z0-9：:，,。.！!？?\s]{6,16})[\s\S]*$/, '$1');
    if (!before && !after) {
      before = text.slice(Math.max(0, idx - 10), idx);
      after = text.slice(idx + code.length, idx + code.length + 10);
    }
    const pattern = `${before}~${after}`;
    const extracted = extractWithRule(text, pattern);
    if (extracted === code) {
      return { pattern, source };
    }
    // fallback: slightly longer context
    const before2 = text.slice(Math.max(0, idx - 20), idx);
    const after2 = text.slice(idx + code.length, idx + code.length + 20);
    const pattern2 = `${before2}~${after2}`;
    if (extractWithRule(text, pattern2) === code) {
      return { pattern: pattern2, source };
    }
  }
  return null;
}

function ExtractRulesSection({ group, onUpdate }: { group: GroupWithRules; onUpdate: () => void }) {
  const [adding, setAdding] = useState(false);
  const [fieldName, setFieldName] = useState('验证码');
  const [source, setSource] = useState<'html' | 'text'>('html');
  const [pattern, setPattern] = useState('');
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [sampleEmailId, setSampleEmailId] = useState('');
  const [testEmailId, setTestEmailId] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [generatedPattern, setGeneratedPattern] = useState('');
  const [generatedSource, setGeneratedSource] = useState<'html' | 'text'>('html');
  const [sampleResult, setSampleResult] = useState('');
  const [testResult, setTestResult] = useState('');
  const [genError, setGenError] = useState('');
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [previewResult, setPreviewResult] = useState<Record<string, string> | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState('');

  useEffect(() => {
    setLoadingEmails(true);
    emailsApi.list({ group: group.id, limit: 50 })
      .then(res => setEmails(res.items))
      .catch(console.error)
      .finally(() => setLoadingEmails(false));
  }, [group.id]);

  const handleAdd = async () => {
    if (!fieldName.trim() || !pattern.trim()) return;
    await groupsApi.addExtractRule(group.id, { field_name: fieldName.trim(), source, pattern });
    setFieldName('验证码');
    setPattern('');
    setAdding(false);
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await groupsApi.deleteExtractRule(id);
    onUpdate();
  };

  const handleAutoGenerate = async () => {
    setGenError('');
    setGeneratedPattern('');
    setSampleResult('');
    setTestResult('');
    if (!codeInput.trim()) {
      setGenError('请输入验证码');
      return;
    }
    if (!sampleEmailId) {
      setGenError('请选择一封包含该验证码的邮件');
      return;
    }
    try {
      const email = await emailsApi.get(sampleEmailId);
      const html = email.body_html || '';
      const text = email.body_text || '';
      let found: { pattern: string; source: 'html' | 'text' } | null = null;
      if (html.includes(codeInput.trim())) {
        found = generatePatternFromCode(html, codeInput.trim());
        if (found) found.source = 'html';
      }
      if (!found && text.includes(codeInput.trim())) {
        found = generatePatternFromCode(text, codeInput.trim());
        if (found) found.source = 'text';
      }
      if (!found) {
        // try plain text derived from html
        const plain = (html || text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        if (plain.includes(codeInput.trim())) {
          found = generatePatternFromCode(plain, codeInput.trim());
          if (found) found.source = 'text';
        }
      }
      if (!found) {
        setGenError('在所选邮件中未找到该验证码，或无法生成稳定规则');
        return;
      }
      setGeneratedPattern(found.pattern);
      setGeneratedSource(found.source);
      setSource(found.source);
      setPattern(found.pattern);
      const src = found.source === 'html' ? (html || text) : (text || html);
      setSampleResult(extractWithRule(src, found.pattern));
    } catch {
      setGenError('加载邮件失败');
    }
  };

  const handleTestOther = async () => {
    setTestResult('');
    if (!generatedPattern || !testEmailId) return;
    try {
      const email = await emailsApi.get(testEmailId);
      const src = generatedSource === 'html'
        ? (email.body_html || email.body_text || '')
        : (email.body_text || email.body_html || '');
      setTestResult(extractWithRule(src, generatedPattern));
    } catch {
      setTestResult('');
    }
  };

  const handleSaveGenerated = async () => {
    if (!generatedPattern || !fieldName.trim()) return;
    await groupsApi.addExtractRule(group.id, {
      field_name: fieldName.trim(),
      source: generatedSource,
      pattern: generatedPattern,
    });
    setCodeInput('');
    setGeneratedPattern('');
    setSampleResult('');
    setTestResult('');
    setGenError('');
    onUpdate();
  };

  const runPreview = async () => {
    if (!selectedEmailId) {
      setPreviewResult(null);
      return;
    }
    try {
      const email = await emailsApi.get(selectedEmailId);
      const rules = group.extract_rules.map(r => ({
        field_name: r.field_name,
        pattern: r.pattern,
        source: r.source,
      }));
      const result: Record<string, string> = {};
      for (const rule of rules) {
        const text = rule.source === 'html' ? (email.body_html || email.body_text) : (email.body_text || email.body_html);
        result[rule.field_name] = extractWithRule(text || '', rule.pattern);
      }
      setPreviewResult(result);
    } catch {
      setPreviewResult(null);
    }
  };

  return (
    <Section title="🔧 提取规则" subtitle="输入验证码自动生成规则，或手动用 ~ 编写">
      <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
        💡 推荐：输入已知验证码 + 选择对应邮件 → 自动生成规则 → 用另一封邮件测试 → 保存
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

      <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100 space-y-3">
        <div className="text-sm font-medium text-purple-800">✨ 自动生成规则</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input value={codeInput} onChange={e => setCodeInput(e.target.value)}
            placeholder="输入邮件中的验证码，如 873853"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input value={fieldName} onChange={e => setFieldName(e.target.value)}
            placeholder="字段名（默认：验证码）"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <select
          value={sampleEmailId}
          onChange={e => setSampleEmailId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          disabled={loadingEmails}
        >
          <option value="">{loadingEmails ? '加载中...' : emails.length === 0 ? '本分组暂无邮件' : '选择包含该验证码的邮件'}</option>
          {emails.map(e => (
            <option key={e.id} value={e.id}>
              {e.subject || '(无主题)'} — {new Date(e.received_at).toLocaleString('zh-CN')}
            </option>
          ))}
        </select>
        <button onClick={handleAutoGenerate}
          className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700">
          自动识别规则
        </button>
        {genError && <div className="text-xs text-red-500">{genError}</div>}
        {generatedPattern && (
          <div className="space-y-2 bg-white rounded-lg p-3 border border-purple-100">
            <div className="text-xs text-gray-500">生成的规则（{generatedSource === 'html' ? 'HTML' : '文本'}）：</div>
            <code className="block text-sm text-gray-800 bg-gray-50 px-2 py-2 rounded border break-all">{generatedPattern}</code>
            <div className="text-xs text-gray-500">
              样本邮件提取结果：
              <code className="ml-1 px-2 py-0.5 bg-green-50 text-green-700 rounded">{sampleResult || '(未匹配)'}</code>
            </div>
            <div className="flex gap-2 items-center pt-1">
              <select
                value={testEmailId}
                onChange={e => setTestEmailId(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="">选择另一封邮件测试</option>
                {emails.filter(e => e.id !== sampleEmailId).map(e => (
                  <option key={e.id} value={e.id}>
                    {e.subject || '(无主题)'} — {new Date(e.received_at).toLocaleString('zh-CN')}
                  </option>
                ))}
              </select>
              <button onClick={handleTestOther} disabled={!testEmailId}
                className="px-3 py-1.5 bg-gray-800 text-white rounded text-xs disabled:opacity-50">
                测试
              </button>
            </div>
            {testEmailId && (
              <div className="text-xs text-gray-500">
                测试邮件提取结果：
                <code className={`ml-1 px-2 py-0.5 rounded ${testResult ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {testResult || '(未匹配)'}
                </code>
              </div>
            )}
            <button onClick={handleSaveGenerated}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
              保存为提取规则
            </button>
          </div>
        )}
      </div>

      {adding ? (
        <div className="space-y-2 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">手动添加</div>
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
        <button onClick={() => setAdding(true)} className="text-sm text-blue-600 hover:text-blue-800 mt-3">+ 手动添加提取规则</button>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="text-sm font-medium text-gray-700 mb-2">🧪 已有规则预览</div>
        <p className="text-xs text-gray-400 mb-2">选择本分组邮件，按已保存规则预览提取结果</p>
        <div className="flex gap-2 items-center">
          <select
            value={selectedEmailId}
            onChange={e => { setSelectedEmailId(e.target.value); setPreviewResult(null); }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled={loadingEmails}
          >
            <option value="">{loadingEmails ? '加载中...' : emails.length === 0 ? '本分组暂无邮件' : '选择一封邮件'}</option>
            {emails.map(e => (
              <option key={e.id} value={e.id}>
                {e.subject || '(无主题)'} — {new Date(e.received_at).toLocaleString('zh-CN')}
              </option>
            ))}
          </select>
          <button onClick={runPreview} disabled={!selectedEmailId}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50">
            预览提取
          </button>
        </div>
        {previewResult && (
          <div className="mt-3 space-y-1">
            {Object.keys(previewResult).length === 0 ? (
              <div className="text-sm text-gray-400">暂无已保存的提取规则</div>
            ) : (
              Object.entries(previewResult).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">{k}</span>
                  <code className="bg-white px-2 py-1 rounded border border-gray-200 text-gray-800">
                    {v === '' ? '(未匹配)' : v}
                  </code>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

const DEFAULT_TEMPLATE = (groupName: string) => `{
  "group": "${groupName}",
  "time": "{{接收时间}}",
  "code": "{{验证码}}"
}`;

function ResponseTemplateSection({ group, onUpdate }: { group: GroupWithRules; onUpdate: () => void }) {
  const defaultTpl = DEFAULT_TEMPLATE(group.name);
  const [template, setTemplate] = useState(group.response_template?.template || defaultTpl);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTemplate(group.response_template?.template || DEFAULT_TEMPLATE(group.name));
  }, [group.response_template, group.name]);

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

  const handleReset = async () => {
    setTemplate(DEFAULT_TEMPLATE(group.name));
  };

  return (
    <Section title="📦 响应模板" subtitle="自定义 API 返回格式，用 {{变量名}} 引用提取结果">
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3 space-y-1">
        <div>可用变量：</div>
        <div className="flex flex-wrap gap-1.5">
          <code className="bg-gray-200 px-1 rounded">{'{{验证码}}'}</code>
          <code className="bg-gray-200 px-1 rounded">{'{{code}}'}</code>
          <span className="text-gray-400">提取字段（默认取「验证码」或第一个提取字段）</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <code className="bg-gray-200 px-1 rounded">{'{{分组名}}'}</code>
          <code className="bg-gray-200 px-1 rounded">{'{{group}}'}</code>
          <span className="text-gray-400">分组名称</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <code className="bg-gray-200 px-1 rounded">{'{{接收时间}}'}</code>
          <code className="bg-gray-200 px-1 rounded">{'{{time}}'}</code>
          <span className="text-gray-400">邮件接收时间 ISO</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <code className="bg-gray-200 px-1 rounded">{'{{发件人}}'}</code>
          <code className="bg-gray-200 px-1 rounded">{'{{主题}}'}</code>
          <code className="bg-gray-200 px-1 rounded">{'{{收件人}}'}</code>
        </div>
        <div className="text-gray-400 pt-1">也可使用任意提取规则字段名，如 {'{{'}你的字段名{'}}'}</div>
      </div>
      <textarea value={template} onChange={e => setTemplate(e.target.value)}
        className="w-full h-36 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={DEFAULT_TEMPLATE(group.name)}
      />
      <div className="flex gap-2 mt-2">
        <button onClick={handleSave}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {saved ? '✓ 已保存' : '保存模板'}
        </button>
        <button onClick={handleReset}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
          恢复默认
        </button>
      </div>
      <div className="mt-3">
        <div className="text-xs text-gray-400 mb-1">预览效果：</div>
        <pre className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 border border-gray-200 overflow-auto">
          {(() => {
            try {
              return JSON.stringify(JSON.parse(template), null, 2);
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
          <div className="text-gray-500 mb-1">获取指定时间之后的第一封邮件（适合发起验证后轮询）：</div>
          <code className="block bg-gray-50 rounded-lg px-3 py-2 text-blue-700 border border-gray-200 break-all">
            GET {baseUrl}/api/codes/latest?group={group.id}&after=2026-07-15T08:00:00.000Z
          </code>
          <div className="text-xs text-gray-400 mt-1">
            after 为 ISO 时间；返回该时间之后收到的第一封邮件（按接收时间升序）
          </div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">仅获取验证码：</div>
          <code className="block bg-gray-50 rounded-lg px-3 py-2 text-blue-700 border border-gray-200">
            GET {baseUrl}/api/codes/latest/code?group={group.id}
          </code>
        </div>
        <div>
          <div className="text-gray-500 mb-1">仅获取验证码（带 after）：</div>
          <code className="block bg-gray-50 rounded-lg px-3 py-2 text-blue-700 border border-gray-200 break-all">
            GET {baseUrl}/api/codes/latest/code?group={group.id}&after=2026-07-15T08:00:00.000Z
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
