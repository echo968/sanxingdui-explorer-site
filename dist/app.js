const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const records = {
  figure: {
    id:'figure', slug:'qing-tong-da-li-ren-xiang', name:'青铜大立人像', kicker:'BRONZE FIGURE · 01',
    category:'青铜器', period:'商代晚期', material:'青铜', excavation:'三星堆二号祭祀坑', discovery:'1986 年发掘',
    dimensions:'待核实（需补充可核查的尺寸出处）', collection:'三星堆博物馆',
    intro:'青铜大立人像出土于三星堆二号祭祀坑，是三星堆青铜造像中具有代表性的器物。器物身份与手势含义仍属于研究议题。',
    interpretation:'祭司、王者等身份说法属于研究解释，尚不能作为确定结论。', status:{label:'公开考古背景可查 · 尺寸出处待核实 · 身份解释尚未确定', kind:'partial'},
    image:{src:'https://commons.wikimedia.org/wiki/Special:FilePath/%E4%B8%89%E6%98%9F%E5%A0%86%E5%87%BA%E5%9C%9F%E9%9D%92%E9%93%9C%E5%A4%A7%E7%AB%8B%E4%BA%BA%E5%83%8F%2C_2017-09-17.jpg?width=1100',alt:'三星堆青铜大立人像全身展陈照片',author:'Siyuwj',license:'CC BY-SA 4.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:%E4%B8%89%E6%98%9F%E5%A0%86%E5%87%BA%E5%9C%9F%E9%9D%92%E9%93%9C%E5%A4%A7%E7%AB%8B%E4%BA%BA%E5%83%8F,_2017-09-17.jpg',kind:'photo',status:'授权信息见 Wikimedia Commons 文件页'},
    references:[{label:'四川人大网 · 三星堆遗址史料',url:'https://www.scspc.gov.cn/lfdt/202106/157515.html',type:'公开史料',note:'用于出土与考古背景；本条目尺寸暂未找到可直接核对的引用，标为待核实。'}]
  },
  tree: {
    id:'tree', slug:'qing-tong-shen-shu', name:'青铜神树', kicker:'BRONZE TREE · 02',
    category:'青铜器', period:'商代晚期', material:'青铜', excavation:'三星堆二号祭祀坑', discovery:'1986 年发掘',
    dimensions:'待核实（需补充可核查的尺寸出处）', collection:'三星堆博物馆',
    intro:'青铜神树是三星堆出土的大型青铜树形器。器物名称为通行称谓；其具体文化内涵仍有不同解释。',
    interpretation:'树形、神鸟与龙等细节可观察，但不能单独据此确定它与某一神话体系的对应关系。', status:{label:'馆方资料入口可查 · 尺寸与单件信息待逐项核实 · 文化内涵仍有不同解释', kind:'partial'},
    image:{src:'https://commons.wikimedia.org/wiki/Special:FilePath/Bronze_Sacred_Tree.jpg?width=1100',alt:'三星堆大型青铜神树展陈照片',author:'momo（Flickr）',license:'CC BY 2.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:Bronze_Sacred_Tree.jpg',kind:'photo',status:'授权信息见 Wikimedia Commons 文件页'},
    references:[{label:'三星堆博物馆 · 文物介绍',url:'https://www.sxd.cn/relics/',type:'馆方资料入口',note:'作为文物资料入口；本条目暂未定位能直接核对尺寸与单件出土信息的具体记录。'}]
  },
  mask: {
    id:'mask', slug:'qing-tong-mian-ju', name:'青铜面具', kicker:'BRONZE MASK · 03',
    category:'青铜器', period:'待核实', material:'青铜', excavation:'具体坑位待核实', discovery:'待核实',
    dimensions:'待核实', collection:'待核实',
    intro:'本条目展示一张三星堆青铜面具展陈影像。当前影像资料未提供可对应到单件器物的编号与出土坑位。',
    interpretation:'器物编号、出土单位、年代细分与身份解释均需对应馆藏档案核实。', status:{label:'影像出处可查 · 单件档案待核实', kind:'pending'},
    image:{src:'https://commons.wikimedia.org/wiki/Special:FilePath/Sanxingdui_Bronsmask.jpg?width=1100',alt:'三星堆出土青铜面具展陈照片',author:'Bairuilong',license:'CC BY-SA 4.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:Sanxingdui_Bronsmask.jpg',kind:'photo',status:'图片拍摄于中国国家博物馆展陈；授权信息见文件页'},
    references:[{label:'Wikimedia Commons · 影像文件与授权',url:'https://commons.wikimedia.org/wiki/File:Sanxingdui_Bronsmask.jpg',type:'图像来源',note:'可核对图片作者、许可与展陈场景；不据此推定器物编号或坑位。'}]
  },
  gold: {
    id:'gold', slug:'huang-jin-mian-ju', name:'黄金面具', kicker:'GOLD MASK · 04',
    category:'金器', period:'待核实', material:'黄金', excavation:'具体坑位待核实', discovery:'2021 年公布的新发现中包含金面具残片',
    dimensions:'待核实', collection:'待核实',
    intro:'此条目用于指向三星堆新发现报道中的金面具相关资料，不代表某一件具体编号的完整面具。',
    interpretation:'不同金面具或残片的形制、出土单位与保存状态需逐件核实。', status:{label:'公开报道可查 · 单件档案与图像待核实', kind:'pending'},
    image:{src:'',alt:'图像占位：未展示真实馆藏照片',author:'待核实',license:'待核实',sourceUrl:'',kind:'placeholder',status:'无可确认的馆藏影像；不展示生成图'},
    references:[{label:'四川人大网 · 三星堆考古新发现报道',url:'https://www.scspc.gov.cn/lfdt/202106/157515.html',type:'公开报道',note:'报道中包含金面具残片相关信息；无法据此补全单件档案。'}]
  },
  jade: {
    id:'jade', slug:'yu-zhang', name:'玉璋（类别示例）', kicker:'JADE ZHANG · 05',
    category:'玉石器', period:'待核实', material:'玉石', excavation:'具体器物与地点待核实', discovery:'待核实',
    dimensions:'待核实', collection:'待核实',
    intro:'此条目为玉璋类别的资料入口，并不指向一件具有明确编号的馆藏器物。页面示意图不是文物照片。',
    interpretation:'器物形制、年代、使用情境和出土单位需以具体器物档案核验。', status:{label:'类别示例 · 具体器物资料待核实', kind:'pending'},
    image:{src:'',alt:'玉璋器形示意图，由代码绘制，不是真实文物照片',author:'本项目示意图',license:'不适用 · 非文物照片',sourceUrl:'',kind:'diagram',status:'示意图不代表具体器物'},
    references:[{label:'四川人大网 · 三星堆遗址史料',url:'https://www.scspc.gov.cn/lfdt/202106/157515.html',type:'公开史料',note:'用于三星堆玉石器的一般背景；并非本条目所指单件玉璋的器物档案。'}]
  }
};

const artifactList = Object.values(records);
const galleryItems = ['figure','tree','mask'].map(key => ({ key, ...records[key] }));
const detailMeta = record => [
  ['类别', record.category], ['年代', record.period], ['材质', record.material],
  ['出土信息', record.excavation], ['发现时间', record.discovery],
  ['尺寸', record.dimensions], ['收藏信息', record.collection]
];
const subtitleFor = record => `${record.excavation} · ${record.material}`;
const citationSummary = record => record.references.map(reference => reference.label).join('；');
let galleryIndex = 0;
let activeFilter = 'all';
let toastTimer;

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function filterArtifacts() {
  const query = ($('#artifact-search').value || '').trim().toLocaleLowerCase();
  let visibleCount = 0;
  $$('.artifact-card').forEach(card => {
    const matchesCategory = activeFilter === 'all' || card.dataset.category === activeFilter;
    const matchesQuery = !query || `${card.dataset.search} ${card.textContent}`.toLocaleLowerCase().includes(query);
    card.hidden = !(matchesCategory && matchesQuery);
    if (!card.hidden) visibleCount += 1;
  });
  $('#empty-state').hidden = visibleCount !== 0;
  if (visibleCount === 0 && activeFilter === 'pottery' && !query) {
    $('#empty-title').textContent = '陶器档案尚未接入';
    $('#empty-copy').textContent = '当前目录没有可核验的陶器条目，后续接入真实资料后会在此展示。';
  } else {
    $('#empty-title').textContent = '没有找到匹配的器物';
    $('#empty-copy').textContent = '试试更短的关键词，或切换材质筛选。';
  }
}

function chooseArtifactFilter(category) {
  activeFilter = category;
  $('#artifact-search').value = '';
  $$('.filter').forEach(item => {
    const selected = item.dataset.filter === category;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  filterArtifacts();
  $('#collection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

$$('.filter').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  $$('.filter').forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  filterArtifacts();
}));
$('#artifact-search').addEventListener('input', filterArtifacts);
$('[data-reset-search]').addEventListener('click', () => {
  $('#artifact-search').value = '';
  activeFilter = 'all';
  $$('.filter').forEach(item => {
    const selected = item.dataset.filter === 'all';
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  filterArtifacts();
});
$$('[data-entry-filter]').forEach(button => button.addEventListener('click', () => chooseArtifactFilter(button.dataset.entryFilter)));
$$('[data-theme-link="bronze"]').forEach(link => link.addEventListener('click', () => {
  activeFilter = 'bronze';
  $('#artifact-search').value = '';
  $$('.filter').forEach(item => {
    const selected = item.dataset.filter === 'bronze';
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  filterArtifacts();
}));

function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('no-scroll');
}
function closeDialog(dialog) {
  if (dialog.open) dialog.close();
  if (!$('dialog[open]')) document.body.classList.remove('no-scroll');
}
$$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); });
  dialog.addEventListener('close', () => { if (!$('dialog[open]')) document.body.classList.remove('no-scroll'); });
});

function openArtifact(key) {
  const record = records[key];
  if (!record) return;
  $('#modal-kicker').textContent = record.kicker;
  $('#artifact-title').textContent = record.name;
  $('#modal-subtitle').textContent = subtitleFor(record);
  const visual = $('#modal-image');
  visual.replaceChildren();
  if (record.image.src) {
    const img = new Image();
    img.src = record.image.src;
    img.alt = record.image.alt;
    img.loading = 'lazy';
    visual.append(img);
  } else {
    const label = document.createElement('span');
    label.className = 'modal-placeholder';
    label.textContent = record.image.alt;
    visual.append(label);
  }
  $('#record-table').replaceChildren(...detailMeta(record).map(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'record-row';
    const term = document.createElement('span');
    term.textContent = label;
    const description = document.createElement('span');
    description.textContent = value || '待核实';
    row.append(term, description);
    return row;
  }));
  $('#record-interpretation').textContent = record.interpretation;
  const citation = $('#modal-citation');
  citation.replaceChildren(...record.references.map(reference => {
    const sourceLink = document.createElement('a');
    sourceLink.href = reference.url;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noreferrer';
    sourceLink.textContent = `${reference.label} ↗`;
    return sourceLink;
  }), document.createTextNode(` · 影像：${record.image.author} · ${record.image.license}`));
  const detailLink = $('#modal-detail-link');
  detailLink.href = artifactUrl(record);
  detailLink.dataset.artifactKey = record.id;
  openDialog($('#artifact-modal'));
}

function artifactUrl(record) {
  return `${window.location.pathname}?artifact=${encodeURIComponent(record.slug)}`;
}

function renderArtifactDetail(slug) {
  const record = artifactList.find(item => item.slug === slug);
  const layout = $('#detail-layout');
  const notFound = $('#detail-not-found');
  layout.hidden = !record;
  notFound.hidden = Boolean(record);
  if (!record) {
    $('#detail-breadcrumb-name').textContent = '未找到';
    document.title = '未找到文物 · 三星堆数字探索平台';
    return;
  }

  $('#detail-breadcrumb-name').textContent = record.name;
  $('#detail-kicker').textContent = record.kicker;
  $('#detail-title').textContent = record.name;
  $('#detail-status').textContent = record.status.label;
  $('#detail-status').dataset.status = record.status.kind;
  $('#detail-intro').textContent = record.intro;
  $('#detail-interpretation').textContent = `${record.status.label}。${record.interpretation}`;
  document.title = `${record.name} · 文物档案 · 三星堆数字探索平台`;

  const meta = $('#detail-meta');
  meta.replaceChildren(...detailMeta(record).flatMap(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value || '待核实';
    return [term, description];
  }));

  const visual = $('#detail-visual');
  visual.replaceChildren();
  if (record.image.src) {
    const image = new Image();
    image.className = 'detail-photo';
    image.src = record.image.src;
    image.alt = record.image.alt;
    image.addEventListener('error', () => {
      visual.replaceChildren();
      const fallback = document.createElement('div');
      fallback.className = 'detail-image-placeholder';
      fallback.textContent = `影像暂时无法加载。${record.image.status}`;
      visual.append(fallback);
    }, {once:true});
    visual.append(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = `detail-image-placeholder detail-image-${record.image.kind}`;
    placeholder.textContent = record.image.kind === 'diagram' ? '器形示意 · 非文物照片' : '图像占位 · 无可确认馆藏影像';
    visual.append(placeholder);
  }
  $('#detail-image-caption').textContent = `${record.image.author} · ${record.image.license} · ${record.image.status}`;
  const imageSource = $('#detail-image-source');
  imageSource.hidden = !record.image.sourceUrl;
  imageSource.href = record.image.sourceUrl || '#';

  $('#detail-references').replaceChildren(...record.references.map(reference => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = reference.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = `${reference.label} ↗`;
    const type = document.createElement('span');
    type.className = 'source-type';
    type.textContent = reference.type;
    const note = document.createElement('p');
    note.textContent = reference.note;
    item.append(link, type, note);
    return item;
  }));
  $('#detail-share-status').textContent = '';
}

function renderCurrentRoute() {
  const slug = new URLSearchParams(window.location.search).get('artifact');
  const detailView = $('#artifact-detail-view');
  const homeView = $('#home-view');
  const isDetail = slug !== null;
  homeView.hidden = isDetail;
  detailView.hidden = !isDetail;
  document.body.classList.toggle('detail-mode', isDetail);
  if (isDetail) renderArtifactDetail(slug);
  else document.title = '三星堆 · 古蜀文明数字探索平台';
}

function navigateToArtifact(key) {
  const record = records[key] || artifactList.find(item => item.slug === key);
  if (!record) return;
  history.pushState({artifact:record.slug}, '', artifactUrl(record));
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function navigateToHome(anchor = 'collection') {
  const hash = anchor ? `#${encodeURIComponent(anchor)}` : '';
  history.pushState({home:true}, '', `${window.location.pathname}${hash}`);
  renderCurrentRoute();
  if (anchor) requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}));
  else window.scrollTo({top:0, behavior:'auto'});
}

$$('.artifact-card').forEach(card => card.addEventListener('click', () => navigateToArtifact(card.dataset.artifact)));
$('[data-modal-detail-link]').addEventListener('click', event => {
  event.preventDefault();
  const key = event.currentTarget.dataset.artifactKey;
  closeDialog($('#artifact-modal'));
  navigateToArtifact(key);
});
$('[data-copy-url]').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    $('#detail-share-status').textContent = '详情链接已复制。';
  } catch {
    $('#detail-share-status').textContent = '未能自动复制，请从浏览器地址栏复制当前链接。';
  }
});
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || !$('#home-view').hidden) return;
  const anchor = link.getAttribute('href').slice(1);
  if (anchor === 'sources') return;
  event.preventDefault();
  navigateToHome(anchor === 'top' ? '' : anchor);
});
window.addEventListener('popstate', () => {
  renderCurrentRoute();
  if (!new URLSearchParams(window.location.search).has('artifact') && window.location.hash) {
    requestAnimationFrame(() => document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView());
  }
});
renderCurrentRoute();
$('[data-modal-ask]').addEventListener('click', () => {
  closeDialog($('#artifact-modal'));
  openGuide();
  $('#guide-input').value = `关于${$('#artifact-title').textContent}，我想了解它的出土背景与研究现状。`;
  $('#guide-input').focus();
});

function updateGallery(step) {
  galleryIndex = (galleryIndex + step + galleryItems.length) % galleryItems.length;
  const item = galleryItems[galleryIndex];
  const image = $('#gallery-image');
  image.style.opacity = '0';
  setTimeout(() => {
    image.src = item.image.src;
    image.alt = item.image.alt;
    image.style.opacity = '1';
  }, 140);
  $('#gallery-current').textContent = String(galleryIndex + 1).padStart(2, '0');
  $('#gallery-number').textContent = String(galleryIndex + 1).padStart(2, '0');
  $('#gallery-title').textContent = item.name;
  $('#gallery-subtitle').textContent = `${item.period} · ${item.excavation}`;
  $('#gallery-credit').textContent = `${item.image.author} · ${item.image.license}`;
  $('#gallery-source').href = item.image.sourceUrl;
}
$$('[data-gallery-step]').forEach(button => button.addEventListener('click', () => updateGallery(Number(button.dataset.galleryStep))));
$('#exhibition').addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') updateGallery(1);
  if (event.key === 'ArrowLeft') updateGallery(-1);
});
let touchStartX = null;
$('.gallery-stage').addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].screenX; }, {passive:true});
$('.gallery-stage').addEventListener('touchend', event => {
  if (touchStartX === null) return;
  const delta = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(delta) > 45) updateGallery(delta < 0 ? 1 : -1);
  touchStartX = null;
}, {passive:true});

$$('.graph-node').forEach(node => node.addEventListener('click', () => {
  $$('.graph-node').forEach(item => item.classList.toggle('selected', item === node));
  $('#graph-title').textContent = node.dataset.node;
  $('#graph-detail').textContent = node.dataset.detail;
}));

const layerNotes = {
  1: { label:'表层', status:'表层：观察界面示意', copy:'网格位置与线索均为虚构，不代表真实地层。' },
  2: { label:'扰土层', status:'扰土层：观察界面示意', copy:'真实地层需依据发掘记录与专业判断识别。' },
  3: { label:'堆积层', status:'堆积层：观察界面示意', copy:'本练习不包含真实遗址坐标、文物编号或出土信息。' }
};
const grid = $('#excavation-grid');
const markedCells = new Set([5, 11, 19, 26, 34]);
for (let i = 0; i < 40; i += 1) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = `excavation-cell${markedCells.has(i) ? ' marked' : ''}`;
  cell.setAttribute('aria-label', `示意探方格点 ${Math.floor(i / 8) + 1}-${(i % 8) + 1}`);
  cell.dataset.cell = String(i);
  cell.addEventListener('click', () => {
    $$('.excavation-cell', grid).forEach(item => item.classList.toggle('chosen', item === cell));
    const hasMark = markedCells.has(Number(cell.dataset.cell));
    $('#field-state-title').textContent = hasMark ? `示意线索 · 格点 ${Math.floor(i / 8) + 1}-${(i % 8) + 1}` : `格点 ${Math.floor(i / 8) + 1}-${(i % 8) + 1} · 尚无标记`;
    $('#field-state-copy').textContent = hasMark ? '教学示意符号，不代表真实遗物或考古发现。' : '模拟练习 · 该格点没有设置示意符号。';
  });
  grid.append(cell);
}
$$('.layer-button').forEach(button => button.addEventListener('click', () => {
  $$('.layer-button').forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  const layer = layerNotes[button.dataset.layer];
  $('#layer-label').textContent = `层位 ${button.dataset.layer} / 03`;
  $('#field-state-title').textContent = layer.status;
  $('#field-state-copy').textContent = layer.copy;
  $$('.excavation-cell', grid).forEach((cell, i) => {
    const visibleMarker = markedCells.has(i) && (Number(button.dataset.layer) === 1 || Number(button.dataset.layer) === 3 && i === 19);
    cell.classList.toggle('marked', visibleMarker);
    cell.classList.remove('chosen');
  });
}));

function openGuide() {
  $('#guide-panel').classList.add('open');
  $('#guide-panel').setAttribute('aria-hidden', 'false');
  $('.panel-scrim').classList.add('open');
  document.body.classList.add('no-scroll');
  setTimeout(() => $('#guide-input').focus(), 180);
}
function closeGuide() {
  $('#guide-panel').classList.remove('open');
  $('#guide-panel').setAttribute('aria-hidden', 'true');
  $('.panel-scrim').classList.remove('open');
  if (!$('dialog[open]')) document.body.classList.remove('no-scroll');
}
$$('[data-open-guide]').forEach(button => button.addEventListener('click', () => {
  const prompt = button.dataset.initialPrompt;
  if (prompt) $('#guide-input').value = prompt;
  openGuide();
}));
$$('[data-close-guide]').forEach(button => button.addEventListener('click', closeGuide));
$$('[data-prompt]').forEach(button => button.addEventListener('click', () => {
  $('#guide-input').value = button.dataset.prompt;
  $('#guide-input').focus();
}));
$('#guide-form').addEventListener('submit', event => {
  event.preventDefault();
  const status = $('#form-status');
  status.textContent = $('#guide-input').value.trim() ? '尚未连接知识服务；问题未发送、未保存。' : '请先输入或选择一个问题。';
});

$$('[data-home-example]').forEach(button => button.addEventListener('click', () => {
  $('#home-question').value = button.dataset.homeExample;
  $('#home-question').focus();
}));
$('[data-home-ask]').addEventListener('click', () => {
  const question = $('#home-question').value.trim();
  if (!question) {
    showToast('先输入问题，或选择一条示例问题。');
    $('#home-question').focus();
    return;
  }
  $('#guide-input').value = question;
  openGuide();
});
$('[data-login]').addEventListener('click', () => showToast('账户功能尚未开放；当前可公开浏览文物与学习内容。'));

const quizFeedback = $('#quiz-feedback');
$$('[data-quiz-answer]').forEach(button => button.addEventListener('click', () => {
  const correct = button.dataset.quizAnswer === 'open';
  quizFeedback.textContent = correct
    ? '正确。名称是便于指称的线索；具体文化内涵仍需结合器物、出土背景与研究资料讨论。'
    : '再想想。通行名称不等于已经确认唯一象征含义；请结合器物与考古资料判断。';
  quizFeedback.classList.toggle('is-correct', correct);
  quizFeedback.classList.toggle('is-retry', !correct);
  $$('[data-quiz-answer]').forEach(option => { option.disabled = true; });
  $('[data-quiz-reset]').hidden = false;
}));
$('[data-quiz-reset]').addEventListener('click', () => {
  quizFeedback.textContent = '选择一个答案，查看说明。';
  quizFeedback.classList.remove('is-correct', 'is-retry');
  $$('[data-quiz-answer]').forEach(option => { option.disabled = false; });
  $('[data-quiz-reset]').hidden = true;
});

const searchModal = $('#search-modal');
function openSearch() {
  openDialog(searchModal);
  $('#global-search').value = '';
  renderSearch('');
  setTimeout(() => $('#global-search').focus(), 50);
}
function renderSearch(query) {
  const term = query.trim().toLocaleLowerCase();
  const matches = Object.entries(records).filter(([, record]) => `${record.name} ${record.slug} ${record.category} ${record.period} ${record.material} ${record.excavation} ${record.discovery} ${record.intro} ${record.interpretation} ${record.references.map(source => source.label).join(' ')}`.toLocaleLowerCase().includes(term));
  const results = $('#search-results');
  if (!matches.length) {
    results.innerHTML = '<p class="search-empty">暂未找到匹配档案。可以尝试更短关键词，或查看全部文物条目。</p>';
    return;
  }
  results.replaceChildren(...matches.map(([key, record]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-row';
    const title = document.createElement('span');
    title.textContent = record.name;
    const label = document.createElement('small');
    label.textContent = subtitleFor(record);
    button.append(title, label);
    button.addEventListener('click', () => {
      closeDialog(searchModal);
      openArtifact(key);
    });
    return button;
  }));
}
$('[data-open-search]').addEventListener('click', openSearch);
$('#global-search').addEventListener('input', event => renderSearch(event.target.value));

$('[data-open-story]').addEventListener('click', () => openDialog($('#story-modal')));
$$('[data-learning]').forEach(button => button.addEventListener('click', () => {
  const target = button.dataset.learning;
  if (target === '关系图练习') {
    $('#knowledge').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    showToast('关系图练习：选择一个节点，阅读事实与解释边界。');
  } else if (target === '观察记录单') {
    $('#collection').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    showToast('观察记录：选择一件器物，从形状、材质与出土背景开始。');
  } else {
    $('#worksheet-draft').value = '';
    $('#worksheet-status').textContent = '不会保存到服务器，也不会生成未经核实的文物信息。';
    openDialog($('#worksheet-modal'));
  }
}));

$('#worksheet-form').addEventListener('submit', event => {
  event.preventDefault();
  const object = $('#worksheet-object').value;
  const observation = $('#worksheet-observation').value.trim() || '（待填写：记录可观察到的形状、材质或细节）';
  const source = $('#worksheet-source').value.trim() || '（待填写：补充可核验的资料来源）';
  const question = $('#worksheet-question').value.trim() || '（待填写：标出仍需核实的问题）';
  $('#worksheet-draft').value = `【${object}】\n观察：${observation}\n资料来源：${source}\n仍需核实：${question}`;
  $('#worksheet-status').textContent = '已在当前页面整理草稿。请核对引用和事实后再用于课堂或展签。';
});

const menu = $('.primary-nav');
const menuToggle = $('.menu-toggle');
menuToggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
});
$$('.primary-nav a').forEach(link => link.addEventListener('click', () => {
  menu.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeGuide();
});

// Keep remote-image failures legible and honest rather than leaving a broken icon.
$$('img').forEach(img => img.addEventListener('error', () => {
  img.classList.add('image-unavailable');
  if (!img.parentElement.querySelector('.image-fallback')) {
    const fallback = document.createElement('span');
    fallback.className = 'image-fallback';
    fallback.textContent = '影像暂时无法加载 · 请查看来源页';
    img.parentElement.append(fallback);
  }
}));
