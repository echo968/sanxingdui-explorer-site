const $tree = (selector, root = document) => root.querySelector(selector);

let roomConfig = null;
let modelRequest = null;
let rendererState = null;
let activation = 0;
let questionIndex = 0;
let usedQuestionStems = [];
let questionRequestInFlight = false;
let questionRequestSerial = 0;
let score = 0;
let selectedOption = '';
let answeredQuestions = new Set();
let exploredParts = new Set();
let activePart = '';
let hotspotsById = new Map();
let previousFocus = null;
let guideRequest = null;
let guideHistory = [];
let guideAnswerVisibleIds = new Set();
let guideServiceConfigured = false;

function setModelStatus(message) {
  const status = $tree('#ai-tree-model-status');
  if (status) status.textContent = message;
}

function appendText(tag, className, value, parent) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

function sourceFor(id) {
  return roomConfig?.sources.find(source => source.id === id);
}

async function loadCatalogEvidence(artifactId) {
  const manifestResponse = await fetch('/data/manifest.json', {cache:'no-cache'});
  if (!manifestResponse.ok) throw new Error(`数据清单读取失败（${manifestResponse.status}）。`);
  const manifest = await manifestResponse.json();
  const file = manifest.files?.find(item => item.path === 'artifacts/selected-book-300.jsonl' && item.format === 'jsonl');
  if (!file?.url) throw new Error('精选300件图录数据未列入 manifest。');
  const response = await fetch(file.url, {cache:'no-cache'});
  if (!response.ok) throw new Error(`精选图录读取失败（${response.status}）。`);
  const records = (await response.text()).split(/\r?\n/).flatMap(line => {
    try { return line.trim() ? [JSON.parse(line)] : []; }
    catch { return []; }
  });
  const record = records.find(item => item.id === artifactId);
  if (!record) throw new Error(`精选图录中未找到证据记录 ${artifactId}。`);
  const source = record.sources?.find(item => item.source_id === 'book-2009-146-033');
  if (!source) throw new Error('图录记录缺少对应的来源出处。');
  return {record, source};
}

function renderSourceLinks(ids, parent) {
  if (!ids?.length) return;
  const list = document.createElement('ul');
  list.className = 'ai-tree-inline-sources';
  for (const id of ids) {
    const source = sourceFor(id);
    if (!source) continue;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${source.title} · ${source.locator}（待复核）↗`;
    item.append(link);
    list.append(item);
  }
  if (list.childElementCount) parent.append(list);
}

function renderGuideSources() {
  const container = $tree('#ai-tree-guide-sources');
  if (!container) return;
  container.replaceChildren();
  if (!roomConfig?.sources.length) {
    appendText('p', '', '当前没有已配置的来源记录。', container);
    return;
  }
  for (const source of roomConfig.sources) {
    const article = document.createElement('article');
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${source.title} ↗`;
    article.append(link);
    appendText('small', '', `${source.locator} · 记录状态：资料待复核`, article);
    if (source.supports?.length) appendText('small', '', `支持字段：${source.supports.join('、')}`, article);
    container.append(article);
  }
}

function currentQuestion() {
  return roomConfig?.questions[questionIndex] || null;
}

function normalizeQuizOutput(outputs) {
  let value = outputs?.quiz_result || outputs?.quiz || outputs;
  if (value === outputs && typeof outputs?.output === 'string') value = outputs.output;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch {}
  }
  return value && typeof value === 'object' ? value : {};
}

function makeAiQuestion(outputs, index) {
  const value = normalizeQuizOutput(outputs);
  const canGenerate = value.can_generate ?? value.Group2;
  if (canGenerate === false || canGenerate === 'false') {
    throw new Error(value.error_message || value.Group3 || '知识库资料不足，暂时无法生成这道题。');
  }
  const prompt = String(value.question || value.Group4 || '').trim();
  const correct = String(value.correct_option || value.Group9 || '').trim().toUpperCase();
  const rawOptions = [
    ['A',value.option_a || value.Group5],['B',value.option_b || value.Group6],
    ['C',value.option_c || value.Group7],['D',value.option_d || value.Group8]
  ];
  if (!prompt || !['A','B','C','D'].includes(correct) || rawOptions.some(([,text]) => !String(text || '').trim())) {
    throw new Error('工作流返回的题目字段不完整。请检查总工作流结束节点是否映射了 question、option_a 至 option_d 和 correct_option。');
  }
  return {
    id:`coze-tree-${index + 1}`,
    type:'choice',
    label:'知识库单选题',
    prompt,
    options:rawOptions.map(([id,text]) => ({
      id,
      label:`${id}. ${String(text).trim().replace(/^[A-D]\s*[.、:：)]\s*/i,'')}`
    })),
    answer:correct,
    hint:'再结合题干和资料线索想一想，也可以查看答案与解析。',
    explanation:String(value.explanation || value.Group10 || '').trim(),
    sourceTitle:String(value.source_title || value.Group11 || '').trim(),
    sourcePage:String(value.source_page || value.Group12 || '').trim(),
    evidenceQuote:String(value.evidence_quote || value.Group13 || '').trim()
  };
}

async function requestAiQuestion(activationId) {
  if (!roomConfig || questionRequestInFlight || !document.body.classList.contains('ai-tree-room-mode')) return;
  if (questionIndex >= 5) { renderQuestion(); return; }
  questionRequestInFlight = true;
  const requestSerial = ++questionRequestSerial;
  const loading = $tree('#ai-tree-quiz-loading');
  const body = $tree('#ai-tree-quiz-body');
  loading.replaceChildren();
  loading.hidden = false;
  loading.textContent = `正在生成第 ${questionIndex + 1} 题…`;
  body.hidden = true;
  const focusAreas = ['器物形制与构件','考古记录与出土信息','神树结构观察','研究观点辨析','资料证据与解释边界'];
  try {
    const outputs = await window.SanxingduiCoze.run('space3_quiz', {
      topic:'三星堆青铜神树',
      focus:focusAreas[questionIndex % focusAreas.length],
      difficulty:'中等',
      question_index:questionIndex + 1,
      used_questions:usedQuestionStems.join('\n')
    });
    if (activationId !== activation || !document.body.classList.contains('ai-tree-room-mode')) return;
    const question = makeAiQuestion(outputs, questionIndex);
    roomConfig.questions[questionIndex] = question;
    usedQuestionStems.push(question.prompt);
    renderQuestion();
  } catch (error) {
    if (activationId !== activation) return;
    loading.replaceChildren();
    appendText('p', '', `题目生成失败：${error.message}`, loading);
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'ai-tree-retry';
    retry.textContent = '重试生成';
    retry.addEventListener('click', () => requestAiQuestion(activation));
    loading.append(retry);
    loading.hidden = false;
  } finally {
    if (requestSerial === questionRequestSerial) questionRequestInFlight = false;
  }
}

function renderQuestion() {
  const body = $tree('#ai-tree-quiz-body');
  if (!body || !roomConfig) return;
  $tree('#ai-tree-next-question').hidden = true;
  body.replaceChildren();
  body.hidden = false;
  $tree('#ai-tree-quiz-loading').hidden = true;
  const question = currentQuestion();
  if (!question) {
    const completion = document.createElement('div');
    completion.className = 'ai-tree-completion';
    appendText('p', 'ai-tree-question-type', 'EXPLORATION COMPLETE', completion);
    appendText('h2', '', '枝脉已探索', completion);
    appendText('p', '', `答对 ${score} / ${roomConfig.questions.length} 题`, completion);
    appendText('p', 'ai-tree-explored-parts', `已探索部位：${[...exploredParts].join('、') || '尚未记录'}`, completion);
    const actions = document.createElement('div');
    actions.className = 'ai-tree-quiz-actions';
    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'button button-gold';
    restart.textContent = '重新挑战';
    restart.addEventListener('click', resetQuiz);
    const continueLink = document.createElement('a');
    continueLink.className = 'button button-outline';
    continueLink.href = '/?page=ai-exhibition&room=echo';
    continueLink.dataset.aiRoomLink = 'echo';
    continueLink.textContent = '继续参观';
    actions.append(restart, continueLink);
    completion.append(actions);
    body.append(completion);
    return;
  }

  const heading = document.createElement('div');
  heading.className = 'ai-tree-question-heading';
  appendText('p', 'ai-tree-question-type', question.label, heading);
  appendText('span', '', `第 ${questionIndex + 1} 题 / 共 5 题`, heading);
  body.append(heading);
  appendText('h2', '', question.prompt, body);

  if (question.type === 'choice') {
    const options = document.createElement('div');
    options.className = 'ai-tree-options';
    options.setAttribute('role', 'radiogroup');
    options.setAttribute('aria-label', question.prompt);
    for (const option of question.options || []) {
      const label = document.createElement('label');
      label.className = 'ai-tree-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `tree-question-${question.id}`;
      input.value = option.id;
      input.checked = selectedOption === option.id;
      input.addEventListener('change', () => {
        selectedOption = option.id;
        check.disabled = false;
      });
      const text = document.createElement('span');
      text.textContent = option.label;
      label.append(input, text);
      options.append(label);
    }
    body.append(options);
  } else {
    const target = roomConfig.hotspots.find(part => part.id === question.targetHotspotId);
    appendText('p', 'ai-tree-hotspot-instruction', `请点击 3D 模型上的「${target?.label || '目标部位'}」柔光标记。`, body);
  }

  const feedback = document.createElement('div');
  feedback.className = 'ai-tree-feedback';
  feedback.id = 'ai-tree-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  body.append(feedback);

  const actions = document.createElement('div');
  actions.className = 'ai-tree-quiz-actions';
  const check = document.createElement('button');
  check.type = 'button';
  check.className = 'button button-gold';
  check.textContent = question.type === 'hotspot' ? '我已找到目标' : '提交答案';
  check.disabled = question.type === 'hotspot' || !selectedOption;
  check.hidden = question.type === 'hotspot';
  check.addEventListener('click', () => evaluateChoice(selectedOption));
  actions.append(check);
  body.append(actions);
}

function showQuestionFeedback(kind, message, question, {showAnswer = false} = {}) {
  const feedback = $tree('#ai-tree-feedback');
  if (!feedback) return;
  feedback.replaceChildren();
  feedback.className = `ai-tree-feedback is-${kind}`;
  appendText('p', '', message, feedback);
  if (showAnswer) {
    guideAnswerVisibleIds.add(question.id);
    const details = document.createElement('details');
    details.className = 'ai-tree-answer-details';
    const summary = document.createElement('summary');
    summary.textContent = '查看答案解析、来源与证据';
    details.append(summary);
    const answerLabel = question.options?.find(option => option.id === question.answer)?.label;
    if (answerLabel) appendText('p', 'ai-tree-answer-line', `正确答案：${answerLabel}`, details);
    if (question.explanation) appendText('p', 'ai-tree-explanation', question.explanation, details);
    if (question.sourceTitle) appendText('p', 'ai-tree-record-excerpt', `来源：${question.sourceTitle}${question.sourcePage ? ` · ${question.sourcePage}` : ''}`, details);
    if (question.evidenceQuote) appendText('p', 'ai-tree-record-excerpt', `证据摘录：“${question.evidenceQuote}”`, details);
    if (question.id === 'fact-or-interpretation' && roomConfig.catalogArtifact?.description) {
      appendText('p', 'ai-tree-record-excerpt', `图录简介（OCR 整理，待复核）：${roomConfig.catalogArtifact.description}`, details);
    }
    renderSourceLinks(question.sourceIds, details);
    const ask = document.createElement('button');
    ask.type = 'button';
    ask.className = 'ai-tree-text-button';
    ask.textContent = '问 AI 讲解';
    ask.addEventListener('click', () => openGuide(question.prompt));
    details.append(ask);
    feedback.append(details);
    const next = $tree('#ai-tree-next-question');
    next.hidden = false;
    next.innerHTML = questionIndex + 1 < 5 ? '下一题 <span aria-hidden="true">→</span>' : '完成 <span aria-hidden="true">→</span>';
  }
}

function markCorrect(question) {
  if (answeredQuestions.has(question.id)) return;
  answeredQuestions.add(question.id);
  score += 1;
}

function evaluateChoice(optionId) {
  const question = currentQuestion();
  if (!question || question.type !== 'choice') return;
  if (!optionId) {
    showQuestionFeedback('hint', '先选择一项，再提交你的观察。', question);
    return;
  }
  if (optionId === question.answer) {
    markCorrect(question);
    if (question.targetHotspotId) {
      highlightPart(question.targetHotspotId);
      exploredParts.add(roomConfig.hotspots.find(part => part.id === question.targetHotspotId)?.label || '模型形态');
    }
    showQuestionFeedback('correct', '观察正确。模型中已标出相关部位。', question, {showAnswer:true});
    return;
  }
  const feedback = $tree('#ai-tree-feedback');
  feedback.replaceChildren();
  feedback.className = 'ai-tree-feedback is-hint';
  appendText('p', '', question.hint, feedback);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'ai-tree-text-button';
  retry.textContent = '再观察一次';
  retry.addEventListener('click', () => { selectedOption = ''; renderQuestion(); });
  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'ai-tree-text-button';
  reveal.textContent = '查看答案';
  reveal.addEventListener('click', () => {
    highlightPart(question.targetHotspotId);
    showQuestionFeedback('answer', '答案线索已标出。', question, {showAnswer:true});
  });
  feedback.append(retry, reveal);
}

function evaluateHotspot(partId) {
  const question = currentQuestion();
  if (!question || question.type !== 'hotspot') return;
  const feedback = $tree('#ai-tree-feedback');
  if (partId !== question.targetHotspotId) {
    feedback.replaceChildren();
    feedback.className = 'ai-tree-feedback is-hint';
    appendText('p', '', question.hint, feedback);
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'ai-tree-text-button';
    retry.textContent = '再观察一次';
    retry.addEventListener('click', () => feedback.replaceChildren());
    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'ai-tree-text-button';
    reveal.textContent = '查看答案';
    reveal.addEventListener('click', () => {
      highlightPart(question.targetHotspotId);
      showQuestionFeedback('answer', '目标部位已标出。', question, {showAnswer:true});
    });
    feedback.append(retry, reveal);
    return;
  }
  markCorrect(question);
  exploredParts.add(roomConfig.hotspots.find(part => part.id === partId)?.label || '模型部位');
  highlightPart(partId);
  showQuestionFeedback('correct', '找到了。目标部位已在模型上增强标记。', question, {showAnswer:true});
}

async function advanceQuestion() {
  if (questionRequestInFlight) return;
  $tree('#ai-tree-next-question').hidden = true;
  guideHistory = [];
  questionIndex += 1;
  selectedOption = '';
  activePart = '';
  $tree('#ai-tree-hotspot-card').hidden = true;
  highlightPart('');
  if (questionIndex >= 5) renderQuestion();
  else await requestAiQuestion(activation);
}

async function resetQuiz() {
  if (questionRequestInFlight) return;
  $tree('#ai-tree-next-question').hidden = true;
  guideHistory = [];
  guideAnswerVisibleIds = new Set();
  questionIndex = 0;
  score = 0;
  selectedOption = '';
  answeredQuestions = new Set();
  exploredParts = new Set();
  usedQuestionStems = [];
  if (roomConfig) roomConfig.questions = [];
  activePart = '';
  $tree('#ai-tree-hotspot-card').hidden = true;
  highlightPart('');
  rendererState?.reset?.();
  if (roomConfig) await requestAiQuestion(activation);
}

function showHotspotCard(part) {
  const card = $tree('#ai-tree-hotspot-card');
  const stage = $tree('#ai-tree-model-frame');
  const button = $tree(`[data-tree-hotspot="${part.id}"]`);
  if (!card || !button) return;
  activePart = part.id;
  $tree('#ai-tree-hotspot-kicker').textContent = '模型观察 · 数字素材待核';
  $tree('#ai-tree-hotspot-title').textContent = part.label;
  $tree('#ai-tree-hotspot-description').textContent = part.description;
  const targetAction = $tree('#ai-tree-hotspot-target');
  const question = currentQuestion();
  targetAction.hidden = question?.type !== 'hotspot';
  targetAction.textContent = `将「${part.label}」作为本题答案`;
  targetAction.onclick = () => evaluateHotspot(part.id);
  card.hidden = false;
  card.dataset.part = part.id;
  const frame = stage.getBoundingClientRect();
  const marker = button.getBoundingClientRect();
  const cardWidth = Math.min(300, frame.width - 24);
  const cardHeight = Math.min(card.offsetHeight || 210, frame.height - 24);
  const screenX = marker.left + marker.width / 2 - frame.left;
  const screenY = marker.top + marker.height / 2 - frame.top;
  const left = Math.max(12, Math.min(frame.width - cardWidth - 12, screenX > frame.width * .58 ? screenX - cardWidth - 20 : screenX + 20));
  const top = Math.max(12, Math.min(frame.height - cardHeight - 12, screenY - cardHeight / 2));
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
  highlightPart(part.id);
}

function highlightPart(id) {
  activePart = id;
  for (const [partId, button] of hotspotsById) {
    const isTarget = partId === id;
    button.classList.toggle('is-highlighted', isTarget);
    button.setAttribute('aria-pressed', String(partId === id));
  }
}

function guideContextText() {
  const question = currentQuestion();
  const selected = question?.options?.find(option => option.id === selectedOption)?.label || '尚未选择';
  const part = roomConfig?.hotspots.find(item => item.id === activePart)?.label || '尚未选择';
  const lines = [
    '展厅：三星堆青铜神树探索厅',
    `题目：${question?.prompt || '本轮题目已完成'}`,
    question?.options?.length ? `选项：${question.options.map(option => option.label).join('；')}` : '',
    `观众当前选择：${selected}`,
    `当前观察部位：${part}`
  ];
  if (question && guideAnswerVisibleIds.has(question.id)) {
    const answer = question.options?.find(option => option.id === question.answer)?.label || question.answer;
    lines.push(`已向观众展示的正确答案：${answer}`);
    if (question.explanation) lines.push(`题目解析：${question.explanation}`);
    if (question.sourceTitle) lines.push(`题目所列来源：${question.sourceTitle}${question.sourcePage ? `，${question.sourcePage}` : ''}`);
    if (question.evidenceQuote) lines.push(`题目证据摘录：${question.evidenceQuote}`);
  }
  return lines.filter(Boolean).join('\n');
}

function updateGuideContext(questionOverride = '') {
  const context = guideContextText();
  $tree('#ai-tree-guide-context').textContent = questionOverride ? `${context}\n当前追问：${questionOverride}` : context;
  return context;
}

function openGuide(question = '') {
  const dialog = $tree('#ai-tree-guide-dialog');
  if (!dialog) return;
  previousFocus = document.activeElement;
  updateGuideContext(question);
  if (question) $tree('#ai-tree-guide-input').value = `请结合这道题讲解：${question}`;
  if (!dialog.open) dialog.showModal();
  $tree('#ai-tree-guide-close').focus();
}

async function checkGuideService() {
  const status = $tree('#ai-tree-guide-status');
  try {
    const response = await fetch('/api/guide/status', {headers:{accept:'application/json'},cache:'no-store'});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || '讲解服务状态暂时无法读取。');
    guideServiceConfigured = payload.configured === true && payload.knowledgeReady === true;
    status.textContent = guideServiceConfigured
      ? '智谱讲解已连接。回答会检索本地 PDF 资料；证据不足时会明确说明无法确认。'
      : payload.configured === false
        ? '智谱服务尚未配置。请在服务端设置 ZHIPU_API_KEY 和 ZHIPU_TEXT_MODEL。'
        : '本地 PDF 知识库尚未就绪，暂时无法为答题提供讲解。';
  } catch (error) {
    guideServiceConfigured = false;
    status.textContent = `智谱讲解服务暂时不可用：${error.message}`;
  }
}

function renderGuideCitations(citations) {
  const answer = $tree('#ai-tree-guide-answer');
  answer.querySelector('.ai-tree-guide-answer-sources')?.remove();
  if (!citations?.length) return;
  const details = document.createElement('details');
  details.className = 'ai-tree-guide-answer-sources';
  const summary = document.createElement('summary');
  summary.textContent = `智谱检索来源（${citations.length}）`;
  details.append(summary);
  const list = document.createElement('ul');
  for (const citation of citations) {
    const item = document.createElement('li');
    const label = `${citation.title || '来源待核'} · ${citation.locator || (citation.pdfPage ? `PDF第${citation.pdfPage}页` : '页码待核')}${citation.status ? ` · ${citation.status}` : ''}`;
    if (typeof citation.url === 'string' && citation.url.startsWith('https://')) {
      const link = document.createElement('a');
      link.href = citation.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = label;
      item.append(link);
    } else item.textContent = label;
    if (citation.snippet) {
      const excerpt = document.createElement('small');
      excerpt.textContent = citation.snippet;
      item.append(excerpt);
    }
    list.append(item);
  }
  details.append(list);
  answer.append(details);
}

async function askGuide(question) {
  const text = String(question || '').trim();
  const status = $tree('#ai-tree-guide-status');
  const errorBox = $tree('#ai-tree-guide-unavailable');
  const answer = $tree('#ai-tree-guide-answer');
  const form = $tree('#ai-tree-guide-form');
  const submit = form.querySelector('button[type="submit"]');
  if (!text) {
    errorBox.textContent = '请先输入问题。';
    errorBox.hidden = false;
    return;
  }
  if (guideRequest) return;

  const controller = new AbortController();
  guideRequest = controller;
  const context = updateGuideContext();
  const contextTurn = {role:'user',content:`当前答题上下文（用于理解问题，不视为独立史实依据）：\n${context}`};
  const history = [...guideHistory,contextTurn].slice(-6);
  const current = currentQuestion();
  const visibleAnswer = current && guideAnswerVisibleIds.has(current.id);
  const retrievalQuestion = [
    '三星堆青铜神树',
    current?.prompt ? `题目：${current.prompt.slice(0,180)}` : '',
    visibleAnswer && current?.sourceTitle ? `来源：${current.sourceTitle}` : '',
    visibleAnswer && current?.evidenceQuote ? `证据：${current.evidenceQuote.slice(0,100)}` : '',
    `观众追问：${text.slice(0,180)}`
  ].filter(Boolean).join('；').slice(0,500);
  const controls = [...form.querySelectorAll('button'),...$tree('#ai-tree-guide-questions').querySelectorAll('button')];
  controls.forEach(button => { button.disabled = true; });
  submit.textContent = '正在讲解…';
  $tree('#ai-tree-guide-input').disabled = true;
  errorBox.hidden = true;
  answer.replaceChildren();
  answer.hidden = false;
  const questionLabel = appendText('p','ai-tree-guide-answer-question',`你的问题：${text}`,answer);
  const answerText = appendText('p','ai-tree-guide-answer-text','',answer);
  status.textContent = '正在检索本地 PDF 资料…';
  let responseText = '';
  let completed = false;
  try {
    const response = await fetch('/api/guide/query', {
      method:'POST',
      headers:{'content-type':'application/json','accept':'text/event-stream'},
      body:JSON.stringify({question:retrievalQuestion,history}),
      signal:controller.signal
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `讲解请求失败（${response.status}）。`);
    }
    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('智谱讲解服务没有返回流式响应。');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const handleFrame = frame => {
      let eventName = 'message';
      const dataLines = [];
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
      }
      if (!dataLines.length) return;
      const payload = JSON.parse(dataLines.join('\n'));
      if (eventName === 'status') status.textContent = payload.message || '智谱正在整理讲解…';
      else if (eventName === 'token') {
        responseText += payload.text || '';
        answerText.textContent = responseText;
      } else if (eventName === 'sources') renderGuideCitations(payload.citations || []);
      else if (eventName === 'error') throw new Error(payload.error || '智谱讲解服务暂时不可用。');
      else if (eventName === 'done') completed = true;
    };
    while (true) {
      const {value,done} = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(),{stream:!done});
      let boundary;
      while ((boundary = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const frame = buffer.slice(0,boundary);
        const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)[0];
        buffer = buffer.slice(boundary + separator.length);
        handleFrame(frame);
      }
      if (done) break;
    }
    if (buffer.trim()) handleFrame(buffer);
    if (!completed) throw new Error('讲解响应提前结束，请稍后重试。');
    guideHistory = [...history,{role:'user',content:text},{role:'assistant',content:responseText}].slice(-6);
    status.textContent = '讲解完成；展开下方来源可查看检索依据。';
    $tree('#ai-tree-guide-input').value = '';
  } catch (error) {
    if (error.name === 'AbortError') status.textContent = '本次讲解已取消。';
    else {
      answer.hidden = true;
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      status.textContent = '这次没有得到讲解回答，可以修改问题后重试。';
    }
  } finally {
    if (guideRequest === controller) guideRequest = null;
    controls.forEach(button => { button.disabled = false; });
    submit.textContent = '提交问题';
    $tree('#ai-tree-guide-input').disabled = false;
    questionLabel?.removeAttribute('aria-busy');
  }
}

function setupGuide() {
  const dialog = $tree('#ai-tree-guide-dialog');
  $tree('#ai-tree-guide-fab').addEventListener('click', () => openGuide());
  $tree('#ai-tree-guide-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (guideRequest) guideRequest.abort();
    previousFocus?.focus?.();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  $tree('#ai-tree-guide-questions').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button) void askGuide(button.textContent.trim());
  });
  $tree('#ai-tree-guide-form').addEventListener('submit', event => {
    event.preventDefault();
    void askGuide($tree('#ai-tree-guide-input').value);
  });
  void checkGuideService();
}

function buildHotspotAnchors(THREE, model, camera, controls, canvas, overlay) {
  const meshList = [];
  model.traverse(node => { if (node.isMesh) meshList.push(node); });
  if (!meshList.length) throw new Error('模型文件中没有可显示的网格。');
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  if (!size.x || !size.y || !size.z) throw new Error('模型的空间范围不完整。');
  const hitRay = new THREE.Raycaster();
  hotspotsById.clear();
  const anchors = [];
  for (const part of roomConfig.hotspots) {
    const x = box.min.x + size.x * part.position.u;
    const y = box.min.y + size.y * part.position.v;
    const origin = new THREE.Vector3(x, y, box.max.z + Math.max(size.z * .15, .08));
    hitRay.set(origin, new THREE.Vector3(0, 0, -1));
    const hit = hitRay.intersectObjects(meshList, false)[0];
    if (!hit) continue;
    const normalWorld = hit.normal.clone();
    const normalLocal = hit.object.worldToLocal(hit.point.clone().add(normalWorld)).sub(hit.object.worldToLocal(hit.point.clone())).normalize();
    const pointLocal = hit.object.worldToLocal(hit.point.clone().addScaledVector(normalWorld, .018));
    const anchor = {config:part, mesh:hit.object, point:pointLocal, normal:normalLocal};
    anchors.push(anchor);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ai-tree-hotspot';
    button.dataset.treeHotspot = part.id;
    button.setAttribute('aria-label', `查看模型部位：${part.label}`);
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = '<span aria-hidden="true"></span>';
    button.addEventListener('click', () => {
      showHotspotCard(part);
      if (currentQuestion()?.type === 'hotspot') evaluateHotspot(part.id);
    });
    overlay.append(button);
    hotspotsById.set(part.id, button);
  }
  if (!anchors.length) throw new Error('当前视角下无法在模型表面定位互动部位。');

  const world = new THREE.Vector3();
  const towardCamera = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const viewRay = new THREE.Raycaster();
  const place = () => {
    camera.updateMatrixWorld();
    model.updateMatrixWorld(true);
    for (const anchor of anchors) {
      const button = hotspotsById.get(anchor.config.id);
      world.copy(anchor.point);
      anchor.mesh.localToWorld(world);
      const projected = world.clone().project(camera);
      const frame = canvas.getBoundingClientRect();
      const visible = projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1;
      towardCamera.copy(camera.position).sub(world).normalize();
      worldNormal.copy(anchor.normal).transformDirection(anchor.mesh.matrixWorld);
      let visibleSurface = false;
      if (visible && worldNormal.dot(towardCamera) > .05) {
        viewRay.set(camera.position, towardCamera.clone().negate());
        viewRay.far = camera.position.distanceTo(world) + .05;
        const nearest = viewRay.intersectObjects(meshList, false)[0];
        visibleSurface = Boolean(nearest && nearest.point.distanceTo(world) < .045);
      }
      button.hidden = !visibleSurface;
      if (visibleSurface) {
        button.style.left = `${(projected.x + 1) * frame.width / 2}px`;
        button.style.top = `${(1 - projected.y) * frame.height / 2}px`;
      }
    }
    positionHotspotCard();
  };
  const positionHotspotCard = () => {
    const card = $tree('#ai-tree-hotspot-card');
    if (card.hidden || !activePart) return;
    const button = hotspotsById.get(activePart);
    if (!button || button.hidden) { card.hidden = true; return; }
    const frame = canvas.getBoundingClientRect();
    const marker = button.getBoundingClientRect();
    const cardWidth = Math.min(300, frame.width - 24);
    const cardHeight = Math.min(card.offsetHeight || 190, frame.height - 24);
    const sx = marker.left + marker.width / 2 - frame.left;
    const sy = marker.top + marker.height / 2 - frame.top;
    card.style.left = `${Math.max(12, Math.min(frame.width - cardWidth - 12, sx > frame.width * .58 ? sx - cardWidth - 18 : sx + 18))}px`;
    card.style.top = `${Math.max(12, Math.min(frame.height - cardHeight - 12, sy - cardHeight / 2))}px`;
  };
  return {place, anchors};
}

function disposeModel() {
  if (modelRequest?.abort) modelRequest.abort();
  modelRequest = null;
  rendererState?.dispose();
  rendererState = null;
  hotspotsById.clear();
  $tree('#ai-tree-hotspots').replaceChildren();
  $tree('#ai-tree-hotspots').hidden = true;
  $tree('#ai-tree-hotspot-card').hidden = true;
  $tree('#ai-tree-model-canvas').hidden = true;
  $tree('#ai-tree-model-fallback').hidden = false;
}

async function loadTreeModel(activationId) {
  disposeModel();
  const canvas = $tree('#ai-tree-model-canvas');
  const fallback = $tree('#ai-tree-model-fallback');
  const overlay = $tree('#ai-tree-hotspots');
  const message = $tree('#ai-tree-load-error');
  const retry = $tree('#ai-tree-model-retry');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  message.hidden = true;
  retry.hidden = true;
  setModelStatus('正在读取青铜树数字模型素材。');
  try {
    const [THREE, {FBXLoader}, {OrbitControls}] = await Promise.all([
      import('three'),
      import('three/addons/loaders/FBXLoader.js'),
      import('three/addons/controls/OrbitControls.js')
    ]);
    if (activationId !== activation || !document.body.classList.contains('ai-tree-room-mode')) return;
    const manager = new THREE.LoadingManager();
    let textureError = '';
    manager.onError = url => { textureError = `模型贴图读取失败：${url.split('/').pop() || '未知贴图'}。`; };
    const loader = new FBXLoader(manager);
    loader.setResourcePath(roomConfig.model.resourcePath);
    const model = await new Promise((resolve, reject) => {
      modelRequest = loader.load(roomConfig.model.url, resolve, event => {
        if (event.lengthComputable && event.total) setModelStatus(`正在载入青铜树数字模型 · ${Math.round(event.loaded / event.total * 100)}%`);
        else setModelStatus('正在载入青铜树数字模型。');
      }, reject);
    });
    if (activationId !== activation || !document.body.classList.contains('ai-tree-room-mode')) {
      model.traverse(node => { if (node.isMesh) { node.geometry.dispose(); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) mat?.dispose?.(); } });
      return;
    }
    const beforeBox = new THREE.Box3().setFromObject(model);
    const beforeSize = beforeBox.getSize(new THREE.Vector3());
    if (beforeSize.z > beforeSize.y * 1.5) model.rotation.x = -Math.PI / 2;
    else if (beforeSize.x > beforeSize.y * 1.5) model.rotation.z = Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    if (size.y < .01) throw new Error('模型高度过小，无法设置合适的展陈视角。');
    const scale = 4.65 / size.y;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale - 1.65, -center.z * scale);
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = false;
      node.receiveShadow = false;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if (material) {
          material.side = THREE.DoubleSide;
          material.needsUpdate = true;
        }
      }
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 120);
    camera.position.set(0, .7, 8.8);
    scene.add(new THREE.HemisphereLight(0xf0e9dc, 0x172019, 2));
    const key = new THREE.DirectionalLight(0xf0dfbd, 2.3);
    key.position.set(-3, 5, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x728776, 1.5);
    fill.position.set(4, 1, -4);
    scene.add(fill);
    const rim = new THREE.PointLight(0xa9854b, 11, 14);
    rim.position.set(0, 3.4, -2.4);
    scene.add(rim);
    scene.add(model);

    const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !reduceMotion;
    controls.dampingFactor = .07;
    controls.enablePan = false;
    controls.minDistance = 4.8;
    controls.maxDistance = 13;
    controls.target.set(0, .65, 0);
    controls.update();
    const hotspotState = buildHotspotAnchors(THREE, model, camera, controls, canvas, overlay);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false);
      hotspotState.place();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);
    canvas.hidden = false;
    fallback.hidden = true;
    overlay.hidden = false;
    resize();
    let frame = 0;
    let visibilityFrame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      if (++visibilityFrame % 2 === 0) hotspotState.place();
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    rendererState = {
      reset:() => {
        controls.reset();
        controls.target.set(0, .65, 0);
        controls.update();
        hotspotState.place();
      },
      dispose:() => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        controls.dispose();
        model.traverse(node => {
          if (!node.isMesh) return;
          node.geometry.dispose();
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            material?.map?.dispose?.();
            material?.dispose?.();
          }
        });
        renderer.dispose();
      }
    };
    setModelStatus(roomConfig.model.identityNote);
    if (textureError) {
      message.textContent = `${textureError}模型本体仍可观察。`;
      message.hidden = false;
    }
    $tree('#ai-tree-model-hint').textContent = reduceMotion ? '拖动观察 · 已减少动态效果' : '拖动旋转 · 滚轮或双指缩放';
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (activationId !== activation) return;
    fallback.hidden = false;
    canvas.hidden = true;
    overlay.hidden = true;
    const detail = `3D 模型暂时无法显示：${error?.message || '加载失败'}。背景场景图仍可浏览。`;
    setModelStatus(detail);
    message.textContent = detail;
    message.hidden = false;
    retry.hidden = false;
  }
}

async function loadRoom(activationId) {
  const startQuiz = $tree('#ai-tree-quiz-open');
  startQuiz.disabled = true;
  startQuiz.innerHTML = '正在准备答题… <span aria-hidden="true">↗</span>';
  const quizLoading = $tree('#ai-tree-quiz-loading');
  const quizBody = $tree('#ai-tree-quiz-body');
  quizLoading.hidden = false;
  quizLoading.textContent = '正在读取互动题目…';
  quizBody.hidden = true;
  const image = $tree('.ai-tree-background');
  image.onerror = () => {
    $tree('#ai-tree-load-error').textContent = '场景图暂时无法读取；3D 模型和互动仍可继续使用。';
    $tree('#ai-tree-load-error').hidden = false;
  };
  try {
    const response = await fetch('/assets/ai-exhibition/tree-room-content.json', {cache:'no-cache'});
    if (!response.ok) throw new Error(`内容配置读取失败（${response.status}）。`);
    const config = await response.json();
    if (activationId !== activation) return;
    if (config.roomId !== 'tree' || !Array.isArray(config.questions) || !Array.isArray(config.hotspots)) throw new Error('空间内容配置格式不正确。');
    const evidence = await loadCatalogEvidence(config.evidenceArtifactId);
    config.catalogArtifact = evidence.record;
    config.sources = config.sources.map(source => source.id === evidence.source.source_id ? {
      ...source,
      title:evidence.source.title,
      url:evidence.source.url,
      locator:evidence.source.locator,
      recordStatus:evidence.record.record_status
    } : source);
    roomConfig = config;
    roomConfig.questions = [];
    renderGuideSources();
    startQuiz.disabled = false;
    startQuiz.innerHTML = '开始答题 <span aria-hidden="true">↗</span>';
    await loadTreeModel(activationId);
  } catch (error) {
    if (activationId !== activation) return;
    roomConfig = null;
    quizLoading.textContent = `互动资料暂时无法读取：${error.message}`;
    startQuiz.disabled = false;
    startQuiz.innerHTML = '查看答题状态 <span aria-hidden="true">↗</span>';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'ai-tree-retry';
    retry.textContent = '重新读取';
    retry.addEventListener('click', () => loadRoom(activation));
    quizLoading.append(retry);
    setModelStatus('互动题目配置未读取，模型暂不加载。');
  }
}

function activateTreeRoom() {
  if (!document.body.classList.contains('ai-tree-room-mode')) return;
  activation += 1;
  questionRequestSerial += 1;
  questionRequestInFlight = false;
  questionIndex = 0;
  usedQuestionStems = [];
  score = 0;
  selectedOption = '';
  answeredQuestions = new Set();
  exploredParts = new Set();
  guideHistory = [];
  guideAnswerVisibleIds = new Set();
  activePart = '';
  loadRoom(activation);
}

function deactivateTreeRoom() {
  activation += 1;
  if ($tree('#ai-tree-quiz-dialog')?.open) $tree('#ai-tree-quiz-dialog').close();
  $tree('#ai-tree-guide-dialog')?.open && $tree('#ai-tree-guide-dialog').close();
  disposeModel();
}

$tree('#ai-tree-quiz-open').addEventListener('click', () => {
  const dialog = $tree('#ai-tree-quiz-dialog');
  if (!dialog.open) dialog.showModal();
  if (roomConfig && roomConfig.questions.length === 0 && !questionRequestInFlight) {
    void requestAiQuestion(activation);
  }
});
$tree('#ai-tree-quiz-close').addEventListener('click', () => $tree('#ai-tree-quiz-dialog').close());
$tree('#ai-tree-next-question').addEventListener('click', () => { void advanceQuestion(); });
$tree('#ai-tree-quiz-dialog').addEventListener('click', event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
$tree('#ai-tree-quiz-dialog').addEventListener('close', () => {
  const start = $tree('#ai-tree-quiz-open');
  start.textContent = roomConfig?.questions.length ? '继续答题 ↗' : '开始答题 ↗';
  start.focus({preventScroll:true});
});
$tree('#ai-tree-model-retry').addEventListener('click', () => loadTreeModel(activation));
$tree('#ai-tree-model-reset').addEventListener('click', () => rendererState?.reset?.());
$tree('#ai-tree-hotspot-close').addEventListener('click', () => {
  $tree('#ai-tree-hotspot-card').hidden = true;
  activePart = '';
  highlightPart('');
});
$tree('#ai-tree-stage').addEventListener('click', event => {
  if (event.target.closest('.ai-tree-hotspot, .ai-tree-hotspot-card, .ai-tree-model-controls, .ai-tree-model-caption')) return;
  $tree('#ai-tree-hotspot-card').hidden = true;
  activePart = '';
  highlightPart('');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$tree('#ai-tree-guide-dialog').open) {
    $tree('#ai-tree-hotspot-card').hidden = true;
    activePart = '';
    highlightPart('');
  }
});
setupGuide();
window.addEventListener('ai-tree-room:activate', activateTreeRoom);
window.addEventListener('ai-tree-room:deactivate', deactivateTreeRoom);
window.addEventListener('ai-exhibition:reset', resetQuiz);
if (document.body.classList.contains('ai-tree-room-mode')) activateTreeRoom();
