(() => {
  const storageKey = 'sanxingdui-learning-origins-v1';
  const params = () => new URLSearchParams(location.search);
  let data = null;
  let loading = null;
  let active = false;
  let assignments = {};
  let readingComplete = false;
  let readingIndex = 0;
  let phase = 1;
  let evidenceOrder = [];
  let activeEvidenceId = null;
  let selectedEvidenceTier = null;
  let evidenceSubmitted = false;
  let judgmentChoices = {};
  let judgmentSubmitted = {};
  let sortDialogMode = '';
  let returnFocus = null;
  let placeStage = 1;
  let placeReadingIndex = 0;
  let placeReadingComplete = false;
  let placeAssignments = {};
  let placeCardOrder = [];
  let activePlaceCardId = null;
  let selectedPlaceCategory = null;
  let placeAnswerSubmitted = false;
  let placeReviewOpen = false;
  let placeReturnFocus = null;
  let selectedScope = null;
  let scopeLayerVisibility = new Set();
  let scopeLayerTouched = false;
  let scopeReflectionAnswers = new Set();
  let scopeReflectionSubmitted = false;
  let record = {discovery:'', evidence:'', nameChange:'', question:''};
  let recordSaveTimer = null;
  let assistantTaskId = 'discovery';
  let activeJudgmentId = '';
  let assistantPreview = null;
  let assistantSelection = null;
  let assistantContextKey = '';

  const $ = selector => document.querySelector(selector);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const pdfLocation = pages => `《三星堆之惑》PDF 页序 ${pages}；书内印刷页码未逐项确认。`;
  const pill = text => make('span', 'learning-source-pill', text);
  const setHidden = (node, hidden) => { if (node) node.hidden = hidden; };

  function readLocalRecord(remoteRecord) {
    try {
      const saved = remoteRecord === undefined ? JSON.parse(localStorage.getItem(storageKey) || '{}') : (remoteRecord || {});
      record = {...record, ...(saved.record || {})};
      readingIndex = Number.isInteger(saved.readingIndex) && saved.readingIndex >= 0 ? saved.readingIndex : 0;
      if (saved.schemaVersion >= 2) {
        assignments = saved.assignments && typeof saved.assignments === 'object' ? saved.assignments : {};
        readingComplete = Boolean(saved.readingComplete);
        phase = [1,2,3].includes(saved.phase) ? saved.phase : 1;
        evidenceOrder = Array.isArray(saved.evidenceOrder) ? saved.evidenceOrder : [];
        judgmentChoices = saved.judgmentChoices && typeof saved.judgmentChoices === 'object' ? saved.judgmentChoices : {};
        judgmentSubmitted = saved.judgmentSubmitted && typeof saved.judgmentSubmitted === 'object' ? saved.judgmentSubmitted : {};
      }
      if (saved.schemaVersion >= 3) {
        placeStage = [1,2,3].includes(saved.placeStage) ? saved.placeStage : 1;
        placeReadingIndex = Number.isInteger(saved.placeReadingIndex) && saved.placeReadingIndex >= 0 ? saved.placeReadingIndex : 0;
        placeReadingComplete = Boolean(saved.placeReadingComplete);
        placeAssignments = saved.placeAssignments && typeof saved.placeAssignments === 'object' ? saved.placeAssignments : {};
        placeCardOrder = Array.isArray(saved.placeCardOrder) ? saved.placeCardOrder : [];
      }
      selectedScope = saved.selectedScope || null;
    } catch {
      $('#learning-local-status').textContent = '无法读取本机保存内容；本页仍可继续使用。';
    }
  }

  function saveLocalRecord(message = '已保存在本机浏览器。') {
    const snapshot = {schemaVersion:3, record, assignments, readingComplete, readingIndex, phase, evidenceOrder, judgmentChoices, judgmentSubmitted, placeStage, placeReadingIndex, placeReadingComplete, placeAssignments, placeCardOrder, selectedScope, savedAt:new Date().toISOString()};
    try {
      const savedMessage = window.AccountData?.authenticated ? '研学记录已保存' : message;
      const saving = window.LearningProgress
        ? window.LearningProgress.save('learning_origins', snapshot, storageKey, savedMessage)
        : (localStorage.setItem(storageKey, JSON.stringify(snapshot)), Promise.resolve(snapshot));
      return Promise.resolve(saving)
        .then(() => { $('#learning-local-status').textContent = window.AccountData?.authenticated ? '进度与记录已同步到当前账号。' : '进度与记录已保存在本机浏览器。'; })
        .catch(error => { $('#learning-local-status').textContent = `保存失败：${error.message || '请重试。'}`; return false; });
    } catch {
      $('#learning-local-status').textContent = '浏览器未允许本机保存；可以继续填写并打印。';
      return Promise.resolve(false);
    }
  }

  async function loadData() {
    if (data) return data;
    if (!loading) {
      loading = (async () => {
        const manifestResponse = await fetch('/data/manifest.json', {cache:'no-cache'});
        if (!manifestResponse.ok) throw new Error(`数据清单读取失败（HTTP ${manifestResponse.status}）`);
        const manifest = await manifestResponse.json();
        const item = manifest.files?.find(entry => entry.path === 'learning/origins.json');
        if (!item?.url) throw new Error('数据清单中没有 learning/origins.json。');
        const response = await fetch(item.url);
        if (!response.ok) throw new Error(`主题资料读取失败（HTTP ${response.status}）`);
        data = await response.json();
        return data;
      })().catch(error => { loading = null; throw error; });
    }
    return loading;
  }

  function makeSourceLine(source, year, locator, note = '') {
    const line = make('div', 'learning-source-line');
    const main = make('div', 'learning-source-line-main');
    main.append(make('b', '', source), make('span', '', year ? `发表/记录：${year}` : '年份：书中未详'), make('small', '', pdfLocation(locator)));
    line.append(main);
    if (note) line.append(make('p', '', note));
    return line;
  }

  function renderPlaceSources() {
    const host = $('#learning-place-sources');
    host.replaceChildren();
    (data.place_sources || []).forEach(source => host.append(makeSourceLine(source.title, source.year, source.locator, source.note)));
  }

  function renderScopeSources() {
    const host = $('#learning-scope-sources');
    host.replaceChildren();
    data.scope_claims.forEach(item => host.append(makeSourceLine(item.source_name, item.year, item.book_pdf_pages, `原文说法：“${item.original_claim||item.label}” ${item.evidence}`)));
    host.append(make('p', 'learning-method-note', '面积对照中的每个大格代表 1 平方公里，并细分为 10 × 10 小格。1985 年的 1.6–2.4 平方公里是依据书中长宽范围相乘得到的估算；“以上”只画出来源提供的下限，“约”仍保留近似含义。面积单元不表示实际地理形状或精确边界。'));
  }

  function renderPhaseProgress() {
    document.querySelectorAll('#learning-phase-progress [data-phase]').forEach(step => {
      const number = Number(step.dataset.phase);
      step.classList.toggle('is-current', number === phase);
      step.classList.toggle('is-complete', number < phase);
      if (number === phase) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
    });
  }

  function renderReading() {
    if (!data?.reading_sections?.length) return;
    const sections = data.reading_sections;
    readingIndex = Math.min(readingIndex, sections.length - 1);
    const item = sections[readingIndex];
    $('#learning-reading-progress').textContent = '阅读资料 ' + (readingIndex + 1) + ' / ' + sections.length + ' · PDF 页序 ' + item.pdf_pages;
    $('#learning-reading-title').textContent = item.title;
    const host = $('#learning-reading-passages');
    host.replaceChildren();
    item.passages.forEach((passage, index) => {
      const figure = make('figure', 'learning-reading-passage');
      figure.dataset.assistantMaterialId = `reading:${item.id}`;
      const quote=make('blockquote', '', passage.text);quote.dataset.assistantSelectableMaterial=item.id;figure.append(quote);
      const caption = make('figcaption', 'learning-reading-citation');
      caption.append(make('b', '', passage.attribution), make('span', '', passage.source));
      const details = make('div', 'learning-reading-source-detail', (passage.chapter || '第一章') + ' · ' + passage.locator + ' · ' + (passage.source_time || '来源时间：书中未详'));
      details.hidden = true;
      const toggle = make('button', 'learning-source-toggle', '查看出处');
      toggle.type = 'button'; toggle.dataset.readingSource = ''; toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', () => {
        details.hidden = !details.hidden;
        toggle.textContent = details.hidden ? '查看出处' : '收起出处';
        toggle.setAttribute('aria-expanded', String(!details.hidden));
      });
      caption.append(toggle, details);
      figure.append(caption);
      if (index > 0) figure.classList.add('has-separator');
      host.append(figure);
    });
    $('#learning-reading-tip').textContent = item.reading_tip;
    $('#learning-reading-prev').disabled = readingIndex === 0;
    $('#learning-reading-next').textContent = readingIndex === sections.length - 1 ? '进入证据室' : '继续阅读';
    $('#learning-reading-stage').hidden = phase !== 1;
    $('#learning-sort-stage').hidden = phase !== 2;
    $('#learning-judgment-stage').hidden = phase !== 3;
    renderPhaseProgress();
    updateProgress();
  }

  function openSortDialog(mode) {
    sortDialogMode = mode;
    returnFocus = document.activeElement;
    $('#learning-sort-overlay').hidden = false;
    document.body.classList.add('learning-sort-open');
    renderSortDialog();
    requestAnimationFrame(() => $('#learning-sort-dialog')?.focus());
  }

  function closeSortDialog() {
    $('#learning-sort-overlay').hidden = true;
    document.body.classList.remove('learning-sort-open');
    $('#learning-sort-dialog-content').replaceChildren();
    if (sortDialogMode === 'active') { selectedEvidenceTier = null; evidenceSubmitted = false; }
    const focus = returnFocus;
    returnFocus = null;
    if (focus?.isConnected) focus.focus();
  }

  function createFlyingCard() {
    const card = document.querySelector('#learning-sort-dialog-content .learning-source-float-card');
    if (!card) return null;
    const rect = card.getBoundingClientRect();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return rect;
    const clone = card.cloneNode(true);
    clone.classList.add('learning-sort-fly');
    Object.assign(clone.style, {left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px'});
    document.body.append(clone);
    return rect;
  }

  function animateCardToYear(originRect, tierId) {
    if (!originRect || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = [...document.querySelectorAll('[data-evidence-lane]')].find(node => node.dataset.evidenceLane === tierId)?.querySelector('.learning-card-stack');
    const source = document.querySelector('.learning-sort-fly');
    if (!target || !source) { source?.remove(); return; }
    const rect = target.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - (originRect.left + originRect.width / 2);
    const dy = rect.top + rect.height / 2 - (originRect.top + originRect.height / 2);
    const animation = source.animate([{transform:'translate(0,0) scale(1) rotateY(0)',opacity:1},{transform:'translate(' + dx + 'px,' + dy + 'px) scale(.16) rotateY(180deg)',opacity:.45}], {duration:430,easing:'cubic-bezier(.2,.72,.25,1)'});
    animation.onfinish = () => source.remove(); animation.oncancel = () => source.remove();
  }

  function renderActiveClaim() {
    const previewing = assistantPreview?.kind === 'evidence';
    const item = data.evidence_cards.find(card => card.id === (previewing ? assistantPreview.materialId : activeEvidenceId));
    const host = $('#learning-sort-dialog-content');
    host.replaceChildren();
    if (!item) return closeSortDialog();
    host.append(make('p', 'learning-modal-kicker', '证据卡 ' + (Object.keys(assignments).length + 1) + ' / ' + data.evidence_cards.length));
    const title = make('h2', 'learning-modal-title', '这些材料分别能证明什么？'); title.id = 'learning-sort-dialog-title'; host.append(title);
    const detail = make('article', 'learning-source-float-card');
    const tags = make('div', 'learning-card-tags', '');
    tags.append(pill(item.event), pill(item.material_type));
    const excerpt=make('p', 'learning-floating-excerpt', item.excerpt);excerpt.dataset.assistantSelectableMaterial=item.id;
    detail.append(tags, excerpt, make('b', 'learning-floating-source', item.source_name), make('p', 'learning-floating-meta', '资料形成时间：' + item.source_time + ' · ' + item.attribution + ' · ' + item.locator));
    host.append(detail, make('p', 'learning-choice-prompt', '请选择最符合这条材料证据性质的档位。'));
    if (previewing) {
      host.lastChild.textContent = '材料回看模式：只展示原始线索，不会提交或改变分类。';
      const close = make('button', 'button button-outline', '关闭材料回看'); close.type = 'button'; close.dataset.sortClose = ''; host.append(close);
      return;
    }
    const choices = make('div', 'learning-year-choices learning-tier-choices');
    choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', '选择证据档位');
    data.evidence_tiers.forEach(tier => {
      const button = make('button', 'learning-year-choice learning-tier-choice' + (selectedEvidenceTier === tier.id ? ' is-selected' : ''), tier.label);
      button.type = 'button'; button.dataset.evidenceTier = tier.id;
      button.disabled = evidenceSubmitted;
      button.setAttribute('aria-pressed', String(selectedEvidenceTier === tier.id));
      choices.append(button);
    });
    host.append(choices);
    if (!evidenceSubmitted) {
      const submit = make('button', 'button button-gold learning-evidence-submit', '提交分类');
      submit.type = 'button'; submit.dataset.evidenceSubmit = ''; submit.disabled = !selectedEvidenceTier; host.append(submit);
      return;
    }
    const correct = selectedEvidenceTier === item.correct_tier;
    const feedback = make('section', 'learning-sort-feedback ' + (correct ? 'is-correct' : 'is-incorrect'));
    feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.tabIndex = -1;
    feedback.append(make('b', '', correct ? '✓ 分类符合材料' : '↻ 再核对一下'), make('p', '', item.rationale), make('small', '', item.source_name + ' · ' + item.locator));
    host.append(feedback);
    const actions = make('div', 'learning-dialog-actions');
    if (!correct) { const retry = make('button', 'button button-outline', '重新选择档位'); retry.type = 'button'; retry.dataset.evidenceRetry = ''; actions.append(retry); }
    const collect = make('button', 'button button-gold', correct ? '收进这个档位' : '仍然收入所选档位');
    collect.type = 'button'; collect.dataset.evidenceCollect = ''; actions.append(collect); host.append(actions);
    requestAnimationFrame(() => feedback.focus());
  }

  function renderSortReview(tierId = null) {
    const host = $('#learning-sort-dialog-content'); host.replaceChildren();
    const tier = data.evidence_tiers.find(item => item.id === tierId);
    const rows = data.evidence_cards.filter(card => assignments[card.id] && (!tierId || assignments[card.id] === tierId));
    host.append(make('p', 'learning-modal-kicker', '翻开卡堆复盘'));
    const title = make('h2', 'learning-modal-title', tier ? tier.label + ' · ' + rows.length + ' 张证据卡' : '全部证据卡复盘');
    title.id = 'learning-sort-dialog-title'; host.append(title);
    if (!rows.length) host.append(make('p', 'learning-empty-review', '这个档位目前没有卡片。'));
    rows.forEach(item => {
      const chosen = data.evidence_tiers.find(entry => entry.id === assignments[item.id]);
      const correct = assignments[item.id] === item.correct_tier;
      const card = make('article', 'learning-review-card ' + (correct ? 'is-correct' : 'is-incorrect'));
      card.append(make('div', 'learning-review-card-top', ''), make('p', 'learning-floating-excerpt', item.excerpt), make('b', 'learning-floating-source', item.source_name));
      card.querySelector('.learning-review-card-top').append(pill(item.event), make('strong', '', (correct ? '✓ 分类符合材料' : '↻ 选择有误') + ' · 你放入「' + (chosen?.label || '未知档位') + '」'));
      card.append(make('p', 'learning-review-answer', '应归入「' + data.evidence_tiers.find(entry => entry.id === item.correct_tier)?.label + '」。' + item.rationale), make('small', '', item.material_type + ' · ' + item.attribution + ' · ' + item.locator));
      host.append(card);
    });
    const close = make('button', 'button button-gold', '合上卡堆'); close.type = 'button'; close.dataset.sortClose = ''; host.append(close);
  }

  function renderSortDialog() {
    if (sortDialogMode === 'review') renderSortReview(null);
    else if (sortDialogMode.startsWith('review:')) renderSortReview(sortDialogMode.slice(7));
    else renderActiveClaim();
  }

  function renderJudgment() {
    const host = $('#learning-judgment-questions'); host.replaceChildren();
    data.judgment_questions.forEach(question => {
      const card = make('article', 'learning-judgment-card');
      card.append(make('p', 'learning-task-number', question.id === 'discovery' ? '判断一　/　发现年份' : '判断二　/　首次试掘'), make('h4', '', question.prompt));
      const options = make('div', 'learning-judgment-options'); options.setAttribute('role', 'group'); options.setAttribute('aria-label', question.prompt);
      question.options.forEach(option => {
        const selected = judgmentChoices[question.id] === option;
        const button = make('button', 'learning-judgment-option' + (selected ? ' is-selected' : ''), option);
        button.type = 'button'; button.dataset.judgmentChoice = question.id; button.dataset.option = option; button.setAttribute('aria-pressed', String(selected)); button.disabled = Boolean(judgmentSubmitted[question.id]); options.append(button);
      });
      card.append(options);
      if (!judgmentSubmitted[question.id]) {
        const submit = make('button', 'button button-gold', '提交判断'); submit.type = 'button'; submit.dataset.submitJudgment = question.id; submit.disabled = !judgmentChoices[question.id]; card.append(submit);
      } else {
        const correct = judgmentChoices[question.id] === question.correct;
        const feedback = make('section', 'learning-judgment-feedback ' + (correct ? 'is-aligned' : 'is-misaligned'));
        feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.tabIndex = -1;
        feedback.append(make('b', '', (correct ? '✓ 符合本书论证' : '↻ 与本书论证不符') + ' · 本书作者的判断'), make('p', '', question.rationale), make('blockquote', '', question.reasoning_excerpt), make('small', '', question.reasoning_locator));
        card.append(feedback);
      }
      host.append(card);
    });
    const complete = data.judgment_questions.every(question => judgmentSubmitted[question.id]);
    const summary = $('#learning-judgment-complete'); summary.replaceChildren(); summary.hidden = !complete;
    if (complete) {
      const score = data.judgment_questions.filter(question => judgmentChoices[question.id] === question.correct).length;
      summary.append(pill('判断完成'), make('h3', '', '两题答对 ' + score + ' / ' + data.judgment_questions.length));
      const counts = make('div', 'learning-review-counts');
      data.evidence_tiers.forEach(tier => counts.append(make('span', '', tier.label + '：' + data.evidence_cards.filter(card => assignments[card.id] === tier.id).length + ' 张')));
      summary.append(counts, make('p', '', '证据卡可逐档翻开复盘；打印记录包含你的归类、作答和引用来源。'));
      const conclusion = make('blockquote', 'learning-author-judgment', data.judgment_questions[0].author_conclusion);
      conclusion.prepend(pill('本书作者总结原文'));
      conclusion.append(make('small', '', data.judgment_questions[0].author_conclusion_locator + '。这是本书作者的判断，不是无争议定论。'));
      summary.append(conclusion);
      const review = make('button', 'button button-outline', '翻开证据卡复盘'); review.type = 'button'; review.dataset.reviewAll = ''; summary.append(review);
      const redo = make('button', 'button button-outline', '重新挑战'); redo.type = 'button'; redo.dataset.sortRedo = ''; summary.append(redo);
      const read = make('button', 'text-button', '返回阅读资料'); read.type = 'button'; read.dataset.returnReading = ''; summary.append(read);
    }
    renderPhaseProgress(); updateProgress(); renderPrintSummary(); saveLocalRecord('发现史互动进度已保存在本机浏览器。');
  }

  function renderPrintSummary() {
    const host = $('#learning-discovery-print-summary');
    if (!host || !data) return;
    host.replaceChildren(make('h2', '', '发现史互动记录'));
    host.append(make('p', '', '阅读资料完成：' + (readingComplete ? '是' : '否') + '；证据卡整理：' + Object.keys(assignments).length + '/' + data.evidence_cards.length + '。'));
    const list = make('ol', '');
    data.evidence_cards.forEach(item => {
      const chosen = data.evidence_tiers.find(tier => tier.id === assignments[item.id]);
      const expected = data.evidence_tiers.find(tier => tier.id === item.correct_tier);
      const review = chosen ? '你的归类：' + chosen.label + '；建议归档：' + expected.label + '。' + item.rationale : '尚未整理；分类解析在提交后显示。';
      list.append(make('li', '', item.event + '｜' + review + '｜' + item.source_name + '，' + item.locator));
    });
    host.append(list);
    data.judgment_questions.forEach(question => {
      host.append(make('h3', '', question.prompt), make('p', '', '你的选择：' + (judgmentChoices[question.id] || '未作答') + '。' + (judgmentSubmitted[question.id] ? question.rationale : '尚未提交；答案解析未显示。')));
    });
    if (data.judgment_questions.every(question => judgmentSubmitted[question.id])) host.append(make('blockquote', '', data.judgment_questions[0].author_conclusion), make('small', '', data.judgment_questions[0].author_conclusion_locator + '；本书作者判断，不是无争议定论。'));
    host.append(make('h2', '', '辨认地名互动记录'));
    host.append(make('p', '', `原始资料阅读：${placeReadingComplete ? '已完成' : '未完成'}；名称卡：${Object.keys(placeAssignments).length} / ${(data.place_cards || []).length}。`));
    const placeList=make('ol','');
    (data.place_cards||[]).forEach(card=>{
      const assigned=placeAssignments[card.id];
      const status=assigned ? `你的归类：${categoryLabel(assigned)}；资料判断：${categoryLabel(card.correct_category)}。${assigned===card.correct_category?'符合资料语境。':'需要再核对。'} ${card.rationale}` : '尚未完成；答案解析未显示。';
      placeList.append(make('li','',`${card.name}｜${status}｜${card.source_name}，${card.locator}`));
    });
    host.append(placeList);
  }

  function renderClaims() {
    if (!data) return;
    const allowed = new Set(data.evidence_tiers.map(tier => tier.id));
    assignments = Object.fromEntries(data.evidence_cards.filter(card => allowed.has(assignments[card.id])).map(card => [card.id, assignments[card.id]]));
    if (!readingComplete) phase = 1;
    if (phase === 3 && Object.keys(assignments).length !== data.evidence_cards.length) phase = 2;
    evidenceOrder = evidenceOrder.filter(id => data.evidence_cards.some(card => card.id === id));
    if (evidenceOrder.length !== data.evidence_cards.length) evidenceOrder = [...data.evidence_cards].sort(() => Math.random() - .5).map(card => card.id);
    $('#learning-reading-stage').hidden = phase !== 1;
    $('#learning-sort-stage').hidden = phase !== 2;
    $('#learning-judgment-stage').hidden = phase !== 3;
    renderPhaseProgress();
    if (phase === 1) { renderReading(); return; }
    if (phase === 3) { renderJudgment(); renderReading(); return; }
    const lanes = $('#learning-year-lanes'); lanes.replaceChildren();
    const allAssigned = Object.keys(assignments).length === data.evidence_cards.length;
    data.evidence_tiers.forEach(tier => {
      const rows = data.evidence_cards.filter(card => assignments[card.id] === tier.id);
      const lane = make('section', 'learning-year-lane learning-evidence-lane'); lane.dataset.evidenceLane = tier.id;
      lane.setAttribute('aria-label', tier.label + '，' + rows.length + ' 张卡片');
      const heading = make('div', 'learning-year-lane-heading'); heading.append(make('h4', '', tier.label), make('span', '', rows.length + ' 张'));
      const stack = make('button', 'learning-card-stack' + (rows.length ? ' has-cards' : '')); stack.type = 'button'; stack.disabled = !rows.length || !allAssigned; stack.dataset.reviewTier = tier.id; stack.setAttribute('aria-label', rows.length ? '翻开' + tier.label + '的' + rows.length + '张卡片复盘' : tier.label + '为空');
      const back = make('span', 'learning-card-back', '');
      for (let index = Math.min(rows.length, 4) - 1; index >= 0; index--) { const layer = make('i', 'learning-card-back-layer layer-' + (index + 1)); layer.setAttribute('aria-hidden', 'true'); back.append(layer); }
      back.append(rows.length ? make('b', '', '×' + rows.length) : make('span', 'learning-empty-slot', '空档')); stack.append(back);
      lane.append(heading, stack, make('small', 'learning-year-lane-state', rows.length ? '背面朝上 · 点击复盘' : '空档')); lanes.append(lane);
    });
    const count = Object.keys(assignments).length;
    $('#learning-sort-status').textContent = '已整理 ' + count + ' / ' + data.evidence_cards.length;
    $('#learning-sort-score-live').textContent = '答案与分类反馈在提交后逐张显示';
    $('#learning-sort-start').textContent = allAssigned ? '进入判断' : '打开下一张证据卡';
    $('#learning-sort-reset').hidden = count === 0;
    const summary = $('#learning-sort-complete'); summary.replaceChildren(); summary.hidden = !allAssigned;
    if (allAssigned) {
      summary.append(pill('证据卡已整理'), make('h3', '', '可以开始形成判断'), make('p', '', '分类结果将在最终复盘中逐张展开。'));
      const enter = make('button', 'button button-gold', '进入判断'); enter.type = 'button'; enter.dataset.enterJudgment = ''; summary.append(enter);
      const review = make('button', 'button button-outline', '翻开全部卡堆复盘'); review.type = 'button'; review.dataset.reviewAll = ''; summary.append(review);
    }
    renderPhaseProgress(); updateProgress(); renderPrintSummary(); saveLocalRecord('证据整理进度已保存在本机浏览器。');
  }

  function renderPlaces() {
    const reading = $('#learning-place-reading');
    const sorting = $('#learning-place-sorting');
    const complete = $('#learning-place-complete');
    if (!reading || !sorting || !complete) return;
    if (!placeReadingComplete) placeStage = 1;
    const allDone = isPlaceComplete();
    if (placeStage === 3 && !allDone) placeStage = 2;
    reading.hidden = placeStage !== 1;
    sorting.hidden = placeStage !== 2;
    complete.hidden = placeStage !== 3;
    renderPlacePhaseProgress();

    if (placeStage === 1) renderPlaceReading();
    if (placeStage === 2) renderPlaceSorting();
    if (placeStage === 3) renderPlaceCompletion();
    updateProgress();
    renderPrintSummary();
  }

  function isPlaceComplete() {
    return Boolean(data?.place_cards?.length) && data.place_cards.every(card => Boolean(placeAssignments[card.id]));
  }

  function renderPlacePhaseProgress() {
    const host = $('#learning-place-phase-progress');
    if (!host) return;
    host.querySelectorAll('[data-place-stage]').forEach(step => {
      const number = Number(step.dataset.placeStage);
      step.classList.toggle('is-current', number === placeStage);
      step.classList.toggle('is-complete', number < placeStage);
      if (number === placeStage) step.setAttribute('aria-current','step'); else step.removeAttribute('aria-current');
    });
  }

  function renderPlaceReading() {
    const sections = data.place_reading_sections || [];
    const host = $('#learning-place-reading-content');
    host.replaceChildren();
    if (!sections.length) {
      host.append(make('p', 'learning-method-note', '地名阅读资料暂未登记，当前互动不可用。'));
      $('#learning-place-reading-next').disabled = true;
      return;
    }
    placeReadingIndex = Math.min(placeReadingIndex, sections.length - 1);
    const item = sections[placeReadingIndex];
    $('#learning-place-reading-progress').textContent = `阅读资料 ${placeReadingIndex + 1} / ${sections.length} · ${item.locator}`;
    $('#learning-place-reading-title').textContent = item.title;
    item.passages.forEach(passage => {
      const figure = make('figure', 'learning-reading-passage');
      figure.dataset.assistantMaterialId = `place-reading:${item.id}`;
      const quote=make('blockquote', '', passage.text);quote.dataset.assistantSelectableMaterial=item.id;figure.append(quote);
      const caption = make('figcaption', 'learning-reading-citation');
      caption.append(make('b', '', passage.attribution), make('span', '', passage.source));
      const detail = make('div', 'learning-reading-source-detail', `${passage.chapter} · ${passage.locator} · ${passage.source_time}`); detail.hidden = true;
      const toggle = make('button', 'learning-source-toggle', '查看出处'); toggle.type='button'; toggle.setAttribute('aria-expanded','false');
      toggle.addEventListener('click', () => { detail.hidden = !detail.hidden; toggle.textContent = detail.hidden ? '查看出处' : '收起出处'; toggle.setAttribute('aria-expanded', String(!detail.hidden)); });
      caption.append(toggle, detail); figure.append(caption); host.append(figure);
    });
    $('#learning-place-reading-tip').textContent = item.reading_tip;
    $('#learning-place-reading-prev').disabled = placeReadingIndex === 0;
    $('#learning-place-reading-next').textContent = placeReadingIndex === sections.length - 1 ? '进入辨认环节' : '继续阅读';
  }

  function renderPlaceSorting() {
    const tiers = data.place_categories || [];
    const cards = data.place_cards || [];
    const count = Object.keys(placeAssignments).length;
    $('#learning-place-sort-status').textContent = `已辨认 ${count} / ${cards.length}`;
    $('#learning-place-sort-help').textContent = '每次判断后会先展示资料依据；确认收卡后，卡片只以背面形式进入分类堆。';
    const bins = $('#learning-place-bins'); bins.replaceChildren();
    tiers.forEach(tier => {
      const rows = cards.filter(card => placeAssignments[card.id] === tier.id);
      const lane = make('section', 'learning-place-bin');
      const head = make('div','learning-place-bin-heading'); head.append(make('h4','',tier.label),make('span','',`${rows.length} 张`));
      const stack = make('div','learning-place-stack'+(rows.length?' has-cards':'')); stack.setAttribute('aria-hidden','true');
      for (let i=Math.min(rows.length,4)-1;i>=0;i--) { const back=make('i',`learning-card-back-layer layer-${i+1}`); stack.append(back); }
      if (!rows.length) stack.append(make('span','learning-place-empty','空档'));
      lane.append(head,stack,make('small','',rows.length?'背面朝上':'等待归档')); bins.append(lane);
    });
    if (!placeCardOrder.length) placeCardOrder = cards.map(card => card.id);
    placeCardOrder = placeCardOrder.filter(id => cards.some(card => card.id === id));
    const nextCard = placeCardOrder.find(id => !placeAssignments[id]);
    const start = $('#learning-place-open-card');
    start.disabled = !placeReadingComplete || !nextCard;
    start.textContent = count === cards.length ? '所有名称已归档' : (count ? '打开下一张名称卡' : '开始辨认名称');
    $('#learning-place-review-open').hidden = !allPlaceCardsAssigned();
    $('#learning-place-finish').hidden = !allPlaceCardsAssigned();
    const notice = $('#learning-place-card-notice');
    notice.textContent = nextCard ? `待辨认：${cards.find(card => card.id === nextCard)?.name || '名称卡'}` : '名称卡已全部归档。';
    renderPlaceDialog();
  }

  function allPlaceCardsAssigned() { return Boolean(data?.place_cards?.length) && data.place_cards.every(card => placeAssignments[card.id]); }

  function openPlaceCard(cardId) {
    activePlaceCardId = cardId; selectedPlaceCategory = null; placeAnswerSubmitted = false; placeReturnFocus = document.activeElement;
    renderPlaceDialog();
    const overlay=$('#learning-place-overlay'); overlay.hidden=false;
    document.body.classList.add('learning-sort-open');
    requestAnimationFrame(() => $('#learning-place-dialog')?.focus());
  }

  function closePlaceCard() {
    const overlay=$('#learning-place-overlay'); if (overlay) overlay.hidden=true;
    document.body.classList.remove('learning-sort-open');
    activePlaceCardId=null; selectedPlaceCategory=null; placeAnswerSubmitted=false;
    const focus=placeReturnFocus; placeReturnFocus=null;
    if (focus?.isConnected) focus.focus();
  }

  function renderPlaceDialog() {
    const host=$('#learning-place-dialog-content');
    if (!host) return;
    host.replaceChildren();
    if (placeReviewOpen) {
      host.append(pill('完成复盘'));
      const reviewTitle=make('h3','','名称卡与资料依据'); reviewTitle.id='learning-place-dialog-heading'; host.append(reviewTitle);
      data.place_categories.forEach(tier => {
        const group=make('section','learning-place-review-group'); group.append(make('h4','',`${tier.label} · ${data.place_cards.filter(card=>placeAssignments[card.id]===tier.id).length} 张`));
        data.place_cards.filter(card=>placeAssignments[card.id]===tier.id).forEach(card=>{
          const row=make('article','learning-place-review-card');
          const correct=placeAssignments[card.id]===card.correct_category;
          row.append(make('b','',card.name),make('p','',card.excerpt),make('small','',`${card.source_name} · ${card.locator}`));
          const answers=make('p','',`你的归类：${categoryLabel(placeAssignments[card.id])}；资料支持的判断：${categoryLabel(card.correct_category)}。${correct?'符合这条资料的语境。':'这次归类与资料语境不符。'} ${card.rationale}`); row.append(answers); group.append(row);
        });
        host.append(group);
      });
      const close=make('button','button button-outline','关闭复盘'); close.type='button'; close.dataset.placeDialogClose=''; host.append(close); return;
    }
    const card=data.place_cards.find(item=>item.id===activePlaceCardId);
    if (!card) return;
    host.append(pill(`名称卡 ${data.place_cards.filter(item=>placeAssignments[item.id]).length+1} / ${data.place_cards.length}`));
    const cardTitle=make('h3','learning-place-dialog-title',card.name); cardTitle.id='learning-place-dialog-heading'; host.append(cardTitle);
    const excerpt=make('p','learning-place-card-excerpt',card.excerpt);excerpt.dataset.assistantSelectableMaterial=card.id;
    host.append(excerpt,make('p','learning-place-card-source',`${card.source_name} · ${card.source_time} · ${card.material_type}`));
    if (assistantPreview?.kind === 'place') {
      host.append(make('p','learning-method-note','材料回看模式：不会提交或修改你的分类。'));
      const close=make('button','button button-outline','关闭材料回看');close.type='button';close.dataset.placeDialogClose='';host.append(close);return;
    }
    const prompt=make('p','learning-place-prompt','根据这条资料，这个名称在这里指什么？'); host.append(prompt);
    const options=make('div','learning-place-dialog-options'); options.setAttribute('role','group'); options.setAttribute('aria-label',`${card.name}的名称用法判断`);
    data.place_categories.forEach(category=>{
      const button=make('button','learning-place-dialog-option',category.label); button.type='button'; button.dataset.placeCategory=category.id;
      button.setAttribute('aria-pressed',String(selectedPlaceCategory===category.id)); button.disabled=placeAnswerSubmitted; if(selectedPlaceCategory===category.id)button.classList.add('is-selected'); options.append(button);
    });
    host.append(options);
    if (!placeAnswerSubmitted) {
      const submit=make('button','button button-gold','提交判断'); submit.type='button'; submit.dataset.placeSubmit=''; submit.disabled=!selectedPlaceCategory; host.append(submit);
    } else {
      const correct=selectedPlaceCategory===card.correct_category;
      const feedback=make('section',`learning-place-dialog-feedback ${correct?'is-aligned':'is-misaligned'}`); feedback.setAttribute('role','status'); feedback.setAttribute('aria-live','polite'); feedback.tabIndex=-1;
      feedback.append(make('b','',correct?'✓ 符合资料':'↻ 需要再核对'),make('p','',card.rationale),make('small','',`${card.source_name} · ${card.locator}`)); host.append(feedback);
      const actions=make('div','learning-task-actions');
      if (!correct) { const retry=make('button','button button-outline','重新选择'); retry.type='button'; retry.dataset.placeRetry=''; actions.append(retry); }
      const collect=make('button','button button-gold',correct?'收进分类堆':'仍按此归档'); collect.type='button'; collect.dataset.placeCollect=''; actions.append(collect); host.append(actions);
    }
  }

  function categoryLabel(id) { return data.place_categories.find(category=>category.id===id)?.label || '待核实'; }

  function renderPlaceCompletion() {
    const host=$('#learning-place-complete-content'); host.replaceChildren();
    const cards=data.place_cards||[]; const correctCount=cards.filter(card=>placeAssignments[card.id]===card.correct_category).length;
    host.append(pill('名称辨认完成'));
    const completeTitle=make('h3','',`符合资料语境 ${correctCount} / ${cards.length}`); completeTitle.id='learning-place-complete-title'; host.append(completeTitle,make('p','','分类依据会随每张名称卡一并复盘；不同来源、不同语境下的名称用法不应被简化成单一沿革。'));
    const bins=make('div','learning-place-complete-bins');
    data.place_categories.forEach(tier=>{
      const rows=cards.filter(card=>placeAssignments[card.id]===tier.id); const stack=make('div','learning-place-stack'+(rows.length?' has-cards':''));
      for(let i=Math.min(rows.length,4)-1;i>=0;i--)stack.append(make('i',`learning-card-back-layer layer-${i+1}`));
      if(!rows.length)stack.append(make('span','learning-place-empty','空档'));
      const item=make('div','learning-place-bin'); item.append(make('b','',tier.label),stack,make('small','',`${rows.length} 张`)); bins.append(item);
    });
    host.append(bins);
    const summary=make('section','learning-place-range-summary'); summary.append(make('p','learning-task-number','名称与范围 · 资料总结'),make('h4','','一个地点名称的范围，会随记录语境和考古认识而变化。'),make('p','','《三星堆之惑》指出，在两个器物坑发现之前，关于“三星堆遗址”的定名与范围认识并不一致；书中也梳理了重大考古发现之后不同称呼与范围逐步整合的过程。此处是作者对资料的概括，不把名称形成时间写成无争议定论。'),make('small','',`许宏，《三星堆之惑》第二章，${data.place_summary_locator}。`));
    const timeline=make('div','learning-place-mini-timeline');
    (data.place_timeline||[]).forEach(item=>{ const node=make('article',''); node.append(make('b','',item.label),make('p','',item.text),make('small','',item.locator)); timeline.append(node); });
    summary.append(timeline,make('p','learning-method-note','范围示意只表达资料中的称谓与认识变化，不是地理地图、测绘边界或比例图。')); host.append(summary);
    const questions=make('div','learning-reflection-prompts'); questions.append(make('p','',`一个发现地点和一处遗址范围有什么区别？${record.nameChange?` 你的记录：${record.nameChange}`:''}`),make('p','',`资料没有交代边界依据时，应怎样表达？${record.question?` 你的问题：${record.question}`:''}`)); host.append(questions);
    const actions=make('div','learning-task-actions');
    const review=make('button','button button-outline','翻开分类卡复盘'); review.type='button'; review.dataset.placeReview=''; actions.append(review);
    const toRecord=make('button','button button-gold','继续学习并填写记录'); toRecord.type='button'; toRecord.dataset.placeContinueRecord=''; actions.append(toRecord);
    const redo=make('button','text-button','重新体验'); redo.type='button'; redo.dataset.placeRedo=''; actions.append(redo);
    const back=make('button','text-button','返回阅读资料'); back.type='button'; back.dataset.placeReturnReading=''; actions.append(back); host.append(actions);
  }

  function renderScope() {
    if(!data)return;
    renderScopeMap();
    renderScopeText();
    renderScopeReflection();
    $('#learning-scope-caution').textContent=data.scope_comparison_note||'面积数字不能单独作为精确遗址边界。';
    renderScopeManagementNote();
    $('#learning-scope-arithmetic').textContent = buildScopeArithmetic();
  }

  function renderScopeMap(){
    const maps=(Array.isArray(data.scope_maps)?data.scope_maps:[]).filter(item=>item.id==='site-plan');
    const image=$('#learning-scope-map-image');
    const fallback=$('#learning-scope-map-fallback');
    const link=$('#learning-scope-map-link');
    if(!image||!link)return;
    if(!maps.length){image.hidden=true;fallback.hidden=false;fallback.textContent='项目资料中尚未登记可展示的地图图件。';return;}
    const item=maps[0];
    image.hidden=false;fallback.hidden=true;image.alt=item.alt||item.title;
    link.href=item.image_url;link.setAttribute('aria-label',`查看本地原尺寸地图图像：${item.title}`);
    $('#learning-scope-map-caption').textContent=`${item.title} · ${item.institution} · ${item.locator}`;
    const source=$('#learning-scope-map-source');source.href=item.source_url;source.textContent='查看相关机构资料页面（本地图件来源待核实） ↗';
    $('#learning-scope-map-rights').textContent=`${item.rights_status} ${item.georeferenced?'':'本图未在本项目中地理配准。'}`;
    $('#learning-scope-map-fixed-note').textContent=data.scope_map_notice||'范围示意不代表精确边界。';
    $('#learning-scope-map-warning').textContent='地图底图保留来源图面信息；叠加范围光晕仅为面积尺度示意，不是地理落点。';
    image.onerror=()=>{image.hidden=true;fallback.hidden=false;fallback.textContent='图件未能从来源加载。可通过“打开来源页面”查看原始图项。';};
    image.onload=()=>{image.hidden=false;fallback.hidden=true;};
    image.src=item.image_url;
    renderScopeLayers();
  }

  const scopeShapePath='M0,-76 C22,-98 52,-81 77,-84 C104,-87 125,-65 148,-59 C174,-52 188,-24 178,0 C170,24 187,46 160,64 C137,79 118,73 96,88 C69,104 49,83 25,90 C0,98 -16,78 -39,83 C-67,89 -84,70 -88,47 C-92,25 -111,11 -98,-14 C-86,-38 -65,-51 -45,-58 C-27,-66 -19,-91 0,-76 Z';
  const scopeColors={
    'ancient-city':{fill:'#c5a363',stroke:'#edcf8a',className:'city'},
    distribution:{fill:'#6d9279',stroke:'#a7c2a8',className:'distribution'},
    'calculated-upper':{fill:'#a9854b',stroke:'#e0c180',className:'estimate'},
    'lower-bound':{fill:'#69816d',stroke:'#b1c4a8',className:'lower'},
    approximate:{fill:'#ac8551',stroke:'#e3c88b',className:'approx'}
  };
  function scopeLayers(){
    return [...(data.scope_current_layers||[]),...(data.scope_claims||[])].map(item=>({
      ...item,
      area:Number(item.area_max??item.visual_value),
      displayArea:item.area_label||scopeValueLabel(item),
      kind:item.kind||item.visual_kind,
      sourceName:item.source_name,
      locator:item.locator||`《三星堆之惑》第二章，PDF 页序 ${item.book_pdf_pages||'待核实'}`,
      quote:item.original_claim||item.label,
      precis:item.precision||item.evidence
    }));
  }
  function renderScopeLayers(){
    const host=$('#learning-scope-layer-list'),svg=$('#learning-scope-map-overlay');
    if(!host||!svg)return;
    const layers=scopeLayers();
    const current=(data.scope_current_layers||[]).map(item=>item.id);
    if(!scopeLayerTouched&&!scopeLayerVisibility.size)current.forEach(id=>scopeLayerVisibility.add(id));
    host.replaceChildren();svg.replaceChildren();
    const defs=document.createElementNS(svg.namespaceURI,'defs');
    defs.innerHTML='<filter id="scope-haze-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter><linearGradient id="scope-haze-fill" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f0d99f" stop-opacity=".7"/><stop offset="1" stop-color="#53685b" stop-opacity=".26"/></linearGradient>';
    svg.append(defs);
    layers.filter(layer=>scopeLayerVisibility.has(layer.id)).forEach(layer=>{
      const color=scopeColors[layer.kind]||scopeColors.approximate;
      const maxArea=12;
      const area=layer.area||0;
      const scale=Math.max(.22,Math.sqrt(Math.min(area,maxArea)/maxArea));
      const g=document.createElementNS(svg.namespaceURI,'g');g.classList.add('learning-scope-halo',`is-${color.className}`);g.setAttribute('transform',`translate(320 224) scale(${scale})`);
      const halo=document.createElementNS(svg.namespaceURI,'path');halo.setAttribute('d',scopeShapePath);halo.setAttribute('fill',color.fill);halo.setAttribute('opacity','.18');halo.setAttribute('filter','url(#scope-haze-blur)');
      const line=document.createElementNS(svg.namespaceURI,'path');line.setAttribute('d',scopeShapePath);line.setAttribute('fill',color.fill);line.setAttribute('fill-opacity','.18');line.setAttribute('stroke',color.stroke);line.setAttribute('stroke-width',layer.kind==='lower-bound'?'2':'1.8');line.setAttribute('stroke-dasharray',layer.kind==='lower-bound'?'7 6':layer.kind==='approximate'?'3 4':layer.kind==='calculated-upper'?'5 4':'none');
      g.append(halo,line);
      if(layer.kind==='lower-bound'){
        const more=document.createElementNS(svg.namespaceURI,'text');more.setAttribute('x','-10');more.setAttribute('y','-92');more.setAttribute('class','learning-scope-halo-more');more.textContent='以上 →';g.append(more);
      }
      svg.append(g);
      if(layer.visual_min&&layer.visual_value){
        const minScale=Math.max(.22,Math.sqrt(Math.min(Number(layer.visual_min),maxArea)/maxArea));
        const minGroup=document.createElementNS(svg.namespaceURI,'g');minGroup.classList.add('learning-scope-halo','is-range-min');minGroup.setAttribute('transform',`translate(320 224) scale(${minScale})`);
        const minPath=document.createElementNS(svg.namespaceURI,'path');minPath.setAttribute('d',scopeShapePath);minPath.setAttribute('fill','none');minPath.setAttribute('stroke','#e2d7b8');minPath.setAttribute('stroke-width','2');minPath.setAttribute('stroke-dasharray','5 5');minGroup.append(minPath);svg.append(minGroup);
      }
    });
    const renderLayerButton=layer=>{
      const color=scopeColors[layer.kind]||scopeColors.approximate;
      const button=make('button',`learning-scope-layer${scopeLayerVisibility.has(layer.id)?' is-on':''}${selectedScope===layer.id?' is-selected':''}`);
      button.type='button';button.dataset.scopeLayer=layer.id;button.setAttribute('aria-pressed',String(scopeLayerVisibility.has(layer.id)));
      button.setAttribute('aria-label',`${scopeLayerVisibility.has(layer.id)?'隐藏':'显示'}${layer.label}，${layer.displayArea}。查看来源与精度说明。`);
      const swatch=make('span',`learning-scope-layer-swatch ${color.className}`);swatch.setAttribute('aria-hidden','true');
      const copy=make('span','learning-scope-layer-copy');copy.append(make('b','',layer.label),make('small','',`${layer.year||'资料说法'} · ${layer.displayArea}`));
      const state=make('span','learning-scope-layer-state',scopeLayerVisibility.has(layer.id)?'显示':'隐藏');
      button.append(swatch,copy,state);host.append(button);
    };
    const currentLayers=layers.filter(layer=>(data.scope_current_layers||[]).some(current=>current.id===layer.id));
    const historicalLayers=layers.filter(layer=>!(data.scope_current_layers||[]).some(current=>current.id===layer.id));
    if(currentLayers.length){host.append(make('p','learning-scope-layer-group-title','现有机构概述'));currentLayers.forEach(renderLayerButton);}
    if(historicalLayers.length){host.append(make('p','learning-scope-layer-group-title','书中所见的早期说法'));historicalLayers.forEach(renderLayerButton);}
    const selected=layers.find(layer=>layer.id===selectedScope&&scopeLayerVisibility.has(layer.id))||layers.find(layer=>scopeLayerVisibility.has(layer.id));
    if(selected){if(scopeLayerTouched&&selected.id!==selectedScope)selectedScope=selected.id;showScopeLayerDetail(selected);}
    else {selectedScope=null;const detail=$('#learning-scope-map-selected');detail?.replaceChildren(make('p','','当前没有显示范围图层。可从左侧开启一个图层，底图仍保持不变。'));}
  }
  function showScopeLayerDetail(layer){
    const host=$('#learning-scope-map-selected');if(!host)return;host.replaceChildren();
    const kindLabel=layer.id==='ancient-city'?'古城 / 城址':layer.id==='archaeological-distribution'?'考古调查范围':layer.kind==='calculated-upper'?'据长宽估算':layer.kind==='lower-bound'?'面积下限说法':'近似面积说法';
    host.append(pill(kindLabel),make('h4','',`${layer.year||'资料范围'} · ${layer.displayArea}`),make('b','',layer.sourceName||'来源待核实'),make('small','','来源原文 / 记载'));
    const quote=make('blockquote','learning-scope-original-quote',`“${layer.quote||'原文未登记'}”`);host.append(quote);
    if(layer.source_url||layer.source_url_secondary){
      const links=make('div','learning-scope-source-links');
      [[layer.source_url,layer.sourceName?.split('；')[0]||'来源一'],[layer.source_url_secondary,'北京大学考古文博学院']].filter(([url])=>url).forEach(([url,label])=>{const a=make('a','',`${label} ↗`);a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);});
      host.append(links);
    }
    host.append(make('p','',layer.evidence||''),make('small','',`${layer.locator||''} · ${layer.precis||''}`));
    if(layer.id.startsWith('scope-'))host.append(make('small','','引用与页码均按《三星堆之惑》第二章核对；页码为 PDF 页序。'));
  }
  function renderScopeManagementNote(){
    const host=$('#learning-scope-management-note');if(!host)return;host.replaceChildren(make('span','',data.scope_management_note||''));
    const links=make('span','learning-scope-management-links');
    (data.scope_management_sources||[]).forEach(source=>{const a=make('a','',`${source.title} · ${source.locator} ↗`);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);});
    host.append(links);
  }

  function scopeValueLabel(item){
    if(item.visual_kind==='calculated-upper')return `约 ${item.visual_min}–${item.visual_value} 平方公里`;
    if(item.visual_kind==='lower-bound')return `${item.visual_value} 平方公里以上`;
    return `约 ${item.visual_value} 平方公里`;
  }

  function renderAreaUnits(value,id,kind){
    const full=Math.floor(value),fraction=Math.round((value-full)*100),partial=fraction>0?1:0,total=full+partial;
    const cols=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(total)))),rows=Math.ceil(total/cols),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('learning-area-units-svg'); svg.setAttribute('viewBox',`0 0 ${cols*100} ${rows*100}`); svg.style.setProperty('--area-cols',String(cols)); svg.style.setProperty('--area-rows',String(rows)); svg.setAttribute('role','img'); svg.setAttribute('aria-label',`${value}平方公里面积单元示意`);
    const defs=document.createElementNS(svg.namespaceURI,'defs'),pattern=document.createElementNS(svg.namespaceURI,'pattern'); pattern.id=`${id}-grid`;pattern.setAttribute('width','10');pattern.setAttribute('height','10');pattern.setAttribute('patternUnits','userSpaceOnUse');
    const bg=document.createElementNS(svg.namespaceURI,'rect');bg.setAttribute('width','10');bg.setAttribute('height','10');bg.setAttribute('fill',kind==='lower-bound'?'#29332c':'#353b31');
    const lines=document.createElementNS(svg.namespaceURI,'path');lines.setAttribute('d','M10 0H0V10');lines.setAttribute('fill','none');lines.setAttribute('stroke',kind==='lower-bound'?'#82917e':'#a48b58');lines.setAttribute('stroke-width','.65');lines.setAttribute('opacity','.78');pattern.append(bg,lines);defs.append(pattern);svg.append(defs);
    const createCell=(index,partialWidth=100)=>{const x=(index%cols)*100,y=Math.floor(index/cols)*100,group=document.createElementNS(svg.namespaceURI,'g');
      const rect=document.createElementNS(svg.namespaceURI,'rect');rect.setAttribute('x',x+1);rect.setAttribute('y',y+1);rect.setAttribute('width',partialWidth-2);rect.setAttribute('height','98');rect.setAttribute('fill',`url(#${pattern.id})`);rect.setAttribute('stroke',kind==='lower-bound'?'#82917e':'#c5a967');rect.setAttribute('stroke-width',partialWidth<100?'1':'2');
      if(partialWidth<100){rect.setAttribute('stroke-dasharray','4 3');rect.setAttribute('rx','2');}
      group.append(rect);svg.append(group);
    };
    for(let i=0;i<full;i++)createCell(i);
    if(fraction)createCell(full,fraction);
    return svg;
  }

  function renderScopeText(){
    const host=$('#learning-scope-text-content');host.replaceChildren();
    const item=data.scope_range_description;
    const notice=make('p','learning-scope-text-notice','文字范围示意 · 非精确边界 · 不按比例或坐标落点');
    const description=make('p','learning-scope-text-attribution',`${item?.attribution||'本书转引文献'}；${item?.source_name||''}。`);
    const quote=make('blockquote','learning-scope-range-quote',item?.text||'现有项目资料未提供可显示的文字四至。');
    const locator=make('small','learning-scope-text-locator',`《三星堆之惑》PDF 页序 ${item?.book_pdf_pages||'待核实'}；书内印刷页码未逐项确认。`);
    const directional=make('div','learning-scope-directions');
    [['北','鸭子河'],['东','回龙村'],['南','米花村'],['西','大堰村']].forEach(([direction,name])=>{const row=make('div','learning-scope-direction');row.append(make('b','',direction),make('span','',name));directional.append(row);});
    const centers=make('p','learning-scope-centers','分布最集中、堆积最丰富的地点：仁胜、真武、三星、回龙四村。此处按原文列举，不表示它们之间的精确相对位置。');
    host.append(notice,description,quote,locator,directional,centers,make('p','learning-method-note','此视图只呈现文献中的方向和地名文字，不绘制多边形，不补造坐标、距离或边界。'));
  }

  function buildScopeArithmetic(){
    const current=data.scope_current_layers||[];
    const distribution=current.find(item=>item.id==='archaeological-distribution');
    const city=current.find(item=>item.id==='ancient-city');
    const calculated=data.scope_claims.find(item=>item.visual_kind==='calculated-upper');
    if(!distribution||!city||!calculated)return '范围图层仅比较来源中的面积数字，不表示边界已经测定。';
    const cityRatio=(Number(distribution.area_max)/Number(city.area_max)).toFixed(1);
    const earlyRatio=(Number(distribution.area_max)/Number(calculated.visual_value)).toFixed(0);
    return `数值比较：约 12 平方公里的遗址分布范围约为约 3.6 平方公里城址的 ${cityRatio} 倍；也约为1985年依据长宽推算上限 2.4 平方公里的 ${earlyRatio} 倍。算术比例不意味着这些来源使用了相同边界定义。`;
  }

  function renderScopeReflection(){
    const host=$('#learning-scope-reflection');if(!host)return;host.replaceChildren();
    host.append(make('h3','','看到这些面积数字后，你还需要什么资料，才能把它们画成可信的遗址边界？'));
    const choices=[['boundary','明确的边界定义'],['survey','调查或钻探点位'],['map','测绘底图与坐标'],['source','数字出现的年份和出处']];
    const group=make('div','learning-scope-reflection-options');
    choices.forEach(([id,label])=>{const wrapper=make('label','learning-scope-reflection-option');const input=document.createElement('input');input.type='checkbox';input.value=id;input.checked=scopeReflectionAnswers.has(id);input.addEventListener('change',()=>{if(input.checked)scopeReflectionAnswers.add(id);else scopeReflectionAnswers.delete(id);scopeReflectionSubmitted=false;const feedback=$('#learning-scope-reflection-feedback');if(feedback)feedback.hidden=true;const submitButton=$('#learning-scope-reflection').querySelector('[data-scope-reflection-submit]');if(submitButton)submitButton.disabled=scopeReflectionAnswers.size===0;});wrapper.append(input,make('span','',label));group.append(wrapper);});
    const submit=make('button','button button-outline','提交');submit.type='button';submit.dataset.scopeReflectionSubmit='';submit.disabled=scopeReflectionAnswers.size===0;
    const feedback=make('p','learning-scope-reflection-feedback','面积数字可以比较大小；绘制可信边界还需要明确范围定义及与之对应的调查、测绘和坐标依据。年份与出处帮助追溯数字如何形成，但单靠它们仍不能确定边界。');feedback.id='learning-scope-reflection-feedback';feedback.hidden=!scopeReflectionSubmitted;feedback.setAttribute('role','status');
    host.append(group,submit,feedback);
  }

  function showScopeDetail(id) {
    const item=scopeLayers().find(layer=>layer.id===id);if(!item)return;
    selectedScope=id;showScopeLayerDetail(item);updateProgress();saveLocalRecord('已查看遗址范围来源。');
  }

  function renderBookCitation() {
    const book = data.book;
    const host = $('#learning-book-source');
    host.replaceChildren(make('p', 'learning-book-label', '本页材料来源'), make('b', '', `${book.author}：《${book.title}》`), make('span', '', `${book.publisher}，${book.publication_date}。`));
    book.chapters.forEach(chapter => {
      const link = make('button', 'learning-chapter-link', `第${chapter.number}章《${chapter.title}》（PDF 页序 ${chapter.pdf_pages}）`);
      link.type = 'button'; link.dataset.learningChapter = String(chapter.number);
      host.append(link);
    });
    host.append(make('small', '', book.source_note));
    $('#learning-print-citation').textContent = `${book.author}：《${book.title}》，${book.publisher}，${book.publication_date}；第1、2章。发现与试掘说法见 PDF 页序7–16；地名及范围讨论见 PDF 页序17–34。书内印刷页码未逐项确认。`;
  }

  function updateProgress() {
    if (!data) return;
    const done = [data.judgment_questions.every(question => judgmentSubmitted[question.id]), isPlaceComplete(), Boolean(selectedScope)];
    const completed = done.filter(Boolean).length;
    let current = done.findIndex(value => !value) + 1;
    if (!current) current = 3;
    const label = $('#learning-progress-label');
    label.textContent = `学习进度 · ${current} / 3`;
    const track = $('#learning-progress-track');
    track.setAttribute('aria-valuenow', String(current));
    track.querySelectorAll('i').forEach((segment,index) => {
      segment.classList.toggle('is-complete', done[index]);
      segment.classList.toggle('is-current', index + 1 === current && !done[index]);
    });
    document.querySelectorAll('[data-learning-step]').forEach(link => {
      const step = Number(link.dataset.learningStep);
      link.classList.toggle('is-complete', done[step - 1]);
      link.classList.toggle('is-current', step === current);
      if (step === current) link.setAttribute('aria-current','step'); else link.removeAttribute('aria-current');
    });
    track.setAttribute('aria-valuetext', `${completed} 个任务已完成，当前第 ${current} 步`);
  }

  function syncRecordFields() {
    Object.entries(record).forEach(([key,value]) => {
      const field = document.querySelector(`[name="${key}"]`);
      if (field) field.value = value || '';
      const output = document.querySelector(`[data-print-field="${key}"]`);
      if (output) output.textContent = value || '（未填写）';
    });
  }

  function getAssistantContext() {
    if (!active || !data) return null;
    let taskId=assistantTaskId,stage='reading',materialId='',sourceMaterialId='',question='',submitted=false,choice='';
    if (taskId === 'discovery') {
      stage=phase===1?'reading':phase===2?'evidence':'judgment';
      if(stage==='reading') materialId=data.reading_sections[readingIndex]?.id||'';
      else if(stage==='evidence'){
        materialId=activeEvidenceId||data.evidence_cards.find(item=>!assignments[item.id])?.id||data.evidence_cards[0]?.id||'';
        submitted=Boolean(evidenceSubmitted||assignments[materialId]);choice=selectedEvidenceTier||assignments[materialId]||'';
      }else{
        const qid=activeJudgmentId||data.judgment_questions.find(item=>!judgmentSubmitted[item.id])?.id||data.judgment_questions[0]?.id||'';
        materialId=qid;const current=data.judgment_questions.find(item=>item.id===qid);question=current?.prompt||'';sourceMaterialId=current?.source_material_id||'';
        submitted=Boolean(judgmentSubmitted[qid]);choice=judgmentChoices[qid]||'';
      }
    }else if(taskId==='place'){
      stage=placeStage===1?'reading':placeStage===2?'evidence':'judgment';
      if(stage==='reading')materialId=data.place_reading_sections[placeReadingIndex]?.id||'';
      else{
        materialId=activePlaceCardId||data.place_cards.find(item=>!placeAssignments[item.id])?.id||data.place_cards[0]?.id||'';
        submitted=Boolean(placeAnswerSubmitted||placeAssignments[materialId]);choice=selectedPlaceCategory||placeAssignments[materialId]||'';
      }
    }else if(taskId==='scope'){
      stage=scopeReflectionSubmitted?'judgment':selectedScope?'evidence':'reading';
      materialId=(data.scope_claims||[]).some(item=>item.id===selectedScope)?selectedScope:(data.scope_current_layers||[]).some(item=>item.id===selectedScope)?selectedScope:data.scope_claims?.[0]?.id||'';
      submitted=scopeReflectionSubmitted;choice=[...scopeReflectionAnswers].join('、');
    }else{
      taskId='discovery';stage='judgment';materialId=activeJudgmentId||data.judgment_questions[0]?.id||'';
      const current=data.judgment_questions.find(item=>item.id===materialId);question=current?.prompt||'';sourceMaterialId=current?.source_material_id||'';
      submitted=Boolean(judgmentSubmitted[materialId]);choice=judgmentChoices[materialId]||'';
    }
    const contextKey=`${taskId}:${stage}:${materialId}`;
    if(assistantContextKey&&assistantContextKey!==contextKey)assistantSelection=null;
    assistantContextKey=contextKey;
    const selectedText=assistantSelection&&[materialId,sourceMaterialId].includes(assistantSelection.materialId)?assistantSelection.text:'';
    return {path:'origins',taskId,stage,materialId,sourceMaterialId,question,submitted,choice,selectedText};
  }

  function publishAssistantContext() {
    window.dispatchEvent(new CustomEvent('learning-origins:context-changed',{detail:getAssistantContext()}));
  }

  function cancelAssistantPreview(returnFocus=false) {
    if(!assistantPreview)return;
    const preview=assistantPreview;assistantPreview=null;
    if(preview.kind==='place'&&preview.previous){
      $('#learning-place-overlay').hidden=true;document.body.classList.remove('learning-sort-open');
      activePlaceCardId=preview.previous.activePlaceCardId;selectedPlaceCategory=preview.previous.selectedPlaceCategory;placeAnswerSubmitted=preview.previous.placeAnswerSubmitted;placeReviewOpen=preview.previous.placeReviewOpen;placeReturnFocus=preview.previous.placeReturnFocus;
    }else if(preview.kind==='evidence'&&$('#learning-sort-overlay')&&!$('#learning-sort-overlay').hidden)closeSortDialog();
    if(data){renderClaims();renderPlaces();renderScope();}
    if(returnFocus&&preview.focusTarget?.isConnected)preview.focusTarget.focus({preventScroll:true});
  }

  function revisitAssistantMaterial(materialId) {
    if(!active||!data||typeof materialId!=='string')return false;
    if(assistantPreview)cancelAssistantPreview(true);
    if(materialId.startsWith('reading:')){
      const id=materialId.slice(8),index=data.reading_sections.findIndex(item=>item.id===id);if(index<0)return false;
      assistantPreview={kind:'reading'};const previous={phase,readingIndex};phase=1;readingIndex=index;renderReading();phase=previous.phase;readingIndex=previous.readingIndex;
      $('#learning-task-1')?.scrollIntoView({behavior:'smooth',block:'start'});
      const node=document.querySelector(`[data-assistant-material-id="${CSS.escape(materialId)}"]`);node?.scrollIntoView({behavior:'smooth',block:'center'});node?.classList.add('learning-assistant-preview');setTimeout(()=>node?.classList.remove('learning-assistant-preview'),2500);return true;
    }
    if(materialId.startsWith('place-reading:')){
      const id=materialId.slice(14),index=data.place_reading_sections.findIndex(item=>item.id===id);if(index<0)return false;
      assistantPreview={kind:'reading'};const previous={placeStage,placeReadingIndex};placeStage=1;placeReadingIndex=index;renderPlaces();placeStage=previous.placeStage;placeReadingIndex=previous.placeReadingIndex;
      $('#learning-task-2')?.scrollIntoView({behavior:'smooth',block:'start'});
      const node=document.querySelector(`[data-assistant-material-id="${CSS.escape(materialId)}"]`);node?.scrollIntoView({behavior:'smooth',block:'center'});node?.classList.add('learning-assistant-preview');setTimeout(()=>node?.classList.remove('learning-assistant-preview'),2500);return true;
    }
    if(data.evidence_cards.some(item=>item.id===materialId)){
      assistantPreview={kind:'evidence',materialId,focusTarget:document.activeElement};openSortDialog('assistant-preview');return true;
    }
    if(data.place_cards.some(item=>item.id===materialId)){
      assistantPreview={kind:'place',materialId,focusTarget:document.activeElement,previous:{activePlaceCardId,selectedPlaceCategory,placeAnswerSubmitted,placeReviewOpen,placeReturnFocus}};activePlaceCardId=materialId;placeReviewOpen=false;placeReturnFocus=document.activeElement;renderPlaceDialog();$('#learning-place-overlay').hidden=false;document.body.classList.add('learning-sort-open');requestAnimationFrame(()=>$('#learning-place-dialog')?.focus());return true;
    }
    const scopeClaim=(data.scope_claims||[]).find(item=>item.id===materialId);
    const scopeLayer=(data.scope_current_layers||[]).find(item=>item.id===materialId);
    if(scopeClaim||scopeLayer){
      const node=scopeClaim?document.querySelector(`[data-scope-claim="${CSS.escape(materialId)}"]`):$('#learning-scope-text-content');
      (node||$('#learning-task-3'))?.scrollIntoView({behavior:'smooth',block:'center'});node?.classList.add('learning-assistant-preview');setTimeout(()=>node?.classList.remove('learning-assistant-preview'),2500);return true;
    }
    return false;
  }

  async function handleClicks(event) {
    if (assistantPreview && !event.target.closest('#learning-assistant')) {
      const closesPreview=Boolean(event.target.closest('#learning-sort-overlay,#learning-place-overlay'));
      cancelAssistantPreview(closesPreview);
      if(closesPreview)return;
    }
    const interactedTask=event.target.closest('#learning-task-1,#learning-task-2,#learning-task-3,#learning-record');
    if (interactedTask) assistantTaskId=interactedTask.id==='learning-task-1'?'discovery':interactedTask.id==='learning-task-2'?'place':interactedTask.id==='learning-task-3'?'scope':'record';
    const readNext = event.target.closest('#learning-reading-next');
    if (readNext) {
      if (readingIndex < data.reading_sections.length - 1) readingIndex += 1;
      else {
        readingComplete = true;
        phase = 2;
      }
      saveLocalRecord(readingComplete ? '原始资料已读完；证据室现已开放。' : '阅读进度已保存在本机浏览器。');
      renderReading(); renderClaims();
      return;
    }
    if (event.target.closest('#learning-reading-prev')) {
      readingIndex = Math.max(0, readingIndex - 1); saveLocalRecord('阅读进度已保存在本机浏览器。'); renderReading(); return;
    }
    if (event.target.closest('#learning-sort-return-reading')) {
      phase = 1; renderReading();
      $('#learning-reading-stage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'}); return;
    }
    const tierChoice = event.target.closest('[data-evidence-tier]');
    if (tierChoice && !evidenceSubmitted) { selectedEvidenceTier = tierChoice.dataset.evidenceTier; renderActiveClaim(); [...document.querySelectorAll('[data-evidence-tier]')].find(button => button.dataset.evidenceTier === selectedEvidenceTier)?.focus(); return; }
    if (event.target.closest('[data-evidence-submit]') && selectedEvidenceTier) { evidenceSubmitted = true; renderActiveClaim(); $('#learning-sort-dialog-content .learning-sort-feedback')?.focus(); return; }
    if (event.target.closest('[data-evidence-retry]')) { selectedEvidenceTier = null; evidenceSubmitted = false; renderActiveClaim(); return; }
    if (event.target.closest('[data-evidence-collect]')) {
      const flyingRect = createFlyingCard();
      const landedTier = selectedEvidenceTier;
      if (activeEvidenceId && selectedEvidenceTier) assignments[activeEvidenceId] = selectedEvidenceTier;
      activeEvidenceId = null; selectedEvidenceTier = null; evidenceSubmitted = false; closeSortDialog(); renderClaims();
      requestAnimationFrame(() => animateCardToYear(flyingRect, landedTier));
      return;
    }
    if (event.target.closest('#learning-sort-start')) {
      if (!readingComplete) return;
      if (Object.keys(assignments).length === data.evidence_cards.length) { phase = 3; renderClaims(); $('#learning-judgment-stage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'}); return; }
      activeEvidenceId = evidenceOrder.find(id => !assignments[id]) || null;
      selectedEvidenceTier = null; evidenceSubmitted = false;
      if (activeEvidenceId) openSortDialog('active');
      return;
    }
    if (event.target.closest('[data-enter-judgment]')) { if (Object.keys(assignments).length !== data.evidence_cards.length) return; phase = 3; renderClaims(); $('#learning-judgment-stage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'}); return; }
    if (event.target.closest('[data-sort-close]')) { closeSortDialog(); return; }
    const reviewTier = event.target.closest('[data-review-tier]');
    if (reviewTier && !reviewTier.disabled) { openSortDialog('review:' + reviewTier.dataset.reviewTier); return; }
    if (event.target.closest('[data-review-all]')) { openSortDialog('review'); return; }
    const judgmentChoice = event.target.closest('[data-judgment-choice]');
    if (judgmentChoice && !judgmentSubmitted[judgmentChoice.dataset.judgmentChoice]) { const id=judgmentChoice.dataset.judgmentChoice, option=judgmentChoice.dataset.option; activeJudgmentId=id; judgmentChoices[id]=option; renderJudgment(); [...document.querySelectorAll('[data-judgment-choice]')].find(button=>button.dataset.judgmentChoice===id&&button.dataset.option===option)?.focus(); return; }
    const submitJudgment = event.target.closest('[data-submit-judgment]');
    if (submitJudgment && judgmentChoices[submitJudgment.dataset.submitJudgment]) { const id=submitJudgment.dataset.submitJudgment; activeJudgmentId=id; judgmentSubmitted[id]=true; renderJudgment(); document.querySelector('[data-judgment="' + id + '"] .learning-judgment-feedback')?.focus(); return; }
    if (event.target.closest('#learning-judgment-return-evidence')) { phase = 2; renderClaims(); $('#learning-sort-stage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'}); return; }
    if (event.target.closest('[data-return-reading]')) { phase = 1; renderReading(); $('#learning-reading-stage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'}); return; }
    if (event.target.closest('[data-sort-redo]')) {
      assignments = {}; judgmentChoices = {}; judgmentSubmitted = {}; activeEvidenceId = null; selectedEvidenceTier = null; evidenceSubmitted = false; phase = 2; saveLocalRecord('互动已重置，可以重新挑战。'); renderClaims(); return;
    }
    const chapter = event.target.closest('[data-learning-chapter]');
    if (chapter) {
      document.querySelector(chapter.dataset.learningChapter === '1' ? '#learning-task-1' : '#learning-task-2')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
      return;
    }
    if (event.target.closest('#learning-sort-reset')) {
      assignments = {}; judgmentChoices = {}; judgmentSubmitted = {}; activeEvidenceId = null; selectedEvidenceTier = null; evidenceSubmitted = false; phase = 2; saveLocalRecord('互动已重置，可以重新挑战。'); renderClaims(); return;
    }
    if (event.target.closest('#learning-place-reading-prev')) { placeReadingIndex=Math.max(0,placeReadingIndex-1); renderPlaces(); saveLocalRecord('阅读进度已保存在本机浏览器。'); return; }
    if (event.target.closest('#learning-place-reading-next')) {
      const sections=data.place_reading_sections||[];
      if(placeReadingIndex<sections.length-1) placeReadingIndex++;
      else { placeReadingComplete=true; placeStage=2; placeCardOrder=data.place_cards.map(card=>card.id); }
      renderPlaces(); saveLocalRecord(placeReadingComplete?'地名资料已读完，辨认环节已开放。':'地名阅读进度已保存在本机浏览器。'); return;
    }
    if (event.target.closest('#learning-place-return-reading') || event.target.closest('[data-place-return-reading]')) { closePlaceCard(); placeStage=1; renderPlaces(); $('#learning-place-reading').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); return; }
    const placeCategory=event.target.closest('[data-place-category]');
    if(placeCategory&&!placeAnswerSubmitted){ selectedPlaceCategory=placeCategory.dataset.placeCategory; renderPlaceDialog(); document.querySelector(`[data-place-category="${CSS.escape(selectedPlaceCategory)}"]`)?.focus(); return; }
    if(event.target.closest('[data-place-submit]')&&selectedPlaceCategory){ placeAnswerSubmitted=true; renderPlaceDialog(); $('#learning-place-dialog-content .learning-place-dialog-feedback')?.focus(); return; }
    if(event.target.closest('[data-place-retry]')){ selectedPlaceCategory=null; placeAnswerSubmitted=false; renderPlaceDialog(); $('#learning-place-dialog-content [data-place-category]')?.focus(); return; }
    if(event.target.closest('[data-place-collect]')){
      const card=data.place_cards.find(item=>item.id===activePlaceCardId);
      if(card&&selectedPlaceCategory) placeAssignments[card.id]=selectedPlaceCategory;
      closePlaceCard(); renderPlaces(); saveLocalRecord('地名辨认进度已保存在本机浏览器。'); return;
    }
    if(event.target.closest('#learning-place-open-card')){
      const order=placeCardOrder.length?placeCardOrder:data.place_cards.map(card=>card.id);
      const next=order.find(id=>!placeAssignments[id]); if(next)openPlaceCard(next); return;
    }
    if(event.target.closest('#learning-place-finish')&&allPlaceCardsAssigned()){ placeStage=3; renderPlaces(); saveLocalRecord('地名名称卡已整理，进入解析与完成记录。'); $('#learning-place-complete').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); return; }
    if(event.target.closest('[data-place-review]')){ placeReviewOpen=true; placeReturnFocus=document.activeElement; $('#learning-place-overlay').hidden=false; document.body.classList.add('learning-sort-open'); renderPlaceDialog(); requestAnimationFrame(()=>$('#learning-place-dialog')?.focus()); return; }
    if(event.target.closest('[data-place-dialog-close]')){
      if(placeReviewOpen){ placeReviewOpen=false; closePlaceCard(); renderPlaces(); }
      else closePlaceCard(); return;
    }
    if(event.target.closest('[data-place-continue-record]')){ $('#learning-record').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); $('#learning-record-name')?.focus({preventScroll:true}); return; }
    if(event.target.closest('[data-place-redo]')){
      if(!confirm('重新体验将清除本机保存的地名阅读与分类进度，是否继续？'))return;
      placeStage=1; placeReadingIndex=0; placeReadingComplete=false; placeAssignments={}; placeCardOrder=[]; placeReviewOpen=false; closePlaceCard(); renderPlaces(); saveLocalRecord('地名互动已重置，可重新阅读和辨认。'); return;
    }
    const scope = event.target.closest('[data-scope-claim]');
    if (scope) { showScopeDetail(scope.dataset.scopeClaim); renderScope(); return; }
    const scopeLayer=event.target.closest('[data-scope-layer]');
    if(scopeLayer){
      const id=scopeLayer.dataset.scopeLayer;
      scopeLayerTouched=true;
      if(scopeLayerVisibility.has(id))scopeLayerVisibility.delete(id);else scopeLayerVisibility.add(id);
      selectedScope=id;renderScopeLayers();updateProgress();return;
    }
    if(event.target.closest('[data-scope-reset-layers]')){
      scopeLayerTouched=true;
      scopeLayerVisibility=new Set(scopeLayers().map(layer=>layer.id));
      selectedScope='ancient-city';renderScopeLayers();updateProgress();return;
    }
    if(event.target.closest('[data-scope-reflection-submit]')){if(!scopeReflectionAnswers.size)return;scopeReflectionSubmitted=true;renderScopeReflection();return;}
    if (event.target.closest('#learning-record-clear')) {
      const inAccount = Boolean(window.AccountData?.authenticated);
      if (!confirm(inAccount ? '清空当前账号保存的研学记录和本页练习进度？' : '清空保存在本机浏览器中的研学记录和本页练习进度？')) return;
      if (inAccount) {
        const button = $('#learning-record-clear'); button.disabled = true;
        try { await window.AccountData.flushAll(); await window.AccountData.remove('learning_origins','state'); }
        catch (error) { $('#learning-local-status').textContent = `清除失败：${error.message || '请重试。'}`; button.disabled = false; return; }
        button.disabled = false;
      }
      record = {discovery:'', evidence:'', nameChange:'', question:''}; assignments = {}; readingComplete = false; readingIndex = 0; phase = 1; evidenceOrder = []; activeEvidenceId = null; selectedEvidenceTier = null; evidenceSubmitted = false; judgmentChoices = {}; judgmentSubmitted = {}; placeStage=1; placeReadingIndex=0; placeReadingComplete=false; placeAssignments={}; placeCardOrder=[]; placeReviewOpen=false; selectedScope = null;
      if (!inAccount) localStorage.removeItem(storageKey); syncRecordFields(); renderClaims(); renderPlaces(); renderScope();
      $('#learning-local-status').textContent = inAccount ? '账号记录已清空。' : '本机记录已清空。'; return;
    }
    if (event.target.closest('#learning-retry')) {
      data = null; loading = null; active = false; activate();
    }
  }

  document.addEventListener('keydown', event => {
    if (assistantPreview && event.key === 'Escape') { event.preventDefault(); cancelAssistantPreview(true); return; }
    if ($('#learning-place-overlay') && !$('#learning-place-overlay').hidden && event.key === 'Escape') { event.preventDefault(); if(placeReviewOpen){placeReviewOpen=false;closePlaceCard();renderPlaces();}else closePlaceCard(); return; }
    if (!$('#learning-sort-overlay') || $('#learning-sort-overlay').hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeSortDialog(); }
  });

  async function activate() {
    if (active || params().get('page') !== 'learning') return;
    active = true;
    const content = $('#learning-origins-view .learning-origins-content');
    content.hidden = true;
    const errorOld = $('#learning-load-error'); errorOld?.remove();
    try {
      const saved = await window.AccountData.load('learning_origins','state',storageKey,{});
      if (params().get('page') !== 'learning') return;
      readLocalRecord(saved);
      $('#learning-local-status').textContent = window.AccountData?.authenticated ? '研学记录自动同步到当前账号。' : '练习只保存在本机浏览器。';
      $('#learning-record-description').textContent = window.AccountData?.authenticated ? '填写内容会保存到当前账号，并与本主题的研学进度一起管理。' : '填写内容保存在此浏览器本机；登录后可在个人账号页导入。';
      $('#learning-record-clear').textContent = window.AccountData?.authenticated ? '清空账号记录' : '清空本机记录';
      await loadData();
      if (params().get('page') !== 'learning') return;
      renderPlaceSources(); renderScopeSources(); renderClaims(); renderPlaces(); renderScope(); renderBookCitation(); syncRecordFields(); updateProgress(); renderPrintSummary(); content.hidden = false; publishAssistantContext();
    } catch (error) {
      active = false;
      content.hidden = false;
      const panel = make('div', 'learning-load-error'); panel.id = 'learning-load-error'; panel.setAttribute('role','alert');
      panel.append(make('b', '', '研学资料暂时无法读取'), make('p', '', error?.message || '请检查 /data/learning/origins.json 后重试。'));
      const retry = make('button', 'button button-outline', '重试读取'); retry.id = 'learning-retry'; retry.type = 'button'; panel.append(retry);
      content.prepend(panel);
    }
  }

  window.addEventListener('learning-origins:activate', activate);
  window.addEventListener('learning-origins:deactivate', () => { active = false; cancelAssistantPreview(); publishAssistantContext(); });
  window.addEventListener('account-user-changed', () => {
    cancelAssistantPreview();
    active = false; assignments = {}; readingComplete = false; readingIndex = 0; phase = 1; evidenceOrder = []; judgmentChoices = {}; judgmentSubmitted = {};
    placeStage = 1; placeReadingIndex = 0; placeReadingComplete = false; placeAssignments = {}; placeCardOrder = []; selectedScope = null;
    record = {discovery:'', evidence:'', nameChange:'', question:''};
    $('#learning-origins-view .learning-origins-content').hidden = true;
    if(params().get('page')==='learning'&&params().get('path')==='origins')queueMicrotask(()=>activate());
  });
  window.addEventListener('account-record-deleted', event => {
    if (event.detail?.collection !== 'learning_origins') return;
    cancelAssistantPreview();
    assignments = {}; readingComplete = false; readingIndex = 0; phase = 1; evidenceOrder = []; judgmentChoices = {}; judgmentSubmitted = {};
    placeStage = 1; placeReadingIndex = 0; placeReadingComplete = false; placeAssignments = {}; placeCardOrder = []; selectedScope = null;
    record = {discovery:'', evidence:'', nameChange:'', question:''}; active = false;
  });
  document.addEventListener('click', event => { Promise.resolve(handleClicks(event)).finally(publishAssistantContext); });
  document.addEventListener('selectionchange', () => {
    const selection=window.getSelection(),text=selection?.toString().trim()||'';
    if(!text)return;
    const element=node=>node?.nodeType===1?node:node?.parentElement;
    const start=element(selection.anchorNode)?.closest('[data-assistant-selectable-material]');
    const end=element(selection.focusNode)?.closest('[data-assistant-selectable-material]');
    assistantSelection=start&&start===end&&text.length<=500?{materialId:start.dataset.assistantSelectableMaterial,text}:null;
    publishAssistantContext();
  });
  $('#learning-record-form').addEventListener('input', event => {
    const name = event.target.name;
    if (!Object.prototype.hasOwnProperty.call(record,name)) return;
    record[name] = event.target.value;
    publishAssistantContext();
    const output = document.querySelector(`[data-print-field="${name}"]`);
    if (output) output.textContent = event.target.value || '（未填写）';
    if (window.AccountData?.authenticated) {
      $('#learning-local-status').textContent = '正在同步填写内容到当前账号…';
    } else $('#learning-local-status').textContent = '正在保存到本机…';
    clearTimeout(recordSaveTimer);
    recordSaveTimer = setTimeout(() => { void saveLocalRecord('研学记录已保存。'); }, 650);
  });
  $('#learning-record-form').addEventListener('focusout', () => {
    if (!recordSaveTimer) return;
    clearTimeout(recordSaveTimer);
    recordSaveTimer = null;
    void saveLocalRecord('研学记录已保存。');
  });
  $('#learning-record-form').addEventListener('submit', event => { event.preventDefault(); saveLocalRecord(); });
  $('#learning-print').addEventListener('click', async () => {
    clearTimeout(recordSaveTimer);
    const saved = await saveLocalRecord('研学记录已保存。');
    if (saved === false) return;
    await window.AccountData?.flushAll?.();
    syncRecordFields();
    if (data) { renderBookCitation(); renderPrintSummary(); }
    window.print();
  });
  document.querySelectorAll('[data-learning-step]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    assistantTaskId=link.dataset.learningStep==='1'?'discovery':link.dataset.learningStep==='2'?'place':'scope';
    publishAssistantContext();
    document.querySelector(link.getAttribute('href'))?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
  }));
  window.LearningOrigins = Object.freeze({getAssistantContext,revisitAssistantMaterial});
})();
