(() => {
  const KEY = 'sd-learning-connections-v1';
  const $ = (s, root = document) => root.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const root = $('#lc-app');
  const loading = $('#lc-loading');
  const error = $('#lc-error');
  const printSheet = $('#lc-print-sheet');
  let dataPromise;
  let data;
  let state;

  const freshStation = () => ({readIndex:0, readComplete:false, active:false, focus:'form', choice:'', submitted:false, confidence:'', note:''});
  const freshState = () => ({station:0, answers:[], updatedAt:''});
  function normalizeState(saved) {
    const next = freshState();
    next.answers = data.stations.map((_, index) => ({...freshStation(), ...(saved?.answers?.[index] || {})}));
    next.station = Math.max(0, Math.min(data.stations.length, Number(saved?.station) || 0));
    return next;
  }
  function restore(savedOverride) {
    try { return normalizeState(savedOverride === undefined ? JSON.parse(localStorage.getItem(KEY) || 'null') : savedOverride); }
    catch { return normalizeState(null); }
  }
  function save() {
    state.updatedAt = new Date().toISOString();
    if (window.LearningProgress) {
      void window.LearningProgress.save('learning_connections',state,KEY,'研学进度已保存').catch(error => {
        const note = root.querySelector('.lc-local-note');
        if (note) note.textContent = `保存失败：${error.message || '请重试。'}`;
      });
      return;
    }
    if (!window.AccountData?.authenticated) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} return; }
    void window.AccountData.save('learning_connections','state',state,KEY).catch(error => {
      const note = root.querySelector('.lc-local-note');
      if (note) note.textContent = `账号保存失败：${error.message || '请重试。'}`;
    });
  }
  function load() {
    if (!dataPromise) dataPromise = fetch('/data/manifest.json').then(response => {
      if (!response.ok) throw new Error(`数据清单读取失败（HTTP ${response.status}）`);
      return response.json();
    }).then(manifest => {
      const entry = manifest.files?.find(file => file.path === 'learning/connections.json');
      if (!entry) throw new Error('manifest.json 中没有 learning/connections.json');
      return fetch(entry.url).then(response => {
        if (!response.ok) throw new Error(`研学资料读取失败（HTTP ${response.status}）`);
        return response.json();
      });
    });
    return dataPromise;
  }
  const citation = (station, reading = null) => `<div class="lc-citation"><span>${esc(data.book.title)} · ${esc(data.book.author)}</span><b>${esc(reading?.locator || `${station.chapter}，见下列来源定位`)}</b>${reading ? `<small>${esc(reading.voice)} · ${esc(reading.type)}</small>` : ''}</div>`;
  const completedCount = () => state.answers.filter(answer => answer.submitted).length;
  const setProgress = () => {
    const label = $('#lc-progress-label');
    const track = $('.lc-progress-track');
    const done = completedCount();
    label.textContent = state.station >= data.stations.length ? '三站完成 · 调查记录' : `第 ${state.station + 1} / 3 站 · ${state.answers[state.station]?.readComplete ? '互动调查' : '先读资料'}`;
    track?.setAttribute('aria-valuenow', String(done));
    if (track) track.querySelector('i').style.width = `${done / data.stations.length * 100}%`;
  };

  function render() {
    if (!data || !state || !root) return;
    setProgress();
    if (state.station >= data.stations.length) {
      root.innerHTML = renderFinish();
      bindFinish();
      notifyAssistantContext();
      return;
    }
    const station = data.stations[state.station];
    const answer = state.answers[state.station];
    root.innerHTML = `<nav class="lc-station-nav" aria-label="证据调查站点">${data.stations.map((item, index) => `<button type="button" data-station="${index}" ${index > completedCount() ? 'disabled' : ''} class="${index===state.station?'is-current':''} ${state.answers[index].submitted?'is-done':''}" aria-current="${index===state.station?'step':'false'}"><span>${item.number}</span><b>${esc(item.title)}</b><small>${state.answers[index].submitted?'已完成':index===state.station?'正在调查':'待开始'}</small></button>`).join('')}</nav>
      <section class="lc-station" aria-labelledby="lc-station-title"><header class="lc-station-heading"><div><p class="lc-eyebrow">${esc(station.chapter)}　/　${esc(station.chapterTitle)}</p><h2 id="lc-station-title">${esc(station.title)} <small>${esc(station.subtitle)}</small></h2></div><span class="lc-station-count">0${station.number} <i>/</i> 03</span></header>
        ${renderReading(station, answer)}
        ${answer.active && answer.readComplete ? renderInteraction(station, answer) : ''}
        ${answer.submitted ? renderFeedback(station, answer) : ''}
        ${answer.submitted ? `<div class="lc-station-nav-actions"><button type="button" class="button button-outline" data-back-reading>返回阅读材料</button><button type="button" class="button button-gold" data-next-station>${state.station===data.stations.length-1?'完成调查，查看记录':'进入下一站'} <span aria-hidden="true">↗</span></button></div>` : ''}
      </section>`;
    bindStation(station, answer);
    notifyAssistantContext();
  }

  function renderReading(station, answer) {
    const reading = station.reading[answer.readIndex] || station.reading[station.reading.length - 1];
    const progress = answer.readComplete ? station.reading.length : Math.min(answer.readIndex + 1, station.reading.length);
    return `<section class="lc-reading" aria-labelledby="lc-reading-title"><div class="lc-reading-heading"><div><p class="lc-eyebrow">READ FIRST · ${esc(station.chapter)}</p><h3 id="lc-reading-title">${esc(reading.title)}</h3></div><span role="status" aria-live="polite">阅读材料 ${progress} / ${station.reading.length}</span></div><div class="lc-reading-grid"><article class="lc-reading-copy" data-assistant-material="${station.id}:passage:${answer.readIndex}"><p class="lc-reading-type">${esc(reading.type)}</p><p>${esc(reading.text)}</p>${reading.quote ? `<blockquote>${esc(reading.quote)}</blockquote>` : ''}${citation(station, reading)}<details><summary>资料定位与阅读说明</summary><p>${esc(data.book.sourceNote)} 本站文字是页面编辑性转述；引号中的短语为书中核对过的短引文。</p></details></article><aside class="lc-reading-aside"><span>阅读线索</span><b>${esc(station.subtitle)}</b><p>先区分材料本身、研究者的解释和仍需补充的证据。不要从一个相似特征直接跳到来源或族属结论。</p><div class="lc-reading-counter">${String(progress).padStart(2,'0')}<i> / </i>${String(station.reading.length).padStart(2,'0')}</div></aside></div><div class="lc-reading-actions">${answer.readIndex>0 && !answer.readComplete ? '<button type="button" class="button button-outline" data-reading-prev>上一段</button>' : ''}${!answer.readComplete ? `<button type="button" class="button button-gold" data-reading-next>${answer.readIndex===station.reading.length-1?'读完资料，进入观察':'读完本段，继续'} <span aria-hidden="true">↗</span></button>` : `<span class="lc-read-complete" role="status">资料已读 · 互动已开放</span><button type="button" class="button button-outline" data-toggle-reading>${answer.active?'收起阅读材料':'重新查看阅读材料'}</button>`}</div></section>`;
  }

  function renderInteraction(station, answer) {
    const markup=station.visual.kind === 'craft' ? renderCraft(station, answer) : station.visual.kind === 'jinsha' ? renderJinsha(station, answer) : renderShu(station, answer);
    return markup.replace('<button type="button" class="button button-gold" data-submit-answer', `<label class="lc-assistant-reason">我的理由<textarea data-assistant-reason maxlength="800" rows="3">${esc(answer.note)}</textarea></label><button type="button" class="learning-assistant-review-reason" data-assistant-check-reason="lc-reason">请助手看看我的理由</button><button type="button" class="button button-gold" data-submit-answer`);
  }

  function renderCraft(station, answer) {
    const visual = station.visual;
    const focus = visual.layers.find(item => item.id === answer.focus) || visual.layers[0];
    return `<section class="lc-interaction lc-craft-lab" aria-labelledby="lc-interaction-title"><div class="lc-interaction-title"><div><p class="lc-eyebrow">OBSERVE &amp; DISASSEMBLE · 观察与拆解</p><h3 id="lc-interaction-title">从器物图版到工艺论证</h3><p>点选观察层，查看“看得见什么、研究者如何解释、还需什么证据”。</p></div><span class="lc-source-chip">示意结构 · 非制作流程复原</span></div><div class="lc-craft-grid"><figure class="lc-craft-plate"><div class="lc-craft-image"><img src="${esc(visual.image)}" alt="${esc(visual.alt)}" loading="lazy" onerror="this.closest('.lc-craft-plate').classList.add('is-image-missing')"><div class="lc-image-missing" role="status">图录图版暂时无法加载；可继续使用右侧结构示意与来源文字。</div></div><figcaption>${esc(visual.caption)}</figcaption><div class="lc-layer-tabs" role="group" aria-label="选择工艺观察层">${visual.layers.map((layer, index) => `<button type="button" data-craft-layer="${layer.id}" aria-pressed="${answer.focus===layer.id}" class="${answer.focus===layer.id?'is-selected':''}"><span>0${index+1}</span><b>${esc(layer.label)}</b></button>`).join('')}</div></figure><div class="lc-craft-explainer"><div class="lc-craft-schematic" role="img" aria-label="工艺比较的阅读路径示意，不对应铜神树实物结构拆解"><div class="lc-schematic-part part-a ${answer.focus==='form'?'is-active':''}"><i>01</i><b>器物形态</b></div><span class="lc-schematic-link" aria-hidden="true">↓</span><div class="lc-schematic-part part-b ${answer.focus==='method'?'is-active':''}"><i>02</i><b>制作方法比较</b></div><span class="lc-schematic-link" aria-hidden="true">↓</span><div class="lc-schematic-part part-c ${answer.focus==='limits'?'is-active':''}"><i>03</i><b>来源与传播解释</b></div><small>${esc(visual.schematicNote)}</small></div><article class="lc-craft-detail" aria-live="polite"><span>${esc(focus.tag)}</span><h4>${esc(focus.title)}</h4><p>${esc(focus.body)}</p><small>${esc(focus.source)}</small></article></div></div><fieldset class="lc-judgment-choice"><legend>${esc(visual.judgmentPrompt)}</legend>${visual.judgments.map(option => `<label><input type="radio" name="lc-choice" value="${option.id}" ${answer.choice===option.id?'checked':''}><span>${esc(option.label)}</span></label>`).join('')}</fieldset><button type="button" class="button button-gold" data-submit-answer ${answer.submitted?'disabled':''}>提交我的判断</button></section>`;
  }

  function renderJinsha(station, answer) {
    const visual = station.visual;
    const feature = visual.features.find(item => item.id === answer.focus) || visual.features[0];
    return `<section class="lc-interaction lc-jinsha-lab" aria-labelledby="lc-interaction-title"><div class="lc-interaction-title"><div><p class="lc-eyebrow">PARALLEL COMPARISON · 并列比较</p><h3 id="lc-interaction-title">时间、位置与材料并置</h3><p>切换比较维度，观察书中如何描述两类遗存；图像不够时，让来源文字承担证据。</p></div><span class="lc-source-chip">不画迁徙路线</span></div><div class="lc-jinsha-timelines">${visual.timeline.map((item, index) => `<article class="lc-timeline-lane lane-${index+1}"><div class="lc-lane-name"><span>0${index+1}</span><b>${esc(item.label)}</b></div><div class="lc-lane-track"><span class="lc-lane-period">${esc(item.range)}</span><i class="lane-marker"></i><small>${esc(item.date)}</small></div><button type="button" data-focus="${item.id}" aria-label="查看${esc(item.label)}时间线来源">查看出处 · ${esc(item.locator)}</button></article>`).join('')}</div><div class="lc-map-gallery-grid"><figure class="lc-relative-map"><figcaption><span>区域位置关系示意</span><small>不按比例 · 无坐标落点</small></figcaption><svg viewBox="0 0 600 330" role="img" aria-label="成都平原三星堆与金沙位置关系的文字关系示意，非比例地图"><path class="plain-field" d="M115 28 C205 8 332 36 478 58 L532 117 L477 273 L349 305 L170 282 L73 188 Z"/><text x="300" y="171" class="plain-label">成都平原</text><path d="M216 91 L375 236" class="no-route-line"/><g class="map-site sanxingdui"><circle cx="216" cy="91" r="8"/><text x="235" y="88">三星堆遗址</text><small x="235" y="107">广汉 · PDF 第116页</small></g><g class="map-site jinsha"><circle cx="375" cy="236" r="8"/><text x="394" y="233">金沙遗址</text><small x="394" y="252">成都 · PDF 第116—117页</small></g></svg><p>${esc(visual.mapNote)}</p></figure><div class="lc-comparison-gallery"><div class="lc-gallery-images">${visual.galleryImages.map((item, index) => `<figure class="lc-gallery-object"><div class="lc-gallery-image ${item.image?'':'is-text-only'}">${item.image?`<img src="${esc(item.image)}" alt="${esc(item.name)}，图录图版" loading="lazy" onerror="this.closest('.lc-gallery-object').classList.add('is-image-missing')}"><span class="lc-image-missing">图像不可用；保留文字来源</span>`:`<span>馆际对照<br>图像未接入</span>`}</div><figcaption><b>${esc(item.name)}</b><small>${esc(item.site)} · ${esc(item.caption)}</small></figcaption></figure>`).join('')}</div><div class="lc-feature-tabs" role="group" aria-label="选择比较维度">${visual.features.map((item,index)=>`<button type="button" data-feature="${item.id}" aria-pressed="${answer.focus===item.id}" class="${answer.focus===item.id?'is-selected':''}"><span>0${index+1}</span>${esc(item.label)}</button>`).join('')}</div><article class="lc-feature-inspector" aria-live="polite"><span>${esc(feature.status)}</span><div><section><small>三星堆一侧</small><p>${esc(feature.sanxingdui)}</p></section><section><small>金沙一侧</small><p>${esc(feature.jinsha)}</p></section></div><b>${esc(feature.locator)}</b></article></div></div><fieldset class="lc-judgment-choice"><legend>${esc(visual.judgmentPrompt)}</legend>${visual.judgments.map(option => `<label><input type="radio" name="lc-choice" value="${option.id}" ${answer.choice===option.id?'checked':''}><span>${esc(option.label)}</span></label>`).join('')}</fieldset><button type="button" class="button button-gold" data-submit-answer ${answer.submitted?'disabled':''}>提交比较判断</button></section>`;
  }

  function renderShu(station, answer) {
    const visual = station.visual;
    return `<section class="lc-interaction lc-shu-lab" aria-labelledby="lc-interaction-title"><div class="lc-interaction-title"><div><p class="lc-eyebrow">TWO EVIDENCE TRACKS · 双层时间线</p><h3 id="lc-interaction-title">把材料放在自己的时间与性质轨道</h3><p>选择考古材料和一项文献称谓，再判断它们之间可以怎样表达。</p></div><span class="lc-source-chip">连线是你的研究判断，不代表已证实互证</span></div><div class="lc-dual-timeline"><div class="lc-track-label"><span>轨道 A</span><b>${esc(visual.archaeologyLabel)}</b></div><div class="lc-archaeology-band"><span class="lc-band-mark" aria-hidden="true"></span><b>三星堆遗址考古材料</b><span>${esc(visual.archaeologyRange)}</span><small>${esc(visual.archaeologySource)}</small></div><div class="lc-track-label"><span>轨道 B</span><b>文献中的“蜀”称谓</b></div><div class="lc-text-timeline">${visual.texts.map((item,index)=>`<button type="button" data-text-source="${item.id}" class="${answer.focus===item.id?'is-selected':''}" aria-pressed="${answer.focus===item.id}"><span>0${index+1}</span><b>${esc(item.label)}</b><small>${esc(item.when)}</small><i>${esc(item.locator)}</i></button>`).join('')}</div><svg class="lc-connection-lines" viewBox="0 0 900 115" role="img" aria-label="展示用户选择的两类材料关系，线型代表证据强度选择"><path d="M170 20 C350 110 555 110 730 20" class="connection-preview ${answer.focus?'is-visible':''} ${answer.confidence==='direct'?'is-direct':answer.confidence==='hypothesis'?'is-hypothesis':'is-distant'}"/><text x="450" y="91" text-anchor="middle">${answer.focus?`正在尝试对读：${esc(visual.texts.find(item=>item.id===answer.focus)?.label)} ↔ 考古材料`:'选择文献节点后，在下方标注联系强度'}</text></svg></div><fieldset class="lc-connection-strength"><legend>这条连线的证据强度，你会如何标注？</legend>${[{id:'direct',label:'有材料直接互证'},{id:'hypothesis',label:'研究者可讨论的对应解释'},{id:'distant',label:'证据有距离，暂不作对应'}].map(item=>`<label><input type="radio" name="lc-confidence" value="${item.id}" ${answer.confidence===item.id?'checked':''}><span>${esc(item.label)}</span></label>`).join('')}</fieldset><fieldset class="lc-judgment-choice"><legend>你对这条联系的总体判断</legend>${visual.connections.map(item=>`<label><input type="radio" name="lc-choice" value="${item.id}" ${answer.choice===item.id?'checked':''}><span>${esc(item.label)}</span></label>`).join('')}</fieldset><button type="button" class="button button-gold" data-submit-answer ${answer.submitted?'disabled':''}>提交连线判断</button></section>`;
  }

  function renderFeedback(station, answer) {
    const visual = station.visual;
    const judgments = visual.judgments || visual.connections;
    const selected = judgments.find(item => item.id === answer.choice);
    const aligned = answer.choice === visual.bestSupported;
    const label = aligned ? '与材料较相符' : '需要收紧推论';
    const note = station.visual.kind === 'shu' ? visual.connections.find(item => item.id === answer.choice)?.feedback : selected?.feedback;
    const confidenceNote = station.visual.kind === 'shu' && answer.confidence === 'direct'
      ? '你把关系标为“有材料直接互证”；但本章指出，考古文化与古代文献称谓之间仍缺少足以直接等同的同时期文字材料。'
      : '';
    return `<section class="lc-feedback ${aligned?'is-aligned':'is-caution'}" aria-live="polite"><div class="lc-feedback-mark" aria-hidden="true">${aligned?'↗':'?'}</div><div><p class="lc-eyebrow">${label}</p><h3>${aligned?'你保留了证据层级':'这一步需要更多证据'}</h3><p>${esc(note || '所选判断已记录。请回看图像、比较材料与来源定位。')} ${esc(confidenceNote)}</p><small>反馈依据：${esc(station.sources.map(source=>source.locator).join('；'))}</small></div></section>`;
  }

  function renderFinish() {
    const summaries = data.stations.map((station, index) => {
      const answer = state.answers[index];
      const options = station.visual.judgments || station.visual.connections;
      const selected = options.find(item => item.id === answer.choice);
      const source = station.sources.map(item => `${item.title} · ${item.locator}`).join('；');
      return `<article class="lc-record-entry"><span>${station.number} · ${esc(station.chapter)}</span><h3>${esc(station.title)}</h3><p>我的选择：${esc(selected?.label || '尚未提交')}</p><p>${esc(selected?.feedback || '返回本调查站继续操作。')}</p><small>${esc(source)}</small><button type="button" data-review-station="${index}">回看本站材料 ↗</button></article>`;
    }).join('');
    return `<section class="lc-finish" aria-labelledby="lc-finish-title"><p class="lc-eyebrow">MY EVIDENCE NOTES · 调查记录</p><h2 id="lc-finish-title">相似是一条线索，论证还要继续</h2><p>这份记录汇总你在工艺比较、三星堆与金沙材料对读、文献称谓连线中的选择。它不计算正确率，也不替争议问题给出定论。</p><div class="lc-finish-diagram" role="img" aria-label="三站证据路径汇总示意"><span>形态与工艺</span><i>比较</i><span>遗址与器物</span><i>对读</i><span>考古材料与称谓</span></div><div class="lc-record-grid">${summaries}</div><div class="lc-finish-actions"><button type="button" class="button button-gold" data-print-record>打印研学记录</button><button type="button" class="button button-outline" data-restart>重新体验</button><button type="button" class="button button-outline" data-review-station="0">返回第一站</button></div><p class="lc-local-note">${window.AccountData?.authenticated?'进度已同步到当前账号。':'进度仅保存在本机浏览器。'}</p></section>`;
  }

  function bindStation(station, answer) {
    root.querySelectorAll('[data-reading-next]').forEach(button => button.addEventListener('click', () => {
      if (answer.readIndex < station.reading.length - 1) answer.readIndex += 1;
      else { answer.readComplete = true; answer.active = true; }
      save(); render();
    }));
    root.querySelectorAll('[data-reading-prev]').forEach(button => button.addEventListener('click', () => { answer.readIndex = Math.max(0, answer.readIndex - 1); save(); render(); }));
    root.querySelectorAll('[data-toggle-reading]').forEach(button => button.addEventListener('click', () => { answer.active = !answer.active; save(); render(); }));
    root.querySelectorAll('[data-back-reading]').forEach(button => button.addEventListener('click', () => { answer.active = false; save(); render(); root.querySelector('.lc-reading')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); }));
    root.querySelectorAll('[data-craft-layer]').forEach(button => button.addEventListener('click', () => { answer.focus = button.dataset.craftLayer; save(); render(); }));
    root.querySelectorAll('[data-feature]').forEach(button => button.addEventListener('click', () => { answer.focus = button.dataset.feature; save(); render(); }));
    root.querySelectorAll('[data-focus]').forEach(button => button.addEventListener('click', () => { answer.focus = button.dataset.focus; save(); render(); }));
    root.querySelectorAll('[data-text-source]').forEach(button => button.addEventListener('click', () => { answer.focus = button.dataset.textSource; save(); render(); }));
    root.querySelectorAll('[data-station]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.station);
      if (index <= completedCount()) { state.station = index; save(); render(); }
    }));
    root.querySelectorAll('input[name="lc-choice"]').forEach(input => input.addEventListener('change', () => { answer.choice = input.value; save(); }));
    root.querySelectorAll('input[name="lc-confidence"]').forEach(input => input.addEventListener('change', () => { answer.confidence = input.value; save(); render(); }));
    root.querySelector('[data-assistant-reason]')?.addEventListener('input', event => { answer.note=event.target.value; save(); notifyAssistantContext(); });
    root.querySelectorAll('[data-submit-answer]').forEach(button => button.addEventListener('click', () => {
      if (!answer.choice) { button.insertAdjacentHTML('afterend','<p class="lc-validation" role="alert">请先选择一项判断，再提交。</p>'); return; }
      if (station.visual.kind === 'shu' && (!answer.focus || !answer.confidence)) { button.insertAdjacentHTML('afterend','<p class="lc-validation" role="alert">请先选择一项文献材料，并标注连线强度。</p>'); return; }
      answer.submitted = true; save(); render(); root.querySelector('.lc-feedback')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
    }));
    root.querySelectorAll('[data-next-station]').forEach(button => button.addEventListener('click', () => { state.station += 1; save(); render(); window.scrollTo({top:0,behavior:'auto'}); }));
  }

  function bindFinish() {
    root.querySelectorAll('[data-review-station]').forEach(button => button.addEventListener('click', () => { state.station = Number(button.dataset.reviewStation); save(); render(); window.scrollTo({top:0,behavior:'auto'}); }));
    root.querySelector('[data-restart]')?.addEventListener('click', () => { state = normalizeState(null); save(); render(); window.scrollTo({top:0,behavior:'auto'}); });
    root.querySelector('[data-print-record]')?.addEventListener('click', () => {
      printSheet.innerHTML = `<p>三星堆 · 研学记录卡</p><h1>${esc(data.title)}</h1><p>${esc(data.question)}</p>${data.stations.map((station,index)=>{const answer=state.answers[index];const choices=station.visual.judgments||station.visual.connections;const selected=choices.find(item=>item.id===answer.choice);return `<article><h2>${station.number}　${esc(station.title)}</h2><p>我的选择：${esc(selected?.label||'未提交')}</p><p>${esc(selected?.feedback||'')}</p><small>${esc(station.sources.map(source=>`${source.title}，${source.locator}`).join('；'))}</small></article>`;}).join('')}<p class="lc-print-source">${esc(data.book.title)} · ${esc(data.book.author)} · ${esc(data.book.sourceNote)}</p>`;
      printSheet.hidden = false;
      window.addEventListener('afterprint', () => { printSheet.hidden = true; }, {once:true});
      window.print();
    });
  }

  function assistantContext() {
    if(!data||!state)return null;
    const index=Math.min(state.station,data.stations.length-1),station=data.stations[index],answer=state.answers[index];
    if(!station||!answer)return null;
    const atRecord=state.station>=data.stations.length;
    const stage=answer.submitted?'judgment':answer.readComplete?'evidence':'reading';
    const studentWork={choice:answer.choice,focus:answer.focus,confidence:answer.confidence,note:answer.note};
    return {path:'connections',taskId:station.id,taskTitle:atRecord?'我的证据调查记录':station.title,materialId:atRecord?'record':station.id,stage,submitted:answer.submitted,choice:JSON.stringify(studentWork),question:station.visual.judgmentPrompt||station.title,reasonText:answer.note||''};
  }
  function notifyAssistantContext(){window.dispatchEvent(new CustomEvent('learning-assistant:context-changed',{detail:assistantContext()}));}
  function revisitAssistantMaterial(materialId){const match=/^connections:([^:]+):passage:(\d+)$/.exec(materialId||'');if(!match||!data)return;const index=data.stations.findIndex(item=>item.id===match[1]);if(index<0)return;const answer=state.answers[index];answer.readIndex=Math.max(0,Math.min(Number(match[2])||0,data.stations[index].reading.length-1));state.station=index;render();requestAnimationFrame(()=>{const target=root.querySelector(`[data-assistant-material="${match[1]}:passage:${answer.readIndex}"]`);target?.scrollIntoView({behavior:'smooth',block:'center'});if(target){target.classList.remove('learning-assistant-preview');void target.offsetWidth;target.classList.add('learning-assistant-preview');}});}
  window.LearningConnections={getAssistantContext:assistantContext,revisitAssistantMaterial};

  window.addEventListener('learning-connections:activate', async () => {
    if (!root) return;
    root.hidden = true; loading.hidden = false; error.hidden = true;
    try {
      data = await load();
      state = restore(await window.AccountData.load('learning_connections','state',KEY,null));
      loading.hidden = true; error.hidden = true; root.hidden = false;
      render();
    } catch (reason) {
      loading.hidden = true; error.hidden = false; $('#lc-error-message').textContent = reason?.message || '未知读取错误';
    }
  });
  $('#lc-retry')?.addEventListener('click', () => { dataPromise = null; window.dispatchEvent(new Event('learning-connections:activate')); });
  window.addEventListener('account-user-changed',()=>{state=null;if(document.body.classList.contains('learning-connections-mode'))window.dispatchEvent(new Event('learning-connections:activate'));});
  window.addEventListener('account-record-deleted',event=>{if(event.detail?.collection==='learning_connections')state=null;});
})();
