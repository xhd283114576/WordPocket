const STORAGE_KEY = 'wordpocket.words.v1';

const $ = (selector) => document.querySelector(selector);
const els = {
  form: $('#wordForm'), word: $('#wordInput'), meaning: $('#meaningInput'), example: $('#exampleInput'), tags: $('#tagsInput'),
  message: $('#formMessage'), list: $('#wordList'), empty: $('#emptyState'), template: $('#wordTemplate'), search: $('#searchInput'),
  total: $('#totalCount'), learning: $('#learningCount'), mastered: $('#masteredCount'), exportBtn: $('#exportBtn'), importInput: $('#importInput'),
  reviewBtn: $('#reviewBtn'), dialog: $('#reviewDialog'), reviewWord: $('#reviewWord'), reviewMeaning: $('#reviewMeaning'),
  reviewExample: $('#reviewExample'), reviewAnswer: $('#reviewAnswer'), revealBtn: $('#revealBtn'), nextReviewBtn: $('#nextReviewBtn'),
  masterReviewBtn: $('#masterReviewBtn'), speakReviewBtn: $('#speakReviewBtn')
};

let words = loadWords();
let activeFilter = 'all';
let currentReviewId = null;

function loadWords() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

function saveWords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  render();
}

function normalizeTags(value) {
  return [...new Set(value.split(/[,，]/).map(tag => tag.trim()).filter(Boolean))].slice(0, 8);
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = .86;
  speechSynthesis.speak(utterance);
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(timestamp));
}

function render() {
  const query = els.search.value.trim().toLowerCase();
  const filtered = words.filter(item => {
    const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
    const haystack = [item.word, item.meaning, item.example, ...(item.tags || [])].join(' ').toLowerCase();
    return matchesFilter && haystack.includes(query);
  });

  els.list.replaceChildren();
  filtered.forEach(item => {
    const card = els.template.content.firstElementChild.cloneNode(true);
    card.dataset.id = item.id;
    card.querySelector('.card-word').textContent = item.word;
    card.querySelector('.card-meaning').textContent = item.meaning;
    card.querySelector('.card-example').textContent = item.example || '';
    card.querySelector('.card-date').textContent = formatDate(item.createdAt);
    card.querySelector('.card-date').dateTime = new Date(item.createdAt).toISOString();

    const tags = card.querySelector('.card-tags');
    (item.tags || []).forEach(tag => {
      const el = document.createElement('span');
      el.className = 'tag';
      el.textContent = tag;
      tags.append(el);
    });

    const status = card.querySelector('.status-button');
    status.textContent = item.status === 'mastered' ? '✓ 已掌握' : '学习中';
    status.classList.toggle('mastered', item.status === 'mastered');
    status.addEventListener('click', () => toggleStatus(item.id));
    card.querySelector('.speak-button').addEventListener('click', () => speak(item.word));
    card.querySelector('.delete-button').addEventListener('click', () => deleteWord(item.id));
    els.list.append(card);
  });

  els.empty.hidden = filtered.length > 0;
  els.total.textContent = words.length;
  els.learning.textContent = words.filter(item => item.status === 'learning').length;
  els.mastered.textContent = words.filter(item => item.status === 'mastered').length;
}

function toggleStatus(id) {
  words = words.map(item => item.id === id ? { ...item, status: item.status === 'mastered' ? 'learning' : 'mastered' } : item);
  saveWords();
}

function deleteWord(id) {
  const item = words.find(word => word.id === id);
  if (!item || !confirm(`确定删除 “${item.word}” 吗？`)) return;
  words = words.filter(word => word.id !== id);
  saveWords();
}

function addWord(event) {
  event.preventDefault();
  const word = els.word.value.trim();
  const meaning = els.meaning.value.trim();
  if (!word || !meaning) return;
  const duplicate = words.find(item => item.word.toLowerCase() === word.toLowerCase());
  if (duplicate) {
    els.message.textContent = '这个词已经在口袋里了。';
    els.word.focus();
    return;
  }
  words.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    word, meaning, example: els.example.value.trim(), tags: normalizeTags(els.tags.value), status: 'learning', createdAt: Date.now()
  });
  els.form.reset();
  els.message.textContent = `已保存 “${word}”`;
  saveWords();
  els.word.focus();
  setTimeout(() => { els.message.textContent = ''; }, 2400);
}

function showReview() {
  if (!words.length) {
    els.message.textContent = '先记录一个单词，再来复习吧。';
    els.word.focus();
    return;
  }
  const candidates = words.length > 1 ? words.filter(item => item.id !== currentReviewId) : words;
  const item = candidates[Math.floor(Math.random() * candidates.length)];
  currentReviewId = item.id;
  els.reviewWord.textContent = item.word;
  els.reviewMeaning.textContent = item.meaning;
  els.reviewExample.textContent = item.example || '暂无例句';
  els.reviewAnswer.hidden = true;
  els.revealBtn.hidden = false;
  els.masterReviewBtn.textContent = item.status === 'mastered' ? '设为学习中' : '标为已掌握';
  if (!els.dialog.open) els.dialog.showModal();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ app: 'WordPocket', version: 1, exportedAt: new Date().toISOString(), words }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wordpocket-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const imported = Array.isArray(data) ? data : data.words;
    if (!Array.isArray(imported)) throw new Error('Invalid format');
    const valid = imported.filter(item => item && typeof item.word === 'string' && typeof item.meaning === 'string').map(item => ({
      id: item.id || `${Date.now()}-${Math.random()}`, word: item.word.trim(), meaning: item.meaning.trim(), example: String(item.example || ''),
      tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 8) : [], status: item.status === 'mastered' ? 'mastered' : 'learning', createdAt: Number(item.createdAt) || Date.now()
    }));
    words = valid;
    saveWords();
    alert(`成功导入 ${valid.length} 个单词。`);
  } catch { alert('导入失败：请选择由 WordPocket 导出的 JSON 文件。'); }
  event.target.value = '';
}

els.form.addEventListener('submit', addWord);
els.form.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') els.form.requestSubmit();
});
els.search.addEventListener('input', render);
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button));
  render();
}));
els.reviewBtn.addEventListener('click', showReview);
els.nextReviewBtn.addEventListener('click', showReview);
els.revealBtn.addEventListener('click', () => { els.reviewAnswer.hidden = false; els.revealBtn.hidden = true; });
els.speakReviewBtn.addEventListener('click', () => speak(els.reviewWord.textContent));
els.masterReviewBtn.addEventListener('click', () => { toggleStatus(currentReviewId); showReview(); });
els.exportBtn.addEventListener('click', exportData);
els.importInput.addEventListener('change', importData);
els.dialog.addEventListener('click', event => { if (event.target === els.dialog) els.dialog.close(); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
render();
