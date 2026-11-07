(() => {
  const $echo = selector => document.querySelector(selector);
  const room = $echo('#ai-echo-room');
  if (!room) return;
  const artifactIds = ['book-2009-005', 'book-2009-009', 'book-2009-211', 'book-2009-003'];
  const state = {dataPromise:null,config:null,records:new Map(),selectedId:'',theme:'seeking',revealIndex:0,videoReady:false};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function parseJsonl(text) {
    const records = [];
    let malformed = 0;
    String(text || '').split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      try { const value = JSON.parse(line); if (value && typeof value === 'object' && !Array.isArray(value)) records.push(value); else malformed += 1; }
      catch { malformed += 1; }
    });
    return {records,malformed};
  }
  async function fetchJson(url) {
    const response = await fetch(url,{credentials:'same-origin'});
    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
    return response.json();
  }
  async function loadData() {
    if (state.dataPromise) return state.dataPromise;
    state.dataPromise = (async () => {
      const manifest = await fetchJson(new URL('./data/manifest.json',document.baseURI));
      const file = (manifest.files || []).find(item => item.path === 'artifacts/selected-book-300.jsonl' && item.format === 'jsonl');
      if (!file) throw new Error('manifest.json 未登记 selected-book-300.jsonl');
      const url = new URL(file.url || '/data/' + file.path,document.baseURI);
      if (url.origin !== location.origin || !url.pathname.includes('/data/')) throw new Error('文物档案必须来自本站数据目录');
      const results = await Promise.all([
        fetch(url,{credentials:'same-origin'}),
        fetchJson('/assets/ai-exhibition/echo-room-content.json')
      ]);
      if (!results[0].ok) throw new Error('精选器物数据读取失败：' + results[0].status);
      const parsed = parseJsonl(await results[0].text());
      state.config = results[1];
      state.records = new Map(parsed.records.filter(record => record && record.id).map(record => [record.id,record]));
      return {malformed:parsed.malformed};
    })().catch(error => { state.dataPromise = null; throw error; });
    return state.dataPromise;
  }
  async function generateEchoText(context) {
    const theme = state.config.themes.find(item => item.id === state.theme);
    const outputs = await window.SanxingduiCoze.run('space4_echo', {
      artifact_id:context.record.id,
      artifact_name:context.record.name,
      theme_id:state.theme || 'none',
      theme_label:theme?.label || '暂不选择特定人生主题'
    });
    let value = outputs.philosophy_text || outputs.output || outputs.Group14 || '';
    if (value && typeof value === 'object') value = value.url || value.text || value.content || '';
    const line = Array.from(String(value).trim()).slice(0,24).join('');
    if (!line) throw new Error('工作流没有返回哲理句。请检查第四空间子工作流及总工作流结束节点的 output 映射。');
    return line;
  }
  function setVideo(active) {
    const video = $echo('#ai-echo-video');
    if (!video) return;
    if (!active || reducedMotion.matches) { video.pause(); return; }
    if (!state.videoReady) {
      const source = video.querySelector('source[data-src]');
      if (source) source.src = source.dataset.src;
      state.videoReady = true;
      video.load();
    }
    const playback = video.play();
    if (playback && playback.catch) playback.catch(() => {
      $echo('#ai-echo-video-error').hidden = false;
      room.classList.add('is-video-fallback');
    });
  }
  function renderCards(malformed) {
    const container = $echo('#ai-echo-artifacts');
    container.replaceChildren();
    let missing = 0;
    artifactIds.forEach(id => {
      const record = state.records.get(id);
      const entry = state.config.artifacts.find(item => item.id === id);
      if (!record || !entry) { missing += 1; return; }
      const article = document.createElement('article');
      article.className = 'ai-echo-card';
      article.dataset.artifactId = id;
      const body = document.createElement('div');
      body.className = 'ai-echo-card-body';
      const name = document.createElement('h3');
      name.textContent = record.name;
      body.append(name);
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.className = 'ai-echo-select';
      choose.textContent = '选择这件文物';
      choose.setAttribute('aria-label','选择' + record.name + '，图录档案待复核');
      choose.addEventListener('click',() => reveal(id));
      body.append(choose);
      article.append(body);
      container.append(article);
    });
    const status = $echo('#ai-echo-data-status');
    const messages = [];
    if (missing) messages.push(missing + ' 件预设器物未在精选数据集中找到，已省略。');
    if (malformed) messages.push(malformed + ' 行数据格式异常，已跳过。');
    status.textContent = messages.join(' ');
  }
  function setTheme(theme) {
    state.theme = theme || '';
    room.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.theme === theme)));
    $echo('#ai-echo-skip').setAttribute('aria-pressed',String(!state.theme));
  }
  function setView(isReveal) {
    $echo('#ai-echo-choice-content').hidden = isReveal;
    $echo('#ai-echo-reveal').hidden = !isReveal;
  }
  async function reveal(id) {
    const record = state.records.get(id);
    const entry = state.config?.artifacts.find(item => item.id === id);
    if (!record || !entry) return;
    state.selectedId = id;
    state.revealIndex = 0;
    setView(true);
    $echo('#ai-echo-again').focus({preventScroll:true});
    const title = $echo('#ai-echo-reveal-title');
    const note = $echo('.ai-echo-reveal-note');
    title.textContent = '正在结合器物与主题生成回响…';
    note.textContent = '正在请求 Coze 工作流。生成内容为当代文案，不代表古代原文或学术定论。';
    room.querySelectorAll('.ai-echo-select,[data-theme],#ai-echo-skip,#ai-echo-random,#ai-echo-again').forEach(button => { button.disabled = true; });
    try {
      const line = await generateEchoText({record,entry,theme:state.theme});
      if (state.selectedId !== id || !document.body.classList.contains('ai-echo-room-mode')) return;
      renderReveal(record,entry,line);
    } catch (error) {
      if (state.selectedId !== id) return;
      title.textContent = '暂时无法生成回响';
      note.textContent = error.message;
    } finally {
      room.querySelectorAll('.ai-echo-select,[data-theme],#ai-echo-skip,#ai-echo-random,#ai-echo-again').forEach(button => { button.disabled = false; });
    }
  }
  function renderReveal(record,entry,line) {
    $echo('#ai-echo-selected-name').textContent = record.name;
    $echo('#ai-echo-reveal-title').textContent = '「' + line + '」';
    const why = $echo('#ai-echo-why-content');
    why.replaceChildren();
    const factHeading = document.createElement('h3');
    factHeading.textContent = '考古事实 · 图录记录';
    const fact = document.createElement('p');
    fact.textContent = record.description || '该条记录没有提供可展示的器物描述。';
    const source = record.sources?.[0];
    const cite = document.createElement('p');
    cite.className = 'ai-echo-citation';
    cite.textContent = source ? (source.title || '来源标题待核实') + ' · ' + (source.locator || '出处定位待核实') + ' · ' + (record.record_status === 'needs_review' ? '资料待复核' : record.record_status || '状态待核实') : '本条记录未附来源定位，待补核。';
    why.append(factHeading,fact,cite);
    const media = (record.media || []).find(item => item && item.media_type === 'image');
    if (media) {
      const mediaNote = document.createElement('p');
      mediaNote.className = 'ai-echo-citation';
      mediaNote.textContent = '图片说明：' + (media.creator || '图录配图') + '；' + (media.attribution || '署名待核实') + '；权利状态：' + (media.license || media.rights_status || '待核实') + '。';
      why.append(mediaNote);
    }
    const inferenceHeading = document.createElement('h3');
    inferenceHeading.textContent = '学者推论 · 保持开放';
    const inference = document.createElement('p');
    inference.textContent = entry.inferenceNote;
    why.append(inferenceHeading,inference);
    (entry.interpretationSources || []).forEach(item => {
      const expertSource = document.createElement('a');
      expertSource.className = 'ai-echo-source-link';
      expertSource.href = item.url;
      expertSource.target = '_blank';
      expertSource.rel = 'noopener noreferrer';
      expertSource.textContent = item.title + ' · ' + item.locator + ' ↗';
      why.append(expertSource);
    });
    const artHeading = document.createElement('h3');
    artHeading.textContent = '艺术表达 · 当代创作';
    const art = document.createElement('p');
    const themeLabel = state.config.themes.find(item => item.id === state.theme)?.label || '暂不选择';
    art.textContent = entry.artNote + ' 本句结合“' + themeLabel + '”主题与所选器物生成。';
    why.append(artHeading,art);
    if (source?.url) {
      const sourceLink = document.createElement('a');
      sourceLink.className = 'ai-echo-source-link';
      sourceLink.href = source.url;
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener noreferrer';
      sourceLink.textContent = '打开来源机构入口';
      why.append(sourceLink);
    }
    const detailLink = document.createElement('a');
    detailLink.className = 'ai-echo-source-link';
    detailLink.href = '/?artifact=' + encodeURIComponent(record.slug || record.id);
    detailLink.textContent = '查看 ' + record.name + ' 档案 ↗';
    why.append(detailLink);
  }
  async function activateRoom() {
    if (!document.body.classList.contains('ai-echo-room-mode')) return;
    setVideo(true);
    $echo('#ai-echo-loading').hidden = false;
    $echo('#ai-echo-error').hidden = true;
    $echo('#ai-echo-choice-content').hidden = true;
    try {
      const result = await loadData();
      if (!document.body.classList.contains('ai-echo-room-mode')) return;
      renderCards(result.malformed);
      $echo('#ai-echo-loading').hidden = true;
      $echo('#ai-echo-choice-content').hidden = false;
      setTheme(state.theme);
    } catch (error) {
      $echo('#ai-echo-loading').hidden = true;
      $echo('#ai-echo-error').hidden = false;
      $echo('#ai-echo-error').querySelector('p').textContent = '器物档案读取失败：' + error.message;
    }
  }
  function deactivateRoom() { $echo('#ai-echo-video')?.pause(); }
  function resetRoom() {
    state.selectedId = '';
    state.theme = 'seeking';
    state.revealIndex = 0;
    setTheme('seeking');
    setView(false);
    $echo('#ai-echo-why').open = false;
  }
  room.addEventListener('click',event => {
    const theme = event.target.closest('[data-theme]');
    if (theme) { setTheme(theme.dataset.theme); return; }
    if (event.target.closest('#ai-echo-skip')) {
      setTheme('');
      return;
    }
    if (event.target.closest('#ai-echo-random')) {
      const available = artifactIds.filter(id => state.records.has(id) && state.config?.artifacts.some(entry => entry.id === id));
      if (available.length) void reveal(available[Math.floor(Math.random() * available.length)]);
      return;
    }
    if (event.target.closest('#ai-echo-again')) {
      const record = state.records.get(state.selectedId);
      const entry = state.config?.artifacts.find(item => item.id === state.selectedId);
      if (record && entry) { state.revealIndex += 1; void reveal(state.selectedId); }
      return;
    }
    if (event.target.closest('#ai-echo-change') || event.target.closest('#ai-echo-return')) {
      setView(false);
      room.querySelector('.ai-echo-select')?.focus({preventScroll:true});
      return;
    }
    if (event.target.closest('#ai-echo-retry')) { state.dataPromise = null; activateRoom(); }
  });
  reducedMotion.addEventListener?.('change',() => setVideo(document.body.classList.contains('ai-echo-room-mode')));
  $echo('#ai-echo-video').addEventListener('error',() => {
    room.classList.add('is-video-fallback');
    $echo('#ai-echo-video-error').hidden = false;
  });
  $echo('#ai-echo-video').addEventListener('loadeddata',() => {
    room.classList.remove('is-video-fallback');
    $echo('#ai-echo-video-error').hidden = true;
  });
  window.addEventListener('ai-echo-room:activate',activateRoom);
  window.addEventListener('ai-echo-room:deactivate',deactivateRoom);
  window.addEventListener('ai-exhibition:reset',resetRoom);
  window.addEventListener('pagehide',deactivateRoom);
  const params = new URLSearchParams(location.search);
  if (params.get('page') === 'ai-exhibition' && params.get('room') === 'echo') activateRoom();
})();
