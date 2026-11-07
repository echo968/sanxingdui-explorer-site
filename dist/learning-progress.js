(() => {
  const courses = [
    {id:'origins', collection:'learning_origins', path:'origins', title:'发现与命名', storageKey:'sanxingdui-learning-origins-v1'},
    {id:'framework', collection:'learning_framework', path:'framework', title:'年代、文化与古城', storageKey:'sd-learning-framework-v1'},
    {id:'pits', collection:'learning_pits', path:'pits', title:'器物坑与雕像', storageKey:'sd-learning-pits-v1'},
    {id:'connections', collection:'learning_connections', path:'connections', title:'工艺、金沙与“蜀”', storageKey:'sd-learning-connections-v1'},
  ];
  const $ = selector => document.querySelector(selector);
  let configPromise = null;
  let currentRecords = [];
  let requestRevision = 0;
  let toastTimer = null;
  let refreshTimer = null;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeParse = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const anyValue = value => {
    if (typeof value === 'string') return Boolean(value.trim());
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.values(value).some(anyValue);
    return value === true || (typeof value === 'number' && value !== 0);
  };
  const dateLabel = value => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return '尚无学习记录';
    return `最近学习：${date.toLocaleString('zh-CN', {year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}`;
  };

  function getStatusElement() {
    let status = $('#learning-save-feedback');
    if (!status) {
      status = document.createElement('div');
      status.id = 'learning-save-feedback';
      status.className = 'learning-save-feedback';
      status.setAttribute('role','status');
      status.setAttribute('aria-live','polite');
      document.body.append(status);
    }
    return status;
  }

  function announceSave(text, failed = false) {
    const status = getStatusElement();
    status.textContent = text;
    status.classList.toggle('is-error', failed);
    status.classList.add('is-visible');
    clearTimeout(toastTimer);
    if (!failed) toastTimer = setTimeout(() => status.classList.remove('is-visible'), 2600);
  }

  async function save(collection, value, localKey, message = '进度已保存。') {
    const status = getStatusElement();
    status.textContent = '正在保存研学进度…';
    status.classList.remove('is-error');
    status.classList.add('is-visible');
    clearTimeout(toastTimer);
    try {
      if (window.AccountData?.authenticated) await window.AccountData.save(collection, 'state', value, localKey);
      else localStorage.setItem(localKey, JSON.stringify(value));
      announceSave(window.AccountData?.authenticated ? `${message}已同步到当前账号。` : `${message}已保存在此浏览器。`);
      scheduleRefresh();
      return value;
    } catch (error) {
      announceSave(`保存失败：${error?.message || '请检查存储空间后重试。'}`, true);
      throw error;
    }
  }

  async function loadConfigs() {
    if (!configPromise) configPromise = (async () => {
      const response = await fetch('/data/manifest.json', {cache:'no-cache'});
      if (!response.ok) throw new Error(`研学数据清单读取失败（HTTP ${response.status}）`);
      const manifest = await response.json();
      const pairs = await Promise.all(courses.map(async course => {
        const entry = manifest.files?.find(file => file.path === `learning/${course.path}.json`);
        if (!entry?.url) return [course.id, null];
        try {
          const result = await fetch(entry.url);
          return [course.id, result.ok ? await result.json() : null];
        } catch { return [course.id, null]; }
      }));
      return Object.fromEntries(pairs);
    })().catch(error => { configPromise = null; throw error; });
    return configPromise;
  }

  async function loadRecords() {
    const configs = await loadConfigs();
    const snapshots = await Promise.all(courses.map(async course => {
      const state = await window.AccountData.load(course.collection, 'state', course.storageKey, null);
      return summarize(course, state, configs[course.id]);
    }));
    return snapshots;
  }

  function summarize(course, state, config) {
    const saved = state && typeof state === 'object' ? state : null;
    let completed = 0;
    let total = 0;
    let location = '';
    let active = false;
    if (course.id === 'origins') {
      const questionIds = (config?.judgment_questions || []).map(item => item.id).filter(Boolean);
      const cardIds = (config?.place_cards || []).map(item => item.id).filter(Boolean);
      const judgmentDone = questionIds.length > 0 && questionIds.every(id => saved?.judgmentSubmitted?.[id]);
      const placesDone = cardIds.length > 0 && cardIds.every(id => saved?.placeAssignments?.[id]);
      const scopeDone = Boolean(saved?.selectedScope);
      completed = [judgmentDone, placesDone, scopeDone].filter(Boolean).length;
      total = 3;
      active = Boolean(saved && (saved.readingComplete || Number(saved.readingIndex) > 0 || anyValue(saved.assignments) || anyValue(saved.judgmentSubmitted) || Number(saved.placeStage) > 1 || saved.placeReadingComplete || anyValue(saved.placeAssignments) || scopeDone || anyValue(saved.record)));
      location = scopeDone ? '遗址范围讨论' : placesDone ? '地名辨认' : judgmentDone || Number(saved?.phase) >= 2 ? '证据卡整理' : '材料阅读';
    } else {
      const list = course.id === 'framework' ? saved?.stations : saved?.answers;
      const items = Array.isArray(list) ? list : [];
      total = Number(config?.stations?.length) || items.length || (course.id === 'connections' ? 3 : 4);
      completed = items.filter(item => item?.submitted).length;
      active = Boolean(saved && (saved.updatedAt || items.some(item => anyValue(item)) || anyValue(saved.reflection)));
      const index = Math.min(Math.max(0, Number(saved?.station) || 0), Math.max(0, total - 1));
      const station = config?.stations?.[index];
      location = saved?.station >= total ? '个人研学记录' : station?.title ? `上次：${station.title}` : `上次：第 ${index + 1} 站`;
    }
    const isComplete = total > 0 && completed >= total;
    const updatedAt = saved?.updatedAt || saved?.savedAt || null;
    return {course, state:saved, config, completed, total, active:active || Boolean(updatedAt), isComplete, updatedAt, location,
      status:isComplete ? '已完成' : (active || updatedAt) ? '学习中' : '未开始'};
  }

  function renderDashboard(records) {
    currentRecords = records;
    const note = $('#learning-progress-note');
    if (!note) return;
    const completed = records.filter(item => item.isComplete).length;
    const started = records.filter(item => item.active && !item.isComplete).length;
    note.textContent = `已完成 ${completed} 个主题${started ? ` · ${started} 个主题进行中` : ''}。进度按已完成的研学任务计算。`;
    if (window.AccountData?.authenticated) {
      const hasUnimportedLocal = records.some(item => !item.state && safeParse(item.course.storageKey) !== null);
      if (hasUnimportedLocal) note.textContent += ' 检测到本机尚未导入的记录；可在个人账号页手动导入。';
      else note.textContent += ' 当前进度保存在账号中。';
    } else note.textContent += ' 访客进度仅保存在此浏览器。';

    for (const record of records) {
      const card = document.querySelector(`[data-learning-course="${record.course.id}"]`);
      if (!card) continue;
      const status = record.isComplete ? '已完成' : record.active ? '学习中' : '未开始';
      const progress = card.querySelector('[data-course-progress]');
      if (progress) {
        progress.innerHTML = `<span class="learning-course-status ${record.isComplete?'is-complete':record.active?'is-active':''}">${status}</span><span>${record.completed} / ${record.total} 项已完成</span><small>${escapeHtml(record.location)} · ${escapeHtml(dateLabel(record.updatedAt))}</small>`;
      }
      const action = card.querySelector('[data-course-action]');
      if (action) action.innerHTML = `${record.isComplete ? '查看学习记录' : record.active ? '继续学习' : '开始学习'} <span aria-hidden="true">↗</span>`;
      card.dataset.progressState = record.isComplete ? 'complete' : record.active ? 'active' : 'new';
    }
  }

  async function refreshDashboard() {
    const revision = ++requestRevision;
    const note = $('#learning-progress-note');
    if (!note || !window.AccountData) return;
    note.textContent = '正在读取本机或账号中的学习记录…';
    try {
      const records = await loadRecords();
      if (revision === requestRevision) renderDashboard(records);
    } catch (error) {
      if (revision === requestRevision) note.textContent = `研学进度暂时无法读取：${error?.message || '请重试。'}`;
    }
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { void refreshDashboard(); }, 350);
  }

  function sourceLines(record) {
    const values = new Set();
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (typeof value.locator === 'string' && value.locator.trim()) values.add(value.locator.trim());
      for (const item of Object.values(value)) visit(item);
    };
    visit(record.config);
    const config = record.config || {};
    const book = config.book || {};
    const head = [book.title, book.author, book.publisher, book.sourceNote, book.source_note, config.source_note, config.sourceNote].filter(Boolean).join(' · ');
    return [head, ...values].filter(Boolean);
  }

  function userNotes(record) {
    const state = record.state || {};
    const values = [];
    const push = (label, value) => { if (typeof value === 'string' && value.trim()) values.push([label, value.trim()]); };
    if (record.course.id === 'origins') {
      const names = {discovery:'我认为玉石器发现时间是',evidence:'我的判断依据是',nameChange:'“三星堆”名称范围的变化说明',question:'我还想继续查证的问题'};
      for (const [key,label] of Object.entries(names)) push(label, state.record?.[key]);
    } else {
      push('个人反思', state.reflection);
      const answers = Array.isArray(state.answers) ? state.answers : [];
      answers.forEach((answer,index) => {
        const station = record.config?.stations?.[index];
        const title = station?.title || `第 ${index + 1} 站`;
        push(`${title} · 理由`, answer?.reason);
        push(`${title} · 记录`, answer?.note);
        push(`${title} · 反馈`, answer?.feedback);
      });
    }
    return values;
  }

  function responseSummary(record) {
    const state = record.state || {};
    const fields = [];
    const labelsFor = root => {
      const labels = new Map();
      const visit = value => {
        if (!value || typeof value !== 'object') return;
        if (typeof value.id === 'string') {
          const label = value.label || value.title || value.name || value.short;
          if (typeof label === 'string' && label) labels.set(value.id,label);
        }
        Object.values(value).forEach(visit);
      };
      visit(root);
      return labels;
    };
    const humanize = (value, labels) => {
      if (typeof value === 'string') return labels.get(value) || value;
      if (Array.isArray(value)) return value.map(item=>humanize(item,labels));
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,humanize(item,labels)]));
      return value;
    };
    if (record.course.id === 'origins') {
      const labels = labelsFor(record.config);
      if (anyValue(state.judgmentChoices)) fields.push(['证据判断',humanize(state.judgmentChoices,labels)]);
      if (anyValue(state.placeAssignments)) fields.push(['名称卡分类',humanize(state.placeAssignments,labels)]);
      if (state.selectedScope) fields.push(['遗址范围选择',humanize(state.selectedScope,labels)]);
    } else {
      const answers = record.course.id === 'framework' ? state.stations : state.answers;
      if (Array.isArray(answers)) answers.forEach((answer,index) => {
        if (!answer || !anyValue(answer)) return;
        const station = record.config?.stations?.[index];
        const response = Object.fromEntries(Object.entries(answer).filter(([key,value]) => !['read','updatedAt','readIndex','active','focus','visualFocus','zoom','imageZoom','submitted','correct','feedback','inputError'].includes(key) && anyValue(value)));
        if (Object.keys(response).length) fields.push([station?.title || `第 ${index+1} 站`,humanize(response,labelsFor(station))]);
      });
    }
    return fields;
  }

  function recordHtml(record, printing = false) {
    const notes = userNotes(record);
    const responses = responseSummary(record);
    const sources = sourceLines(record);
    return `<article class="learning-record-course"><div class="learning-record-course-head"><div><span>${record.isComplete?'已完成':record.active?'学习中':'未开始'} · ${record.completed}/${record.total} 项</span><h4>${escapeHtml(record.course.title)}</h4></div><small>${escapeHtml(dateLabel(record.updatedAt))}</small></div>
      ${notes.length ? `<section><h5>我的文字记录</h5>${notes.map(([label,value])=>`<p><b>${escapeHtml(label)}</b><br>${escapeHtml(value)}</p>`).join('')}</section>` : '<p class="learning-record-empty-note">暂无文字记录。</p>'}
      ${responses.length ? `<details class="learning-record-responses" ${printing?'open':''}><summary>查看互动选择记录</summary>${responses.map(([label,value])=>`<div><b>${escapeHtml(label)}</b><pre>${escapeHtml(JSON.stringify(value,null,2))}</pre></div>`).join('')}</details>` : ''}
      ${sources.length ? `<section class="learning-record-sources"><h5>资料来源与定位</h5>${sources.map(source=>`<p>${escapeHtml(source)}</p>`).join('')}</section>` : '<p class="learning-record-empty-note">本主题来源定位暂不可用，请打开主题页查看引用资料。</p>'}</article>`;
  }

  async function loadLatest() {
    if (window.AccountData?.authenticated) await window.AccountData.flushAll();
    const records = await loadRecords();
    renderDashboard(records);
    return records;
  }

  async function openRecords() {
    const dialog = $('#learning-records-dialog');
    const content = $('#learning-records-content');
    const status = $('#learning-records-status');
    if (!dialog || !content || !status) return;
    status.textContent = '正在读取四个主题的研学记录…';
    content.replaceChildren();
    if (!dialog.open) dialog.showModal();
    try {
      const records = await loadLatest();
      content.innerHTML = records.map(recordHtml).join('');
      const hasAny = records.some(item => item.state);
      status.textContent = hasAny ? (window.AccountData?.authenticated ? '记录从当前账号读取。' : '记录从此浏览器读取；登录后可在个人账号页手动导入。') : '目前还没有保存的研学记录。开始任一主题后，进度和回答会出现在这里。';
    } catch (error) {
      status.textContent = `读取失败：${error?.message || '请重试。'}`;
    }
  }

  async function exportJson() {
    const status = $('#learning-records-status');
    if (status) status.textContent = '正在同步待保存内容并准备导出…';
    try {
      const records = await loadLatest();
      const payload = {
        format:'sanxingdui-learning-records', version:1, exportedAt:new Date().toISOString(),
        note:'仅包含四个研学主题的进度与回答，不包含账号凭证或其他账号数据。来源定位按页面资料配置整理；部分纸书页码仍待核实。',
        courses:records.map(record=>({id:record.course.id,title:record.course.title,status:record.status,progress:{completed:record.completed,total:record.total,location:record.location},updatedAt:record.updatedAt,answers:record.state,readableResponses:responseSummary(record),sources:sourceLines(record)})),
      };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href=url; link.download=`sanxingdui-learning-records-${new Date().toISOString().slice(0,10)}.json`;
      document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
      announceSave('研学记录 JSON 已导出。');
      if (status) status.textContent = '导出完成。文件包含四个研学主题的状态、个人回答和来源定位。';
    } catch (error) {
      if (status) status.textContent = `导出失败：${error?.message || '请重试。'}`;
    }
  }

  async function printRecords() {
    const status = $('#learning-records-status');
    const print = $('#learning-records-print');
    if (!print) return;
    if (status) status.textContent = '正在同步待保存内容并生成打印版…';
    try {
      const records = await loadLatest();
      print.innerHTML = `<p class="learning-print-brand">三星堆 · 古蜀文明数字探索平台</p><h1>个人研学记录</h1><p>生成时间：${escapeHtml(new Date().toLocaleString('zh-CN'))}</p><p class="learning-print-caveat">本记录汇总个人研学进度、文字回答、互动选择和资料出处。研究解释与证据边界按页面原文保留，不作为唯一结论或正确率排名。</p>${records.map(record=>recordHtml(record,true)).join('')}<footer>访客记录来自本机浏览器；登录用户记录来自当前账号。纸书页码待核实的内容仍按页面原标注。</footer>`;
      if ($('#learning-records-dialog')?.open) $('#learning-records-dialog').close();
      document.body.classList.add('learning-records-print-mode');
      window.print();
      if (status) status.textContent = '已打开打印窗口；可选择打印机或“另存为 PDF”。';
    } catch (error) {
      if (status) status.textContent = `打印版生成失败：${error?.message || '请重试。'}`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#learning-records-open')?.addEventListener('click', openRecords);
    $('#learning-records-close')?.addEventListener('click', () => $('#learning-records-dialog')?.close());
    $('#learning-records-done')?.addEventListener('click', () => $('#learning-records-dialog')?.close());
    $('#learning-records-export')?.addEventListener('click', exportJson);
    $('#learning-records-export-dialog')?.addEventListener('click', exportJson);
    $('#learning-records-print')?.addEventListener('click', printRecords);
    document.addEventListener('click', event => {
      const action = event.target.closest('[data-course-action]');
      if (!action) return;
      const card = action.closest('[data-learning-course]');
      const record = currentRecords.find(item => item.course.id === card?.dataset.learningCourse);
      if (record?.isComplete && record.course.id === 'origins') {
        let attempts = 0;
        const revealRecord = () => {
          const target = document.getElementById('learning-record');
          if (target?.closest('[hidden]') && attempts++ < 80) { setTimeout(revealRecord, 50); return; }
          target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
        };
        setTimeout(revealRecord, 80);
      }
    }, true);
    void refreshDashboard();
    window.addEventListener('learning-progress:refresh', refreshDashboard);
    window.addEventListener('account-user-changed', refreshDashboard);
    window.addEventListener('account-record-deleted', event => {
      if (courses.some(course => course.collection === event.detail?.collection)) refreshDashboard();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('learning-records-print-mode'));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') document.body.classList.remove('learning-records-print-mode'); });
  });

  window.LearningProgress = {save, refresh:refreshDashboard, loadRecords};
})();
