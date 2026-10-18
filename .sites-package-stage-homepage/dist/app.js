const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const records = {
  figure: {
    title: '青铜大立人像', kicker: 'BRONZE FIGURE · 01', subtitle: '三星堆二号祭祀坑出土 · 青铜',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/%E4%B8%89%E6%98%9F%E5%A0%86%E5%87%BA%E5%9C%9F%E9%9D%92%E9%93%9C%E5%A4%A7%E7%AB%8B%E4%BA%BA%E5%83%8F%2C_2017-09-17.jpg?width=1100', alt: '三星堆青铜大立人像全身展陈照片',
    rows: [['出土地点','三星堆二号祭祀坑'],['发现时间','1986 年发掘'],['器物材质','青铜'],['通高','约 2.62 米'],['收藏信息','三星堆博物馆']],
    interpretation: '器物造型与手持姿态引发了关于身份和仪式功能的多种讨论。祭司、王者等说法属于研究解释，尚不能作为确定结论。',
    sourceLabel: '资料：四川人大网 · 三星堆遗址史料；影像：Siyuwj', sourceUrl: 'https://www.scspc.gov.cn/lfdt/202106/157515.html', credit: 'Siyuwj · CC BY-SA 4.0',
    photoUrl: 'https://commons.wikimedia.org/wiki/File:%E4%B8%89%E6%98%9F%E5%A0%86%E5%87%BA%E5%9C%9F%E9%9D%92%E9%93%9C%E5%A4%A7%E7%AB%8B%E4%BA%BA%E5%83%8F,_2017-09-17.jpg'
  },
  tree: {
    title: '青铜神树', kicker: 'BRONZE TREE · 02', subtitle: '三星堆二号祭祀坑出土 · 青铜',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bronze_Sacred_Tree.jpg?width=1100', alt: '三星堆一号大型青铜神树展陈照片',
    rows: [['出土地点','三星堆二号祭祀坑'],['发现时间','1986 年发掘'],['器物材质','青铜'],['现存通高','约 3.96 米'],['图像作者','momo（Flickr）']],
    interpretation: '“神树”作为器物名称已为学界共识。其具体内涵仍有不同解释；树形、神鸟与龙等细节可观察，不能单独据此确定神话对应关系。',
    sourceLabel: '资料：三星堆博物馆 · 文物介绍；影像：momo / Wikimedia Commons', sourceUrl: 'https://www.sxd.cn/relics/', credit: 'momo · CC BY 2.0',
    photoUrl: 'https://commons.wikimedia.org/wiki/File:Bronze_Sacred_Tree.jpg'
  },
  mask: {
    title: '青铜面具', kicker: 'BRONZE MASK · 03', subtitle: '三星堆文化 · 青铜',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sanxingdui_Bronsmask.jpg?width=1100', alt: '三星堆出土青铜面具展陈照片',
    rows: [['器物类别','青铜面具'],['文化归属','三星堆文化'],['图像地点','中国国家博物馆展出'],['图像作者','Bairuilong'],['授权方式','CC BY-SA 4.0']],
    interpretation: '本图为三星堆出土青铜面具照片。图片拍摄于中国国家博物馆展出场景；具体器物编号、出土坑位与身份解释，请以对应馆藏档案为准。',
    sourceLabel: '影像与授权：Wikimedia Commons · Bairuilong', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sanxingdui_Bronsmask.jpg', credit: 'Bairuilong · CC BY-SA 4.0',
    photoUrl: 'https://commons.wikimedia.org/wiki/File:Sanxingdui_Bronsmask.jpg'
  },
  gold: {
    title: '黄金面具', kicker: 'GOLD MASK · 04', subtitle: '三星堆新发现相关器物 · 金器',
    image: '', alt: '文物图像暂缺：黄金面具的资料占位图，不代表真实器物',
    rows: [['器物类别','黄金面具'],['材质','黄金'],['发现背景','2021 年公布的新发现中包含金面具残片'],['图像授权','待核实，未展示馆藏照片']],
    interpretation: '图像暂缺，页面以明确标记的视觉占位呈现。不同金面具和残片的形制、出土单位与保存状态需逐件核实。',
    sourceLabel: '资料：四川人大网 · 2021 年三星堆考古新发现报道', sourceUrl: 'https://www.scspc.gov.cn/lfdt/202106/157515.html', credit: '图像占位 · 无馆藏照片', photoUrl: ''
  },
  jade: {
    title: '玉璋', kicker: 'JADE ZHANG · 05', subtitle: '玉石器 · 器物资料原型',
    image: '', alt: '玉璋形制示意图，为代码绘制的图形，不是真实文物照片',
    rows: [['器物类别','玉璋'],['器物材质','玉石'],['图像说明','代码绘制的器形示意'],['考古语境','需结合具体器物的出土记录核验']],
    interpretation: '三星堆祭祀坑出土有玉石器。此条目不指向某一件具备具体编号的玉璋，形制示意不代表真实器物。',
    sourceLabel: '资料：四川人大网 · 三星堆遗址史料', sourceUrl: 'https://www.scspc.gov.cn/lfdt/202106/157515.html', credit: '代码绘制示意 · 非馆藏影像', photoUrl: ''
  }
};

const galleryItems = [
  { key:'figure', ...records.figure },
  { key:'tree', ...records.tree },
  { key:'mask', ...records.mask }
];
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
  $('#artifact-title').textContent = record.title;
  $('#modal-subtitle').textContent = record.subtitle;
  const visual = $('#modal-image');
  visual.replaceChildren();
  if (record.image) {
    const img = new Image();
    img.src = record.image;
    img.alt = record.alt;
    img.loading = 'lazy';
    visual.append(img);
  } else {
    const label = document.createElement('span');
    label.className = 'modal-placeholder';
    label.textContent = record.alt;
    visual.append(label);
  }
  $('#record-table').innerHTML = record.rows.map(([label, value]) => `<div class="record-row"><span>${label}</span><span>${value}</span></div>`).join('');
  $('#record-interpretation').textContent = record.interpretation;
  const sourceLink = document.createElement('a');
  sourceLink.href = record.sourceUrl;
  sourceLink.target = '_blank';
  sourceLink.rel = 'noreferrer';
  sourceLink.textContent = `${record.sourceLabel} ↗`;
  const citation = $('#modal-citation');
  citation.replaceChildren(sourceLink, document.createTextNode(` · ${record.credit}`));
  openDialog($('#artifact-modal'));
}

$$('.artifact-card').forEach(card => card.addEventListener('click', () => openArtifact(card.dataset.artifact)));
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
    image.src = item.image;
    image.alt = item.alt;
    image.style.opacity = '1';
  }, 140);
  $('#gallery-current').textContent = String(galleryIndex + 1).padStart(2, '0');
  $('#gallery-number').textContent = String(galleryIndex + 1).padStart(2, '0');
  $('#gallery-title').textContent = item.title;
  $('#gallery-subtitle').textContent = item.subtitle;
  $('#gallery-credit').textContent = item.credit;
  $('#gallery-source').href = item.photoUrl;
});
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
  const matches = Object.entries(records).filter(([, record]) => `${record.title} ${record.subtitle} ${record.interpretation} ${record.rows.flat().join(' ')}`.toLocaleLowerCase().includes(term));
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
    title.textContent = record.title;
    const label = document.createElement('small');
    label.textContent = record.subtitle;
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
