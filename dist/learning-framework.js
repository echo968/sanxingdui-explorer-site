(() => {
  const KEY = 'sd-learning-framework-v1';
  const root = document.getElementById('lf-app');
  const loading = document.getElementById('lf-loading');
  const errorBox = document.getElementById('lf-error');
  const errorText = document.getElementById('lf-error-message');
  const printSheet = document.getElementById('lf-print-sheet');
  let dataPromise = null;
  let data = null;
  let state = null;
  let active = false;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const loadData = () => {
    if (!dataPromise) dataPromise = fetch('/data/manifest.json').then(response => {
      if (!response.ok) throw new Error(`数据清单读取失败（HTTP ${response.status}）`);
      return response.json();
    }).then(manifest => {
      const entry = manifest.files?.find(file => file.path === 'learning/framework.json');
      if (!entry) throw new Error('manifest.json 中没有 learning/framework.json');
      return fetch(entry.url).then(response => {
        if (!response.ok) throw new Error(`研学配置读取失败（HTTP ${response.status}）：${entry.url}`);
        return response.json();
      });
    });
    return dataPromise;
  };

  function freshState() {
    return {station:0, stations:data.stations.map(station => ({read:[], lower:station.task.initialLower ?? null, upper:station.task.initialUpper ?? null, selectedEvidence:'', layer:'', choice:'', observations:[], links:[], submitted:false, correct:false})), reflection:'', updatedAt:new Date().toISOString()};
  }
  function restoreState(savedOverride) {
    try {
      const parsed = savedOverride === undefined ? JSON.parse(localStorage.getItem(KEY) || 'null') : savedOverride;
      if (!parsed || !Array.isArray(parsed.stations) || parsed.stations.length !== data.stations.length) return freshState();
      return {...freshState(), ...parsed, station:Math.max(0, Math.min(data.stations.length, Number(parsed.station) || 0)), stations:data.stations.map((item,index) => ({...freshState().stations[index], ...parsed.stations[index]}))};
    } catch { return freshState(); }
  }
  function saveState() {
    state.updatedAt = new Date().toISOString();
    if (window.LearningProgress) {
      void window.LearningProgress.save('learning_framework',state,KEY,'研学进度已保存').catch(error => {
        const status = root.querySelector('#lf-save-status');
        if (status) status.textContent = `保存失败：${error.message || '请重试。'}`;
      });
      return;
    }
    if (!window.AccountData?.authenticated) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} return; }
    void window.AccountData.save('learning_framework','state',state,KEY).catch(error => {
      const status = root.querySelector('#lf-save-status');
      if (status) status.textContent = `账号保存失败：${error.message || '请重试。'}`;
    });
  }
  function status(text, kind='neutral') {
    return `<p class="lf-feedback lf-feedback-${kind}" role="status" aria-live="polite"><b>${kind === 'correct' ? '符合材料' : kind === 'review' ? '与材料存在差异' : '观察提示'}</b><span>${escapeHtml(text)}</span></p>`;
  }
  function citation(passage) {
    return `<div class="lf-citation"><span>${escapeHtml(passage.voice)}</span><span>${escapeHtml(data.book.title)} · ${escapeHtml(data.book.author)} · ${escapeHtml(passage.locator)}</span><span>${escapeHtml(passage.sourceType)}</span></div>`;
  }
  function currentIndex() { return Math.min(state.station, data.stations.length - 1); }
  function render() {
    if (!data || !state || !root) return;
    const doneCount = state.stations.filter(item => item.submitted).length;
    const atEnd = state.station >= data.stations.length;
    document.getElementById('lf-overall-progress').textContent = atEnd ? '四站完成 · 历史框架记录' : `第 ${state.station + 1} / ${data.stations.length} 站`;
    const progress = document.querySelector('.lf-overall-track');
    progress?.setAttribute('aria-valuenow', String(doneCount));
    if (progress) progress.querySelector('i').style.width = `${doneCount / data.stations.length * 100}%`;
    if (atEnd) { renderRecord(); notifyAssistantContext(); return; }
    const station = data.stations[currentIndex()];
    const stationState = state.stations[currentIndex()];
    root.innerHTML = `<nav class="lf-station-nav" aria-label="研学站点">${data.stations.map((item,index) => `<button type="button" data-station="${index}" ${index > doneCount ? 'disabled' : ''} class="${index === currentIndex() ? 'is-current' : ''} ${state.stations[index].submitted ? 'is-done' : ''}" aria-current="${index === currentIndex() ? 'step' : 'false'}"><span>${item.number}</span><b>${escapeHtml(item.title)}</b><small>${state.stations[index].submitted ? '已完成' : index === currentIndex() ? '进行中' : '待开始'}</small></button>`).join('')}</nav>
      <section class="lf-station" aria-labelledby="lf-station-title"><header class="lf-station-head"><p class="lf-kicker">${escapeHtml(station.chapter)}　/　${escapeHtml(station.chapterTitle)}</p><h2 id="lf-station-title">${escapeHtml(station.title)}</h2><p>${escapeHtml(data.question)}</p></header>
      ${renderReading(station,stationState)}${stationState.read.length === station.passages.length ? `${renderInteraction(station,stationState)}${stationState.inputError ? `<p class="lf-input-error" role="alert">${escapeHtml(stationState.inputError)}</p>` : ''}` : ''}
      ${stationState.submitted ? `<div class="lf-after-submit">${status(station.task.feedback,stationState.correct ? 'correct' : 'review')}<p class="lf-reflection"><b>继续想一想</b>${escapeHtml(station.reflection)}</p><div class="lf-actions">${currentIndex() < data.stations.length - 1 ? `<button class="button button-gold" type="button" data-next-station>进入下一站 <span aria-hidden="true">↗</span></button>` : `<button class="button button-gold" type="button" data-finish>整理我的历史框架 <span aria-hidden="true">↗</span></button>`}<button class="button button-outline" type="button" data-reread>返回阅读本章</button></div></div>` : ''}</section>
      <p class="lf-local-note" role="status">${window.AccountData?.authenticated?'进度自动同步到当前账号。':'进度仅保存在此浏览器本机。'}原书纸书页码在当前核对版本中未能确认，页面注明 PDF 页码。</p>`;
    bindStation(station,stationState);
    notifyAssistantContext();
  }
  function renderReading(station,stationState) {
    return `<section class="lf-reading" aria-labelledby="lf-reading-heading"><div class="lf-section-title"><div><p class="lf-step-label">先读原书　/　READ THE SOURCE</p><h3 id="lf-reading-heading">阅读材料</h3></div><span>${stationState.read.length} / ${station.passages.length} 段已阅读</span></div><p class="lf-reading-intro">以下为《${escapeHtml(data.book.title)}》${escapeHtml(station.chapter)}的连续原文摘录。请先阅读材料，再进入操作。</p><div class="lf-passage-list">${station.passages.map((passage,index) => {
      const read = stationState.read.includes(index);
      return `<details class="lf-passage" open data-assistant-material="${station.id}:passage:${index}"><summary><span>${String(index+1).padStart(2,'0')}</span>${escapeHtml(passage.title)}<span class="lf-read-mark">${read ? '已读 ✓' : '原文'}</span></summary><blockquote><p>${escapeHtml(passage.text).replace(/\n\n/g,'</p><p>')}</p></blockquote>${citation(passage)}<button class="lf-read-button" type="button" data-read="${index}" ${read ? 'disabled' : ''}>${read ? '已标记读完' : '标记本段已读'}</button></details>`;
    }).join('')}</div><p class="lf-reading-tip"><b>阅读提示 · 页面编辑说明</b>${escapeHtml(station.readingTip)}</p>${stationState.read.length === station.passages.length ? '<p class="lf-unlocked" role="status">本章材料已读完，可以进入互动。</p>' : '<p class="lf-locked-note">读完并标记以上段落后，互动区域将开放。</p>'}</section>`;
  }
  function renderInteraction(station,stationState) {
    if (station.interaction === 'range') return renderRange(station,stationState);
    if (station.interaction === 'profile') return renderProfile(station,stationState);
    if (station.interaction === 'compare') return renderCompare(station,stationState);
    return renderWalls(station,stationState);
  }
  function renderRange(station,s) {
    const task=station.task;
    return `<section class="lf-interaction lf-range-lab" aria-labelledby="lf-interaction-title"><p class="lf-step-label">年代轨道　/　UNCERTAINTY RANGE</p><h3 id="lf-interaction-title">${escapeHtml(task.prompt)}</h3><div class="lf-age-axis" aria-hidden="true"><span>距今 4000 年（较近）</span><span>距今 4500 年</span><span>距今 5000 年（较早）</span></div><div class="lf-range-track"><div class="lf-range-band" id="lf-range-band"></div><div class="lf-reference-band ${s.submitted?'is-visible':''}" aria-hidden="true"></div><input id="lf-range-lower" type="range" min="${task.min}" max="${task.max}" step="${task.step}" value="${s.lower ?? task.initialLower}" aria-label="年代区间较晚端，单位为距今年" ${s.submitted?'disabled':''}><input id="lf-range-upper" type="range" min="${task.min}" max="${task.max}" step="${task.step}" value="${s.upper ?? task.initialUpper}" aria-label="年代区间较早端，单位为距今年" ${s.submitted?'disabled':''}></div><div class="lf-range-readout"><span>所选范围</span><strong><i id="lf-lower-value">${s.lower ?? task.initialLower}</i>—<i id="lf-upper-value">${s.upper ?? task.initialUpper}</i> 年前</strong><small>提交后可与原书讨论的校正范围比较。</small></div><fieldset class="lf-choice-field"><legend>你认为最直接支持这个区间的是哪类证据？</legend>${task.evidenceOptions.map(option=>`<label class="lf-choice"><input type="radio" name="lf-evidence" value="${option.id}" ${s.selectedEvidence===option.id?'checked':''} ${s.submitted?'disabled':''}><span>${escapeHtml(option.label)}</span></label>`).join('')}</fieldset><button type="button" class="button button-gold" data-submit="range" ${s.submitted?'disabled':''}>提交年代判断</button></section>`;
  }
  function renderProfile(station,s) {
    const task=station.task;
      return `<section class="lf-interaction lf-profile-lab" aria-labelledby="lf-interaction-title"><p class="lf-step-label">概念剖面　/　CONCEPTUAL PROFILE</p><h3 id="lf-interaction-title">${escapeHtml(task.prompt)}</h3><p class="lf-interaction-hint">先逐层点击剖面，查看每一层在回答什么问题。</p><div class="lf-profile-figure" role="group" aria-label="遗址、遗存、考古学文化的概念剖面">${task.layers.map((layer,index)=>`<button type="button" class="lf-profile-layer layer-${index+1} ${s.layer===layer.id?'is-selected':''}" data-layer="${layer.id}" aria-pressed="${s.layer===layer.id}" ${s.submitted?'disabled':''}><span>${String(index+1).padStart(2,'0')}</span><b>${escapeHtml(layer.title)}</b><i aria-hidden="true">⌄</i></button>`).join('')}</div><div class="lf-layer-explainer" id="lf-layer-explainer" aria-live="polite">${task.layers.find(layer=>layer.id===s.layer) ? `<b>${escapeHtml(task.layers.find(layer=>layer.id===s.layer).title)}</b><p>${escapeHtml(task.layers.find(layer=>layer.id===s.layer).description)}</p>` : '<span>选择剖面层级，阅读它所回答的问题。</span>'}</div><fieldset class="lf-choice-field"><legend>针对上面的新发现，哪种处理方式更符合材料中的方法？</legend>${task.choices.map(choice=>`<label class="lf-choice"><input type="radio" name="lf-profile-choice" value="${choice.id}" ${s.choice===choice.id?'checked':''} ${s.submitted?'disabled':''}><span>${escapeHtml(choice.label)}</span></label>`).join('')}</fieldset><button type="button" class="button button-gold" data-submit="profile" ${s.submitted?'disabled':''}>提交判断</button></section>`;
  }
  function renderCompare(station,s) {
    const task=station.task;
    return `<section class="lf-interaction lf-compare-lab" aria-labelledby="lf-interaction-title"><p class="lf-step-label">器物比较台　/　COMPARE THE EVIDENCE</p><h3 id="lf-interaction-title">${escapeHtml(task.prompt)}</h3><p class="lf-interaction-hint">当前使用文字档案面板：本页没有能够可靠对应到这两批具体器物的可复用图像。</p><div class="lf-compare-table">${task.objects.map(object=>`<article class="lf-object-record"><p class="lf-record-overline">SOURCE RECORD · TEXT ONLY</p><h4>${escapeHtml(object.title)}</h4><ul>${object.facts.map(fact=>`<li>${escapeHtml(fact)}</li>`).join('')}</ul><p class="lf-record-source">依据《${escapeHtml(data.book.title)}》${escapeHtml(station.passages[object.id==='moon-bay-jade'?0:1].locator)}</p></article>`).join('')}</div><fieldset class="lf-choice-field lf-observation-field"><legend>标记你认为材料明确提供的依据（可多选）</legend>${task.observations.map(item=>`<label class="lf-choice"><input type="checkbox" name="lf-observation" value="${item.id}" ${s.observations.includes(item.id)?'checked':''} ${s.submitted?'disabled':''}><span>${escapeHtml(item.label)}</span></label>`).join('')}</fieldset><fieldset class="lf-choice-field"><legend>这些材料能够支持到哪一步？</legend>${task.choices.map(choice=>`<label class="lf-choice"><input type="radio" name="lf-compare-choice" value="${choice.id}" ${s.choice===choice.id?'checked':''} ${s.submitted?'disabled':''}><span>${escapeHtml(choice.label)}</span></label>`).join('')}</fieldset><button type="button" class="button button-gold" data-submit="compare" ${s.submitted?'disabled':''}>提交比较判断</button></section>`;
  }
  function renderWalls(station,s) {
    const task=station.task;
    const selected=new Set(s.links);
    return `<section class="lf-interaction lf-wall-lab" aria-labelledby="lf-interaction-title"><p class="lf-step-label">城墙遗迹调查　/　RECONSTRUCT WITH CAUTION</p><h3 id="lf-interaction-title">${escapeHtml(task.prompt)}</h3><div class="lf-wall-status-key"><span><i class="confirmed-line"></i>发掘确认的墙段</span><span><i class="inferred-line"></i>待判断的推测连接</span></div><div class="lf-wall-schematic"><p>北侧关系示意　·　不按比例、不含坐标</p><div class="lf-wall-nodes">${task.nodes.map(node=>`<div class="lf-wall-node"><i aria-hidden="true"></i><b>${escapeHtml(node.label)}</b><small>${escapeHtml(node.status)}</small></div>`).join('')}</div><svg viewBox="0 0 900 72" role="img" aria-label="三个已确认的墙段和两个候选连接"><line x1="75" y1="28" x2="155" y2="28" class="lf-wall-confirmed"/><line x1="410" y1="28" x2="490" y2="28" class="lf-wall-confirmed"/><line x1="745" y1="28" x2="825" y2="28" class="lf-wall-confirmed"/>${task.candidateLinks.map((link,index)=>`<line x1="${index===0?155:490}" y1="28" x2="${index===0?410:745}" y2="28" class="lf-wall-candidate ${selected.has(link.id)?'is-selected':''}"/>`).join('')}</svg><div class="lf-wall-link-actions">${task.candidateLinks.map(link=>`<button type="button" class="lf-link-toggle ${selected.has(link.id)?'is-selected':''}" data-wall-link="${link.id}" aria-pressed="${selected.has(link.id)}" ${s.submitted?'disabled':''}>${selected.has(link.id)?'已连接':'连接'}：${escapeHtml(link.label)}</button>`).join('')}</div></div><p class="lf-wall-caution">实线短段表示来源记载的墙遗存已被发掘确认；两段之间的虚线仅表示候选推定。点位与间距是页面示意。</p><button type="button" class="button button-gold" data-submit="wallmap" ${s.submitted?'disabled':''}>提交我的重建</button></section>`;
  }
  function renderRecord() {
    const stationSummaries=data.stations.map((station,index)=>{
      const result=state.stations[index];
      let response='尚未记录';
      if (station.interaction==='range') response=`年代区间：距今${result.lower}—${result.upper}年；证据选择：${station.task.evidenceOptions.find(x=>x.id===result.selectedEvidence)?.label||'未选'}`;
      if (station.interaction==='profile') response=`剖面层级：${station.task.layers.find(x=>x.id===result.layer)?.title||'未选'}；判断：${station.task.choices.find(x=>x.id===result.choice)?.label||'未选'}`;
      if (station.interaction==='compare') response=`观察标记：${result.observations.map(id=>station.task.observations.find(x=>x.id===id)?.label).filter(Boolean).join('；')||'未选'}；判断：${station.task.choices.find(x=>x.id===result.choice)?.label||'未选'}`;
      if (station.interaction==='wallmap') response=`你选择的推测连接：${result.links.map(id=>station.task.candidateLinks.find(x=>x.id===id)?.label).filter(Boolean).join('；')||'未连接'}`;
      return `<article><span>${station.number} / ${station.chapter}</span><h3>${escapeHtml(station.title)}</h3><p>${escapeHtml(response)}</p><small>${escapeHtml(station.passages.map(p=>p.locator).join('；'))}</small><p class="lf-record-conclusion">证据反馈：${escapeHtml(result.correct?'判断与本书材料的推理方向相符。':'本次判断与材料的推理方向有差异；请保留分歧并查看原文依据。')}</p></article>`;
    }).join('');
    root.innerHTML=`<section class="lf-record" aria-labelledby="lf-record-title"><p class="lf-step-label">FIELD NOTES · YOUR HISTORY FRAMEWORK</p><h2 id="lf-record-title">我的历史框架</h2><p>这份记录整理自你在四站中的操作；它呈现个人判断与材料依据，不给未证实的说法贴上标准结论标签。</p>${stationSummaries}<label class="lf-record-input">我的结论与支撑它的证据<textarea id="lf-reflection" data-assistant-reason rows="4" maxlength="1200" placeholder="写下你目前的理解，以及仍需核对的地方。">${escapeHtml(state.reflection)}</textarea></label><button class="learning-assistant-review-reason" type="button" data-assistant-check-reason="lf-reflection">请助手看看我的理由</button><p class="lf-local-note" id="lf-save-status" role="status" aria-live="polite">${window.AccountData?.authenticated?'记录会自动同步到当前账号。':'记录只保存在本机浏览器。'}</p><div class="lf-actions"><button class="button button-gold" type="button" data-save-reflection>${window.AccountData?.authenticated?'保存账号记录':'保存本机记录'}</button><button class="button button-outline" type="button" data-print-record>打印 / 保存为 PDF</button><button class="button button-outline" type="button" data-restart>重新体验四站</button><button class="text-button" type="button" data-return-reading>返回第一站阅读</button></div></section>`;
    printSheet.innerHTML=`<p>三星堆 · 研学记录</p><h1>我的历史框架</h1><p>主题：${escapeHtml(data.question)}</p>${stationSummaries}<p>个人结论：${escapeHtml(state.reflection||'（未填写）')}</p><div class="lf-print-source"><b>引用来源</b><p>${escapeHtml(data.book.title)}，${escapeHtml(data.book.author)}，第3—6章。引文定位：${escapeHtml(data.stations.flatMap(s=>s.passages.map(p=>p.locator)).join('；'))}。</p><p>打印版本已注明 PDF 页码；书内页码待核实。</p></div>`;
    bindRecord();
  }
  function bindStation(station,s) {
    root.querySelectorAll('[data-station]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.station);if(index<=state.stations.filter(x=>x.submitted).length){state.station=index;saveState();render();root.scrollIntoView({block:'start'});}}));
    root.querySelectorAll('[data-read]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.read);if(!s.read.includes(index))s.read.push(index);saveState();render();}));
    root.querySelectorAll('[data-layer]').forEach(button=>button.addEventListener('click',()=>{s.layer=button.dataset.layer;saveState();render();}));
    root.querySelectorAll('input[name="lf-evidence"]').forEach(input=>input.addEventListener('change',()=>{s.selectedEvidence=input.value;s.inputError='';saveState();}));
    root.querySelectorAll('input[name="lf-profile-choice"],input[name="lf-compare-choice"]').forEach(input=>input.addEventListener('change',()=>{s.choice=input.value;s.inputError='';saveState();}));
    root.querySelectorAll('input[name="lf-observation"]').forEach(input=>input.addEventListener('change',()=>{s.observations=Array.from(root.querySelectorAll('input[name="lf-observation"]:checked')).map(item=>item.value);saveState();}));
    root.querySelectorAll('[data-wall-link]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.wallLink;s.links=s.links.includes(id)?s.links.filter(value=>value!==id):[...s.links,id];s.inputError='';saveState();render();}));
    const lower=root.querySelector('#lf-range-lower'), upper=root.querySelector('#lf-range-upper');
    const updateRange=()=>{if(!lower||!upper)return;let lo=Number(lower.value),hi=Number(upper.value);if(lo>hi){[lo,hi]=[hi,lo];lower.value=String(lo);upper.value=String(hi);}s.lower=lo;s.upper=hi;s.inputError='';root.querySelector('#lf-lower-value').textContent=lo;root.querySelector('#lf-upper-value').textContent=hi;const left=(lo-4000)/1000*100, width=(hi-lo)/1000*100;const band=root.querySelector('#lf-range-band');band.style.left=`${left}%`;band.style.width=`${width}%`;saveState();};
    lower?.addEventListener('input',updateRange);upper?.addEventListener('input',updateRange);updateRange();
    root.querySelector('[data-submit]')?.addEventListener('click',()=>{
      s.inputError='';
      if(station.interaction==='range') { if(!s.selectedEvidence){s.inputError='请先选择你认为最直接的证据类型。';render();return;} s.correct=s.selectedEvidence===station.task.correctEvidence && s.lower<=station.task.targetLower+station.task.tolerance && s.upper>=station.task.targetUpper-station.task.tolerance; }
      if(station.interaction==='profile') { if(!s.layer||!s.choice){s.inputError='请先选择一个剖面层级和一条处理路径。';render();return;} s.correct=s.layer===station.task.scenarioLayer && s.choice===station.task.correctChoice; }
      if(station.interaction==='compare') { if(!s.choice){s.inputError='请先选择一条推理结论。';render();return;} s.correct=station.task.supportedObservations.every(id=>s.observations.includes(id)) && !s.observations.includes('date-proof') && !s.observations.includes('culture-proof') && s.choice===station.task.correctChoice; }
      if(station.interaction==='wallmap') s.correct=station.task.correctLinks.every(id=>s.links.includes(id));
      s.submitted=true;saveState();render();
    });
    root.querySelector('[data-next-station]')?.addEventListener('click',()=>{state.station=Math.min(data.stations.length-1,currentIndex()+1);saveState();render();root.scrollIntoView({block:'start'});});
    root.querySelector('[data-finish]')?.addEventListener('click',()=>{state.station=data.stations.length;saveState();render();root.scrollIntoView({block:'start'});});
    root.querySelector('[data-reread]')?.addEventListener('click',()=>{root.querySelector('.lf-reading')?.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});});
  }
  function bindRecord() {
    root.querySelector('[data-save-reflection]')?.addEventListener('click',()=>{state.reflection=root.querySelector('#lf-reflection').value.trim();saveState();root.querySelector('#lf-save-status').textContent=window.AccountData?.authenticated?'正在保存到账号…':'已保存到本机浏览器。';});
    root.querySelector('[data-print-record]')?.addEventListener('click',()=>{state.reflection=root.querySelector('#lf-reflection').value.trim();saveState();window.print();});
    root.querySelector('[data-restart]')?.addEventListener('click',()=>{if(!window.confirm('重新体验会清除此主题在本机保存的进度。要继续吗？'))return;state=freshState();saveState();render();root.scrollIntoView({block:'start'});});
    root.querySelector('[data-return-reading]')?.addEventListener('click',()=>{state.station=0;saveState();render();root.scrollIntoView({block:'start'});});
    root.querySelector('#lf-reflection')?.addEventListener('input',event=>{state.reflection=event.target.value;saveState();notifyAssistantContext();});
  }
  function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function assistantContext() {
    if (!data || !state) return null;
    const index=Math.min(state.station,data.stations.length-1), station=data.stations[index], answer=state.stations[index];
    if (!station || !answer) return null;
    const atRecord=state.station>=data.stations.length;
    const stage=answer.submitted?'judgment':answer.read.length===station.passages.length?'evidence':'reading';
    const studentWork={lower:answer.lower,upper:answer.upper,selectedEvidence:answer.selectedEvidence,layer:answer.layer,choice:answer.choice,observations:answer.observations,links:answer.links};
    return {path:'framework',taskId:station.id,taskTitle:atRecord?'我的历史框架':station.title,materialId:atRecord?'record':station.id,stage,submitted:answer.submitted,choice:JSON.stringify(studentWork),question:station.task.prompt,reasonText:atRecord?state.reflection:''};
  }
  function notifyAssistantContext() { window.dispatchEvent(new CustomEvent('learning-assistant:context-changed',{detail:assistantContext()})); }
  function revisitAssistantMaterial(materialId) {
    const match=/^framework:([^:]+):passage:(\d+)$/.exec(materialId||''); if(!match||!data)return;
    const index=data.stations.findIndex(item=>item.id===match[1]); if(index<0)return;
    state.station=index;render();requestAnimationFrame(()=>{const target=root.querySelector(`[data-assistant-material="${match[1]}:passage:${match[2]}"]`);target?.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'center'});if(target){target.classList.remove('learning-assistant-preview');void target.offsetWidth;target.classList.add('learning-assistant-preview');}});
  }
  window.LearningFramework={getAssistantContext:assistantContext,revisitAssistantMaterial};
  async function activate() {
    active=true; loading.hidden=false; errorBox.hidden=true; root.hidden=true;
    try { data=await loadData();if(!active)return;state=restoreState(await window.AccountData.load('learning_framework','state',KEY,null));loading.hidden=true;root.hidden=false;render(); }
    catch(error){if(!active)return;loading.hidden=true;errorBox.hidden=false;errorText.textContent=`${error.message}。请确认静态数据已同步到 dist/data/。`;}
  }
  document.getElementById('lf-retry')?.addEventListener('click',()=>{dataPromise=null;activate();});
  window.addEventListener('learning-framework:activate',activate);
  window.addEventListener('learning-framework:deactivate',()=>{active=false;});
  window.addEventListener('account-user-changed',()=>{active=false;state=null;if(document.body.classList.contains('learning-framework-mode'))void activate();});
  window.addEventListener('account-record-deleted',event=>{if(event.detail?.collection==='learning_framework')state=null;});
})();
