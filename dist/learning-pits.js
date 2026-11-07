(() => {
  const KEY = 'sd-learning-pits-v1';
  const root = document.getElementById('lp-app');
  const loading = document.getElementById('lp-loading');
  const errorBox = document.getElementById('lp-error');
  const errorText = document.getElementById('lp-error-message');
  const printSheet = document.getElementById('lp-print-sheet');
  let dataPromise = null;
  let data = null;
  let state = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const freshState = () => ({station:0, answers:data.stations.map(() => ({read:[], stage:0, zoom:0, viewpoint:'', evidence:'', confidence:'', classifications:{}, term:'', reason:'', visualFocus:'', observation:'', interpretation:'', imageZoom:'', identityConfidence:'', link:'', strength:'', submitted:false, support:'', feedback:''})), reflection:'', updatedAt:''});
  function restore(savedOverride) {
    try {
      const saved = savedOverride === undefined ? JSON.parse(localStorage.getItem(KEY) || 'null') : savedOverride;
      if (!saved || !Array.isArray(saved.answers) || saved.answers.length !== data.stations.length) return freshState();
      return {...freshState(), ...saved, station:Math.max(0, Math.min(data.stations.length, Number(saved.station) || 0)), answers:data.stations.map((_,i) => ({...freshState().answers[i], ...saved.answers[i]}))};
    } catch { return freshState(); }
  }
  function save() {
    state.updatedAt = new Date().toISOString();
    if (window.LearningProgress) {
      void window.LearningProgress.save('learning_pits',state,KEY,'研学进度已保存').catch(error => {
        const status = root.querySelector('#lp-save-status');
        if (status) { status.textContent = `保存失败：${error.message || '请重试。'}`; status.classList.add('is-error'); }
      });
      return;
    }
    if (!window.AccountData?.authenticated) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} return; }
    void window.AccountData.save('learning_pits','state',state,KEY).catch(error => {
      const status = root.querySelector('#lp-save-status');
      if (status) { status.textContent = `保存失败：${error.message || '请重试。'}`; status.classList.add('is-error'); }
    });
  }
  function load() {
    if (!dataPromise) dataPromise = fetch('/data/manifest.json').then(r => { if (!r.ok) throw new Error(`数据清单读取失败（HTTP ${r.status}）`); return r.json(); }).then(manifest => {
      const entry = manifest.files?.find(file => file.path === 'learning/pits.json');
      if (!entry) throw new Error('manifest.json 中没有 learning/pits.json');
      return fetch(entry.url).then(r => { if (!r.ok) throw new Error(`研学配置读取失败（HTTP ${r.status}）`); return r.json(); });
    });
    return dataPromise;
  }
  const locator = passage => `<div class="lp-citation"><b>${esc(passage.voice)}</b><span>${esc(data.book.title)} · ${esc(data.book.author)} · ${esc(passage.locator)}</span><span>${esc(passage.sourceType)}</span></div>`;
  const stateLabel = support => support === 'strong' ? '证据支持较强' : support === 'partial' ? '部分支持' : '现有材料不足以支持';
  function render() {
    if (!data || !state || !root) return;
    const completed = state.answers.filter(answer => answer.submitted).length;
    document.getElementById('lp-overall-progress').textContent = state.station >= data.stations.length ? '四份档案已完成 · 调查记录' : `第 ${state.station + 1} / ${data.stations.length} 份档案`;
    const progress = document.querySelector('.lp-overall-track');
    progress?.setAttribute('aria-valuenow', String(completed));
    if (progress) progress.querySelector('i').style.width = `${completed / data.stations.length * 100}%`;
    if (state.station >= data.stations.length) { renderRecord(); notifyAssistantContext(); return; }
    const station = data.stations[state.station];
    const answer = state.answers[state.station];
    root.innerHTML = `<nav class="lp-station-nav" aria-label="调查档案">${data.stations.map((item,i) => `<button type="button" data-station="${i}" ${i > completed ? 'disabled' : ''} class="${i===state.station?'is-current':''} ${state.answers[i].submitted?'is-done':''}" aria-current="${i===state.station?'step':'false'}"><span>${item.number}</span><b>${esc(item.title)}</b><small>${state.answers[i].submitted?'已完成':i===state.station?'正在调查':'待开始'}</small></button>`).join('')}</nav>
      <section class="lp-station" aria-labelledby="lp-station-title"><header class="lp-station-head"><p class="lp-step-label">${esc(station.chapter)}　/　${esc(station.chapterTitle)}</p><h2 id="lp-station-title">${esc(station.title)} <small>${esc(station.subtitle)}</small></h2><p>${esc(data.question)}</p></header>
      ${renderReading(station,answer)}
      ${answer.stage===1 ? `<div data-interaction-anchor>${renderInteraction(station,answer)}</div>${answer.submitted?renderFeedback(station,answer):''}` : ''}
      <p class="lp-local-note">${window.AccountData?.authenticated?'本页进度自动同步到当前账号。':'本页进度仅保存在此浏览器本机。'}纸书页码未能从当前扫描件确认，故使用核对过的 PDF 页码。图录扫描的来源定位已列、授权待核；SVG 场地关系图和比较网络均为依据原书整理的示意，不是实测图或传播路线。</p></section>`;
    bind(station,answer);
    notifyAssistantContext();
  }
  function renderReading(station,answer) {
    const allRead = answer.read.length === station.passages.length;
    return `<section class="lp-reading" aria-labelledby="lp-reading-heading"><div class="lp-section-heading"><div><p class="lp-step-label">READ THE SOURCE · 先读原书</p><h3 id="lp-reading-heading">调查材料</h3></div><span>${answer.read.length} / ${station.passages.length} 段已读</span></div><p class="lp-reading-intro">以下摘录按原书连续段落呈现。先记录材料说了什么，再看研究者如何解释。</p><div class="lp-passages">${station.passages.map((passage,i) => `<details class="lp-passage" open data-assistant-material="${station.id}:passage:${i}"><summary><span>${String(i+1).padStart(2,'0')}</span>${esc(passage.title)}<small>${answer.read.includes(i)?'已读 ✓':'原文摘录'}</small></summary><blockquote>${esc(passage.text)}</blockquote>${locator(passage)}<button type="button" class="lp-read-button" data-read="${i}" ${answer.read.includes(i)?'disabled':''}>${answer.read.includes(i)?'已标记读完':'标记本段已读'}</button></details>`).join('')}</div><p class="lp-reading-tip"><b>阅读提示 · 页面编辑说明</b>${esc(station.readingTip)}</p><div class="lp-reading-actions"><button type="button" class="button button-gold" data-enter-interaction ${!allRead?'disabled':''}>进入本档互动 <span aria-hidden="true">↗</span></button>${answer.stage===1?'<button type="button" class="button button-outline" data-return-interaction>返回互动</button>':''}</div>${!allRead?'<p class="lp-locked" role="status">逐段阅读并标记后，互动会开放。</p>':''}</section>`;
  }
  function renderInteraction(station,a) {
    const markup=station.interaction==='timeline'?renderTimeline(station,a):station.interaction==='argument'?renderArgument(station,a):station.interaction==='identity'?renderIdentity(station,a):renderNetwork(station,a);
    return markup.replace('</textarea></label><button type="button" class="button button-gold" data-submit="argument"', '</textarea></label><button type="button" class="learning-assistant-review-reason" data-assistant-check-reason="lp-reason">请助手看看我的理由</button><button type="button" class="button button-gold" data-submit="argument"');
  }
  function renderTimeline(station,a) {
    const task=station.task;
    const visible=task.viewpoints.filter((_,i)=>a.zoom===0 || (a.zoom===1?i<2:i>=2));
    const selected=task.viewpoints.find(v=>v.id===a.viewpoint);
    return `<section class="lp-interaction lp-timeline-lab" aria-labelledby="lp-interaction-title"><p class="lp-step-label">DATED OPINIONS · 年代意见图</p><h3 id="lp-interaction-title">${esc(task.prompt)}</h3><div class="lp-dating-display"><figure class="lp-opinion-figure"><figcaption><span>${esc(task.axisLabel)}</span><small>依原书讨论次序排列 · 原文未给出可比起止年</small></figcaption><div class="lp-opinion-rail" role="group" aria-label="年代观点相对顺序，点击查看依据"><div class="lp-opinion-line" aria-hidden="true"></div>${visible.map((item,i)=>`<button type="button" class="lp-opinion-stop stop-${i+1} ${a.viewpoint===item.id?'is-selected':''}" data-viewpoint="${item.id}" aria-pressed="${a.viewpoint===item.id}" aria-label="查看${esc(item.label)}观点与来源"><span class="lp-opinion-number">${String(i+1).padStart(2,'0')}</span><i aria-hidden="true"></i><b>${esc(item.label)}</b><small>${esc(item.kind)}</small></button>`).join('')}</div><div class="lp-opinion-axis"><span>原书讨论顺序</span><i aria-hidden="true"></i><span>非时间刻度</span></div></figure><aside class="lp-date-inspector" aria-live="polite">${selected?`<p class="lp-step-label">观点档案 · ${esc(selected.kind)}</p><h4>${esc(selected.label)}</h4><p>${esc(selected.basis)}</p><small>${esc(selected.source)}</small>`:'<p class="lp-step-label">选择一条意见</p><h4>年代分歧不是一条确定刻度</h4><p>点击上方观点，查看提出者、材料线索和解释边界。原书没有给出可将每种意见换算成精确数字的依据。</p>'}</aside></div><div class="lp-timeline-tools" role="group" aria-label="调整年代观点的显示范围">${task.zoomLevels.map((label,i)=>`<button type="button" data-zoom="${i}" aria-pressed="${a.zoom===i}" class="${a.zoom===i?'is-selected':''}">${esc(label)}</button>`).join('')}</div><div class="lp-range-evidence"><div class="lp-range-title"><span>独立的测年范围</span><b>${task.radiocarbon.start}—${task.radiocarbon.end} ${esc(task.radiocarbon.unit)}</b></div><div class="lp-range-track" role="img" aria-label="四号坑的碳十四测年范围为距今${task.radiocarbon.start}至${task.radiocarbon.end}年"><span>${task.radiocarbon.start}</span><i></i><span>${task.radiocarbon.end}</span></div><small>${esc(task.radiocarbon.source)} · ${esc(task.radiocarbon.scope)}</small></div><fieldset class="lp-options"><legend>哪类证据能为其对应对象提供相对直接的年代约束？</legend>${task.evidenceOptions.map(option=>`<label><input type="radio" name="lp-evidence" value="${option.id}" ${a.evidence===option.id?'checked':''} ${a.submitted?'disabled':''}><span>${esc(option.label)}</span></label>`).join('')}</fieldset><fieldset class="lp-confidence"><legend>你对这项选择的信心</legend>${task.confidenceOptions.map(value=>`<label><input type="radio" name="lp-confidence" value="${value}" ${a.confidence===value?'checked':''} ${a.submitted?'disabled':''}><span>${esc(value)}</span></label>`).join('')}</fieldset><button type="button" class="button button-gold" data-submit="timeline" ${a.submitted?'disabled':''}>提交观察</button></section>`;
  }
  function renderArgument(station,a) {
    const task=station.task;
    const tags=[['observation','直接观察'],['interpretation','研究解释'],['gap','证据缺口']];
    const focused=task.statements.find(item=>item.id===a.visualFocus);
    return `<section class="lp-interaction lp-argument-lab" aria-labelledby="lp-interaction-title"><p class="lp-step-label">FIELD EVIDENCE · 现场证据关系示意</p><h3 id="lp-interaction-title">${esc(task.prompt)}</h3><div class="lp-field-visual-layout"><figure class="lp-field-profile"><figcaption><span>场地形成关系示意</span><small>依据书中描述整理 · 非实测剖面、不表示具体坑位</small></figcaption><svg viewBox="0 0 920 300" role="img" aria-labelledby="lp-profile-title lp-profile-desc"><title id="lp-profile-title">器物坑附近夯垫场地与后挖坑体的关系示意</title><desc id="lp-profile-desc">横向示意红烧土夯垫层、其上平整场地、后挖坑体以及坑内器物。所有形状均为解释文字关系的图示，不表示真实剖面、尺寸或器物摆放。</desc><rect x="0" y="0" width="920" height="300" fill="#171b17"/><path d="M0 105 H920 V300 H0 Z" fill="#30372e"/><path d="M0 174 H920 V220 H0 Z" fill="#704c3c" class="profile-pad ${a.visualFocus==='burnt-layer'?'is-focus':''}"/><path d="M0 174 H920" stroke="#b29459" stroke-width="3"/><path d="M365 105 V198 Q365 255 460 255 Q555 255 555 198 V105" fill="#111411" stroke="#a9854b" stroke-width="3" class="profile-cut ${a.visualFocus==='planning'?'is-focus':''}"/><rect x="416" y="190" width="23" height="46" rx="8" fill="#687668" class="profile-object ${a.visualFocus==='ritual-content'?'is-focus':''}"/><rect x="451" y="173" width="26" height="63" rx="8" fill="#96794a"/><rect x="489" y="194" width="19" height="42" rx="8" fill="#53685b"/><path d="M383 91 H537" stroke="#8a8d7d" stroke-dasharray="7 6"/><text x="20" y="76" fill="#d8d1c1" font-size="18">平整后的场地表面</text><text x="20" y="207" fill="#e2c9a7" font-size="16">红烧土夯垫层（书中转述）</text><text x="460" y="278" text-anchor="middle" fill="#d8d1c1" font-size="16">在其上挖坑并埋入器物</text><g class="lp-profile-marker ${a.visualFocus==='planning'?'is-focus':''}" data-evidence-focus="planning" role="button" tabindex="0" aria-label="定位：坑位排列与统一规划解释"><circle cx="690" cy="129" r="18"/><text x="690" y="135" text-anchor="middle" fill="#eee8dc" font-size="16">1</text></g><g class="lp-profile-marker ${a.visualFocus==='burnt-layer'?'is-focus':''}" data-evidence-focus="burnt-layer" role="button" tabindex="0" aria-label="定位：红烧土夯垫与场地形成记录"><circle cx="260" cy="196" r="18"/><text x="260" y="202" text-anchor="middle" fill="#eee8dc" font-size="16">2</text></g><g class="lp-profile-marker ${a.visualFocus==='ritual-content'?'is-focus':''}" data-evidence-focus="ritual-content" role="button" tabindex="0" aria-label="定位：具体仪式内容尚无从确切把握"><circle cx="460" cy="148" r="18"/><text x="460" y="154" text-anchor="middle" fill="#eee8dc" font-size="16">3</text></g></svg><div class="lp-diagram-key"><span><i class="key-record"></i>书中转述的材料关系</span><span><i class="key-interpretation"></i>基于材料的解释</span><span><i class="key-unknown"></i>尚未确切把握</span></div></figure><aside class="lp-field-note" aria-live="polite"><p class="lp-step-label">观察窗 · ${focused?'编号 '+(task.statements.indexOf(focused)+1):'选择图中标记'}</p><h4>${focused?esc(focused.id==='burnt-layer'?'场地材料关系':focused.id==='planning'?'位置排列与解释':'尚未掌握的内容'):'点击图中编号，定位相关材料'}</h4><p>${focused?esc(focused.text):'图中仅把原文提到的材料关系转成非测绘示意。选择标记后，再判断它属于观察、解释还是证据缺口。'}</p><small>依据：${esc(station.passages[1].locator)}</small></aside></div><p class="lp-instruction">逐条标注句子的证据层级。先点击图中编号定位，再选择标签；提交前不显示参考分类。</p><div class="lp-argument-list">${task.statements.map((item,i)=>`<article class="lp-argument-row ${a.visualFocus===item.id?'is-focused':''}"><span class="lp-argument-index">0${i+1}</span><p>${esc(item.text)}</p><div class="lp-argument-actions"><button type="button" class="lp-locate-button" data-evidence-focus="${item.id}" aria-pressed="${a.visualFocus===item.id}">定位示意</button><div class="lp-tag-options" role="group" aria-label="标记第${i+1}条材料">${tags.map(([id,label])=>`<button type="button" data-classify="${item.id}" data-tag="${id}" aria-pressed="${a.classifications[item.id]===id}" class="${a.classifications[item.id]===id?'is-selected':''}" ${a.submitted?'disabled':''}>${label}</button>`).join('')}</div></div></article>`).join('')}</div><fieldset class="lp-term-options"><legend>在描述坑的性质时，你会暂时采用哪种称谓？</legend>${task.terms.map(term=>`<label><input type="radio" name="lp-term" value="${term.id}" ${a.term===term.id?'checked':''} ${a.submitted?'disabled':''}><span><b>${esc(term.label)}</b><small>${esc(term.note)}</small></span></label>`).join('')}</fieldset><label class="lp-reason">你的理由<textarea data-reason maxlength="420" rows="3" placeholder="写下这个称谓保留了哪些材料信息，以及它有哪些限制。" ${a.submitted?'disabled':''}>${esc(a.reason)}</textarea></label><button type="button" class="button button-gold" data-submit="argument" ${a.submitted?'disabled':''}>提交论证审查</button></section>`;
  }
  function renderIdentity(station,a) {
    const task=station.task;
    const interpretation=task.interpretations.find(item=>item.id===a.interpretation);
    const observation=task.observations.find(item=>item.id===a.observation);
    const figure=data.visuals?.identityFigure;
    return `<section class="lp-interaction lp-identity-lab" aria-labelledby="lp-interaction-title"><p class="lp-step-label">OBJECT OBSERVATION · 器物局部观察</p><h3 id="lp-interaction-title">${esc(task.prompt)}</h3><div class="lp-statue-lab"><figure class="lp-statue-plate"><div class="lp-statue-image-wrap"><div class="lp-statue-crop zoom-${a.imageZoom||'overview'}" style="--zoom-origin:${(figure?.observations||[]).find(item=>item.id===a.observation)?.left||'50%'} ${(figure?.observations||[]).find(item=>item.id===a.observation)?.top||'35%'}"><img src="${esc(figure?.image||'')}" alt="${esc(figure?.alt||task.objectLabel)}" loading="lazy" onerror="this.closest('.lp-statue-plate').classList.add('image-unavailable')">${(figure?.observations||[]).map(item=>`<button type="button" class="lp-image-hotspot hotspot-${item.id} ${a.observation===item.id?'is-selected':''}" style="--pin-left:${item.left};--pin-top:${item.top}" data-observation="${item.id}" aria-label="观察图中${esc(item.label)}" aria-pressed="${a.observation===item.id}" ${a.submitted?'disabled':''}><span>${esc(item.label)}</span></button>`).join('')}</div><div class="lp-image-fallback" role="status">图录图版暂时无法显示；请依据原文文字观察档案继续。</div></div><figcaption><b>${esc(figure?.name||task.objectLabel)}</b><span>${esc(figure?.caption||task.imageNote)}</span></figcaption><div class="lp-zoom-controls" role="group" aria-label="器物图版观察比例"><button type="button" data-image-zoom="overview" aria-pressed="${!a.imageZoom||a.imageZoom==='overview'}">全貌</button><button type="button" data-image-zoom="detail" aria-pressed="${a.imageZoom==='detail'}">放大所选部位</button></div></figure><aside class="lp-statue-reading"><div class="lp-statue-observation" aria-live="polite"><p class="lp-step-label">看得到的特征</p><h4>${observation?esc(observation.label):'点击图中的标记，选择观察线索'}</h4><p>${observation?esc(observation.detail):'先描述图版中可见的形态，再切换不同研究解释。图像不提供人物姓名或身份。'}</p><small>图像出处：${esc(figure?.caption||station.passages[0].locator)}</small></div><p class="lp-step-label lp-interpretation-label">切换解释视角</p><div class="lp-lens-tabs" role="group" aria-label="切换研究解释">${task.interpretations.map(item=>`<button type="button" data-interpretation="${item.id}" aria-pressed="${a.interpretation===item.id}" class="${a.interpretation===item.id?'is-selected':''}" ${a.submitted?'disabled':''}>${esc(item.label)}</button>`).join('')}</div>${interpretation?`<article class="lp-interpretation-panel" aria-live="polite"><p class="lp-step-label">研究者观点</p><h4>${esc(interpretation.label)}</h4><p>${esc(interpretation.attribution)}</p><dl><div><dt>如何使用材料</dt><dd>${esc(interpretation.uses)}</dd></div><div><dt>推理加入的假设</dt><dd>${esc(interpretation.assumption)}</dd></div></dl></article>`:'<p class="lp-instruction">选择一个研究解释，比较它与可见材料之间的推理距离。</p>'}</aside></div><fieldset class="lp-confidence"><legend>在现有材料下，你对所选解释的态度</legend>${task.confidenceOptions.map(value=>`<label><input type="radio" name="lp-identity-confidence" value="${value}" ${a.identityConfidence===value?'checked':''} ${a.submitted?'disabled':''}><span>${esc(value)}</span></label>`).join('')}</fieldset><button type="button" class="button button-gold" data-submit="identity" ${a.submitted?'disabled':''}>提交解释判断</button></section>`;
  }
  function renderNetwork(station,a) {
    const task=station.task;
    const link=task.links.find(item=>item.id===a.link);
    const figure=data.visuals?.comparisonFigures?.[link?.id||task.links[0]?.id];
    return `<section class="lp-interaction lp-network-lab" aria-labelledby="lp-interaction-title"><p class="lp-step-label">COMPARISON TABLE · 器物比较台</p><h3 id="lp-interaction-title">${esc(task.prompt)}</h3><div class="lp-comparison-display"><figure class="lp-comparison-object"><div class="lp-comparison-photo"><img src="${esc(figure?.image||'')}" alt="${esc(figure?.name||'三星堆图录器物')}图录图版" loading="lazy" onerror="this.closest('.lp-comparison-object').classList.add('image-unavailable')"><span>三星堆图录器物</span><div class="lp-image-fallback" role="status">当前图录图版暂时无法显示。</div></div><figcaption><b>${esc(figure?.name||'三星堆器物')}</b><small>${esc(figure?.caption||'图录图版，授权状态待核。')}</small><small>图片记录 ID：${esc(figure?.recordId||'待核')}</small></figcaption></figure><div class="lp-comparison-link-view"><div class="lp-comparison-network" role="group" aria-label="书中记载的器物比较关系"><svg viewBox="0 0 560 180" aria-hidden="true"><path d="M96 90 H464"/><path d="M96 90 L280 20 M96 90 L280 160 M280 20 H464 M280 160 H464"/></svg><div class="lp-comparison-network-node is-sanxingdui">三星堆器物</div>${task.links.map((item,i)=>`<button type="button" data-link="${item.id}" class="lp-comparison-target target-${i+1} ${a.link===item.id?'is-selected':''}" aria-pressed="${a.link===item.id}" aria-label="选择比较对象：${esc(item.target)}"><b>${esc(item.target)}</b><small>${esc(item.short)}</small></button>`).join('')}</div><p class="lp-comparison-caveat">比较对象的实物图像未在项目中核验，故不以网络图片代替；这里显示的是原书记录的比较对象与观点，不表示传播路线。</p></div></div>${link?`<article class="lp-link-inspector"><p>${esc(link.detail)}</p><div><b>比较线索</b><span>${esc(link.similarity)}</span></div><div><b>证据边界</b><span>${esc(link.limit)}</span></div><small>${esc(link.source)}</small></article>`:'<p class="lp-instruction">选择一项比较关系，查看书中讨论的对象、相似处和证据边界。</p>'}<fieldset class="lp-strength-options"><legend>这条比较关系目前能支持到哪一步？</legend>${task.strengthOptions.map(option=>`<label><input type="radio" name="lp-strength" value="${option.id}" ${a.strength===option.id?'checked':''} ${a.submitted?'disabled':''}><span>${esc(option.label)}</span></label>`).join('')}</fieldset><button type="button" class="button button-gold" data-submit="network" ${a.submitted?'disabled':''}>提交证据强度</button></section>`;
  }
  function renderFeedback(station,a) {
    const next=state.station<data.stations.length-1;
    return `<section class="lp-feedback lp-feedback-${a.support}" role="status" aria-live="polite"><div><span>判断反馈</span><b>${stateLabel(a.support)}</b></div><p>${esc(a.feedback)}</p><small>依据：${esc(station.passages.map(p=>p.locator).join('；'))}</small><div class="lp-actions">${next?'<button class="button button-gold" type="button" data-next>进入下一份调查档案 <span aria-hidden="true">↗</span></button>':'<button class="button button-gold" type="button" data-finish>整理我的调查记录 <span aria-hidden="true">↗</span></button>'}<button class="button button-outline" type="button" data-reread>返回阅读材料</button></div></section>`;
  }
  function renderRecord() {
    const items=data.stations.map((station,i)=>{const a=state.answers[i];return `<article><span>${station.number} · ${esc(station.chapter)}</span><h3>${esc(station.title)}</h3><p>${esc(recordAnswer(station,a))}</p><b>${stateLabel(a.support)}</b><p>${esc(a.feedback||'尚未提交')}</p><small>${esc(station.passages.map(p=>p.locator).join('；'))}</small></article>`;}).join('');
    root.innerHTML=`<section class="lp-record" aria-labelledby="lp-record-title"><p class="lp-step-label">FIELD NOTES · EVIDENCE &amp; INTERPRETATION</p><h2 id="lp-record-title">我的器物坑调查记录</h2><p>记录你的判断、信心与证据边界。这里不对有争议的问题排名，也不提供唯一历史定论。</p>${items}<label>我认为最需要新证据的问题<textarea id="lp-reflection" rows="4" maxlength="800" placeholder="写下一个仍待查证的问题。">${esc(state.reflection)}</textarea></label><button class="learning-assistant-review-reason" type="button" data-assistant-check-reason="lp-reflection">请助手看看我的理由</button><p class="lp-local-note" id="lp-save-status" role="status">${window.AccountData?.authenticated?'记录自动同步到当前账号。':'记录仅保存在本机浏览器。'}</p><div class="lp-actions"><button class="button button-gold" type="button" data-save-record>保存记录</button><button class="button button-outline" type="button" data-print>打印 / 保存为 PDF</button><button class="button button-outline" type="button" data-restart>重新体验四份档案</button><button class="button button-outline" type="button" data-back-reading>返回第一份阅读资料</button></div></section>`;
    printSheet.innerHTML=`<p>三星堆 · 研学记录卡</p><h1>我的器物坑调查记录</h1><p>${esc(data.question)}</p>${items}<p>我认为最需要新证据的问题：${esc(state.reflection||'（未填写）')}</p><div class="lp-print-source">来源：${esc(data.book.title)}，${esc(data.book.author)}，${esc(data.book.chapter)}。本页定位使用 PDF 页码；纸书页码待核。</div>`;
    root.querySelector('[data-save-record]').addEventListener('click',()=>{state.reflection=root.querySelector('#lp-reflection').value;save();root.querySelector('#lp-save-status').textContent=window.AccountData?.authenticated?'正在保存到账号…':'已保存在本机浏览器。';});
    root.querySelector('#lp-reflection').addEventListener('input',e=>{state.reflection=e.target.value;save();notifyAssistantContext();});
    root.querySelector('[data-print]').addEventListener('click',()=>window.print());
    root.querySelector('[data-restart]').addEventListener('click',()=>{state=freshState();save();render();window.scrollTo(0,0);});
    root.querySelector('[data-back-reading]').addEventListener('click',()=>{state.station=0;state.answers[0].stage=0;render();window.scrollTo(0,0);});
  }
  function recordAnswer(station,a) {
    if(station.interaction==='timeline') return `观点：${station.task.viewpoints.find(x=>x.id===a.viewpoint)?.label||'未选'}；证据：${station.task.evidenceOptions.find(x=>x.id===a.evidence)?.label||'未选'}；信心：${a.confidence||'未记录'}`;
    if(station.interaction==='argument') return `暂用称谓：${station.task.terms.find(x=>x.id===a.term)?.label||'未选'}；理由：${a.reason||'未填写'}`;
    if(station.interaction==='identity') return `观察线索：${station.task.observations.find(x=>x.id===a.observation)?.label||'未选'}；解释视角：${station.task.interpretations.find(x=>x.id===a.interpretation)?.label||'未选'}；态度：${a.identityConfidence||'未记录'}`;
    const link=station.task.links.find(x=>x.id===a.link);return `比较对象：${link?.target||'未选'}；判断：${station.task.strengthOptions.find(x=>x.id===a.strength)?.label||'未选'}`;
  }
  function assistantContext() {
    if(!data||!state)return null;
    const index=Math.min(state.station,data.stations.length-1),station=data.stations[index],answer=state.answers[index];
    if(!station||!answer)return null;
    const atRecord=state.station>=data.stations.length;
    const stage=answer.submitted?'judgment':answer.stage===1?'evidence':'reading';
    const studentWork={viewpoint:answer.viewpoint,evidence:answer.evidence,confidence:answer.confidence,classifications:answer.classifications,term:answer.term,reason:answer.reason,observation:answer.observation,interpretation:answer.interpretation,identityConfidence:answer.identityConfidence,link:answer.link,strength:answer.strength};
    return {path:'pits',taskId:station.id,taskTitle:atRecord?'我的器物坑调查记录':station.title,materialId:atRecord?'record':station.id,stage,submitted:answer.submitted,choice:JSON.stringify(studentWork),question:station.task.prompt,reasonText:answer.reason||state.reflection||''};
  }
  function notifyAssistantContext(){window.dispatchEvent(new CustomEvent('learning-assistant:context-changed',{detail:assistantContext()}));}
  function revisitAssistantMaterial(materialId){const match=/^pits:([^:]+):passage:(\d+)$/.exec(materialId||'');if(!match||!data)return;const index=data.stations.findIndex(item=>item.id===match[1]);if(index<0)return;state.station=index;render();requestAnimationFrame(()=>{const target=root.querySelector(`[data-assistant-material="${match[1]}:passage:${match[2]}"]`);target?.scrollIntoView({behavior:'smooth',block:'center'});if(target){target.classList.remove('learning-assistant-preview');void target.offsetWidth;target.classList.add('learning-assistant-preview');}});}
  window.LearningPits={getAssistantContext:assistantContext,revisitAssistantMaterial};
  function bind(station,a) {
    root.querySelectorAll('[data-read]').forEach(button=>button.addEventListener('click',()=>{const i=Number(button.dataset.read);if(!a.read.includes(i))a.read.push(i);save();render();}));
    root.querySelector('[data-enter-interaction]')?.addEventListener('click',()=>{if(a.read.length===station.passages.length){a.stage=1;save();render();root.querySelector('#lp-interaction-title')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}});
    root.querySelector('[data-return-interaction]')?.addEventListener('click',()=>root.querySelector('[data-interaction-anchor]')?.scrollIntoView());
    root.querySelectorAll('[data-station]').forEach(button=>button.addEventListener('click',()=>{const i=Number(button.dataset.station);if(i<=state.answers.filter(item=>item.submitted).length){state.station=i;save();render();window.scrollTo({top:0,behavior:'smooth'});}}));
    root.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{a.zoom=Number(button.dataset.zoom);save();render();}));
    root.querySelectorAll('[data-viewpoint]').forEach(button=>button.addEventListener('click',()=>{a.viewpoint=button.dataset.viewpoint;save();render();}));
    root.querySelectorAll('[data-evidence-focus]').forEach(button=>{const select=()=>{a.visualFocus=button.dataset.evidenceFocus;save();render();};button.addEventListener('click',select);button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});});
    root.querySelectorAll('[data-image-zoom]').forEach(button=>button.addEventListener('click',()=>{a.imageZoom=button.dataset.imageZoom;save();render();}));
    root.querySelectorAll('[data-classify]').forEach(button=>button.addEventListener('click',()=>{a.classifications[button.dataset.classify]=button.dataset.tag;save();render();}));
    root.querySelectorAll('[data-observation]').forEach(button=>button.addEventListener('click',()=>{a.observation=button.dataset.observation;save();render();}));
    root.querySelectorAll('[data-interpretation]').forEach(button=>button.addEventListener('click',()=>{a.interpretation=button.dataset.interpretation;save();render();}));
    root.querySelectorAll('[data-link]').forEach(button=>button.addEventListener('click',()=>{a.link=button.dataset.link;save();render();}));
    root.querySelectorAll('[data-link][role="button"]').forEach(edge=>edge.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();a.link=edge.dataset.link;save();render();}}));
    root.querySelectorAll('input[name="lp-evidence"]').forEach(input=>input.addEventListener('change',()=>{a.evidence=input.value;save();}));
    root.querySelectorAll('input[name="lp-confidence"]').forEach(input=>input.addEventListener('change',()=>{a.confidence=input.value;save();}));
    root.querySelectorAll('input[name="lp-term"]').forEach(input=>input.addEventListener('change',()=>{a.term=input.value;save();}));
    root.querySelectorAll('input[name="lp-identity-confidence"]').forEach(input=>input.addEventListener('change',()=>{a.identityConfidence=input.value;save();}));
    root.querySelectorAll('input[name="lp-strength"]').forEach(input=>input.addEventListener('change',()=>{a.strength=input.value;save();}));
    root.querySelector('[data-reason]')?.addEventListener('input',e=>{a.reason=e.target.value;save();notifyAssistantContext();});
    root.querySelectorAll('[data-submit]').forEach(button=>button.addEventListener('click',()=>submit(station,a,button.dataset.submit)));
    root.querySelector('[data-next]')?.addEventListener('click',()=>{state.station++;save();render();window.scrollTo(0,0);});
    root.querySelector('[data-finish]')?.addEventListener('click',()=>{state.station=data.stations.length;save();render();window.scrollTo(0,0);});
    root.querySelector('[data-reread]')?.addEventListener('click',()=>{a.stage=0;save();render();window.scrollTo(0,0);});
  }
  function submit(station,a,kind) {
    const reject = message => {
      let notice=root.querySelector('.lp-validation');
      if(!notice){notice=document.createElement('p');notice.className='lp-validation';notice.setAttribute('role','alert');root.querySelector('.lp-interaction>h3')?.insertAdjacentElement('afterend',notice);}
      notice.textContent=message;
    };
    if(kind==='timeline') {
      if(!a.viewpoint||!a.evidence||!a.confidence){reject('请先点选一个年代观点、一类证据和信心程度。');return;}
      const chosen=station.task.evidenceOptions.find(x=>x.id===a.evidence);
      a.support=a.evidence==='radiocarbon'?'strong':'partial';
      a.feedback=`你选择了“${chosen.label}”。${chosen.feedback} 需要注意，书中列出的年代意见跨越很大；这组距今${station.task.radiocarbon.start}—${station.task.radiocarbon.end}年的数据针对四号坑，不能替代一、二号坑的年代讨论。`;
    } else if(kind==='argument') {
      if(!a.term||station.task.statements.some(x=>!a.classifications[x.id])){reject('请为每条材料选择一个标注，再选择暂用称谓。');return;}
      a.reason=root.querySelector('[data-reason]')?.value||'';
      const matched=station.task.statements.filter(x=>a.classifications[x.id]===x.expected).length;
      a.support=matched===3?'strong':matched>=1?'partial':'insufficient';
      a.feedback=`你有 ${matched} / ${station.task.statements.length} 条标注与本页证据层级说明相符。${station.task.statements.map(x=>x.why).join(' ')} “${station.task.terms.find(x=>x.id===a.term)?.label}”是你选择的描述方式，不会自动证明坑的形成性质。`;
    } else if(kind==='identity') {
      if(!a.observation||!a.interpretation||!a.identityConfidence){reject('请先选择观察线索、解释视角和判断态度。');return;}
      const chosen=station.task.interpretations.find(x=>x.id===a.interpretation);
      a.support=a.identityConfidence==='资料不足以定身份'?'strong':'partial';
      a.feedback=`你采用了“${chosen.label}”这一解释视角。${chosen.attribution} 它如何使用材料：${chosen.uses} 推理假设：${chosen.assumption}。${a.identityConfidence==='资料不足以定身份'?'将身份保持为未定，与书中展示的多说并存及推测性评价相符。':'现有资料支持把它作为一种研究解释来讨论，但不足以确认它就是器物所表现人物的身份。'}`;
    } else {
      if(!a.link||!a.strength){reject('请先选择比较关系和证据强度。');return;}
      const relation=station.task.links.find(x=>x.id===a.link);const option=station.task.strengthOptions.find(x=>x.id===a.strength);
      a.support=a.strength==='similarity'?'strong':a.strength==='discussion'?'partial':'insufficient';
      a.feedback=`${option.feedback} 这条关系的具体来源是：${relation.source} ${relation.limit}`;
    }
    a.submitted=true;save();render();root.querySelector('.lp-feedback')?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  }
  async function activate() {
    loading.hidden=false;errorBox.hidden=true;root.hidden=true;
    try { data=await load(); if(!state)state=restore(await window.AccountData.load('learning_pits','state',KEY,null)); if(!document.body.classList.contains('learning-pits-mode'))return; loading.hidden=true;root.hidden=false;render(); }
    catch(error){loading.hidden=true;errorBox.hidden=false;errorText.textContent=error.message||'请检查研学数据文件后重试。';}
  }
  window.addEventListener('learning-pits:activate',activate);
  window.addEventListener('learning-pits:deactivate',()=>{ /* Keep only local learning answers; no visual process runs in the background. */ });
  window.addEventListener('account-user-changed',()=>{state=null;if(document.body.classList.contains('learning-pits-mode'))void activate();});
  window.addEventListener('account-record-deleted',event=>{if(event.detail?.collection==='learning_pits')state=null;});
  document.getElementById('lp-retry')?.addEventListener('click',()=>{dataPromise=null;activate();});
  window.addEventListener('beforeprint',()=>printSheet.hidden=false);
  window.addEventListener('afterprint',()=>printSheet.hidden=true);
})();
