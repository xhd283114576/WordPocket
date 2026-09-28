"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Download, Eye, EyeOff, Search, Settings, Sparkles, Upload, Volume2, X } from "lucide-react";

type WordStatus = "learning" | "mastered";
type WordItem = { id: string; word: string; meaning: string; example: string; tags: string[]; status: WordStatus; createdAt: number };
const STORAGE_KEY = "wordpocket.words.v1";
type Provider = "openai" | "deepseek" | "qwen";
const PROVIDERS: Record<Provider, { label: string; model: string; hint: string }> = {
  openai: { label: "OpenAI", model: "gpt-5-mini", hint: "在 OpenAI Platform 创建的 API Key" },
  deepseek: { label: "DeepSeek", model: "deepseek-v4-flash", hint: "在 DeepSeek 开放平台创建的 API Key" },
  qwen: { label: "通义千问", model: "qwen-plus", hint: "在阿里云百炼创建的 API Key" },
};

export default function Home() {
  const [words, setWords] = useState<WordItem[]>([]);
  const [ready, setReady] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [tags, setTags] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | WordStatus>("all");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [answerShown, setAnswerShown] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [model, setModel] = useState(PROVIDERS.deepseek.model);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setWords(saved);
      const savedProvider = localStorage.getItem("wordpocket.ai.provider") as Provider | null;
      const activeProvider = savedProvider && PROVIDERS[savedProvider] ? savedProvider : "deepseek";
      setProvider(activeProvider);
      setModel(localStorage.getItem("wordpocket.ai.model") || PROVIDERS[activeProvider].model);
      setApiKey(sessionStorage.getItem("wordpocket.ai.key") || "");
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(words)); }, [words, ready]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return words.filter((item) => (filter === "all" || item.status === filter) && [item.word, item.meaning, item.example, ...item.tags].join(" ").toLowerCase().includes(needle));
  }, [words, query, filter]);
  const reviewWord = words.find((item) => item.id === reviewId);

  function announce(text: string) { setMessage(text); window.setTimeout(() => setMessage(""), 2800); }
  function addWord(event: React.FormEvent) {
    event.preventDefault();
    const cleanWord = word.trim(); const cleanMeaning = meaning.trim();
    if (!cleanWord || !cleanMeaning) return;
    if (words.some((item) => item.word.toLowerCase() === cleanWord.toLowerCase())) { announce("这个词已经在口袋里了。"); return; }
    setWords((current) => [{ id: crypto.randomUUID(), word: cleanWord, meaning: cleanMeaning, example: example.trim(), tags: [...new Set(tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))].slice(0, 8), status: "learning", createdAt: Date.now() }, ...current]);
    setWord(""); setMeaning(""); setExample(""); setTags(""); announce(`已保存 “${cleanWord}”`);
  }
  async function generateExample() {
    if (!word.trim()) { announce("请先输入英文单词。"); return; }
    setGenerating(true); setMessage("AI 正在构思自然的学习语境…");
    try {
      const response = await fetch("/api/generate-example", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: word.trim(), meaning: meaning.trim(), level: "intermediate", provider, model, apiKey }) });
      const data = await response.json() as { sentence?: string; translation?: string; note?: string; error?: string };
      if (!response.ok || !data.sentence) throw new Error(data.error || "生成失败，请稍后再试。");
      setExample(`${data.sentence}\n${data.translation ? `中文：${data.translation}` : ""}${data.note ? `\n提示：${data.note}` : ""}`.trim());
      announce("例句已生成，你可以继续修改。");
    } catch (error) { announce(error instanceof Error ? error.message : "生成失败，请稍后再试。"); }
    finally { setGenerating(false); }
  }
  function speak(text: string) { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-US"; utterance.rate = .86; window.speechSynthesis.speak(utterance); }
  function toggleStatus(id: string) { setWords((current) => current.map((item) => item.id === id ? { ...item, status: item.status === "mastered" ? "learning" : "mastered" } : item)); }
  function openReview() { if (!words.length) { announce("先记录一个单词，再来复习吧。"); return; } const candidates = words.length > 1 ? words.filter((item) => item.id !== reviewId) : words; setReviewId(candidates[Math.floor(Math.random() * candidates.length)].id); setAnswerShown(false); }
  function exportWords() { const blob = new Blob([JSON.stringify({ app: "WordPocket", version: 1, exportedAt: new Date().toISOString(), words }, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `wordpocket-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); }
  async function importWords(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()); const imported = Array.isArray(data) ? data : data.words; if (!Array.isArray(imported)) throw new Error(); setWords(imported.filter((item) => item?.word && item?.meaning)); announce(`成功导入 ${imported.length} 个单词。`); } catch { announce("导入失败，请选择 WordPocket 导出的 JSON 文件。"); } event.target.value = ""; }
  function saveSettings() {
    localStorage.setItem("wordpocket.ai.provider", provider);
    localStorage.setItem("wordpocket.ai.model", model.trim());
    if (apiKey.trim()) sessionStorage.setItem("wordpocket.ai.key", apiKey.trim());
    else sessionStorage.removeItem("wordpocket.ai.key");
    setSettingsOpen(false);
    announce("AI 设置已保存到当前浏览器会话。");
  }
  async function testConnection() {
    if (!apiKey.trim() || !model.trim()) { setConnectionState("error"); return; }
    setTesting(true); setConnectionState("idle");
    try {
      const response = await fetch("/api/generate-example", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: "practice", meaning: "练习", level: "beginner", provider, model: model.trim(), apiKey: apiKey.trim() }) });
      setConnectionState(response.ok ? "success" : "error");
    } catch { setConnectionState("error"); }
    finally { setTesting(false); }
  }

  return <>
    <header className="topbar"><a className="brand" href="#top" aria-label="WordPocket 首页"><span className="brand-mark">W</span><span>WordPocket</span></a><div className="top-actions"><button className={`button ghost config-button ${apiKey ? "configured" : ""}`} type="button" onClick={() => { setConnectionState("idle"); setSettingsOpen(true); }}><Settings size={16}/><span>AI 设置</span>{apiKey && <i aria-label="已配置"/>}</button><button className="button ghost" type="button" onClick={exportWords}><Download size={16}/>导出</button><label className="button ghost"><Upload size={16}/>导入<input type="file" accept="application/json" hidden onChange={importWords}/></label></div></header>
    <main id="top" className="shell">
      <section className="intro"><div><p className="eyebrow">YOUR PERSONAL WORD BANK</p><h1>遇见好词，马上收进口袋。</h1><p>记录单词、理解语境，用 AI 生成真正记得住的例句。</p></div><div className="stats" aria-label="词库统计"><div><strong>{words.length}</strong><span>全部</span></div><div><strong>{words.filter((item) => item.status === "learning").length}</strong><span>学习中</span></div><div><strong>{words.filter((item) => item.status === "mastered").length}</strong><span>已掌握</span></div></div></section>
      <section className="workspace">
        <form className="composer" onSubmit={addWord}><div className="composer-heading"><h2>记一个新词</h2><span className="ai-badge"><Sparkles size={14}/>AI 例句</span></div><div className="field-grid">
          <label className="field"><span>英文单词 *</span><input value={word} onChange={(event) => setWord(event.target.value)} required maxLength={80} placeholder="serendipity"/></label>
          <label className="field"><span>中文释义 *</span><input value={meaning} onChange={(event) => setMeaning(event.target.value)} required maxLength={160} placeholder="意外发现美好事物的运气"/></label>
          <label className="field"><span className="field-label-row"><span>例句或笔记</span><button className="generate-button" type="button" onClick={generateExample} disabled={generating}><Sparkles size={15}/>{generating ? "生成中…" : "AI 生成"}</button></span><textarea value={example} onChange={(event) => setExample(event.target.value)} maxLength={700} rows={5} placeholder="点击“AI 生成”，获得英文例句、翻译和用法提示。"/></label>
          <label className="field"><span>标签</span><input value={tags} onChange={(event) => setTags(event.target.value)} maxLength={120} placeholder="旅行, 阅读（用逗号分隔）"/></label>
        </div><div className="composer-footer"><span className="form-message" role="status">{message}</span><button className="button primary" type="submit">收进口袋</button></div></form>
        <section className="library"><div className="library-head"><div><p className="section-kicker">MY WORDS</p><h2>我的词库</h2></div><button className="button dark" type="button" onClick={openReview}><BookOpen size={17}/>随机复习</button></div><div className="toolbar"><label className="search"><Search size={17}/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索单词、释义、标签…"/></label><div className="filters">{(["all","learning","mastered"] as const).map((value) => <button key={value} className={`filter ${filter === value ? "active" : ""}`} type="button" onClick={() => setFilter(value)}>{value === "all" ? "全部" : value === "learning" ? "学习中" : "已掌握"}</button>)}</div></div>
          <div className="word-list">{filtered.map((item) => <article className="word-card" key={item.id}><div className="word-main"><div className="word-title-row"><h3>{item.word}</h3><button className="icon-button" type="button" onClick={() => speak(item.word)} aria-label={`朗读 ${item.word}`}><Volume2 size={14}/></button></div><p className="card-meaning">{item.meaning}</p>{item.example && <p className="card-example">{item.example}</p>}<div className="card-tags">{item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div><div className="card-side"><button className={`status-button ${item.status}`} type="button" onClick={() => toggleStatus(item.id)}>{item.status === "mastered" ? "✓ 已掌握" : "学习中"}</button><time>{new Intl.DateTimeFormat("zh-CN",{month:"short",day:"numeric"}).format(new Date(item.createdAt))}</time><button className="delete-button" type="button" onClick={() => confirm(`确定删除 “${item.word}” 吗？`) && setWords((current) => current.filter((other) => other.id !== item.id))}>删除</button></div></article>)}</div>
          {!filtered.length && <div className="empty-state"><span>Aa</span><h3>{words.length ? "没有匹配的单词" : "口袋还是空的"}</h3><p>{words.length ? "换个关键词或筛选条件试试。" : "从刚刚遇见的那个英文单词开始吧。"}</p></div>}
        </section>
      </section>
    </main>
    {reviewWord && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="随机复习"><section className="review-card"><button className="close-button" onClick={() => setReviewId(null)} aria-label="关闭"><X/></button><p className="section-kicker">QUICK REVIEW</p><button className="review-speak" onClick={() => speak(reviewWord.word)} aria-label="朗读"><Volume2/></button><h2>{reviewWord.word}</h2>{!answerShown ? <button className="button primary wide" onClick={() => setAnswerShown(true)}>显示答案</button> : <div className="review-answer"><strong>{reviewWord.meaning}</strong>{reviewWord.example && <p>{reviewWord.example}</p>}</div>}<div className="review-actions"><button className="button dark" onClick={openReview}>换一个</button><button className="button ghost" onClick={() => toggleStatus(reviewWord.id)}>{reviewWord.status === "mastered" ? "设为学习中" : "标为已掌握"}</button></div></section></div>}
    {settingsOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title"><section className="settings-card"><button className="close-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="关闭"><X/></button><div className="settings-heading"><span className="settings-icon"><Settings/></span><div><p className="section-kicker">AI CONNECTION</p><h2 id="settings-title">配置 AI 服务</h2></div></div><p className="settings-intro">密钥只保存在当前浏览器会话中，关闭标签页后自动清除，不会进入词库导出或 GitHub。</p><div className="field-grid settings-fields"><label className="field"><span>服务商</span><select value={provider} onChange={(event) => { const next = event.target.value as Provider; setProvider(next); setModel(PROVIDERS[next].model); setConnectionState("idle"); }}>{Object.entries(PROVIDERS).map(([value, item]) => <option value={value} key={value}>{item.label}</option>)}</select></label><label className="field"><span>模型名称</span><input value={model} onChange={(event) => { setModel(event.target.value); setConnectionState("idle"); }} maxLength={100} placeholder={PROVIDERS[provider].model}/></label><label className="field"><span>API Key</span><span className="secret-input"><input type={showKey ? "text" : "password"} value={apiKey} onChange={(event) => { setApiKey(event.target.value); setConnectionState("idle"); }} autoComplete="off" spellCheck={false} placeholder={PROVIDERS[provider].hint}/><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? "隐藏密钥" : "显示密钥"}>{showKey ? <EyeOff/> : <Eye/>}</button></span></label></div><div className={`connection-result ${connectionState}`} aria-live="polite">{connectionState === "success" && <><Check size={16}/>连接成功，可以生成例句</>}{connectionState === "error" && <>连接失败，请检查密钥和模型名称</>}</div><div className="settings-actions"><button className="button ghost" type="button" onClick={testConnection} disabled={testing}>{testing ? "测试中…" : "测试连接"}</button><button className="button primary" type="button" onClick={saveSettings}>保存设置</button></div></section></div>}
  </>;
}
