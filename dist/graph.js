let pitExplorerPromise = null;
let pitExplorer = {sites: [], contexts: [], events: [], artifacts: [], edges: [], assignments: new Map(), unassigned: [], ambiguous: [], spatialEvidence: null};
let pitSelectedContextId = '';
let pitSelectedArtifactId = '';
let pitPopupOpen = false;

// Diagram-only positions approximate the supplied published plan's visual layout.
// These ratios are explicitly not geographic coordinates and must never be used by a map API.
const PIT_DIAGRAM_POSITIONS = Object.freeze({
  // Diagram-relative placements guided by the supplied plan; never geographic coordinates.
  K1: {x:49.3, y:32.3, rotate:45, kind:'1986'}, K2: {x:67.6, y:67.4, rotate:32, kind:'1986'},
  K3: {x:54.7, y:59.9, rotate:28}, K4: {x:59.6, y:48.6, rotate:18},
  K5: {x:58.2, y:71.3, rotate:8}, K6: {x:53.9, y:68.7, rotate:25},
  K7: {x:54.5, y:72.3, rotate:-8}, K8: {x:63.4, y:78.3, rotate:30}
});
// Curated highlights refer only to exact records in selected-book-300.jsonl.
const PIT_FEATURED_ARTIFACT_IDS = Object.freeze({
  K1: ['book-2009-122','book-2009-123','book-2009-084'],
  K2: ['book-2009-003','book-2009-005','book-2009-007']
});

const pitEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const pitStatus = status => ({needs_review:'待复核',verified:'资料已核实',published:'已发布',draft:'草稿',withdrawn:'已撤回'})[status] || '状态待核实';
const pitNormalize = value => String(value || '').toLocaleLowerCase().replace(/三星堆遗址|祭祀坑|祭祀|遗址|坑位|坑|\s|[-_—–·:：()（）【】\[\]]/g, '');

async function loadPitExplorerData() {
  if (pitExplorerPromise) return pitExplorerPromise;
  pitExplorerPromise = (async () => {
    const response = await fetch(new URL('./data/manifest.json', document.baseURI), {credentials:'same-origin'});
    if (!response.ok) throw new Error(`数据清单读取失败：${response.status} ${response.statusText}`);
    const manifest = await response.json();
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const read = async path => {
      const entry = files.find(file => file.path === path && file.format === 'jsonl');
      if (!entry) throw new Error(`数据清单未登记 ${path}`);
      const url = new URL(entry.url || `/data/${path}`, document.baseURI);
      if (url.origin !== window.location.origin || !url.pathname.includes('/data/')) throw new Error(`拒绝非本站数据路径：${path}`);
      return fetchJsonl(url.href);
    };
    const [sitesData, contextsData, eventsData, edgesData, spatialData, reportFindData] = await Promise.all([
      read('archaeology/sites.jsonl'), read('archaeology/contexts.jsonl'), read('archaeology/events.jsonl'), read('graph/edges.jsonl'), read('archaeology/spatial-evidence.jsonl'), read('artifacts/pit-report-finds.jsonl'), loadArtifactData()
    ]);
    if (!artifactDataSourceLoaded || !Array.isArray(artifactIndexItems) || !artifactIndexItems.some(item => item.index?.dataOrigin === '/data/artifacts/selected-book-300.jsonl')) {
      throw new Error(artifactDataLoadError || '精选300件图录未能读取，无法核对文物档案。');
    }
    const sites = sitesData.records.filter(row => row?.record_type === 'site' && row.id && row.record_status !== 'withdrawn');
    const contexts = contextsData.records.filter(row => row?.record_type === 'context' && row.id && row.record_status !== 'withdrawn');
    const events = eventsData.records.filter(row => row?.record_type === 'event' && row.id && row.record_status !== 'withdrawn');
    const contextIds = new Set(contexts.map(row => row.id));
    const selectedBookArtifacts = [...artifactRawById.values()].filter(row => row?.id && row.record_status !== 'withdrawn');
    const reportFindArtifacts = reportFindData.records.filter(row => row?.id && row.record_status !== 'withdrawn').map(row => ({...row, _dataCollection:'pit-report-finds'}));
    const selectedIds = new Set(selectedBookArtifacts.map(row => row.id));
    const reportIdCollisions = reportFindArtifacts.filter(row => selectedIds.has(row.id));
    if (reportIdCollisions.length) throw new Error(`简报档案 ID 与精选图录冲突：${reportIdCollisions.map(row => row.id).join('、')}`);
    const artifacts = [...selectedBookArtifacts, ...reportFindArtifacts];
    const edges = edgesData.records.filter(edge => edge?.predicate === 'found_in' && edge.subject?.type === 'artifact' && edge.subject?.id && edge.object?.type === 'context' && contextIds.has(edge.object.id));
    const edgeContextsByArtifact = new Map();
    edges.forEach(edge => {
      const ids = edgeContextsByArtifact.get(edge.subject.id) || new Set();
      ids.add(edge.object.id);
      edgeContextsByArtifact.set(edge.subject.id, ids);
    });
    const contextsById = new Map(contexts.map(row => [row.id, row]));
    const aliases = new Map(contexts.map(context => {
      const values = [context.code, context.context_code, context.name, ...(Array.isArray(context.alternate_names) ? context.alternate_names : [])]
        .map(pitNormalize).filter(Boolean);
      return [context.id, new Set(values)];
    }));
    const assignments = new Map(contexts.map(context => [context.id, []]));
    const unassigned = [], ambiguous = [];
    artifacts.forEach(artifact => {
      const discovery = artifact.discovery || {};
      const evidenceValues = [discovery.excavation_unit, discovery.context].filter(value => typeof value === 'string' && value.trim());
      const directIds = new Set();
      evidenceValues.forEach(value => {
        const normalized = pitNormalize(value);
        aliases.forEach((known, contextId) => { if (normalized && known.has(normalized)) directIds.add(contextId); });
      });
      const edgeIds = edgeContextsByArtifact.get(artifact.id) || new Set();
      const ids = directIds.size ? directIds : new Set(edgeIds);
      const conflict = directIds.size === 1 && edgeIds.size > 0 && [...edgeIds].some(id => !directIds.has(id));
      if (ids.size === 1 && !conflict) {
        const contextId = [...ids][0];
        const matchingEdges = edges.filter(edge => edge.subject.id === artifact.id && edge.object.id === contextId);
        assignments.get(contextId)?.push({artifact, matchBasis:directIds.size ? '图录出土信息与坑位名称/编号精确匹配' : '图谱中登记的 found_in 关系', matchingEdges});
      } else if (ids.size > 1 || conflict) ambiguous.push(artifact);
      else unassigned.push(artifact);
    });
    const diagnostics = [sitesData.malformed, contextsData.malformed, eventsData.malformed, edgesData.malformed, spatialData.malformed, reportFindData.malformed].reduce((sum, n) => sum + (n || 0), 0);
    const spatialEvidence = spatialData.records.find(row => row?.record_type === 'spatial_evidence_collection' && row.record_status !== 'withdrawn') || null;
    if (!spatialEvidence) throw new Error('空间证据目录中没有可展示的资料记录。');
    pitExplorer = {sites, contexts, events, artifacts, edges, assignments, unassigned, ambiguous, diagnostics, contextsById, spatialEvidence};
    return pitExplorer;
  })();
  return pitExplorerPromise;
}

function pitSourceMarkup(sources) {
  const valid = (Array.isArray(sources) ? sources : []).filter(source => source && (source.title || source.source_id || source.url));
  if (!valid.length) return '<p class="pit-no-source">当前记录没有单独登记的来源条目。</p>';
  return `<ol class="pit-source-list">${valid.map(source => {
    const url = typeof safeWebUrl === 'function' ? safeWebUrl(source.url) : '';
    return `<li><b>${pitEscape(source.title || source.source_id || '来源标题待核实')}</b>${source.source_id ? `<small>来源 ID：${pitEscape(source.source_id)}</small>` : ''}${source.publisher ? `<small>${pitEscape(source.publisher)}</small>` : ''}${source.locator ? `<small>定位：${pitEscape(source.locator)}</small>` : ''}${Array.isArray(source.supports) && source.supports.length ? `<small>支持字段：${pitEscape(source.supports.join('、'))}</small>` : ''}${url ? `<a href="${pitEscape(url)}" target="_blank" rel="noopener noreferrer">打开来源 ↗</a>` : '<small>来源链接未登记或不可用</small>'}</li>`;
  }).join('')}</ol>`;
}

function pitRecordSources(artifact) { return Array.isArray(artifact.sources) ? artifact.sources : []; }
function pitArtifactImageMarkup(artifact) {
  const media = Array.isArray(artifact.media) ? artifact.media.find(item => item?.media_type === 'image' && item.url) : null;
  if (!media) return '<p class="kg-empty-data">当前记录没有已登记图片。</p>';
  const kind = media.identity_type || media.image_kind || (String(media.creator || '').includes('图录') || String(media.attribution || '').includes('图录') ? '图录图版' : '图片类型待核实');
  return `<figure class="kg-artifact-image"><img src="${pitEscape(media.url)}" alt="${pitEscape(media.alt || artifact.name || '文物档案图片')}" loading="lazy"><figcaption><b>${pitEscape(kind)}</b> · ${pitEscape(media.creator || '作者待核实')} · ${pitEscape(media.license || '授权待核实')} · 权利状态：${pitEscape(media.rights_status || 'unknown')}<br>${pitEscape(media.attribution || '图片说明待补充')}${media.source_url && typeof safeWebUrl === 'function' && safeWebUrl(media.source_url) ? ` · <a href="${pitEscape(safeWebUrl(media.source_url))}" target="_blank" rel="noopener noreferrer">图片来源 ↗</a>` : ''}</figcaption></figure>`;
}

function pitArtifactCardMarkup(row, context) {
  const artifact = row.artifact;
  const materials = Array.isArray(artifact.materials_and_techniques) ? artifact.materials_and_techniques.filter(Boolean).join('、') : '';
  const period = artifact.period?.label || (artifact.period?.start_year && artifact.period?.end_year ? `${artifact.period.start_year}—${artifact.period.end_year}` : artifact.period?.start_year || '年代待核实');
  const unit = artifact.discovery?.excavation_unit || '坑位待核实';
  const collection = artifact._dataCollection === 'pit-report-finds' ? '考古简报专项档案' : '精选图录';
  return `<button class="pit-artifact-card" type="button" data-pit-artifact="${pitEscape(artifact.id)}" aria-label="查看${pitEscape(artifact.name)}详情，档案编号${pitEscape(artifact.id)}"><span class="pit-artifact-card-top"><span>${pitEscape(collection)} · ${pitEscape(context?.code || '坑位待明确')}</span><small>${pitEscape(pitStatus(artifact.record_status))}</small></span><b>${pitEscape(artifact.name || '名称待核实')}</b><span class="pit-artifact-facts">${pitEscape(artifact.category || '类别待核实')} · ${pitEscape(period)}</span><span class="pit-artifact-facts">${pitEscape(materials || '材质待核实')} · ${pitEscape(unit)}</span><small class="pit-artifact-id">${pitEscape(artifact.museum_inventory_number || artifact.id)}　›</small></button>`;
}

function pitFilteredArtifacts() {
  const query = $('#pit-search').value.trim().toLocaleLowerCase();
  const category = $('#pit-category-filter').value;
  const status = $('#pit-status-filter').value;
  let rows;
  if (pitSelectedContextId === '__unassigned__') rows = pitExplorer.unassigned.map(artifact => ({artifact, contextId:''}));
  else if (pitSelectedContextId) rows = (pitExplorer.assignments.get(pitSelectedContextId) || []).map(row => ({...row, contextId:pitSelectedContextId}));
  else rows = [...pitExplorer.assignments.entries()].flatMap(([contextId, assigned]) => assigned.map(row => ({...row, contextId})));
  return rows.filter(row => {
    const artifact = row.artifact;
    if (category && artifact.category !== category) return false;
    if (status && artifact.record_status !== status) return false;
    if (!query) return true;
    const discovery = artifact.discovery || {};
    const text = [artifact.name, ...(artifact.alternate_names || []), artifact.id, artifact.slug, artifact.museum_inventory_number, artifact.category, ...(artifact.materials_and_techniques || []), discovery.excavation_unit, discovery.context, artifact.description, ...(artifact.catalog_motifs || [])].filter(Boolean).join(' ').toLocaleLowerCase();
    return text.includes(query);
  });
}

function pitSourceForClaim(claim) {
  const source = pitExplorer.spatialEvidence?.sources?.find(item => item.source_id === claim?.source_id);
  return source ? [{...source, locator:claim.locator || source.locator}] : [];
}

function pitSpatialStatus(status) {
  if (status === 'rejected_as_pit_coordinate') return '已纠正归属：遗址级坐标，不是坑位坐标';
  return pitStatus(status);
}

function pitCoordinateDisplay(claim) {
  return [claim?.latitude_dms, claim?.longitude_dms].filter(Boolean).join(' · ') || '坐标待补充';
}

function pitSpatialClaimCard(claim, typeLabel) {
  const targetIds = claim.target_context_ids || (claim.target_context_id ? [claim.target_context_id] : []);
  const target = targetIds.length ? targetIds.map(id => pitExplorer.contextsById.get(id)?.code || id).join('、') : claim.target_id || '目标待核实';
  return `<article class="pit-spatial-claim"><div class="pit-spatial-claim-head"><span>${pitEscape(typeLabel)}</span><b>${pitEscape(target)}</b><i>${pitEscape(pitSpatialStatus(claim.status))}</i></div><p>${pitEscape(claim.description || claim.validation_note || claim.scope || '')}</p>${claim.latitude_dms ? `<p class="pit-raw-coordinate">原始坐标：${pitEscape(pitCoordinateDisplay(claim))}</p>` : ''}${claim.elevation_m ? `<p class="pit-raw-coordinate">海拔：${pitEscape(claim.elevation_m)} 米</p>` : ''}<p class="pit-coordinate-quality">坐标参考系：${pitEscape(claim.crs || '来源未注明')} · 精度：${pitEscape(claim.accuracy || '来源未注明')}</p>${claim.validation_note ? `<p class="pit-spatial-warning">${pitEscape(claim.validation_note)}</p>` : ''}${pitSourceMarkup(pitSourceForClaim(claim))}</article>`;
}

function pitPopupArtifactMarkup(row) {
  const artifact = row.artifact;
  const media = Array.isArray(artifact.media) ? artifact.media.find(item => item?.media_type === 'image' && item.url) : null;
  const description = String(artifact.description || '').trim();
  const excerpt = description.length > 145 ? `${description.slice(0,145)}…` : description || '档案简介待补充。';
  const imageKind = media?.identity_type || media?.image_kind || '图片类型待核实';
  const image = media ? `<img src="${pitEscape(media.url)}" alt="${pitEscape(media.alt || artifact.name || '文物图录图像')}" loading="lazy"><small class="pit-popup-image-credit">${pitEscape(imageKind)} · ${pitEscape(media.creator || '署名待核实')} · ${pitEscape(media.license || '许可待核实')} · ${pitEscape(media.rights_status || '权利状态待核实')}</small>` : '<span class="pit-popup-no-image">未登记图片</span>';
  const sourceUrl = typeof safeWebUrl === 'function' ? safeWebUrl(media?.source_url) : '';
  const imageSource = media ? `<p class="pit-popup-source-note">${pitEscape(media.attribution || '图片说明待核实')}${sourceUrl ? ` · <a href="${pitEscape(sourceUrl)}" target="_blank" rel="noopener noreferrer">图片来源 ↗</a>` : ' · 来源链接待核实'}</p>` : '';
  return `<article class="pit-popup-entry"><button class="pit-popup-artifact" type="button" data-pit-artifact="${pitEscape(artifact.id)}" aria-label="查看${pitEscape(artifact.name)}档案详情"><span class="pit-popup-artifact-image">${image}</span><span class="pit-popup-artifact-copy"><b>${pitEscape(artifact.name || '名称待核实')}</b><small>${pitEscape(artifact.museum_inventory_number || artifact.id)} · ${pitEscape(pitStatus(artifact.record_status))}</small><span>${pitEscape(excerpt)}</span><i>查看档案与来源　›</i></span></button>${imageSource}</article>`;
}

function pitRenderPlan() {
  const positions = PIT_DIAGRAM_POSITIONS;
  const available = [...document.querySelectorAll('#pit-map [data-pit-context]')].map(button => button.dataset.pitContext);
  const visibleIds = new Set(available);
  const contexts = pitExplorer.contexts.filter(context => visibleIds.has(context.id) && positions[context.code]);
  const polygons = {
    K1:'0,-40 34,-8 17,30 -5,38 -34,5', K2:'-29,-23 2,-40 34,-5 11,32 -17,23',
    K3:'-19,-35 14,-41 29,-15 9,11 -7,39 -29,25', K4:'-20,-24 6,-29 25,-3 8,23 -18,13',
    K5:'-20,-15 4,-23 21,-3 5,18 -17,12', K6:'-24,-18 6,-27 25,-2 11,24 -15,18',
    K7:'-23,-20 9,-26 22,-3 4,22 -22,13', K8:'-34,-18 -3,-28 32,-9 17,18 -15,26 -36,7'
  };
  const markers = contexts.map(context => {
    const point = positions[context.code];
    const active = context.id === pitSelectedContextId;
    const count = (pitExplorer.assignments.get(context.id) || []).length;
    const label = `${context.code || '坑位'}，${context.name || ''}，${count} 条明确关联档案，${pitStatus(context.record_status)}。按回车查看关联档案。`;
    return `<g class="pit-plan-marker${point.kind === '1986' ? ' is-1986' : ''}${active ? ' is-selected' : ''}" transform="translate(${point.x * 10} ${point.y * 7.7}) rotate(${point.rotate})" role="button" tabindex="0" data-pit-context="${pitEscape(context.id)}" aria-pressed="${active}" aria-label="${pitEscape(label)}"><title>${pitEscape(context.name || context.code || context.id)} · ${pitEscape(pitStatus(context.record_status))}</title><polygon class="pit-plan-pit-shape" points="${polygons[context.code] || polygons.K4}"></polygon><text class="pit-plan-marker-code" transform="rotate(${-point.rotate})" text-anchor="middle" dominant-baseline="central">${pitEscape(context.code || '坑位')}</text></g>`;
  }).join('');
  const selectedContext = pitExplorer.contextsById.get(pitSelectedContextId);
  const selectedRows = selectedContext ? (pitExplorer.assignments.get(selectedContext.id) || []) : [];
  const featuredIds = PIT_FEATURED_ARTIFACT_IDS[selectedContext?.code] || [];
  const curatedRows = featuredIds.length
    ? selectedRows.filter(row => featuredIds.includes(row.artifact.id))
    : selectedRows.filter(row => row.artifact._dataCollection === 'pit-report-finds');
  const query = $('#pit-search').value.trim().toLocaleLowerCase();
  const featured = curatedRows.filter(({artifact}) => {
    if ($('#pit-category-filter').value && artifact.category !== $('#pit-category-filter').value) return false;
    if ($('#pit-status-filter').value && artifact.record_status !== $('#pit-status-filter').value) return false;
    if (!query) return true;
    return [artifact.name, artifact.id, artifact.museum_inventory_number, artifact.category, artifact.description].filter(Boolean).join(' ').toLocaleLowerCase().includes(query);
  });
  const emptyMessage = !selectedRows.length
    ? selectedContext?.code === 'K6'
      ? '当前未提供 K6 专项资料；精选图录中也暂无可明确关联记录。不会生成占位文物或从其他坑位借用记录。'
      : `当前档案中暂无可明确关联到${pitEscape(selectedContext?.code || '该坑位')}的文物记录；不从其他坑位借用器物。`
    : curatedRows.length && !featured.length
      ? '当前搜索或筛选条件下没有匹配的代表文物。'
      : `该坑位有 ${selectedRows.length} 条明确关联记录；尚未在弹窗中标记代表条目。`;
  const popup = pitPopupOpen && selectedContext ? `<aside class="pit-plan-popup" role="dialog" aria-labelledby="pit-popup-title" aria-live="polite"><div class="pit-plan-popup-head"><div><p class="eyebrow">坑位档案 · ${pitEscape(pitStatus(selectedContext.record_status))}</p><h3 id="pit-popup-title">${pitEscape(selectedContext.code || '')}　${pitEscape(selectedContext.name || '坑位名称待核实')}</h3><p>明确关联档案 ${selectedRows.length} 条 · 当前显示 ${featured.length} 条</p></div><button type="button" class="pit-popup-close" data-pit-popup-close aria-label="关闭坑位文物介绍">×</button></div>${featured.length ? `<div class="pit-popup-artifacts">${featured.map(row => pitPopupArtifactMarkup(row)).join('')}</div>` : `<p class="pit-popup-empty">${emptyMessage}</p>`}<p class="pit-popup-note">精选图录与简报专项记录分开标注；内容均为待复核。图片说明、出处和权利状态会在档案中列明。</p></aside>` : '';
  const gridBlock = (x, y, columns, rows, cell, klass = 'pit-grid-line') => {
    const width = columns * cell, height = rows * cell;
    return `<g class="${klass}" aria-hidden="true"><rect x="${x}" y="${y}" width="${width}" height="${height}"/><path d="${Array.from({length:columns - 1}, (_, i) => `M${x + cell * (i + 1)} ${y}v${height}`).join(' ')} ${Array.from({length:rows - 1}, (_, i) => `M${x} ${y + cell * (i + 1)}h${width}`).join(' ')}"/></g>`;
  };
  const grids = [
    gridBlock(270, 90, 2, 3, 53), gridBlock(323, 196, 3, 3, 53),
    gridBlock(376, 302, 5, 7, 53), gridBlock(589, 568, 4, 2, 53),
    gridBlock(449, 207, 3, 2, 53, 'pit-grid-line pit-grid-old'),
    gridBlock(608, 462, 2, 2, 53, 'pit-grid-line pit-grid-old')
  ].join('');
  const contours = [
    'M398 -25 C390 75 390 118 404 154 C421 194 407 211 407 242 C410 286 438 297 463 313 C500 338 495 376 505 414 C516 454 544 466 561 491 C587 529 584 565 606 588 C632 617 662 633 659 675 C657 720 643 752 650 795',
    'M428 -25 C420 78 420 119 434 151 C450 189 438 210 438 240 C440 278 466 292 489 307 C523 331 519 369 531 405 C544 444 570 455 588 482 C611 517 609 552 630 575 C655 602 687 618 687 662 C687 711 673 748 680 795',
    'M458 -25 C450 78 451 116 463 147 C480 185 468 205 468 235 C469 271 492 285 515 301 C547 324 543 360 556 397 C570 434 597 446 613 472 C635 506 636 538 656 560 C682 589 713 603 714 648 C717 699 704 744 711 795',
    'M780 -20 C749 60 754 113 780 149 C813 194 795 226 819 260 C842 291 884 297 899 337 C915 382 889 417 914 455 C941 495 973 502 985 548 C998 598 973 643 988 687 C997 714 1005 744 1015 780'
  ];
  const contourMarkup = contours.map((d, i) => `<path class="pit-plan-contour${i % 2 ? ' is-soft' : ''}" d="${d}"/>`).join('');
  const legend = `<g class="pit-plan-legend" aria-hidden="true"><text x="30" y="575" class="pit-legend-title">图例 · 档案示意</text><path class="pit-legend-pit-old" d="M32 596h45v19H32z"/><text x="94" y="611">1986年发现坑位（K1、K2）</text><path class="pit-legend-pit-new" d="M32 632h45v19H32z"/><text x="94" y="647">新一轮发现坑位（K3—K8）</text><path class="pit-legend-grid" d="M32 668h45"/><text x="94" y="672">探方网格布局示意</text><path class="pit-legend-contour" d="M32 693h45"/><text x="94" y="697">地形线风格示意</text><path class="pit-legend-scale" d="M32 727h126m-126-5v10m126-10v10"/><text x="32" y="750">比例尺位置示意 · 非实测</text></g>`;
  return `<section class="pit-plan-view" aria-label="祭祀坑相对分布示意图"><div class="pit-plan-heading"><div><p class="eyebrow">ARCHAEOLOGICAL PLAN · SELECT A PIT</p><h2>三星堆祭祀坑分布示意</h2><p>选择平面图中的坑位，查看该坑的图录代表文物与档案说明。</p></div><span class="pit-plan-badge">图面示意 · 非测绘底图</span></div><div class="pit-plan-frame"><svg class="pit-plan-svg" viewBox="0 0 1000 770" role="group" aria-label="参考已发表坑位分布图的构图绘制的交互示意图。坑位可用 Tab 聚焦并按 Enter 打开介绍；网格、地形线和比例尺均为视觉示意，不代表测绘数据。" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="pit-plan-ground" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#18201a"/><stop offset=".48" stop-color="#202a22"/><stop offset="1" stop-color="#26342a"/></linearGradient><radialGradient id="pit-plan-wash"><stop offset="0" stop-color="#53685b" stop-opacity=".18"/><stop offset="1" stop-color="#53685b" stop-opacity="0"/></radialGradient></defs><rect width="1000" height="770" fill="url(#pit-plan-ground)"/><rect width="1000" height="770" fill="url(#pit-plan-wash)"/><g class="pit-plan-contours" aria-hidden="true">${contourMarkup}</g><g class="pit-plan-grids" aria-hidden="true">${grids}</g><g class="pit-plan-north" aria-hidden="true"><text x="42" y="48">北</text><path d="M43 118V64m0 0-7 13m7-13 7 13"/></g>${markers}${legend}</svg>${popup}${!contexts.length ? '<p class="pit-plan-empty">没有匹配的坑位，请清除搜索或筛选后重试。</p>' : ''}<p class="pit-plan-map-label">示意布局参考已发表坑位分布图；坑位点位、边界和比例未经测绘数据校准。</p></div><div class="pit-plan-footer"><span><i aria-hidden="true"></i>1986年发现坑位</span><span><i class="is-new" aria-hidden="true"></i>新一轮考古发现坑位</span><span class="pit-plan-note-inline">探方网格、地形线与比例尺位置均为视觉示意。</span></div></section>`;
}

function pitRenderSpatialPanel() {
  const panel = $('#pit-spatial-panel');
  panel.innerHTML = pitRenderPlan();
  panel.querySelectorAll('.pit-popup-artifact-image img').forEach(image => image.addEventListener('error', () => {
    const fallback = document.createElement('span'); fallback.className = 'pit-popup-no-image'; fallback.textContent = '图片无法加载'; image.replaceWith(fallback);
  }));
}

function pitRenderMap() {
  const map = $('#pit-map');
  const query = $('#pit-search').value.trim().toLocaleLowerCase();
  const categories = $('#pit-category-filter').value;
  const status = $('#pit-status-filter').value;
  const contextItems = pitExplorer.contexts.map(context => {
    const entries = (pitExplorer.assignments.get(context.id) || []).filter(({artifact}) => {
      if (categories && artifact.category !== categories) return false;
      if (status && artifact.record_status !== status) return false;
      if (!query) return true;
      const searchContext = [context.name, context.code, ...(context.alternate_names || [])].join(' ').toLocaleLowerCase();
      const searchArtifact = [artifact.name, artifact.id, artifact.museum_inventory_number, artifact.category, ...(artifact.materials_and_techniques || [])].join(' ').toLocaleLowerCase();
      return searchContext.includes(query) || searchArtifact.includes(query);
    });
    const contextText = [context.name, context.code, ...(context.alternate_names || [])].join(' ').toLocaleLowerCase();
    const active = context.id === pitSelectedContextId;
    const hasSearchHit = !query || contextText.includes(query) || entries.length > 0;
    return {hasSearchHit, markup:`<button class="pit-marker${active ? ' is-selected' : ''}" type="button" data-pit-context="${pitEscape(context.id)}" aria-pressed="${active}" aria-label="选择${pitEscape(context.name)}，${entries.length}条当前匹配的精选图录记录，${pitEscape(pitStatus(context.record_status))}"><span class="pit-marker-code">${pitEscape(context.code || '编号待核实')}</span><b>${pitEscape(context.name || context.id)}</b><small>${entries.length} 条明确关联记录</small><i>${pitEscape(pitStatus(context.record_status))}</i></button>`};
  });
  const visibleContexts = contextItems.filter(item => item.hasSearchHit);
  $('#pit-context-count').textContent = `${visibleContexts.length} / ${pitExplorer.contexts.length} 个`;
  if (query && !visibleContexts.length) map.innerHTML = '<p class="pit-map-empty">没有匹配的坑位或文物记录。可以清除搜索后重新浏览。</p>';
  else map.innerHTML = visibleContexts.map(item => item.markup).join('') || '<p class="pit-map-empty">当前没有可展示的坑位档案。</p>';
  $('#pit-map').setAttribute('aria-busy','false');
}

function pitDetailContextMarkup(context) {
  const events = pitExplorer.events.filter(event => Array.isArray(event.context_ids) && event.context_ids.includes(context.id));
  const assigned = pitExplorer.assignments.get(context.id) || [];
  const discovery = context.discovery || {}, excavation = context.excavation || {};
  const rows = [
    ['坑位编号', context.code], ['遗址 ID', context.site_id], ['发现时间', discovery.date ? `${discovery.date}${discovery.date_precision === 'year' ? '年' : ''}` : '待核实'],
    ['发掘时间', excavation.start_date ? `${excavation.start_date}${excavation.end_date && excavation.end_date !== excavation.start_date ? ` — ${excavation.end_date}` : ''}` : '待核实'],
    ['档案位置描述', context.position_in_site], ['坑位地理坐标', pitUsableCoordinates(context) ? pitCoordinateDisplay(context.coordinates) : '尚无可核验坐标'], ['记录状态', pitStatus(context.record_status)]
  ].filter(row => row[1]);
  const eventMarkup = events.length ? events.map(event => `<details class="pit-event-record"><summary><span>${pitEscape(event.date_start || '日期待核实')} · ${pitEscape(event.date_precision || '精度待核实')}</span><b>${pitEscape(event.name || '事件名称待核实')}</b><small>${pitEscape(pitStatus(event.record_status))}</small></summary><div><p>${pitEscape(event.description || '事件说明待补充')}</p>${pitSourceMarkup(event.sources)}</div></details>`).join('') : '<p class="kg-empty-data">当前坑位档案没有关联考古事件。</p>';
  const evidence = pitExplorer.spatialEvidence || {};
  const relativeClaims = (evidence.relative_position_claims || []).filter(claim => Array.isArray(claim.target_context_ids) && claim.target_context_ids.includes(context.id));
  const relativeMarkup = relativeClaims.length ? relativeClaims.map(claim => pitSpatialClaimCard(claim,'报告相对位置')).join('') : '<p class="kg-empty-data">暂无该坑位的相对位置资料。</p>';
  return `<article class="pit-detail-record"><button class="pit-detail-back" type="button" data-pit-back>‹ 返回坑位分布图</button><p class="eyebrow">祭祀坑档案</p><h2>${pitEscape(context.name || context.id)}</h2><span class="kg-review">${pitEscape(pitStatus(context.record_status))}</span><dl class="kg-meta">${rows.map(([label,value]) => `<div><dt>${pitEscape(label)}</dt><dd>${pitEscape(value)}</dd></div>`).join('')}</dl><p class="pit-record-summary">${pitEscape(context.summary || '坑位摘要待核实。')}</p>${discovery.method_or_event ? `<p class="pit-record-summary">${pitEscape(discovery.method_or_event)}</p>` : ''}<section class="pit-detail-section"><h3>明确关联档案 <span>${assigned.length}</span></h3><p class="pit-record-summary">按记录中的出土单位/坑位名称或图谱显式关系匹配，包含精选图录与已接入的简报专项档案。此数量不是该坑完整出土清单。点击地图弹窗中的条目可查看来源与档案详情。</p></section>${relativeClaims.length ? `<section class="pit-detail-section"><h3>报告中的相对位置</h3>${relativeMarkup}</section>` : ''}<section class="pit-detail-section"><h3>关联考古事件 <span>${events.length}</span></h3>${eventMarkup}</section><section class="kg-sources"><h3>坑位档案来源</h3>${pitSourceMarkup(context.sources)}</section></article>`;
}

function pitUsableCoordinates(record) {
  const coordinates = record?.coordinates;
  return Boolean(record?.record_status === 'verified' && coordinates?.crs && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude));
}

function pitDetailArtifactMarkup(artifact) {
  const discovery = artifact.discovery || {}, dimensions = artifact.dimensions || {};
  const rows = [
    ['档案 ID', artifact.id], ['图录编号', artifact.museum_inventory_number], ['记录范围', artifact.record_scope === 'individual' ? '单件档案' : artifact.record_scope || '待核实'],
    ['类别', artifact.category], ['制作年代', artifact.period?.label || (artifact.period?.start_year ? `${artifact.period.start_year}${artifact.period.end_year && artifact.period.end_year !== artifact.period.start_year ? `—${artifact.period.end_year}` : ''}` : '待核实')],
    ['材质 / 工艺', Array.isArray(artifact.materials_and_techniques) && artifact.materials_and_techniques.length ? artifact.materials_and_techniques.join('、') : '待核实'],
    ['尺寸', dimensions.value ? `${dimensions.value}${dimensions.unit ? ` ${dimensions.unit}` : ''}${dimensions.measurement_note ? `；${dimensions.measurement_note}` : ''}` : '待核实'],
    ['出土单位', discovery.excavation_unit || '待核实'], ['出土信息', discovery.context || '待核实'], ['内容状态', pitStatus(artifact.record_status)]
  ].filter(row => row[1]);
  const artifactKey = artifact.slug || artifact.id;
  const assignment = [...pitExplorer.assignments.values()].flat().find(row => row.artifact.id === artifact.id);
  const isUnassignedView = pitSelectedContextId === '__unassigned__' || !assignment;
  const matchMarkup = isUnassignedView
    ? '<p class="kg-empty-data">当前数据中没有可明确归入具体坑位的匹配依据，因此此记录保留在“坑位未明确”列表。</p>'
    : `<p class="pit-record-summary">关联依据：${pitEscape(assignment.matchBasis)}。${discovery.excavation_unit ? `来源记录的出土单位：“${pitEscape(discovery.excavation_unit)}”。` : ''}</p>${assignment.matchingEdges.length ? `<section class="kg-sources"><h3>坑位关系证据</h3><p class="pit-record-summary">关系状态：${pitEscape(assignment.matchingEdges.map(edge => pitStatus(edge.record_status)).join('、'))}</p>${pitSourceMarkup(assignment.matchingEdges.flatMap(edge => edge.evidence || []))}</section>` : ''}`;
  const isReportFind = artifact._dataCollection === 'pit-report-finds';
  const conflicts = Array.isArray(artifact.field_conflicts) && artifact.field_conflicts.length ? `<section class="pit-detail-section"><h3>来源内部差异</h3>${artifact.field_conflicts.map(conflict => `<p class="pit-record-summary"><b>${pitEscape(conflict.field)}</b>：${conflict.values.map(value => `${pitEscape(value.value)}（${pitEscape(value.source_id)}${value.locator ? `；${pitEscape(value.locator)}` : ''}）`).join('；')}。暂不裁定。</p>`).join('')}</section>` : '';
  const archiveLink = isReportFind ? '<p class="pit-record-summary">此为简报专项档案；完整原文与页码定位见下方来源。</p>' : `<a class="kg-artifact-link" href="${pitEscape(artifactUrl({slug:artifactKey}))}" data-artifact-index-link="${pitEscape(artifactKey)}">打开完整文物档案 ↗</a>`;
  return `<article class="pit-detail-record"><button class="pit-detail-back" type="button" data-pit-back>‹ 返回坑位档案</button><p class="eyebrow">${isReportFind ? '考古简报专项档案' : '精选图录文物'}</p><h2>${pitEscape(artifact.name || '名称待核实')}</h2><span class="kg-review">${pitEscape(pitStatus(artifact.record_status))}</span>${pitArtifactImageMarkup(artifact)}<dl class="kg-meta">${rows.map(([label,value]) => `<div><dt>${pitEscape(label)}</dt><dd>${pitEscape(value)}</dd></div>`).join('')}</dl>${artifact.description ? `<p class="kg-artifact-description">${pitEscape(artifact.description)}</p>` : '<p class="kg-empty-data">简介待核实。</p>'}${matchMarkup}${conflicts}${archiveLink}<section class="kg-sources"><h3>${isReportFind ? '简报来源与出处' : '图录来源'}</h3>${pitSourceMarkup(pitRecordSources(artifact))}</section></article>`;
}

function pitRenderDetails() {
  const details = $('#pit-details');
  if (pitSelectedArtifactId) {
    const artifact = pitExplorer.artifacts.find(row => row.id === pitSelectedArtifactId);
    if (artifact) details.innerHTML = pitDetailArtifactMarkup(artifact);
  } else if (pitSelectedContextId === '__unassigned__') {
    const rows = pitFilteredArtifacts();
    details.innerHTML = `<article class="pit-detail-record"><p class="eyebrow">未明确坑位</p><h2>坑位未明确</h2><p class="pit-record-summary">这些精选图录记录没有可与已登记坑位明确匹配的出土单位或显式坑位关系。它们不会被放入任何具体坑位。</p><section class="pit-detail-section"><h3>当前匹配记录 <span>${rows.length}</span></h3>${rows.length ? `<div class="pit-detail-artifacts">${rows.map(row => pitArtifactCardMarkup(row, null)).join('')}</div>` : '<p class="kg-empty-data">没有符合当前搜索和筛选条件的记录。</p>'}</section></article>`;
  } else if (pitSelectedContextId) {
    const context = pitExplorer.contextsById.get(pitSelectedContextId);
    if (context) details.innerHTML = pitDetailContextMarkup(context);
  } else {
    const site = pitExplorer.sites[0];
    if (!site) { details.innerHTML = '<div class="kg-detail-placeholder"><b>未找到遗址档案</b><p>数据目录中没有可展示的遗址记录。</p></div>'; return; }
    details.innerHTML = `<article class="pit-detail-record"><p class="eyebrow">遗址档案 · ${pitEscape(pitStatus(site.record_status))}</p><h2>${pitEscape(site.name || site.id)}</h2><p class="pit-record-summary">${pitEscape(site.description || '遗址说明待核实。')}</p><dl class="kg-meta">${[['地点',site.location?.administrative_area],['范围',site.extent],['文化年代范围',site.cultural_date_range],['记录状态',pitStatus(site.record_status)]].filter(row => row[1]).map(([label,value]) => `<div><dt>${pitEscape(label)}</dt><dd>${pitEscape(value)}</dd></div>`).join('')}</dl><p class="pit-record-summary">选择示意索引中的一个坑位，查看其登记资料、相关事件和明确匹配的精选图录文物。</p><section class="kg-sources"><h3>遗址档案来源</h3>${pitSourceMarkup(site.sources)}</section></article>`;
  }
  details.querySelectorAll('img').forEach(image => image.addEventListener('error', () => {
    const fallback = document.createElement('p'); fallback.className = 'kg-empty-data'; fallback.textContent = '图片无法加载；档案文字和来源仍可查看。'; image.replaceWith(fallback);
  }));
}

function pitRender() {
  pitRenderMap();
  pitRenderDetails();
  pitRenderSpatialPanel();
  $('#pit-unassigned-count').textContent = `${pitExplorer.unassigned.length} 条`;
  $('#pit-stat-sites').textContent = String(pitExplorer.sites.length);
  $('#pit-stat-contexts').textContent = String(pitExplorer.contexts.length);
  const mappableCount = pitExplorer.contexts.filter(pitUsableCoordinates).length;
  const spatialClaims = [...(pitExplorer.spatialEvidence?.site_coordinate_claims || []), ...(pitExplorer.spatialEvidence?.pit_coordinate_claims || []), ...(pitExplorer.spatialEvidence?.relative_position_claims || [])];
  $('#pit-stat-mappable').textContent = String(mappableCount);
  $('#pit-stat-review').textContent = String(spatialClaims.filter(claim => claim.status === 'needs_review').length);
  const site = pitExplorer.sites[0];
  $('#pit-site-title').textContent = site?.name || '遗址名称待核实';
}

function initializeKnowledgeGraph() {
  document.title = '祭祀坑位探索 · 三星堆数字探索平台';
  const loading = $('#pit-loading'), error = $('#pit-error'), layout = $('#pit-layout');
  if (pitExplorer.contexts.length || pitExplorer.sites.length) { loading.hidden = true; error.hidden = true; layout.hidden = false; pitRender(); return; }
  loading.hidden = false; error.hidden = true; layout.hidden = true;
  loadPitExplorerData().then(() => {
    loading.hidden = true; layout.hidden = false;
    const categories = [...new Set(pitExplorer.artifacts.map(item => item.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'zh-CN'));
    const statuses = [...new Set(pitExplorer.artifacts.map(item => item.record_status).filter(Boolean))].sort();
    $('#pit-category-filter').replaceChildren(new Option('全部类别',''), ...categories.map(value => new Option(value,value)));
    $('#pit-status-filter').replaceChildren(new Option('全部状态',''), ...statuses.map(value => new Option(pitStatus(value),value)));
    const assignmentsCount = [...pitExplorer.assignments.values()].reduce((sum, items) => sum + items.length, 0);
    if (pitExplorer.ambiguous.length) pitExplorer.unassigned.push(...pitExplorer.ambiguous);
    const notices = [];
    if (pitExplorer.ambiguous.length) notices.push(`${pitExplorer.ambiguous.length} 条记录匹配到多个坑位，已放入“坑位未明确”，避免推断归属。`);
    if (!pitExplorer.contexts.length) notices.push('数据目录中没有可展示的坑位记录。');
    if (pitExplorer.diagnostics) notices.push(`${pitExplorer.diagnostics} 条 JSONL 格式异常记录已跳过；页面仅展示可解析档案。`);
    if (artifactDataLoadError) notices.push(artifactDataLoadError);
    if (!assignmentsCount) notices.push('当前项目档案中没有与坑位明确匹配的记录；请查看“坑位未明确”列表。');
    $('#pit-data-notice').textContent = notices.join(' ');
    $('#pit-data-notice').hidden = !notices.length;
    pitBind(); pitRender();
  }).catch(err => {
    loading.hidden = true; error.hidden = false; $('#pit-error-message').textContent = err?.message || '读取遗址或坑位档案失败。';
  });
}

function pitBind() {
  if ($('#pit-layout').dataset.bound === 'true') return;
  $('#pit-layout').dataset.bound = 'true';
  $('#pit-search').addEventListener('input', pitRender);
  $('#pit-category-filter').addEventListener('change', pitRender);
  $('#pit-status-filter').addEventListener('change', pitRender);
  $('#pit-map').addEventListener('click', event => {
    const button = event.target.closest('[data-pit-context]'); if (!button) return;
    pitSelectedContextId = button.dataset.pitContext; pitSelectedArtifactId = ''; pitPopupOpen = true; pitRender();
    $('#pit-spatial-panel').querySelector('[data-pit-popup-close]')?.focus();
    if (matchMedia('(max-width: 820px)').matches) $('#pit-spatial-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
  });
  $('#pit-spatial-panel').addEventListener('click', event => {
    if (event.target.closest('[data-pit-popup-close]')) {
      pitPopupOpen = false; pitRender();
      $('#pit-spatial-panel').querySelector(`[data-pit-context="${pitEscape(pitSelectedContextId)}"]`)?.focus();
      return;
    }
    const artifactButton = event.target.closest('[data-pit-artifact]');
    if (artifactButton) {
      pitSelectedArtifactId = artifactButton.dataset.pitArtifact; pitPopupOpen = false; pitRender();
      $('#pit-detail-drawer').open = true;
      $('#pit-details').querySelector('[data-pit-back]')?.focus();
      if (matchMedia('(max-width: 820px)').matches) $('#pit-details').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
      return;
    }
    const button = event.target.closest('[data-pit-context]'); if (!button) return;
    const wasOpen = pitPopupOpen && button.dataset.pitContext === pitSelectedContextId;
    pitSelectedContextId = button.dataset.pitContext; pitSelectedArtifactId = ''; pitPopupOpen = !wasOpen; pitRender();
    if (pitPopupOpen) $('#pit-spatial-panel').querySelector('[data-pit-popup-close]')?.focus();
    else $('#pit-spatial-panel').querySelector(`[data-pit-context="${pitEscape(pitSelectedContextId)}"]`)?.focus();
  });
  $('#pit-spatial-panel').addEventListener('keydown', event => {
    if (event.key === 'Escape' && pitPopupOpen) {
      event.preventDefault(); pitPopupOpen = false; pitRender();
      $('#pit-spatial-panel').querySelector(`[data-pit-context="${pitEscape(pitSelectedContextId)}"]`)?.focus();
      return;
    }
    const button = event.target.closest('[data-pit-context][role="button"]');
    if (!button || !['Enter',' '].includes(event.key)) return;
    event.preventDefault(); button.click();
  });
  $('#pit-details').addEventListener('click', event => {
    const button = event.target.closest('[data-pit-artifact]'); if (!button) return;
    pitSelectedArtifactId = button.dataset.pitArtifact; pitRender();
    if (matchMedia('(max-width: 820px)').matches) { $('#pit-detail-drawer').open = true; $('#pit-details').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'}); }
  });
  $('#pit-details').addEventListener('click', event => {
    if (event.target.closest('[data-pit-back]')) { pitSelectedArtifactId = ''; pitPopupOpen = Boolean(pitSelectedContextId && pitSelectedContextId !== '__unassigned__'); pitRender(); if (pitPopupOpen) $('#pit-spatial-panel').querySelector('[data-pit-popup-close]')?.focus(); return; }
    const link = event.target.closest('[data-artifact-index-link]');
    if (link) { event.preventDefault(); navigateToArtifact(link.dataset.artifactIndexLink); }
  });
  $('#pit-clear').addEventListener('click', () => { $('#pit-search').value = ''; $('#pit-category-filter').value = ''; $('#pit-status-filter').value = ''; pitSelectedContextId = ''; pitSelectedArtifactId = ''; pitPopupOpen = false; pitRender(); });
  $('#pit-unassigned').addEventListener('click', () => { pitSelectedContextId = '__unassigned__'; pitSelectedArtifactId = ''; pitPopupOpen = false; pitRender(); });
  $('#pit-map-reset').addEventListener('click', () => { pitSelectedContextId = ''; pitSelectedArtifactId = ''; pitPopupOpen = false; pitRender(); });
  $('#pit-retry').addEventListener('click', () => { pitExplorerPromise = null; pitExplorer = {sites:[],contexts:[],events:[],artifacts:[],edges:[],assignments:new Map(),unassigned:[],ambiguous:[]}; artifactDataPromise = null; artifactDataSourceLoaded = false; artifactRawById = new Map(); initializeKnowledgeGraph(); });
}
