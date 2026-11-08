const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let authenticatedUser = null;
let authReady = false;

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
  },
  potteryJar: {
    id:'potteryJar', slug:'tao-xiao-ping-di-guan', name:'陶小平底罐（器型档案）', kicker:'POTTERY JAR · TYPE 01',
    category:'陶器', period:'三星堆文化时期（具体分期待核）', material:'陶；具体胎土与烧成特征依单件而异', excavation:'三星堆遗址；具体探方、层位与坑位待核', discovery:'多份遗址发掘资料记录该器型；单件发现信息待核',
    dimensions:'无可核单件尺寸', collection:'具体收藏单位待核',
    intro:'这是依据遗址发掘资料建立的器型级档案，不对应某一件有编号的馆藏器物。青关山H105报告在同类器物描述中列出小平底罐，并描述该样本的口沿、折沿与窄肩特征；这些特征不应外推到全部小平底罐。',
    interpretation:'器型名称与形态描述按发掘报告的分类记录。具体用途、年代细分及单件出土背景需结合对应器物和报告核实。', status:{label:'器型档案 · 无单件编号、尺寸与出土单位', kind:'partial'},
    image:{src:'',alt:'此器型暂无可逐件对应的公开照片',author:'暂无',license:'暂无',sourceUrl:'',kind:'placeholder',status:'无可确认的单件影像；不展示生成图'},
    references:[{label:'四川省文物考古研究院 · 青关山H105发掘报告',url:'https://www.sckg.com/uploads/soft/20230509/2-230509155A2544.pdf',type:'发掘报告',note:'报告列出小平底罐等陶器类别，并给出该报告所述样本的形态比较；不据此确定本条目对应单件。'},{label:'四川省文物考古研究院 · 三星堆遗址发掘概况、初步分期',url:'https://www.sckg.com/uploads/soft/20230509/2-230509155253N7.pdf',type:'发掘概况',note:'用于核对遗址陶器类别名录；本条目仍是器型档案。'}]
  },
  potteryDou: {
    id:'potteryDou', slug:'tao-gao-bing-dou', name:'陶高柄豆（器型档案）', kicker:'POTTERY DOU · TYPE 02',
    category:'陶器', period:'三星堆文化时期（具体分期待核）', material:'陶；具体胎土与烧成特征依单件而异', excavation:'三星堆遗址；具体探方、层位与坑位待核', discovery:'遗址发掘资料记录该器型；单件发现信息待核',
    dimensions:'无可核单件尺寸', collection:'具体收藏单位待核',
    intro:'这是器型级档案，不对应某一件有编号的馆藏器物。四川省文物考古研究院的遗址发掘概况将高柄豆列入三星堆遗址陶器类型。所附照片是Commons文件页标注为三星堆博物馆陶高柄豆的类别配图，不能据此补全其单件编号或出土单位。',
    interpretation:'“豆”是器型名称；页面不据器形推断具体用途。年代细分、尺寸与出土背景需回到单件资料核实。', status:{label:'器型档案 · 类别配图 · 单件编号与出土单位待核', kind:'partial'},
    image:{src:'https://commons.wikimedia.org/wiki/Special:FilePath/Sanxingdui_Oct_2007_491.jpg?width=1000',alt:'三星堆博物馆展出的陶高柄豆类别配图',author:'G41rn8',license:'CC BY-SA 4.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:Sanxingdui_Oct_2007_491.jpg',kind:'photo',status:'Commons文件页将其说明为三星堆博物馆陶高柄豆；未提供单件编号，作为类别配图使用'},
    references:[{label:'四川省文物考古研究院 · 三星堆遗址发掘概况、初步分期',url:'https://www.sckg.com/uploads/soft/20230509/2-230509155253N7.pdf',type:'发掘概况',note:'用于核对遗址陶器类别名录。'},{label:'Wikimedia Commons · 陶高柄豆照片与许可',url:'https://commons.wikimedia.org/wiki/File:Sanxingdui_Oct_2007_491.jpg',type:'类别配图与许可',note:'文件页标注作者G41rn8、CC BY-SA 4.0；图片仅作为器型类别配图。'}]
  },
  potteryHe: {
    id:'potteryHe', slug:'tao-he', name:'陶盉（器型档案）', kicker:'POTTERY HE · TYPE 03',
    category:'陶器', period:'三星堆文化时期（具体分期待核）', material:'陶；具体胎土与烧成特征依单件而异', excavation:'三星堆遗址；具体探方、层位与坑位待核', discovery:'遗址发掘资料记录该器型；单件发现信息待核',
    dimensions:'无可核单件尺寸', collection:'具体收藏单位待核',
    intro:'这是器型级档案，不对应某一件有编号的馆藏器物。青关山H105发掘报告将盉列入该单位陶器类型。所附Commons照片文件页说明为三星堆遗址出土陶盉，但未给出可与本条目绑定的馆藏编号或具体坑位。',
    interpretation:'器型名称依考古报告与影像文件说明。具体年代、用途及单件出土信息应以相应发掘记录为准。', status:{label:'器型档案 · 类别配图 · 单件编号与出土单位待核', kind:'partial'},
    image:{src:'https://commons.wikimedia.org/wiki/Special:FilePath/%E4%B8%89%E6%98%9F%E5%A0%86%E9%99%B6%E7%9B%89.jpg?width=1000',alt:'三星堆遗址出土陶盉类别配图',author:'Tyg728',license:'CC BY-SA 4.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:%E4%B8%89%E6%98%9F%E5%A0%86%E9%99%B6%E7%9B%89.jpg',kind:'photo',status:'Commons文件页说明为三星堆遗址出土陶盉；未提供单件编号，作为类别配图使用'},
    references:[{label:'四川省文物考古研究院 · 青关山H105发掘报告',url:'https://www.sckg.com/uploads/soft/20230509/2-230509155A2544.pdf',type:'发掘报告',note:'报告列出盉等陶器类别。'},{label:'Wikimedia Commons · 陶盉照片与许可',url:'https://commons.wikimedia.org/wiki/File:%E4%B8%89%E6%98%9F%E5%A0%86%E9%99%B6%E7%9B%89.jpg',type:'类别配图与许可',note:'文件页说明为三星堆遗址出土陶盉，标注作者Tyg728、CC BY-SA 4.0；此图不证明本条目对应单件。'}]
  },
  potteryBirdLadle: {
    id:'potteryBirdLadle', slug:'tao-niao-tou-ba-shao', name:'陶鸟头把勺（器型档案）', kicker:'POTTERY LADLE · TYPE 04',
    category:'陶器', period:'三星堆文化时期（具体分期待核）', material:'陶；具体胎土与烧成特征依单件而异', excavation:'三星堆遗址；具体探方、层位与坑位待核', discovery:'遗址发掘资料记录该器型；单件发现信息待核',
    dimensions:'无可核单件尺寸', collection:'具体收藏单位待核',
    intro:'这是器型级档案，不对应某一件有编号的馆藏器物。四川省文物考古研究院的遗址发掘概况将鸟头把勺列入三星堆遗址陶器类型。当前尚无可逐件对应的照片与单件目录资料。',
    interpretation:'“鸟头把勺”为来源列出的器型名称；鸟形把手的具体象征解释不在本条目中作定论。具体形态、年代和出土背景需核对单件资料。', status:{label:'器型档案 · 无单件编号、尺寸与出土单位', kind:'partial'},
    image:{src:'',alt:'此器型暂无可逐件对应的公开照片',author:'暂无',license:'暂无',sourceUrl:'',kind:'placeholder',status:'无可确认的单件影像；不展示生成图'},
    references:[{label:'四川省文物考古研究院 · 三星堆遗址发掘概况、初步分期',url:'https://www.sckg.com/uploads/soft/20230509/2-230509155253N7.pdf',type:'发掘概况',note:'用于核对“鸟头把勺”器型名称；报告没有在此提供本条目对应单件的编号或坑位。'}]
  }
};

let artifactList = Object.values(records);
const galleryItems = ['figure','tree','mask'].map(key => ({ key, ...records[key] }));
const detailMeta = record => [
  ['类别', record.category], ['年代', record.period], ['材质', record.material],
  ['出土信息', record.excavation], ['发现时间', record.discovery],
  ['尺寸', record.dimensions], ['收藏信息', record.collection]
];
const subtitleFor = record => `${record.excavation} · ${record.material}`;
const citationSummary = record => record.references.map(reference => reference.label).join('；');
let artifactDataPromise = null;
let artifactDataLoadError = '';
let artifactDataSourceLoaded = false;
let artifactRawById = new Map();
let artifactIndexViewMode = 'grid';
let artifactVisibleLimit = 48;
let artifactResultKey = '';
let artifactIndexItems = Object.values(records).map(toIndexRecord);
let galleryIndex = 0;
let activeFilter = 'all';
let homeVisibleLimit = 12;
let archaeologyTimelinePromise = null;
let archaeologyTimelineEvents = [];
let archaeologyTimelineContexts = [];
let archaeologyTimelineSites = [];
let archaeologyTimelineArtifacts = [];
let archaeologyTimelineNotice = '';
let activeTimelineType = 'all';
let storyDataPromise = null;
let storyRecords = [];
let storyExhibitions = [];
let storyGraphEdges = [];
let storyDataNotice = '';
let storyDataLoaded = false;
let graphDataPromise = null;
let graphNodes = [];
let graphEdges = [];
let graphExhibitions = [];
let graphArchives = {sites:new Map(),contexts:new Map(),events:new Map()};
let graphNotice = '';
let graphSelectedId = '';
let graphSelectedEdgeId = '';
let graphExpanded = false;
let graphFullNetwork = true;
let graphVisibleTypes = new Set();
let graphPositions = new Map();
let graphPan = {x:0,y:0};
let graphScale = 1;
let graphDragging = null;
let graphInitialized = false;
let toastTimer;

function safeWebUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch { return ''; }
}

function localArtifactImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const path = value.trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (/^https?:\/\//i.test(path)) return safeWebUrl(path);
  const normalized = path.replace(/^\/+/, '');
  if (normalized.split('/').includes('..')) return '';
  let relative = normalized.startsWith('data/') ? normalized.slice(5) : normalized;
  if (relative.startsWith('images/')) relative = `artifacts/${relative}`;
  if (!relative.startsWith('artifacts/images/')) return '';
  return safeWebUrl(`/data/${relative}`);
}

function normalizeIdentityText(value) {
  return String(value || '').normalize('NFKC').replace(/[（(](?:器型档案|类别示例)[）)]/g, '').replace(/[\s　]/g, '').trim().toLocaleLowerCase();
}

function canonicalCategory(value) {
  const category = normalizeIdentityText(value);
  if (category === '铜器' || category === '青铜器') return '青铜器';
  return category;
}

function contextKey(value) {
  const source = String(value || '');
  const pit = source.match(/[一二三四五六七八九十\d]+号祭祀坑/);
  return pit ? pit[0] : normalizeIdentityText(source).replace(/四川|广汉|三星堆遗址|三星堆/g, '');
}

function sourceKey(value) {
  try { return new URL(value, window.location.href).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
}

function toIndexRecord(record) {
  const sourceTitles = (record.references || []).map(source => source.label).filter(Boolean);
  const baseName = String(record.name || '').replace(/[（(](?:器型档案|类别示例)[）)]/g, '');
  const typeRecord = /器型档案/.test(record.name || '');
  return {
    ...record,
    index: {
      stableId: record.id,
      inventory: '',
      aliases: [],
      keywords: [],
      category: record.category || '',
      period: record.period || '',
      material: record.material || '',
      context: record.excavation || '',
      nameKey: normalizeIdentityText(baseName),
      categoryKey: canonicalCategory(record.category),
      contextKey: contextKey(record.excavation),
      scope: typeRecord ? 'group' : 'individual',
      reviewState: typeRecord ? 'type' : 'frontend',
      sourceTitles,
      sourceIds: sourceTitles,
      sourceKeys: (record.references || []).map(source => sourceKey(source.url)).filter(Boolean),
      imageRank: record.image && record.image.src ? 1 : 0,
      contentStatus: record.status && record.status.label ? record.status.label : '前端档案'
    }
  };
}

function parseJsonl(text) {
  const records = [];
  let malformed = 0;
  String(text || '').split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;
    try {
      const value = JSON.parse(line);
      if (value && typeof value === 'object' && !Array.isArray(value)) records.push(value);
      else malformed += 1;
    } catch { malformed += 1; }
  });
  return {records, malformed};
}

async function fetchJsonl(url) {
  const response = await fetch(url, {credentials:'same-origin'});
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return parseJsonl(await response.text());
}

function urlsMatch(left, right) {
  if (!left || !right) return false;
  try {
    const a = new URL(left, window.location.href);
    const b = new URL(right, window.location.href);
    return a.origin === b.origin && decodeURIComponent(a.pathname).replace(/\/$/, '') === decodeURIComponent(b.pathname).replace(/\/$/, '');
  } catch { return false; }
}

function usableMediaAsset(asset) {
  return asset && asset.media_type === 'image' && ['approved_with_attribution','approved_class_illustration_only'].includes(asset.use_status) && ['open_license_claimed','permission_documented'].includes(asset.rights_status) && asset.identity_match_status !== 'unmatched' && safeWebUrl(asset.file_url);
}

function selectMedia(raw, assets, coverageRows = []) {
  const references = Array.isArray(raw.media) ? raw.media : [];
  const coverage = coverageRows.find(row => row.artifact_id === raw.id);
  const coveredAssetIds = new Set(Array.isArray(coverage && coverage.asset_ids) ? coverage.asset_ids : []);
  const candidates = assets.filter(asset => {
    if (!usableMediaAsset(asset)) return false;
    if ((Array.isArray(asset.artifact_ids) && asset.artifact_ids.includes(raw.id)) || coveredAssetIds.has(asset.id)) return true;
    return references.some(media => urlsMatch(media.url, asset.file_url) || urlsMatch(media.url, asset.page_url));
  });
  candidates.sort((a, b) => (a.identity_match_status === 'exact' ? 2 : 1) - (b.identity_match_status === 'exact' ? 2 : 1));
  const asset = candidates[candidates.length - 1];
  if (!asset) return null;
  const identityLabel = asset.identity_match_status === 'exact' ? '单件照片' : '类别配图';
  const licenseName = asset.license && asset.license.name || '许可待核实';
  const licenseVersion = asset.license && asset.license.version && asset.license.version !== '0' ? ` ${asset.license.version}` : '';
  return {
    src: safeWebUrl(asset.file_url),
    alt: `${asset.title || raw.name}（${identityLabel}）`,
    author: asset.creator || '作者待核实',
    license: `${licenseName}${licenseVersion}`,
    sourceUrl: safeWebUrl(asset.page_url),
    rightsHolder: asset.rights_holder || null,
    kind: 'photo',
    status: `${identityLabel} · ${asset.identity_match_note || asset.review_note || '媒体台账已登记'}`,
    identityLabel,
    assetId: asset.id,
    rightsStatus: asset.rights_status,
    imageRank: asset.identity_match_status === 'exact' ? 3 : 2
  };
}

function safeSlug(raw) {
  const proposed = String(raw.slug || raw.id || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return proposed || `record-${encodeURIComponent(raw.id)}`;
}

function normalizeProjectRecord(raw, kind, assets, coverageRows = []) {
  const discovery = raw.discovery || {};
  const materials = Array.isArray(raw.materials_and_techniques) ? raw.materials_and_techniques.filter(Boolean) : [];
  const sources = (Array.isArray(raw.sources) ? raw.sources : []).map(source => ({
    label: source.title || source.publisher || source.source_id || '资料来源',
    url: safeWebUrl(source.url),
    type: source.source_type || '公开资料',
    note: [source.publisher, source.locator, source.supports && source.supports.length ? `来源字段：${source.supports.join('、')}` : ''].filter(Boolean).join(' · ')
  })).filter(source => source.url);
  const mediaReferences = Array.isArray(raw.media) ? raw.media : [];
  const scannedImage = mediaReferences.find(media => media && media.media_type === 'image' && localArtifactImageUrl(media.url || media.path || media.src));
  const scannedImageUrl = scannedImage && localArtifactImageUrl(scannedImage.url || scannedImage.path || scannedImage.src);
  const image = selectMedia(raw, assets, coverageRows) || (scannedImageUrl ? {
    src:scannedImageUrl,
    alt:`${raw.name || '文物'}（2009年图录页面）`,
    author:scannedImage.creator || '图录资料',
    license:scannedImage.license || '待核实',
    sourceUrl:safeWebUrl((raw.sources || [])[0] && raw.sources[0].url),
    kind:'photo',
    rightsStatus:scannedImage.rights_status || 'unknown',
    rightsHolder:scannedImage.rights_holder || null,
    status:scannedImage.attribution || '来源和页码见档案引用',
    identityLabel:'图录页面影像',
    imageRank:1
  } : {
    src:'', alt:'当前没有可用于此记录的已登记图片', author:'待核实', license:'待核实', sourceUrl:'', kind:'placeholder', status:'无符合媒体许可与身份匹配状态的图片', identityLabel:'', imageRank:0
  });
  const contextParts = [discovery.context, discovery.excavation_unit].filter(value => value && !/待核实|未知/.test(value));
  const context = [...new Set(contextParts)].join(' · ');
  const period = raw.period && raw.period.label || '';
  const material = materials.join('、');
  const recordScope = raw.record_scope || 'individual';
  const recordState = ['draft','needs_review','verified','published','withdrawn'].includes(raw.record_status) ? raw.record_status : 'needs_review';
  const reviewState = kind === 'type' || recordScope === 'group' ? 'type' : recordState;
  const name = String(raw.name || '未命名器物');
  const statusText = {draft:'草稿', needs_review:'待复核', verified:'资料已核实', published:'已发布', withdrawn:'已撤回'}[recordState];
  const statusLabel = kind === 'type'
    ? `器型档案 · ${statusText}`
    : kind === 'book'
      ? `图录档案 · ${statusText}`
    : recordScope === 'group'
      ? `组档案 · ${statusText}`
      : `${statusText} · 采集记录`;
  const interpretationLabels = {consensus:'共识性解释', supported:'有支持的解释', debated:'存在争议', hypothesis:'研究假设', unknown:'尚未确定'};
  const interpretations = Array.isArray(raw.interpretations) ? raw.interpretations.map(item => {
    if (!item || !item.claim) return '';
    const evidence = (item.evidence_source_ids || []).map(id => (raw.sources || []).find(source => source.source_id === id)).filter(Boolean).map(source => source.title || source.publisher).filter(Boolean);
    const attribution = item.attribution ? `（${item.attribution}）` : '';
    const evidenceText = evidence.length ? `；依据：${[...new Set(evidence)].join('、')}` : '';
    return `${interpretationLabels[item.status] || '解释状态待核实'}：${item.claim}${attribution}${evidenceText}`;
  }).filter(Boolean) : [];
  const conflictNotes = Array.isArray(raw.field_conflicts) ? raw.field_conflicts.map(conflict => {
    const values = (conflict.values || []).map(entry => {
      const source = (raw.sources || []).find(item => item.source_id === entry.source_id);
      return `${entry.value}${source && source.title ? `（${source.title}）` : ''}`;
    }).filter(Boolean);
    return values.length ? `来源间存在字段差异（${conflict.field}）：${values.join('；')}。` : '';
  }).filter(Boolean) : [];
  const record = {
    id: raw.id,
    slug: safeSlug(raw),
    name,
    kicker: kind === 'type' ? 'POTTERY TYPE RECORD' : kind === 'book' ? 'BOOK CATALOG RECORD · NEEDS REVIEW' : recordScope === 'group' ? 'GROUP ARCHIVE · NEEDS REVIEW' : 'SOURCE RECORD · NEEDS REVIEW',
    category: raw.category || '',
    period: period || '待核实',
    material: material || '待核实',
    excavation: context || '待核实',
    discovery: discovery.date_or_period || '待核实',
    dimensions: raw.dimensions && raw.dimensions.value ? `${raw.dimensions.value}${raw.dimensions.unit && !String(raw.dimensions.value).includes(raw.dimensions.unit) ? raw.dimensions.unit : ''}` : '待核实',
    collection: raw.collection_institution || '待核实',
    intro: raw.description || (kind === 'book' ? '此条图录档案未提供简介；请通过扫描页和资料来源核对。' : '此条采集记录未提供器物简介；请通过资料来源核对原始字段。'),
    interpretation: [...interpretations, ...conflictNotes].join('；') || '此条记录未提供学术解释；不据器物名称补充结论。',
    status: {label:statusLabel, kind:reviewState === 'type' ? 'partial' : 'pending'},
    image,
    references: sources,
    index: {
      stableId: raw.id,
      inventory: raw.museum_inventory_number || '',
      aliases: Array.isArray(raw.alternate_names) ? raw.alternate_names.filter(Boolean) : [],
      keywords: Array.isArray(raw.catalog_motifs) ? raw.catalog_motifs.filter(Boolean) : [],
      category: raw.category || '',
      period,
      material,
      context,
      discoveryContext: discovery.context || '',
      excavationUnit: discovery.excavation_unit || '',
      nameKey: normalizeIdentityText(name),
      categoryKey: canonicalCategory(raw.category),
      contextKey: contextKey(context),
      scope: recordScope,
      reviewState,
      recordState,
      sourceTitles: sources.map(source => source.label),
      sourceIds: (raw.sources || []).map(source => source.source_id).filter(Boolean),
      sourceKeys: (raw.sources || []).map(source => sourceKey(source.url)).filter(Boolean),
      imageRank: image.imageRank || 0,
      contentStatus: `${statusLabel} · ${raw.record_status || 'needs_review'}`,
      motifs: Array.isArray(raw.catalog_motifs) ? raw.catalog_motifs : [],
      dataOrigin: kind === 'type' ? '/data/pottery/type-index.jsonl' : kind === 'book' ? '/data/artifacts/selected-book-300.jsonl' : 'acquisition'
    }
  };
  return record;
}

function deduplicateRecords(frontendRecords, importedRecords) {
  const merged = frontendRecords.slice();
  importedRecords.forEach(candidate => {
    const found = merged.find(existing => {
      if (existing.index.stableId && existing.index.stableId === candidate.index.stableId) return true;
      if (existing.index.inventory && candidate.index.inventory && existing.index.inventory === candidate.index.inventory) return true;
      if (existing.slug && candidate.slug && existing.slug === candidate.slug) return true;
      if (!existing.index.nameKey || existing.index.nameKey !== candidate.index.nameKey || existing.index.categoryKey !== candidate.index.categoryKey) return false;
      if (existing.index.contextKey && candidate.index.contextKey && existing.index.contextKey !== candidate.index.contextKey) return false;
      const bothImported = Boolean(existing.index.dataOrigin && candidate.index.dataOrigin);
      if (bothImported) {
        const sharedSource = existing.index.sourceKeys.some(key => candidate.index.sourceKeys.includes(key)) || existing.references.some(source => candidate.references.some(other => source.url === other.url));
        if (!sharedSource) return false;
      }
      return true;
    });
    if (!found) { merged.push(candidate); return; }
    found.references = [...new Map([...found.references, ...candidate.references].filter(source => source.url).map(source => [source.url, source])).values()];
    found.index.aliases = [...new Set([...found.index.aliases, ...candidate.index.aliases])];
    found.index.keywords = [...new Set([...found.index.keywords, ...candidate.index.keywords])];
    found.index.sourceTitles = [...new Set([...found.index.sourceTitles, ...candidate.index.sourceTitles])];
    found.index.sourceIds = [...new Set([...found.index.sourceIds, ...candidate.index.sourceIds])];
    found.index.sourceKeys = [...new Set([...found.index.sourceKeys, ...candidate.index.sourceKeys])];
    if ((!found.index.period || /待核/.test(found.index.period)) && candidate.index.period) { found.period = candidate.period; found.index.period = candidate.index.period; }
    if ((!found.index.material || /待核/.test(found.index.material)) && candidate.index.material) { found.material = candidate.material; found.index.material = candidate.index.material; }
    if ((!found.index.context || /待核/.test(found.index.context)) && candidate.index.context) { found.excavation = candidate.excavation; found.index.context = candidate.index.context; found.index.contextKey = candidate.index.contextKey; }
    if (candidate.index.imageRank > found.index.imageRank) { found.image = candidate.image; found.index.imageRank = candidate.index.imageRank; }
    if (candidate.index.reviewState === 'type') { found.index.scope = 'group'; found.index.reviewState = 'type'; found.index.recordState = candidate.index.recordState || 'needs_review'; }
  });
  return merged;
}

async function loadArtifactData() {
  if (artifactDataPromise) return artifactDataPromise;
  artifactDataLoadError = '';
  artifactDataSourceLoaded = false;
  artifactDataPromise = (async () => {
    const manifestResponse = await fetch(new URL('./data/manifest.json', document.baseURI), {credentials:'same-origin'});
    if (!manifestResponse.ok) throw new Error(`${manifestResponse.status} ${manifestResponse.statusText}`);
    const manifest = await manifestResponse.json();
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const curated = files.find(file => file.path === 'artifacts/selected-book-300.jsonl' && file.format === 'jsonl');
    const media = files.find(file => file.path === 'media/assets.jsonl' && file.format === 'jsonl');
    const coverage = files.find(file => file.path === 'media/artifact-photo-coverage.jsonl' && file.format === 'jsonl');
    const selected = [curated, media, coverage].filter(Boolean);
    const results = await Promise.allSettled(selected.map(async file => {
      const url = file.url || `/data/${file.path}`;
      const resolved = new URL(url, document.baseURI);
      if (resolved.origin !== window.location.origin || !resolved.pathname.includes('/data/')) throw new Error('数据清单包含非本站路径');
      return fetchJsonl(resolved.href);
    }));
    const errors = [];
    let malformed = 0;
    const rowsByPath = new Map();
    results.forEach((result, index) => {
      if (result.status === 'rejected') errors.push(`${selected[index].path}：${result.reason && result.reason.message || '读取失败'}`);
      else {
        const path = selected[index].path;
        const isMedia = path === 'media/assets.jsonl';
        const isCoverage = path === 'media/artifact-photo-coverage.jsonl';
        const validRows = result.value.records.filter(row => isMedia
          ? row.id && row.media_type === 'image' && row.page_url
          : isCoverage
            ? row.artifact_id && Array.isArray(row.asset_ids)
          : row.id && row.name && Array.isArray(row.sources) && row.record_status);
        malformed += result.value.malformed + result.value.records.length - validRows.length;
        rowsByPath.set(path, validRows);
      }
    });
    const assets = rowsByPath.get('media/assets.jsonl') || [];
    const coverageRows = rowsByPath.get('media/artifact-photo-coverage.jsonl') || [];
    const imported = [];
    artifactRawById = new Map();
    if (curated) (rowsByPath.get(curated.path) || []).forEach(row => { artifactRawById.set(row.id, row); imported.push(normalizeProjectRecord(row, 'book', assets, coverageRows)); });
    artifactDataSourceLoaded = Boolean(curated && rowsByPath.has(curated.path));
    const frontend = Object.values(records).map(record => {
      const normalized = toIndexRecord(record);
      const matchedAsset = assets.find(asset => usableMediaAsset(asset) && (urlsMatch(record.image.sourceUrl, asset.page_url) || urlsMatch(record.image.src, asset.file_url)));
      if (matchedAsset) {
        const linked = selectMedia({id:record.id, media:[{url:record.image.sourceUrl || record.image.src}]}, [matchedAsset]);
        if (linked) { normalized.image = linked; normalized.index.imageRank = linked.imageRank; }
      }
      return normalized;
    });
    artifactIndexItems = imported;
    artifactList = deduplicateRecords(imported, frontend);
    if (errors.length) artifactDataLoadError = `部分数据文件未能读取，当前展示其余可用记录。${errors.join('；')}`;
    if (malformed) artifactDataLoadError = `${artifactDataLoadError ? `${artifactDataLoadError} ` : ''}${malformed} 条格式异常记录已跳过。`;
    return artifactIndexItems;
  })().catch(error => {
    artifactDataLoadError = `无法读取 /data/manifest.json：${error && error.message || '未知错误'}`;
    artifactIndexItems = Object.values(records).map(toIndexRecord);
    artifactList = artifactIndexItems;
    throw error;
  });
  return artifactDataPromise;
}

function parseArchaeologyDate(value) {
  const match = String(value || '').match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) return null;
  return {year:Number(match[1]), month:Number(match[2] || 1), day:Number(match[3] || 1)};
}

function archaeologyDateSortValue(value) {
  const date = parseArchaeologyDate(value);
  return date ? date.year * 10000 + date.month * 100 + date.day : Number.MAX_SAFE_INTEGER;
}

function formatArchaeologyDatePart(value) {
  const date = parseArchaeologyDate(value);
  if (!date) return String(value || '日期待核实');
  const raw = String(value);
  if (/^\d{4}$/.test(raw)) return `${date.year}年`;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${date.year}年${date.month}月`;
  return `${date.year}年${date.month}月${date.day}日`;
}

function eventDateDisplay(event) {
  const start = event.date_start;
  const end = event.date_end;
  const precision = event.date_precision;
  if (!start) return '日期待核实';
  if (precision === 'year' && /^\d{4}$/.test(start)) return `${start}年`;
  if (precision === 'season') {
    const year = String(start).match(/^\d{4}/)?.[0];
    const season = (event.description || '').match(/(?:\d{4}年)?(春|夏|秋|冬)(?:季)?/)?.[1];
    return `${year || formatArchaeologyDatePart(start).replace('年','')}年${season ? `${season}季` : '（季节待核实）'}`;
  }
  if (precision === 'year_range') {
    const from = String(start).match(/^\d{4}/)?.[0] || start;
    const to = String(end || start).match(/^\d{4}/)?.[0] || end || start;
    return from === to ? `${from}年` : `${from}—${to}年`;
  }
  if (precision === 'day_range' || (end && end !== start)) return `${formatArchaeologyDatePart(start)}—${formatArchaeologyDatePart(end || start)}`;
  if (precision === 'day' || precision === 'month') return formatArchaeologyDatePart(start);
  if (precision === 'year' && end && end !== start) return `${formatArchaeologyDatePart(start)}—${formatArchaeologyDatePart(end)}`;
  return `${formatArchaeologyDatePart(start)} · 日期精度待核实`;
}

function archaeologyPrecisionLabel(event) {
  const labels = {year:'年份', season:'季节', year_range:'年份区间', month:'年月', day:'具体日期', day_range:'日期区间'};
  return labels[event.date_precision] || '精度待核实';
}

function archaeologyRecordStatus(status) {
  return ({needs_review:'资料待复核', verified:'资料已核实', published:'已发布', draft:'草稿', withdrawn:'已撤回'})[status] || '状态待核实';
}

async function loadArchaeologyTimelineData() {
  if (archaeologyTimelinePromise) return archaeologyTimelinePromise;
  archaeologyTimelineNotice = '';
  archaeologyTimelinePromise = (async () => {
    const manifestResponse = await fetch(new URL('./data/manifest.json', document.baseURI), {credentials:'same-origin'});
    if (!manifestResponse.ok) throw new Error(`数据清单读取失败：${manifestResponse.status} ${manifestResponse.statusText}`);
    const manifest = await manifestResponse.json();
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const readJsonlFromManifest = async path => {
      const entry = files.find(file => file.path === path && file.format === 'jsonl');
      if (!entry) throw new Error(`数据清单未登记 ${path}`);
      const url = new URL(entry.url || `/data/${path}`, document.baseURI);
      if (url.origin !== window.location.origin || !url.pathname.includes('/data/')) throw new Error(`拒绝非本站数据路径：${path}`);
      return fetchJsonl(url.href);
    };
    const [eventsResult, contextsResult, sitesResult, artifactsResult] = await Promise.allSettled([
      readJsonlFromManifest('archaeology/events.jsonl'),
      readJsonlFromManifest('archaeology/contexts.jsonl'),
      readJsonlFromManifest('archaeology/sites.jsonl'),
      loadArtifactData()
    ]);
    if (eventsResult.status === 'rejected') throw new Error(eventsResult.reason?.message || '考古事件读取失败');
    const eventsData = eventsResult.value;
    archaeologyTimelineEvents = eventsData.records.filter(record => record && record.record_type === 'event' && record.id && record.record_status !== 'withdrawn').sort((a, b) => archaeologyDateSortValue(a.date_start) - archaeologyDateSortValue(b.date_start) || String(a.id).localeCompare(String(b.id)));
    if (eventsData.malformed) archaeologyTimelineNotice = `${eventsData.malformed} 条格式异常的事件记录已跳过。`;
    if (contextsResult.status === 'fulfilled') {
      archaeologyTimelineContexts = contextsResult.value.records.filter(record => record && record.record_type === 'context' && record.id);
      if (contextsResult.value.malformed) archaeologyTimelineNotice += `${archaeologyTimelineNotice ? ' ' : ''}${contextsResult.value.malformed} 条格式异常的坑位记录已跳过。`;
    } else {
      archaeologyTimelineContexts = [];
      archaeologyTimelineNotice += `${archaeologyTimelineNotice ? ' ' : ''}坑位资料未能读取，事件仍可浏览，但不会显示坑位详情或关联文物。`;
    }
    if (sitesResult.status === 'fulfilled') archaeologyTimelineSites = sitesResult.value.records.filter(record => record && record.record_type === 'site' && record.id);
    else { archaeologyTimelineSites = []; archaeologyTimelineNotice += `${archaeologyTimelineNotice ? ' ' : ''}遗址资料未能读取。`; }
    if (sitesResult.status === 'fulfilled' && sitesResult.value.malformed) archaeologyTimelineNotice += `${archaeologyTimelineNotice ? ' ' : ''}${sitesResult.value.malformed} 条格式异常的遗址记录已跳过。`;
    if (artifactsResult.status === 'fulfilled' && artifactDataSourceLoaded) {
      archaeologyTimelineArtifacts = artifactIndexItems.filter(item => item.index?.dataOrigin === '/data/artifacts/selected-book-300.jsonl');
      if (artifactDataLoadError) archaeologyTimelineNotice += `${archaeologyTimelineNotice ? ' ' : ''}${artifactDataLoadError}`;
    } else {
      archaeologyTimelineArtifacts = [];
      archaeologyTimelineNotice += `${archaeologyTimelineNotice ? ' ' : ''}精选文物数据未能读取，本次不显示关联文物。`;
    }
    renderArchaeologyTimelineFilters();
    renderArchaeologyTimeline();
    return archaeologyTimelineEvents;
  })().catch(error => {
    archaeologyTimelinePromise = null;
    $('#timeline-loading').hidden = true;
    $('#timeline-events').setAttribute('aria-busy','false');
    $('#timeline-error-message').textContent = error?.message || '考古事件资料读取失败。';
    $('#timeline-error').hidden = false;
    throw error;
  });
  return archaeologyTimelinePromise;
}

function timelineContextsForEvent(event) {
  const map = new Map(archaeologyTimelineContexts.map(context => [context.id, context]));
  return (Array.isArray(event.context_ids) ? event.context_ids : []).map(id => map.get(id) || {id, name:`坑位资料缺失（${id}）`, record_status:null});
}

function timelineArtifactMatchesContext(artifact, context) {
  const unit = normalizeIdentityText(artifact.index.excavationUnit);
  const discovery = normalizeIdentityText(artifact.index.discoveryContext);
  if (!unit && !discovery) return false;
  const candidates = [context.name, String(context.name || '').replace(/三星堆遗址|遗址/g,''), ...(context.alternate_names || [])].map(normalizeIdentityText).filter(value => value.length >= 2);
  const code = String(context.code || '').trim();
  const codeMatch = code && [unit, discovery].some(value => new RegExp(`(^|[^a-z0-9])${code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z0-9]|$)`, 'i').test(value));
  return Boolean(codeMatch || candidates.some(candidate => [unit, discovery].some(value => value === candidate || value.includes(candidate))));
}

function timelineArtifactsForEvent(event) {
  const contexts = timelineContextsForEvent(event).filter(context => context.id && archaeologyTimelineContexts.some(item => item.id === context.id));
  if (!contexts.length) return [];
  return archaeologyTimelineArtifacts.filter(artifact => contexts.some(context => timelineArtifactMatchesContext(artifact, context))).sort((a, b) => (a.index.scope === 'individual' ? 0 : 1) - (b.index.scope === 'individual' ? 0 : 1) || a.name.localeCompare(b.name, 'zh-CN'));
}

function renderArchaeologyTimelineFilters() {
  const counts = new Map();
  archaeologyTimelineEvents.forEach(event => counts.set(event.event_type || '类别待核实', (counts.get(event.event_type || '类别待核实') || 0) + 1));
  const filters = [{value:'all',label:'全部事件',count:archaeologyTimelineEvents.length}, ...[...counts].map(([value,count]) => ({value,label:value,count}))];
  if (activeTimelineType !== 'all' && !counts.has(activeTimelineType)) activeTimelineType = 'all';
  $('#timeline-filters').replaceChildren(...filters.map(filter => {
    const button = document.createElement('button'); button.type = 'button';
    button.className = `timeline-filter${activeTimelineType === filter.value ? ' active' : ''}`;
    button.dataset.eventFilter = filter.value; button.setAttribute('aria-pressed', String(activeTimelineType === filter.value));
    button.append(document.createTextNode(filter.label));
    const count = document.createElement('span'); count.textContent = String(filter.count); button.append(count);
    return button;
  }));
  $('#timeline-clear').hidden = activeTimelineType === 'all';
}

function createTimelineArtifactCard(artifact) {
  const entry = document.createElement('article'); entry.className = 'timeline-artifact-entry';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'timeline-artifact';
  button.dataset.timelineArtifact = artifact.slug; button.setAttribute('aria-label', `打开${artifact.name}的文物档案`);
  if (artifact.image?.src && safeWebUrl(artifact.image.src)) {
    const image = new Image(); image.src = safeWebUrl(artifact.image.src); image.alt = artifact.image.alt || `${artifact.name}的图录页截图`;
    image.loading = 'lazy'; button.append(image);
    image.addEventListener('error', () => { image.remove(); const fallback = document.createElement('span'); fallback.className = 'timeline-artifact-placeholder'; fallback.textContent = '图片暂不可用'; button.prepend(fallback); }, {once:true});
  } else {
    const fallback = document.createElement('span'); fallback.className = 'timeline-artifact-placeholder'; fallback.textContent = '无可用图片'; button.append(fallback);
  }
  const copy = document.createElement('span'); copy.className = 'timeline-artifact-copy';
  const name = document.createElement('b'); name.textContent = artifact.name;
  const scope = document.createElement('small'); scope.textContent = artifact.index.scope === 'individual' ? '单件图录条目 · 待复核' : '组档案 · 待复核';
  const imageInfo = document.createElement('small');
  const identity = artifact.image?.identityLabel || '影像类型待核实';
  const rights = ({open_license_claimed:'开放许可已登记',permission_documented:'授权记录已登记',unknown:'权利状态待核实'})[artifact.image?.rightsStatus] || (artifact.image?.license === '待核实' ? '权利状态待核实' : artifact.image?.license || '许可待核实');
  const imageKind = identity === '图录页面影像' ? '（图录资料）' : '';
  imageInfo.textContent = artifact.image?.src ? `${identity}${imageKind} · ${artifact.image.author || '署名待核实'} · ${rights}` : '图片未登记';
  copy.append(name,scope,imageInfo);
  if (artifact.image?.status) { const attribution=document.createElement('small');attribution.textContent=artifact.image.status;copy.append(attribution); }
  button.append(copy); entry.append(button);
  const imageSource = safeWebUrl(artifact.image?.sourceUrl);
  if (imageSource) { const sourceLink=document.createElement('a');sourceLink.className='timeline-artifact-source';sourceLink.href=imageSource;sourceLink.target='_blank';sourceLink.rel='noreferrer';sourceLink.textContent='图像来源与权利说明 ↗';entry.append(sourceLink); }
  else { const sourceNote=document.createElement('span');sourceNote.className='timeline-artifact-source';sourceNote.textContent='图像来源待核实';entry.append(sourceNote); }
  return entry;
}

function createTimelineEventCard(event) {
  const details = document.createElement('details'); details.className = 'timeline-stop'; details.dataset.eventType = event.event_type || '类别待核实';
  const summary = document.createElement('summary'); summary.className = 'timeline-summary';
  const date = document.createElement('span'); date.className = 'timeline-year'; date.textContent = eventDateDisplay(event);
  const dot = document.createElement('span'); dot.className = 'timeline-dot'; dot.setAttribute('aria-hidden','true');
  const copy = document.createElement('span'); copy.className = 'timeline-summary-copy';
  const type = document.createElement('span'); type.className = 'timeline-event-type'; type.textContent = event.event_type || '事件类别待核实';
  const status = document.createElement('span'); status.className = 'timeline-review-status'; status.textContent = archaeologyRecordStatus(event.record_status);
  const heading = document.createElement('h3'); heading.textContent = event.name;
  const description = document.createElement('p'); description.textContent = event.description || '事件说明待补充。';
  const contextList = document.createElement('span'); contextList.className = 'timeline-context-tags';
  timelineContextsForEvent(event).forEach(context => { const tag = document.createElement('span'); tag.textContent = context.code ? `${context.name} · ${context.code}` : context.name; contextList.append(tag); });
  const affordance = document.createElement('span'); affordance.className = 'timeline-expand-label'; affordance.textContent = '查看详情与来源';
  copy.append(type,status,heading,description,contextList,affordance); summary.append(date,dot,copy); details.append(summary);
  const panel = document.createElement('div'); panel.className = 'timeline-detail';
  const descriptionTitle = document.createElement('h4'); descriptionTitle.textContent = '事件说明';
  const fullDescription = document.createElement('p'); fullDescription.textContent = event.description || '事件说明待补充。';
  const facts = document.createElement('dl'); facts.className = 'timeline-detail-facts';
  [[ '日期精度', archaeologyPrecisionLabel(event) ],[ '记录状态', archaeologyRecordStatus(event.record_status) ],[ '日期字段', [event.date_start,event.date_end && event.date_end !== event.date_start ? event.date_end : ''].filter(Boolean).join(' — ') || '待核实' ]].forEach(([label,value]) => { const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;facts.append(dt,dd); });
  panel.append(descriptionTitle,fullDescription,facts);
  const contexts = timelineContextsForEvent(event);
  if (contexts.length) {
    const contextSection = document.createElement('section'); contextSection.className = 'timeline-detail-section';
    const title = document.createElement('h4'); title.textContent = `关联坑位（${contexts.length}）`; contextSection.append(title);
    contexts.forEach(context => {
      const item = document.createElement('div'); item.className = 'timeline-context-detail';
      const name = document.createElement('b'); name.textContent = [context.name,context.code].filter(Boolean).join(' · ');
      const state = document.createElement('span'); state.className = 'timeline-review-status'; state.textContent = archaeologyRecordStatus(context.record_status);
      item.append(name,state);
      if (context.summary) { const summaryText=document.createElement('p');summaryText.textContent=context.summary;item.append(summaryText); }
      if (context.excavation?.date_scope) { const scope=document.createElement('small');scope.textContent=context.excavation.date_scope;item.append(scope); }
      contextSection.append(item);
    });
    panel.append(contextSection);
  }
  const site = archaeologyTimelineSites.find(item => item.id === event.site_id);
  if (site) {
    const siteSection = document.createElement('section'); siteSection.className = 'timeline-detail-section timeline-site-detail';
    const title = document.createElement('h4'); title.textContent = '所属遗址';
    const name = document.createElement('b'); name.textContent = site.name;
    const status = document.createElement('span'); status.className = 'timeline-review-status'; status.textContent = archaeologyRecordStatus(site.record_status);
    const location = document.createElement('p'); location.textContent = site.location?.administrative_area || '行政区信息待核实';
    siteSection.append(title,name,status,location); panel.append(siteSection);
  }
  const sources = (Array.isArray(event.sources) ? event.sources : []).filter(source => safeWebUrl(source.url));
  const sourceSection = document.createElement('section'); sourceSection.className = 'timeline-detail-section timeline-sources';
  const sourceTitle = document.createElement('h4'); sourceTitle.textContent = `资料来源（${sources.length}）`; sourceSection.append(sourceTitle);
  if (sources.length) sources.forEach(source => {
    const item=document.createElement('div');item.className='timeline-source-item';
    const link=document.createElement('a');link.href=safeWebUrl(source.url);link.target='_blank';link.rel='noreferrer';link.textContent=`${source.title || source.publisher || '打开来源'} ↗`;
    const locator=document.createElement('p');locator.textContent=[source.publisher,source.published_at,source.locator].filter(Boolean).join(' · ') || '出处定位待补充';
    item.append(link,locator);sourceSection.append(item);
  }); else { const missing=document.createElement('p');missing.textContent='暂无可打开的来源链接。';sourceSection.append(missing); }
  panel.append(sourceSection);
  const related = timelineArtifactsForEvent(event);
  if (related.length) {
    const artifactSection=document.createElement('section');artifactSection.className='timeline-detail-section timeline-related-artifacts';
    const title=document.createElement('h4');title.textContent=`坑位匹配的图录记录（${related.length}）`;
    const caveat=document.createElement('p');caveat.className='timeline-related-note';caveat.textContent='按所选坑位与图录出土单位/背景匹配，仅作坑位相关索引，不代表本事件的逐件出土清单。';
    const visible=document.createElement('div');visible.className='timeline-artifact-grid';visible.append(...related.slice(0,4).map(createTimelineArtifactCard));
    artifactSection.append(title,caveat,visible);
    if (related.length > 4) {
      const moreList=document.createElement('div');moreList.className='timeline-artifact-grid timeline-more-artifacts';moreList.hidden=true;moreList.append(...related.slice(4).map(createTimelineArtifactCard));
      const more=document.createElement('button');more.type='button';more.className='text-button timeline-more-button';more.dataset.timelineMore='';more.textContent=`展开其余 ${related.length - 4} 条匹配记录`;
      more.dataset.closedLabel = more.textContent;
      artifactSection.append(more,moreList);
    }
    panel.append(artifactSection);
  }
  details.append(panel); return details;
}

function renderArchaeologyTimeline() {
  const matching = archaeologyTimelineEvents.filter(event => activeTimelineType === 'all' || (event.event_type || '类别待核实') === activeTimelineType);
  $('#timeline-loading').hidden = true;
  $('#timeline-error').hidden = true;
  $('#timeline-events').replaceChildren(...matching.map(createTimelineEventCard));
  $('#timeline-events').setAttribute('aria-busy','false');
  $('#timeline-results').textContent = `${matching.length} / ${archaeologyTimelineEvents.length} 条现代考古事件${archaeologyTimelineNotice ? ` · ${archaeologyTimelineNotice}` : ''}`;
  $('#timeline-empty').hidden = matching.length > 0 || archaeologyTimelineEvents.length === 0;
  if (!archaeologyTimelineEvents.length) { $('#timeline-empty').hidden = false; $('#timeline-empty').textContent = '数据目录中没有可展示的考古事件。'; }
}

function initializeArchaeologyTimeline() {
  if (!archaeologyTimelinePromise) {
    $('#timeline-loading').hidden = false;
    loadArchaeologyTimelineData().catch(() => {});
  }
}

function artifactFilterValues(field) {
  const values = new Set();
  artifactIndexItems.forEach(item => {
    const value = item.index[field];
    if (value && String(value).trim() && !/^(待核实|未知|无资料)$/.test(String(value).trim())) values.add(String(value).trim());
  });
  return [...values].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function updateArtifactFilterOptions() {
  const specs = [
    ['category','artifact-filter-category','全部类别'], ['period','artifact-filter-period','全部年代'],
    ['material','artifact-filter-material','全部材质'], ['context','artifact-filter-context','全部地点']
  ];
  specs.forEach(([field, id, allLabel]) => {
    const select = $(`#${id}`);
    const selected = new URLSearchParams(window.location.search).get(field) || '';
    select.replaceChildren(new Option(`${allLabel}（${artifactIndexItems.length}）`, ''));
    const counts = new Map();
    artifactIndexItems.forEach(item => { const value = item.index[field]; if (value && !/待核实|未知/.test(value)) counts.set(value, (counts.get(value) || 0) + 1); });
    artifactFilterValues(field).forEach(value => select.add(new Option(`${value}（${counts.get(value) || 0}）`, value)));
    select.value = counts.has(selected) ? selected : '';
  });
}

function currentArtifactFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('q') || '',
    category: params.get('category') || '',
    period: params.get('period') || '',
    material: params.get('material') || '',
    context: params.get('context') || '',
    sort: ['name','period','category'].includes(params.get('sort')) ? params.get('sort') : 'name',
    view: params.get('view') === 'list' ? 'list' : 'grid'
  };
}

function writeArtifactFilters(filters, replace = true) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', 'artifacts');
  Object.entries(filters).forEach(([key, value]) => {
    if (!value || (key === 'sort' && value === 'name') || (key === 'view' && value === 'grid')) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  history[replace ? 'replaceState' : 'pushState']({...history.state, artifactIndex:true}, '', `${url.pathname}${url.search}${url.hash}`);
}

function renderArtifactIndex() {
  const filters = currentArtifactFilters();
  const resultKey = JSON.stringify([filters.q.trim(), filters.category, filters.period, filters.material, filters.context, filters.sort, filters.view]);
  if (resultKey !== artifactResultKey) {
    artifactResultKey = resultKey;
    artifactVisibleLimit = 48;
  }
  $('#artifact-index-search').value = filters.q;
  $('#artifact-sort').value = filters.sort;
  updateArtifactFilterOptions();
  [['category','#artifact-filter-category'],['period','#artifact-filter-period'],['material','#artifact-filter-material'],['context','#artifact-filter-context']].forEach(([key, selector]) => {
    const control = $(selector);
    control.value = [...control.options].some(option => option.value === filters[key]) ? filters[key] : '';
  });
  artifactIndexViewMode = filters.view;
  $$('[data-artifact-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.artifactView === artifactIndexViewMode)));
  const query = filters.q.trim().toLocaleLowerCase();
  let visible = artifactIndexItems.filter(item => {
    const idx = item.index;
    const searchable = [item.name, ...(idx.aliases || []), item.category, item.period, item.material, item.excavation, item.intro, ...(idx.keywords || []), ...(idx.sourceTitles || [])].join(' ').toLocaleLowerCase();
    return (!query || searchable.includes(query)) && (!filters.category || idx.category === filters.category) && (!filters.period || idx.period === filters.period) && (!filters.material || idx.material === filters.material) && (!filters.context || idx.context === filters.context);
  });
  visible.sort((a, b) => {
    if (filters.sort === 'period') return a.index.period.localeCompare(b.index.period, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN');
    if (filters.sort === 'category') return a.index.category.localeCompare(b.index.category, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN');
    return a.name.localeCompare(b.name, 'zh-CN');
  });
  $('#artifact-index-total').textContent = artifactIndexItems.length.toLocaleString('zh-CN');
  const shownCount = Math.min(visible.length, artifactVisibleLimit);
  $('#artifact-index-results').textContent = `显示 ${shownCount} / ${visible.length} 条匹配记录（共 ${artifactIndexItems.length} 条）`;
  $('#artifact-index-grid').classList.toggle('is-list', artifactIndexViewMode === 'list');
  $('#artifact-index-grid').replaceChildren(...visible.slice(0, artifactVisibleLimit).map(createArtifactIndexCard));
  const loadMore = $('#artifact-index-load-more');
  loadMore.hidden = visible.length <= artifactVisibleLimit;
  loadMore.textContent = `继续浏览 · 还有 ${Math.max(0, visible.length - artifactVisibleLimit)} 条`;
  $('#artifact-index-empty').hidden = visible.length > 0 || artifactIndexItems.length === 0;
  $('#artifact-index-error').hidden = !artifactDataLoadError;
  $('#artifact-index-data-status').textContent = artifactDataLoadError;
  $('#artifact-index-data-status').dataset.kind = artifactDataLoadError.startsWith('无法读取') ? 'error' : 'notice';
  $('#artifact-index-data-status').hidden = !artifactDataLoadError;
}

function createArtifactIndexCard(record) {
  const article = document.createElement('article');
  article.className = 'artifact-index-card';
  const detailLink = document.createElement('a');
  detailLink.className = 'artifact-card-main';
  detailLink.href = artifactUrl(record);
  detailLink.dataset.artifactIndexLink = record.slug;
  detailLink.setAttribute('aria-label', `查看${record.name}档案`);
  const media = document.createElement('div');
  media.className = 'artifact-card-media';
  if (record.image && record.image.src && safeWebUrl(record.image.src)) {
    const image = new Image();
    image.src = safeWebUrl(record.image.src);
    image.alt = record.image.alt || `${record.name}影像`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      media.replaceChildren();
      const fallback = document.createElement('div');
      fallback.className = 'artifact-card-placeholder';
      fallback.textContent = '影像暂时无法加载';
      media.append(fallback);
    }, {once:true});
    media.append(image);
    const isLocalCatalogPage = record.image.identityLabel === '图录页面影像';
    if (record.image.identityLabel && !isLocalCatalogPage) {
      const identity = document.createElement('span');
      identity.className = 'artifact-card-identity';
      identity.textContent = record.image.identityLabel;
      media.append(identity);
    }
    if (!isLocalCatalogPage) {
      const credit = document.createElement('span');
      credit.className = 'artifact-card-image-credit';
      credit.textContent = `${record.image.author || '作者待核实'} · ${record.image.license || '许可待核实'}`;
      media.append(credit);
    }
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'artifact-card-placeholder';
    placeholder.append(document.createTextNode(record.index.reviewState === 'type' ? '器型档案' : record.index.scope === 'group' ? '组档案 · 暂无可展示影像' : '无可确认图片'));
    const note = document.createElement('small');
    note.textContent = '不使用生成或未匹配的器物图像';
    placeholder.append(note);
    media.append(placeholder);
  }
  const content = document.createElement('div');
  content.className = 'artifact-card-content';
  const kicker = document.createElement('div');
  kicker.className = 'artifact-card-kicker';
  kicker.append(document.createTextNode(record.category || '类别待核实'));
  const status = document.createElement('span');
  status.className = 'artifact-card-status';
  status.dataset.kind = record.index.reviewState === 'needs_review' ? 'needs_review' : record.index.reviewState;
  const stateLabels = {draft:'草稿', needs_review:'待复核', verified:'资料已核实', published:'已发布', withdrawn:'已撤回', type:'器型档案'};
  const displayedState = stateLabels[record.index.recordState || record.index.reviewState] || (record.index.scope === 'group' ? '待核实' : record.status.label.includes('类别示例') ? '类别示例' : record.status.label.includes('待核实') ? '待核实' : '前端档案');
  status.textContent = record.index.reviewState === 'type' ? `器型档案 · ${displayedState === '器型档案' ? '待核实' : displayedState}` : record.index.scope === 'group' ? `组档案 · ${displayedState}` : displayedState;
  kicker.append(status);
  const title = document.createElement('h2');
  title.textContent = record.name;
  const facts = document.createElement('dl');
  facts.className = 'artifact-card-facts';
  [[`年代`,record.index.period || '待核实'],['材质',record.index.material || '待核实'],['出土信息',record.index.context || '待核实']].forEach(([label,value]) => {
    const term = document.createElement('dt'); term.textContent = label;
    const description = document.createElement('dd'); description.textContent = value;
    facts.append(term, description);
  });
  content.append(kicker, title, facts);
  detailLink.append(media, content);
  article.append(detailLink);
  return article;
}

function resetArtifactIndexFilters() {
  const filters = {q:'',category:'',period:'',material:'',context:'',sort:'name',view:'grid'};
  writeArtifactFilters(filters);
  renderArtifactIndex();
}

function initializeArtifactIndex() {
  if (!artifactDataPromise) {
    $('#artifact-index-results').textContent = '正在读取本地器物数据…';
    loadArtifactData().then(() => renderArtifactIndex()).catch(() => renderArtifactIndex());
  } else if (artifactDataLoadError || artifactDataPromise) {
    artifactDataPromise.then(() => renderArtifactIndex()).catch(() => renderArtifactIndex());
  } else renderArtifactIndex();
}

$('#artifact-index-search').addEventListener('input', () => {
  const filters = currentArtifactFilters(); filters.q = $('#artifact-index-search').value;
  writeArtifactFilters(filters); renderArtifactIndex(); $('#artifact-index-search').focus();
});
[['category','#artifact-filter-category'],['period','#artifact-filter-period'],['material','#artifact-filter-material'],['context','#artifact-filter-context']].forEach(([key, selector]) => $(selector).addEventListener('change', () => {
  const filters = currentArtifactFilters(); filters[key] = $(selector).value; writeArtifactFilters(filters); renderArtifactIndex();
}));
$('#artifact-sort').addEventListener('change', () => { const filters = currentArtifactFilters(); filters.sort = $('#artifact-sort').value; writeArtifactFilters(filters); renderArtifactIndex(); });
$$('[data-artifact-view]').forEach(button => button.addEventListener('click', () => { const filters = currentArtifactFilters(); filters.view = button.dataset.artifactView; writeArtifactFilters(filters); renderArtifactIndex(); }));
$('#artifact-index-clear').addEventListener('click', resetArtifactIndexFilters);
$$('[data-artifact-clear-empty]').forEach(button => button.addEventListener('click', resetArtifactIndexFilters));
$('#artifact-index-load-more').addEventListener('click', () => { artifactVisibleLimit += 48; renderArtifactIndex(); });
$('#artifact-index-retry').addEventListener('click', () => { artifactDataPromise = null; artifactDataLoadError = ''; initializeArtifactIndex(); });

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
window.addEventListener('account-data-error', event => showToast(event.detail?.message || '个人数据保存失败。'));

function homeCategoryLabel(value) {
  return value || '类别待核实';
}

function renderHomeArtifactFilters() {
  const counts = new Map();
  artifactIndexItems.forEach(item => {
    const category = item.index.category || item.category;
    if (category) counts.set(category, (counts.get(category) || 0) + 1);
  });
  const categories = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
  if (activeFilter !== 'all' && !counts.has(activeFilter)) activeFilter = 'all';
  const filters = [
    {value:'all', label:'全部', count:artifactIndexItems.length},
    ...categories.map(([value, count]) => ({value, label:homeCategoryLabel(value), count}))
  ];
  $('#home-artifact-filters').replaceChildren(...filters.map(filter => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter${activeFilter === filter.value ? ' active' : ''}`;
    button.dataset.filter = filter.value;
    button.setAttribute('aria-pressed', String(activeFilter === filter.value));
    button.append(document.createTextNode(filter.label));
    const count = document.createElement('span'); count.textContent = filter.count.toLocaleString('zh-CN');
    button.append(count);
    return button;
  }));
}

function diverseHomeRecords(recordsToShow, limit) {
  const groups = new Map();
  recordsToShow.forEach(record => {
    const category = record.index.category || record.category || '类别待核实';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(record);
  });
  const queues = [...groups.values()];
  const picked = [];
  while (picked.length < limit && queues.some(queue => queue.length)) {
    queues.forEach(queue => {
      if (picked.length >= limit) return;
      if (queue.length) picked.push(queue.shift());
    });
  }
  return picked;
}

function createHomeArtifactCard(record, feature = false) {
  const card = document.createElement('a');
  card.className = `artifact-card${feature ? ' artifact-card-feature' : ''}`;
  card.href = artifactUrl(record);
  card.dataset.artifactIndexLink = record.slug;
  card.setAttribute('aria-label', `查看${record.name}档案`);
  const photo = document.createElement('span'); photo.className = 'artifact-photo';
  if (record.image && record.image.src && safeWebUrl(record.image.src)) {
    const image = new Image(); image.src = safeWebUrl(record.image.src);
    image.alt = record.image.alt || `${record.name}影像`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      photo.replaceChildren();
      const fallback = document.createElement('span'); fallback.className = 'home-artifact-placeholder';
      fallback.textContent = '影像暂时无法加载'; photo.append(fallback);
    }, {once:true});
    photo.append(image);
    if (record.image.identityLabel !== '图录页面影像') {
      const credit = document.createElement('span'); credit.className = 'photo-credit';
      credit.textContent = `${record.image.author || '作者待核实'} · ${record.image.license || '许可待核实'}${record.image.identityLabel ? ` · ${record.image.identityLabel}` : ''}`;
      photo.append(credit);
    }
  } else {
    const fallback = document.createElement('span'); fallback.className = 'home-artifact-placeholder';
    fallback.textContent = record.index.reviewState === 'type' ? '器型档案 · 暂无图片' : '暂无可确认图片';
    photo.append(fallback);
  }
  const open = document.createElement('span'); open.className = 'card-open'; open.textContent = '↗'; open.setAttribute('aria-hidden','true'); photo.append(open);
  const meta = document.createElement('span'); meta.className = 'artifact-meta';
  const kicker = document.createElement('span'); kicker.className = 'object-no';
  const status = record.index.reviewState === 'needs_review' ? '待复核' : record.index.reviewState === 'type' ? '器型档案' : (record.index.recordState || '图录档案');
  kicker.textContent = `${record.category || '类别待核实'} · ${status}`;
  const title = document.createElement('b'); title.textContent = record.name;
  const details = document.createElement('small');
  details.textContent = [record.index.period || '年代待核实', record.index.context || '出土信息待核实', record.index.material || '材质待核实'].join('　/　');
  meta.append(kicker,title,details); card.append(photo,meta);
  return card;
}

function filterArtifacts() {
  const query = ($('#artifact-search').value || '').trim().toLocaleLowerCase();
  const matches = artifactIndexItems.filter(item => {
    const idx = item.index;
    const searchable = [item.name, ...(idx.aliases || []), item.category, idx.category, idx.period, idx.material, idx.context, item.intro, ...(idx.keywords || []), ...(idx.sourceTitles || [])].join(' ').toLocaleLowerCase();
    return (activeFilter === 'all' || (idx.category || item.category) === activeFilter) && (!query || searchable.includes(query));
  });
  const selected = diverseHomeRecords(matches, homeVisibleLimit);
  const grid = $('#collection-grid');
  grid.replaceChildren(...selected.map(record => createHomeArtifactCard(record)));
  grid.setAttribute('aria-busy','false');
  $('#empty-state').hidden = matches.length !== 0;
  $('#empty-title').textContent = '没有找到匹配的器物';
  $('#empty-copy').textContent = '试试更短的关键词，或切换类别筛选。';
  $('#home-artifact-results').textContent = query || activeFilter !== 'all'
    ? `找到 ${matches.length.toLocaleString('zh-CN')} 条匹配档案，当前展示 ${selected.length.toLocaleString('zh-CN')} 条。`
    : `共 ${artifactIndexItems.length.toLocaleString('zh-CN')} 条图录档案 · 当前展示 ${selected.length.toLocaleString('zh-CN')} 条`;
  const more = $('#home-artifact-load-more');
  more.hidden = matches.length <= selected.length;
  more.textContent = `继续浏览 · 还有 ${Math.max(0, matches.length - selected.length).toLocaleString('zh-CN')} 条`;
  const status = $('#home-artifact-data-status');
  status.textContent = artifactDataLoadError;
  status.hidden = !artifactDataLoadError;
}

function initializeHomeArtifacts() {
  const grid = $('#collection-grid');
  if (!grid || grid.dataset.initialized === 'true') return;
  grid.dataset.initialized = 'true';
  grid.setAttribute('aria-busy','true');
  loadArtifactData().then(() => {
    renderHomeArtifactFilters();
    filterArtifacts();
  }).catch(() => {
    renderHomeArtifactFilters();
    filterArtifacts();
  });
}

function chooseArtifactFilter(category) {
  activeFilter = category;
  homeVisibleLimit = 12;
  $('#artifact-search').value = '';
  renderHomeArtifactFilters();
  filterArtifacts();
  $('#collection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

$('#home-artifact-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  homeVisibleLimit = 12;
  renderHomeArtifactFilters();
  filterArtifacts();
});
$('#artifact-search').addEventListener('input', () => { homeVisibleLimit = 12; filterArtifacts(); });
$('#home-artifact-load-more').addEventListener('click', () => { homeVisibleLimit += 12; filterArtifacts(); });
$('[data-reset-search]').addEventListener('click', () => {
  $('#artifact-search').value = '';
  activeFilter = 'all';
  homeVisibleLimit = 12;
  renderHomeArtifactFilters();
  filterArtifacts();
});
$$('[data-entry-filter]').forEach(button => button.addEventListener('click', () => {
  const category = {bronze:'青铜器',gold:'金器',jade:'玉器',pottery:'陶器'}[button.dataset.entryFilter] || button.dataset.entryFilter;
  chooseArtifactFilter(category);
}));
$$('[data-theme-link="bronze"]').forEach(link => link.addEventListener('click', () => {
  activeFilter = '青铜器';
  $('#artifact-search').value = '';
  homeVisibleLimit = 12;
  renderHomeArtifactFilters();
  filterArtifacts();
}));

$('#timeline-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-event-filter]');
  if (!button) return;
  activeTimelineType = button.dataset.eventFilter;
  renderArchaeologyTimelineFilters();
  renderArchaeologyTimeline();
});
$('#timeline-clear').addEventListener('click', () => {
  activeTimelineType = 'all';
  renderArchaeologyTimelineFilters();
  renderArchaeologyTimeline();
});
$('#timeline-retry').addEventListener('click', () => {
  archaeologyTimelinePromise = null;
  $('#timeline-error').hidden = true;
  $('#timeline-loading').hidden = false;
  loadArchaeologyTimelineData().catch(() => {});
});
$('#timeline-events').addEventListener('click', event => {
  const more = event.target.closest('[data-timeline-more]');
  if (more) {
    const list = more.nextElementSibling;
    list.hidden = !list.hidden;
    more.textContent = list.hidden ? more.dataset.closedLabel : '收起其余匹配记录';
    return;
  }
  const artifact = event.target.closest('[data-timeline-artifact]');
  if (artifact) navigateToArtifact(artifact.dataset.timelineArtifact);
});

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
    $('#detail-not-found').querySelector('h1').textContent = '暂未找到这件文物';
    $('#detail-not-found').querySelector('p:not(.eyebrow)').textContent = '链接中的文物编号不存在，或对应资料尚未接入。';
    document.title = '未找到文物 · 三星堆数字探索平台';
    return;
  }

  $('#detail-breadcrumb-name').textContent = record.name;
  $('#detail-kicker').textContent = record.kicker;
  $('#detail-title').textContent = record.name;
  $('#detail-status').textContent = record.status.label;
  $('#detail-status').dataset.status = record.status.kind;
  $('#detail-intro').textContent = record.intro;
  $('#detail-interpretation').textContent = record.interpretation;
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
    placeholder.textContent = record.image.kind === 'diagram' ? '器形示意 · 非文物照片' : record.image.alt;
    visual.append(placeholder);
  }
  const isLocalCatalogPage = record.image.identityLabel === '图录页面影像';
  $('#detail-image-caption').parentElement.hidden = isLocalCatalogPage;
  $('#detail-image-caption').textContent = `${record.image.author} · ${record.image.license} · ${record.image.status}`;
  const imageSource = $('#detail-image-source');
  imageSource.hidden = isLocalCatalogPage || !record.image.sourceUrl;
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

function storyText(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value || '';
  return node;
}

function storySourceLink(source, className = '') {
  const href = safeWebUrl(source && source.url);
  if (!href) return null;
  const link = document.createElement('a');
  link.className = className;
  link.href = href;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = `${source.title || source.source_id || '查看来源'} ↗`;
  return link;
}

function selectedStoryArtifacts() {
  return artifactIndexItems.filter(item => item && item.id && item.index?.dataOrigin === '/data/artifacts/selected-book-300.jsonl' && item.index.recordState !== 'withdrawn');
}

function storyArtifactMap() {
  const map = new Map();
  selectedStoryArtifacts().forEach(item => { map.set(item.id, item); if (item.slug) map.set(item.slug, item); });
  return map;
}

async function loadStoriesData() {
  if (storyDataPromise) return storyDataPromise;
  storyDataNotice = '';
  storyDataPromise = (async () => {
    const response = await fetch(new URL('./data/manifest.json', document.baseURI), {credentials:'same-origin'});
    if (!response.ok) throw new Error(`数据清单读取失败：${response.status} ${response.statusText}`);
    const manifest = await response.json();
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const readJsonl = async path => {
      const entry = files.find(file => file.path === path && file.format === 'jsonl');
      if (!entry) throw new Error(`数据清单未登记 ${path}`);
      const url = new URL(entry.url || `/data/${path}`, document.baseURI);
      if (url.origin !== window.location.origin || !url.pathname.includes('/data/')) throw new Error(`拒绝非本站数据路径：${path}`);
      return fetchJsonl(url.href);
    };
    const [themes, exhibitions, edges, artifacts, archaeology] = await Promise.allSettled([
      readJsonl('stories/themes.jsonl'), readJsonl('graph/exhibitions.jsonl'), readJsonl('graph/edges.jsonl'),
      loadArtifactData(), loadArchaeologyTimelineData()
    ]);
    if (themes.status === 'rejected') throw new Error(themes.reason?.message || '专题内容读取失败');
    storyRecords = themes.value.records.filter(item => item && item.id && item.slug && item.title && item.record_status !== 'withdrawn').sort((a,b) => Number(a.order || 0) - Number(b.order || 0));
    storyExhibitions = exhibitions.status === 'fulfilled' ? exhibitions.value.records.filter(item => item && item.id && item.record_type === 'exhibition' && item.record_status !== 'withdrawn') : [];
    storyGraphEdges = edges.status === 'fulfilled' ? edges.value.records.filter(item => item && item.id && item.subject && item.object && item.evidence) : [];
    const malformed = [themes.value.malformed, exhibitions.status === 'fulfilled' ? exhibitions.value.malformed : 0, edges.status === 'fulfilled' ? edges.value.malformed : 0].reduce((sum,value) => sum + value,0);
    if (malformed) storyDataNotice = `${malformed} 条格式异常的专题或图谱记录已跳过。`;
    if (exhibitions.status === 'rejected') storyDataNotice += `${storyDataNotice ? ' ' : ''}实体展览记录暂不可用。`;
    if (edges.status === 'rejected') storyDataNotice += `${storyDataNotice ? ' ' : ''}图谱关系暂不可用，未展示相关关系线索。`;
    if (artifacts.status === 'rejected' || !artifactDataSourceLoaded) storyDataNotice += `${storyDataNotice ? ' ' : ''}精选300件数据暂不可用，专题中的文物关联将省略。`;
    if (archaeology.status === 'rejected') storyDataNotice += `${storyDataNotice ? ' ' : ''}考古事件与坑位资料暂不可用。`;
    storyDataLoaded = true;
    renderStoryTeasers();
    if (!$('#stories-view').hidden) renderStoriesPage();
    return storyRecords;
  })().catch(error => {
    storyDataPromise = null;
    storyDataLoaded = false;
    $('#stories-loading').hidden = true;
    $('#stories-content').setAttribute('aria-busy','false');
    $('#stories-content').hidden = true;
    $('#stories-error').hidden = false;
    $('#stories-error-message').textContent = error?.message || '专题资料读取失败。';
    renderStoryTeasers(error?.message || '专题目录暂不可用。');
    throw error;
  });
  return storyDataPromise;
}

function createStoryCover(record, cover, className, includeSource = true) {
  const figure = document.createElement('figure');
  figure.className = className;
  const visual = document.createElement('div'); visual.className = 'story-cover-visual';
  if (record?.image?.src && safeWebUrl(record.image.src)) {
    const image = new Image(); image.src = safeWebUrl(record.image.src); image.alt = record.image.identityLabel ? `${record.name}（${record.image.identityLabel}）` : (cover?.alt || record.image.alt || `${record.name}影像`);
    image.loading = 'lazy';
    image.addEventListener('error', () => { visual.replaceChildren(storyText('span','story-cover-placeholder','影像暂不可用')); }, {once:true});
    visual.append(image);
  } else visual.append(storyText('span','story-cover-placeholder',record ? '无可用登记影像' : '封面记录未找到'));
  figure.append(visual);
  const caption = document.createElement('figcaption');
  const identityLabel = record?.image?.identityLabel || '';
  const captionText = !record?.image?.src ? '暂无登记影像' : identityLabel === '图录页面影像' ? '图录页面影像 · 图录资料' : identityLabel === '类别配图' ? '类别配图 · 不代表本条单件实物' : identityLabel === '单件照片' ? '单件照片 · 来源与权利状态见下' : '影像身份待核实 · 请查看来源说明';
  caption.append(storyText('span','story-image-caption',captionText));
  if (record?.image) {
    const identity = identityLabel || '影像身份待核实';
    const rights = ({open_license_claimed:'开放许可已登记',permission_documented:'授权记录已登记',unknown:'权利状态待核实'})[record.image.rightsStatus] || record.image.license || '权利状态待核实';
    caption.append(storyText('small','story-image-credit',`${identity} · ${record.image.author || '署名待核实'} · ${rights}`));
    if (includeSource) {
      const source = storySourceLink({title:'查看图像来源与许可',url:record.image.sourceUrl},'story-image-source');
      if (source) caption.append(source);
      else caption.append(storyText('small','story-image-source','图像来源链接待核实'));
    }
  }
  figure.append(caption);
  return figure;
}

function renderStoryTeasers(errorMessage = '') {
  const grid = $('#theme-teasers');
  if (!grid) return;
  if (errorMessage) { grid.replaceChildren(storyText('p','stories-inline-status',errorMessage)); return; }
  if (!storyRecords.length) { grid.replaceChildren(storyText('p','stories-inline-status',storyDataLoaded ? '专题目录中没有可展示的内容。' : '正在读取专题目录…')); return; }
  grid.replaceChildren(...storyRecords.map((story,index) => {
    const link = document.createElement('a'); link.className = `theme-card ${['theme-bronze','theme-ritual','theme-discovery'][index % 3]}`;
    link.href = `/?page=stories&theme=${encodeURIComponent(story.slug)}`; link.dataset.storyLink = story.slug;
    link.append(storyText('span','theme-no',`STORY ${String(index+1).padStart(2,'0')}`),storyText('b','',story.title),storyText('small','',story.central_question),storyText('span','theme-link',`阅读专题 · ${Array.isArray(story.sections) ? story.sections.length : 0} 章　↗`));
    return link;
  }));
}

function createStoryDirectoryCard(story,index,artifactMap) {
  const card = document.createElement('article'); card.className = 'story-directory-card';
  const coverRecord = artifactMap.get(story.cover?.artifact_id);
  card.append(createStoryCover(coverRecord,story.cover,'story-directory-cover'));
  const body = document.createElement('div'); body.className = 'story-directory-copy';
  body.append(storyText('span','stories-overline',`STORY ${String(index+1).padStart(2,'0')} · ${story.sections?.length || 0} 章`),storyText('h3','',story.title),storyText('p','story-subtitle',story.subtitle),storyText('p','story-question',story.central_question),storyText('p','story-intro',story.intro));
  if (!coverRecord) body.append(storyText('small','story-missing-note',`封面引用 ${story.cover?.artifact_id || '待登记'} 未在指定精选数据中找到。`));
  const footer = document.createElement('span'); footer.className = 'story-directory-meta'; footer.append(storyText('span','story-status',archaeologyRecordStatus(story.record_status)),storyText('span','', '打开专题 ↗'));
  body.append(footer);
  const link=document.createElement('a');link.className='story-directory-copy-link';link.href=`/?page=stories&theme=${encodeURIComponent(story.slug)}`;link.dataset.storyLink=story.slug;link.append(body);
  card.append(link); return card;
}

function renderExhibitionRecord(exhibition,artifactMap) {
  const article = document.createElement('article'); article.className = 'actual-exhibition-record';
  const head = document.createElement('div'); head.className = 'actual-exhibition-head';
  head.append(storyText('span','actual-exhibition-label','实体展览 · 机构记录'),storyText('span','story-status',archaeologyRecordStatus(exhibition.record_status)));
  const title = storyText('h3','',exhibition.name); const venue = storyText('p','actual-exhibition-venue',exhibition.venue || '展出地点待核实');
  const facts = document.createElement('dl'); facts.className = 'actual-exhibition-facts';
  [[ '展期', [exhibition.date_start,exhibition.date_end].filter(Boolean).join(' — ') || '待核实' ],['展品总数（来源记录）',exhibition.object_count == null ? '待核实' : String(exhibition.object_count)]].forEach(([label,value]) => { facts.append(storyText('dt','',label),storyText('dd','',value)); });
  const note = storyText('p','actual-exhibition-note',exhibition.scope_note || '展览范围说明待核实。');
  const sources = Array.isArray(exhibition.sources) ? exhibition.sources : [];
  const sourceList = document.createElement('div'); sourceList.className = 'story-source-list';
  sources.forEach(source => { const row=document.createElement('div');row.className='story-source-row';const link=storySourceLink(source);if(link)row.append(link);row.append(storyText('p','', [source.publisher,source.locator].filter(Boolean).join(' · ') || '出处定位待补充'));sourceList.append(row); });
  const selectedIds = new Set(selectedStoryArtifacts().flatMap(item => [item.id,item.slug]));
  const matches = storyGraphEdges.filter(edge => edge.predicate === 'listed_in_exhibition' && edge.object?.type === 'exhibition' && edge.object.id === exhibition.id && edge.subject?.type === 'artifact' && selectedIds.has(edge.subject.id));
  const relation = document.createElement('p'); relation.className='exhibition-match-note';
  if (matches.length) {
    relation.textContent = `图谱中有 ${matches.length} 条按精选记录 ID/slug 精确关联的展品关系；关系状态与来源如下。`;
    matches.slice(0,6).forEach(edge => { const line=document.createElement('div');line.className='story-edge-row';line.append(storyText('b','',`${edge.subject.label || edge.subject.id} → ${exhibition.name}`),storyText('span','story-status',archaeologyRecordStatus(edge.record_status)));(edge.evidence || []).forEach(evidence => { const source=storySourceLink({title:evidence.title || evidence.source_id,url:evidence.url});if(source)line.append(source);line.append(storyText('small','',evidence.locator || '出处定位待补充')); });article.append(line); });
  } else relation.textContent = '现有展览关系记录未能按精选300件数据的 ID/slug 精确对应展品，因此不从展览名称名单推断文物关联。';
  article.append(head,title,venue,facts,note,storyText('h4','actual-source-title','展览来源'),sourceList,relation);
  return article;
}

function storyEventsFor(section) { const ids=new Set(section.event_ids || []); return archaeologyTimelineEvents.filter(item => ids.has(item.id)); }
function storyContextsFor(section) { const ids=new Set(section.context_ids || []); return archaeologyTimelineContexts.filter(item => ids.has(item.id)); }

function createStoryArtifactCard(record) {
  const entry=document.createElement('article');entry.className='story-artifact-entry';
  const link = document.createElement('a'); link.className='story-artifact-card'; link.href=artifactUrl(record); link.dataset.artifactIndexLink=record.slug;
  link.setAttribute('aria-label',`打开${record.name}文物档案`);
  link.append(createStoryCover(record,{alt:record.image?.alt || `${record.name}图录图版`,caption:'图录图版 · 非馆藏实物照'},'story-artifact-cover',false));
  const copy = document.createElement('span'); copy.className='story-artifact-copy';
  copy.append(storyText('b','',record.name),storyText('small','',`${record.index?.scope === 'group' ? '组档案' : '单件图录条目'} · ${record.status?.label || '资料待复核'}`),storyText('small','',`${record.category || '类别待核实'} · ${record.excavation || '出土信息待核实'}`));
  link.append(copy);entry.append(link);
  const source=storySourceLink({title:'查看图像来源与许可',url:record.image?.sourceUrl},'story-image-source');
  entry.append(source || storyText('span','story-image-source','图像来源链接待核实'));
  return entry;
}

function createStoryEventNode(event) {
  const details = document.createElement('details'); details.className='story-archaeology-node';
  const summary = document.createElement('summary'); summary.append(storyText('span','story-node-date',eventDateDisplay(event)),storyText('b','',event.name),storyText('span','story-status',archaeologyRecordStatus(event.record_status)));
  const body = document.createElement('div'); body.className='story-node-body';
  body.append(storyText('p','',event.description || '事件说明待补充。'),storyText('small','',`日期精度：${archaeologyPrecisionLabel(event)} · 事件日期为现代考古工作时间，不是器物制作年代。`));
  const contexts=storyContextsFor({context_ids:event.context_ids || []});
  if(contexts.length) body.append(storyText('p','',`关联坑位：${contexts.map(item => [item.name,item.code].filter(Boolean).join(' · ')).join('；')}`));
  (event.sources || []).forEach(source => { const row=document.createElement('div');row.className='story-source-row';const link=storySourceLink(source);if(link)row.append(link);row.append(storyText('p','',[source.publisher,source.locator].filter(Boolean).join(' · ') || '出处定位待补充'));body.append(row); });
  details.append(summary,body); return details;
}

function createStoryContextNode(context) {
  const details=document.createElement('details');details.className='story-archaeology-node story-context-node';
  const summary=document.createElement('summary');summary.append(storyText('b','',[context.name,context.code].filter(Boolean).join(' · ')),storyText('span','story-status',archaeologyRecordStatus(context.record_status)));
  const body=document.createElement('div');body.className='story-node-body';
  body.append(storyText('p','',context.summary || context.position_in_site || '坑位说明待补充。'));
  if(context.discovery?.date) body.append(storyText('small','',`发现时间：${context.discovery.date}（${context.discovery.date_precision === 'year' ? '年份' : '精度待核实'}）`));
  (context.sources || []).forEach(source => {const row=document.createElement('div');row.className='story-source-row';const link=storySourceLink(source);if(link)row.append(link);row.append(storyText('p','',[source.publisher,source.locator].filter(Boolean).join(' · ') || '出处定位待补充'));body.append(row);});
  details.append(summary,body);return details;
}

function renderStoryEdges(section,artifactMap) {
  const contextIds=new Set(section.context_ids || []), eventIds=new Set(section.event_ids || []), artifactIds=new Set(section.artifact_ids || []);
  const explicit=new Set(section.edge_ids || []);
  const validEdge=edge => {
    const endpoints=[edge.subject,edge.object];
    if(endpoints.some(endpoint => endpoint.type === 'artifact' && !artifactMap.has(endpoint.id))) return false;
    if(explicit.size) return explicit.has(edge.id);
    return endpoints.some(endpoint => (endpoint.type === 'context' && contextIds.has(endpoint.id)) || (endpoint.type === 'event' && eventIds.has(endpoint.id)) || (endpoint.type === 'artifact' && artifactIds.has(endpoint.id) && artifactMap.has(endpoint.id)));
  };
  return storyGraphEdges.filter(edge => edge.record_status !== 'withdrawn' && validEdge(edge));
}

function renderStoryDetail(story) {
  const article=$('#story-detail'); article.replaceChildren(); article.hidden=false;
  $('#stories-directory').hidden=true; $('#story-breadcrumb-tail').hidden=false; $('#story-breadcrumb-title').hidden=false; $('#story-breadcrumb-title').textContent=story ? story.title : '未找到专题';
  if (!story) {
    article.append(storyText('p','eyebrow','STORY NOT FOUND'));
    const notFoundHeading=storyText('h1','', '暂未找到这个专题');notFoundHeading.id='story-detail-title';article.append(notFoundHeading,storyText('p','story-not-found-copy','链接对应的专题不存在，或尚未进入专题目录。'));
    const back=document.createElement('a');back.className='button button-outline';back.href='/?page=stories';back.dataset.storiesLink='';back.textContent='返回专题目录';article.append(back);document.title='未找到专题 · 三星堆数字探索平台';return;
  }
  const artifactMap=storyArtifactMap();
  const cover=artifactMap.get(story.cover?.artifact_id);
  const header=document.createElement('header');header.className='story-detail-heading';
  const back=document.createElement('a');back.className='story-back-link';back.href='/?page=stories';back.dataset.storiesLink='';back.textContent='← 返回专题目录';
  const titleBlock=document.createElement('div');titleBlock.append(storyText('p','eyebrow','三星堆考古专题 · 展览文书'),storyText('h1','',story.title),storyText('p','story-detail-subtitle',story.subtitle),storyText('p','story-question',story.central_question),storyText('p','story-detail-intro',story.intro));
  titleBlock.querySelector('h1').id='story-detail-title';
  const state=storyText('span','story-status',archaeologyRecordStatus(story.record_status));
  header.append(back,titleBlock,state);
  const hero=document.createElement('div');hero.className='story-hero';hero.append(header);
  if(cover) hero.append(createStoryCover(cover,story.cover,'story-detail-cover'));
  else hero.append(storyText('p','story-missing-note',`封面关联 ${story.cover?.artifact_id || '（未登记）'} 未在精选300件记录中找到，已使用无图状态。`));
  article.append(hero);
  const layout=document.createElement('div');layout.className='story-reading-layout';
  const toc=document.createElement('nav');toc.className='story-toc';toc.setAttribute('aria-label','专题章节目录');toc.append(storyText('b','', '本专题章节'));
  const chapterColumn=document.createElement('div');chapterColumn.className='story-chapters';
  const sections=(Array.isArray(story.sections)?story.sections:[]).slice().sort((a,b)=>Number(a.order||0)-Number(b.order||0));
  sections.forEach((section,index) => {
    const anchor=document.createElement('a');anchor.href=`#story-${encodeURIComponent(section.id)}`;anchor.textContent=`${String(index+1).padStart(2,'0')} · ${section.title}`;toc.append(anchor);
    const chapter=document.createElement('section');chapter.className='story-chapter';chapter.id=`story-${section.id}`;chapter.setAttribute('aria-labelledby',`story-heading-${section.id}`);
    chapter.append(storyText('span','stories-overline',`CHAPTER ${String(index+1).padStart(2,'0')}`),storyText('h2','',section.title));
    const heading=chapter.querySelector('h2');heading.id=`story-heading-${section.id}`;
    String(section.body || '').split(/\n\s*\n/).filter(Boolean).forEach(paragraph => chapter.append(storyText('p','story-chapter-body',paragraph)));
    const evidenceDetails=document.createElement('details');evidenceDetails.className='story-evidence-details';
    const evidenceSummary=document.createElement('summary');evidenceSummary.textContent='展开相关器物、考古背景与资料来源';evidenceDetails.append(evidenceSummary);
    const referenced=(section.artifact_ids || []).map(id => artifactMap.get(id)).filter(Boolean);
    const missing=(section.artifact_ids || []).filter(id => !artifactMap.has(id));
    if(section.artifact_ids?.length){
      const related=document.createElement('section');related.className='story-related-section';related.append(storyText('h3','',`精选图录关联器物${referenced.length ? `（${referenced.length}）` : ''}`));
      if(referenced.length){const grid=document.createElement('div');grid.className='story-artifact-grid';grid.append(...referenced.map(createStoryArtifactCard));related.append(grid);}
      if(missing.length) related.append(storyText('p','story-missing-note',`${missing.length} 条关联 ID 未在精选300件数据中找到，已省略：${missing.join('、')}`));
      if(!artifactDataSourceLoaded) related.append(storyText('p','story-missing-note','精选300件数据暂不可用，关联器物没有用其他数据集替代。'));
      evidenceDetails.append(related);
    }
    const events=storyEventsFor(section), contexts=storyContextsFor(section);
    if(section.event_ids?.length || section.context_ids?.length){
      const archaeology=document.createElement('section');archaeology.className='story-related-section';archaeology.append(storyText('h3','', '考古背景线索'));
      if(events.length) {const group=document.createElement('div');group.className='story-node-list';group.append(...events.map(createStoryEventNode));archaeology.append(group);}
      const missingEvents=(section.event_ids || []).filter(id => !events.some(event => event.id===id));
      if(missingEvents.length) archaeology.append(storyText('p','story-missing-note',`未找到 ${missingEvents.length} 条事件引用，已省略：${missingEvents.join('、')}`));
      if(contexts.length){const group=document.createElement('div');group.className='story-node-list story-context-list';group.append(...contexts.map(createStoryContextNode));archaeology.append(group);}
      const missingContexts=(section.context_ids || []).filter(id => !contexts.some(context => context.id===id));
      if(missingContexts.length) archaeology.append(storyText('p','story-missing-note',`未找到 ${missingContexts.length} 条坑位引用，已省略：${missingContexts.join('、')}`));
      if(!events.length && !contexts.length) archaeology.append(storyText('p','story-missing-note','当前没有可用的关联事件或坑位资料；未生成替代内容。'));
      const timelineLink=document.createElement('a');timelineLink.className='story-timeline-link';timelineLink.href='/?page=timeline';timelineLink.dataset.timelineLink='';timelineLink.textContent='打开完整考古发现时间线 ↗';archaeology.append(timelineLink);evidenceDetails.append(archaeology);
    }
    const edgeRows=renderStoryEdges(section,artifactMap);
    if(edgeRows.length){
      const evidence=document.createElement('section');evidence.className='story-related-section';evidence.append(storyText('h3','', '图谱关系线索'));
      const list=document.createElement('div');list.className='story-edge-list';
      edgeRows.forEach(edge => {const row=document.createElement('article');row.className='story-edge-row';row.append(storyText('b','',`${edge.subject.label || edge.subject.id}　${edge.predicate}　${edge.object.label || edge.object.id}`),storyText('span','story-status',archaeologyRecordStatus(edge.record_status)));(edge.evidence || []).forEach(source=>{const link=storySourceLink(source);if(link)row.append(link);row.append(storyText('small','',source.locator || '出处定位待补充'));});list.append(row);});
      evidence.append(list,storyText('p','story-editorial-caveat','图谱关系保留原始审核状态；“资料待复核”关系不视为已确认事实。'));evidenceDetails.append(evidence);
    }
    if(Array.isArray(section.sources) && section.sources.length){
      const sources=document.createElement('section');sources.className='story-related-section story-chapter-sources';sources.append(storyText('h3','',`本章资料来源（${section.sources.length}）`));
      section.sources.forEach((source,sourceIndex)=>{const row=document.createElement('div');row.className='story-source-row';row.append(storyText('span','story-source-number',`〔${sourceIndex+1}〕`));const link=storySourceLink(source);if(link)row.append(link);row.append(storyText('p','',[source.locator || '出处定位待补充'].filter(Boolean).join(' · ')));sources.append(row);});evidenceDetails.append(sources);
    }
    if(evidenceDetails.children.length>1){
      evidenceSummary.textContent=`展开相关器物、考古背景与资料来源（${(section.artifact_ids||[]).length+(section.event_ids||[]).length+(section.context_ids||[]).length+(section.sources||[]).length}项）`;
      chapter.append(evidenceDetails);
    }
    chapterColumn.append(chapter);
  });
  if(!sections.length) chapterColumn.append(storyText('p','story-missing-note','此专题尚无章节内容。'));
  layout.append(toc,chapterColumn);article.append(layout);
  const related=storyRecords.filter(item=>item.slug!==story.slug);
  if(related.length){const more=document.createElement('section');more.className='related-stories';more.append(storyText('h2','', '继续阅读'));const links=document.createElement('div');links.className='related-story-links';related.forEach(item=>{const link=document.createElement('a');link.href=`/?page=stories&theme=${encodeURIComponent(item.slug)}`;link.dataset.storyLink=item.slug;link.append(storyText('b','',item.title),storyText('small','',item.central_question));links.append(link);});more.append(links);article.append(more);}
  document.title=`${story.title} · 专题叙事 · 三星堆数字探索平台`;
}

function renderStoriesPage() {
  $('#stories-loading').hidden=true; $('#stories-error').hidden=true;
  $('#stories-content').setAttribute('aria-busy','false');
  const isDetail=new URLSearchParams(window.location.search).has('theme');
  $('#stories-content').hidden=storyRecords.length===0;
  $('#stories-empty').hidden=storyRecords.length>0;
  if(!storyRecords.length) return;
  $('#stories-count').textContent=`${storyRecords.length} 个专题`;
  $('#story-directory-grid').replaceChildren(...storyRecords.map((story,index)=>createStoryDirectoryCard(story,index,storyArtifactMap())));
  $('#actual-exhibitions-list').replaceChildren(...storyExhibitions.map(item=>renderExhibitionRecord(item,storyArtifactMap())));
  if (!storyExhibitions.length) $('#actual-exhibitions-list').append(storyText('p','stories-inline-status','当前没有可展示的实体展览记录。'));
  $('#exhibition-data-status').hidden=!storyDataNotice;
  $('#exhibition-data-status').textContent=storyDataNotice;
  $('#stories-directory').hidden=isDetail;
  $('#story-detail').hidden=!isDetail;
  if(isDetail){const slug=new URLSearchParams(window.location.search).get('theme');renderStoryDetail(storyRecords.find(item=>item.slug===slug));}
  else {$('#story-breadcrumb-tail').hidden=true;$('#story-breadcrumb-title').hidden=true;document.title='专题展览 · 三星堆数字探索平台';}
}

function initializeStories() {
  $('#stories-error').hidden=true;
  if(!storyDataPromise){$('#stories-loading').hidden=false;loadStoriesData().catch(()=>{});}
  else if(storyDataLoaded) renderStoriesPage();
}

$('#stories-retry').addEventListener('click', () => {
  storyDataPromise = null;
  storyDataLoaded = false;
  storyDataNotice = '';
  $('#stories-error').hidden = true;
  $('#stories-loading').hidden = false;
  initializeStories();
});

function updateAiFoyerControls() {
  const video = $('#ai-foyer-video');
  if (!video) return;
  const playing = !video.paused && !video.ended;
  const playButton = $('#ai-foyer-play');
  playButton.textContent = playing ? '暂停' : '播放';
  playButton.setAttribute('aria-label', playing ? '暂停序厅影像' : '播放序厅影像');
  $('#ai-foyer-mute').textContent = video.muted ? '静音' : '开声';
  $('#ai-foyer-mute').setAttribute('aria-label', video.muted ? '开启序厅影像声音' : '静音序厅影像');
  $('#ai-foyer-mute').setAttribute('aria-pressed', String(video.muted));
}

function setAiFoyerPlaybackStatus(message = '') {
  $('#ai-foyer-live-status').textContent = message;
}

function activateAiFoyer() {
  const video = $('#ai-foyer-video');
  if (!video) return;
  video.loop = true;
  updateAiFoyerControls();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.autoplay = false;
    video.pause();
    setAiFoyerPlaybackStatus('已启用减少动态效果，序厅以静态封面呈现。');
    return;
  }
  const source = video.querySelector('source[data-src]');
  if (source && !source.hasAttribute('src')) {
    source.src = source.dataset.src;
    video.preload = 'auto';
    video.load();
  }
  video.autoplay = true;
  video.muted = true;
  const startPlayback = () => {
    if (!document.body.classList.contains('ai-foyer-mode')) return;
    const playback = video.play();
    if (playback && typeof playback.then === 'function') playback.then(updateAiFoyerControls).catch(() => setAiFoyerPlaybackStatus('浏览器未允许自动播放，当前显示静态封面。'));
  };
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) startPlayback();
  else video.addEventListener('canplay', startPlayback, {once:true});
}

function pauseAiFoyer() {
  const video = $('#ai-foyer-video');
  if (video && !video.paused) video.pause();
}

function resumeAiFoyer() {
  const video = $('#ai-foyer-video');
  if (!video || !document.body.classList.contains('ai-foyer-mode') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  video.loop = true;
  const playback = video.play();
  if (playback && typeof playback.catch === 'function') playback.catch(() => setAiFoyerPlaybackStatus('浏览器未允许自动续播，当前显示静态封面。'));
}

function navigateToAiExhibition() {
  const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  history.pushState({page:'ai-exhibition', room:'foyer', aiExhibitionReturn:returnUrl}, '', `${window.location.pathname}?page=ai-exhibition&room=foyer`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:'auto'});
}

function navigateToAiRoom(room) {
  const allowedRooms = new Set(['foyer', 'eye', 'tree', 'echo', 'finale']);
  if (!allowedRooms.has(room)) return;
  history.pushState({page:'ai-exhibition', room}, '', `${window.location.pathname}?page=ai-exhibition&room=${encodeURIComponent(room)}`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:'auto'});
}

function renderCurrentRoute() {
  let params = new URLSearchParams(window.location.search);
  if (!authReady) {
    $('#home-view').hidden = true;
    $('#login-view').hidden = false;
    document.body.classList.add('login-page-mode');
    document.title = '登录 · 三星堆数字探索平台';
    return;
  }
  const isLoginRequest = !params.has('artifact') && params.get('page') === 'login';
  if (!authenticatedUser && !isLoginRequest) {
    history.replaceState({page:'login'}, '', `${window.location.pathname}?page=login`);
    params = new URLSearchParams('page=login');
  }
  const slug = params.get('artifact');
  const isList = slug === null && params.get('page') === 'artifacts';
  const isTimeline = slug === null && params.get('page') === 'timeline';
  const isStories = slug === null && params.get('page') === 'stories';
  const isGraph = slug === null && params.get('page') === 'graph';
  const isFieldwork = slug === null && params.get('page') === 'fieldwork';
  const isLearningOrigins = slug === null && params.get('page') === 'learning' && params.get('path') === 'origins';
  const isLearningFramework = slug === null && params.get('page') === 'learning' && params.get('path') === 'framework';
  const isLearningPits = slug === null && params.get('page') === 'learning' && params.get('path') === 'pits';
  const isLearningConnections = slug === null && params.get('page') === 'learning' && params.get('path') === 'connections';
  const isQa = slug === null && params.get('page') === 'qa';
  const isLogin = slug === null && params.get('page') === 'login';
  const isAccount = slug === null && params.get('page') === 'account';
  const isAccountRecords = slug === null && params.get('page') === 'account-records';
  const isAccountPage = isAccount || isAccountRecords;
  const aiRoom = params.get('room') || 'foyer';
  const isAiExhibition = slug === null && params.get('page') === 'ai-exhibition' && ['foyer','eye','tree','echo','finale'].includes(aiRoom);
  const isAiFoyer = isAiExhibition && aiRoom === 'foyer';
  const isAiEye = isAiExhibition && aiRoom === 'eye';
  const isAiTree = isAiExhibition && aiRoom === 'tree';
  const isAiEcho = isAiExhibition && aiRoom === 'echo';
  const isAiFinale = isAiExhibition && aiRoom === 'finale';
  const detailView = $('#artifact-detail-view');
  const indexView = $('#artifact-index-view');
  const timelineView = $('#timeline-view');
  const storiesView = $('#stories-view');
  const graphView = $('#graph-view');
  const fieldworkView = $('#fieldwork-view');
  const learningOriginsView = $('#learning-origins-view');
  const learningFrameworkView = $('#learning-framework-view');
  const learningPitsView = $('#learning-pits-view');
  const learningConnectionsView = $('#learning-connections-view');
  const aiExhibitionView = $('#ai-exhibition-view');
  const aiEyeView = $('#ai-eye-room');
  const aiTreeView = $('#ai-tree-room');
  const aiEchoView = $('#ai-echo-room');
  const aiFinaleView = $('#ai-finale-room');
  const qaView = $('#qa-view');
  const loginView = $('#login-view');
  const accountView = $('#account-view');
  const accountRecordsView = $('#account-records-view');
  const homeView = $('#home-view');
  const isDetail = slug !== null;
  const wasFieldwork = document.body.classList.contains('fieldwork-page-mode');
  const wasLearningOrigins = document.body.classList.contains('learning-origins-mode');
  const wasLearningFramework = document.body.classList.contains('learning-framework-mode');
  const wasLearningPits = document.body.classList.contains('learning-pits-mode');
  const wasLearningConnections = document.body.classList.contains('learning-connections-mode');
  const wasAiFoyer = document.body.classList.contains('ai-foyer-mode');
  const wasAiEye = document.body.classList.contains('ai-eye-room-mode');
  const wasAiTree = document.body.classList.contains('ai-tree-room-mode');
  const wasAiEcho = document.body.classList.contains('ai-echo-room-mode');
  const wasAiFinale = document.body.classList.contains('ai-finale-room-mode');
  const wasAccount = document.body.classList.contains('account-profile-page-mode');
  const wasAccountRecords = document.body.classList.contains('account-records-page-mode');
  homeView.hidden = isDetail || isList || isTimeline || isStories || isGraph || isFieldwork || isLearningOrigins || isLearningFramework || isLearningPits || isLearningConnections || isAiExhibition || isQa || isLogin || isAccountPage;
  qaView.hidden = !isQa;
  loginView.hidden = !isLogin;
  accountView.hidden = !isAccount;
  accountRecordsView.hidden = !isAccountRecords;
  document.body.classList.toggle('login-page-mode', isLogin);
  document.body.classList.toggle('account-page-mode', isAccountPage);
  document.body.classList.toggle('account-profile-page-mode', isAccount);
  document.body.classList.toggle('account-records-page-mode', isAccountRecords);
  document.title = isLogin ? '登录 · 三星堆数字探索平台' : isAccountRecords ? '我的记录 · 三星堆数字探索平台' : isAccount ? '个人账号 · 三星堆数字探索平台' : '三星堆 · 古蜀文明数字探索平台';
  if ((isAccount && !wasAccount) || (isAccountRecords && !wasAccountRecords)) loadAccountStorage(isAccountRecords);
  indexView.hidden = !isList;
  timelineView.hidden = !isTimeline;
  storiesView.hidden = !isStories;
  graphView.hidden = !isGraph;
  fieldworkView.hidden = !isFieldwork;
  learningOriginsView.hidden = !isLearningOrigins;
  learningFrameworkView.hidden = !isLearningFramework;
  learningPitsView.hidden = !isLearningPits;
  learningConnectionsView.hidden = !isLearningConnections;
  aiExhibitionView.hidden = !isAiFoyer;
  aiEyeView.hidden = !isAiEye;
  aiTreeView.hidden = !isAiTree;
  aiEchoView.hidden = !isAiEcho;
  aiFinaleView.hidden = !isAiFinale;
  detailView.hidden = !isDetail;
  document.body.classList.toggle('detail-mode', isDetail);
  document.body.classList.toggle('artifact-index-mode', isList);
  document.body.classList.toggle('timeline-mode', isTimeline);
  document.body.classList.toggle('stories-mode', isStories);
  document.body.classList.toggle('graph-mode', isGraph);
  document.body.classList.toggle('fieldwork-page-mode', isFieldwork);
  document.body.classList.toggle('learning-origins-mode', isLearningOrigins);
  document.body.classList.toggle('learning-framework-mode', isLearningFramework);
  document.body.classList.toggle('learning-pits-mode', isLearningPits);
  document.body.classList.toggle('learning-connections-mode', isLearningConnections);
  document.body.classList.toggle('ai-exhibition-mode', isAiExhibition);
  document.body.classList.toggle('ai-foyer-mode', isAiFoyer);
  document.body.classList.toggle('ai-eye-room-mode', isAiEye);
  document.body.classList.toggle('ai-tree-room-mode', isAiTree);
  document.body.classList.toggle('ai-echo-room-mode', isAiEcho);
  document.body.classList.toggle('ai-finale-room-mode', isAiFinale);
  document.body.classList.toggle('qa-mode', isQa);
  if (isAiFoyer && !wasAiFoyer) {
    const enterButton = $('#ai-foyer-enter');
    enterButton.disabled = false;
    enterButton.innerHTML = '<span>进入以目观天</span><i aria-hidden="true">↗</i>';
    $('#ai-foyer-live-status').textContent = '';
    activateAiFoyer();
  }
  if (!isAiFoyer && wasAiFoyer) pauseAiFoyer();
  if (isAiEye && !wasAiEye) window.dispatchEvent(new Event('ai-eye-room:activate'));
  if (!isAiEye && wasAiEye) window.dispatchEvent(new Event('ai-eye-room:deactivate'));
  if (isAiTree && !wasAiTree) window.dispatchEvent(new Event('ai-tree-room:activate'));
  if (!isAiTree && wasAiTree) window.dispatchEvent(new Event('ai-tree-room:deactivate'));
  if (isAiEcho && !wasAiEcho) window.dispatchEvent(new Event('ai-echo-room:activate'));
  if (!isAiEcho && wasAiEcho) window.dispatchEvent(new Event('ai-echo-room:deactivate'));
  if (isAiFinale && !wasAiFinale) window.dispatchEvent(new Event('ai-finale-room:activate'));
  if (!isAiFinale && wasAiFinale) window.dispatchEvent(new Event('ai-finale-room:deactivate'));
  if (isFieldwork && !wasFieldwork) enterFieldworkPage();
  if (!isFieldwork && wasFieldwork) window.dispatchEvent(new Event('fieldwork:deactivate'));
  if (isLearningOrigins && !wasLearningOrigins) window.dispatchEvent(new Event('learning-origins:activate'));
  if (!isLearningOrigins && wasLearningOrigins) window.dispatchEvent(new Event('learning-origins:deactivate'));
  if (isLearningFramework && !wasLearningFramework) window.dispatchEvent(new Event('learning-framework:activate'));
  if (!isLearningFramework && wasLearningFramework) window.dispatchEvent(new Event('learning-framework:deactivate'));
  if (isLearningPits && !wasLearningPits) window.dispatchEvent(new Event('learning-pits:activate'));
  if (!isLearningPits && wasLearningPits) window.dispatchEvent(new Event('learning-pits:deactivate'));
  if (isLearningConnections && !wasLearningConnections) window.dispatchEvent(new Event('learning-connections:activate'));
  const previousAssistantPath=wasLearningFramework?'framework':wasLearningPits?'pits':wasLearningConnections?'connections':'';
  const nextAssistantPath=isLearningFramework?'framework':isLearningPits?'pits':isLearningConnections?'connections':'';
  if(previousAssistantPath&&previousAssistantPath!==nextAssistantPath)window.dispatchEvent(new CustomEvent('learning-assistant:deactivate',{detail:{path:previousAssistantPath}}));
  if(nextAssistantPath&&nextAssistantPath!==previousAssistantPath)window.dispatchEvent(new CustomEvent('learning-assistant:activate',{detail:{path:nextAssistantPath}}));
  const artifactsNav = $('[data-artifacts-nav]');
  if (artifactsNav) {
    if (isList) artifactsNav.setAttribute('aria-current','page');
    else artifactsNav.removeAttribute('aria-current');
  }
  const timelineNav = $('[data-timeline-nav]');
  if (timelineNav) {
    if (isTimeline) timelineNav.setAttribute('aria-current','page');
    else timelineNav.removeAttribute('aria-current');
  }
  const storiesNav = $('[data-stories-nav]');
  if (storiesNav) {
    if (isStories) storiesNav.setAttribute('aria-current','page');
    else storiesNav.removeAttribute('aria-current');
  }
  const graphNav = $('[data-graph-nav]');
  if (graphNav) {
    if (isGraph) graphNav.setAttribute('aria-current','page');
    else graphNav.removeAttribute('aria-current');
  }
  const fieldworkNav = $('[data-fieldwork-nav]');
  if (fieldworkNav) {
    if (isFieldwork) fieldworkNav.setAttribute('aria-current','page');
    else fieldworkNav.removeAttribute('aria-current');
  }
  const learningNav = $('[data-learning-nav]');
  if (learningNav) {
    if (isLearningOrigins || isLearningFramework || isLearningPits || isLearningConnections) learningNav.setAttribute('aria-current','page');
    else learningNav.removeAttribute('aria-current');
  }
  const qaNav = $('[data-qa-nav]');
  if (qaNav) {
    if (isQa) qaNav.setAttribute('aria-current','page');
    else qaNav.removeAttribute('aria-current');
  }
  if (isDetail) {
    const known = artifactList.some(item => item.slug === slug);
    if (known) renderArtifactDetail(slug);
    else {
      $('#detail-layout').hidden = true;
      $('#detail-not-found').hidden = false;
      $('#detail-not-found').querySelector('h1').textContent = '正在读取器物资料';
      $('#detail-not-found').querySelector('p:not(.eyebrow)').textContent = '正在检查本地数据目录中的器物记录。';
      document.title = '读取器物资料 · 三星堆数字探索平台';
      loadArtifactData().then(() => {
        if (new URLSearchParams(window.location.search).get('artifact') === slug) renderArtifactDetail(slug);
      }).catch(() => {
        if (new URLSearchParams(window.location.search).get('artifact') !== slug) return;
        $('#detail-not-found').querySelector('h1').textContent = '器物数据暂时无法读取';
        $('#detail-not-found').querySelector('p:not(.eyebrow)').textContent = '无法确认此链接对应的记录。请检查 /data/ 数据目录后重试。';
      });
    }
  } else if (isList) {
    document.title = '文物百科 · 三星堆数字探索平台';
    initializeArtifactIndex();
  } else if (isTimeline) {
    document.title = '考古发现时间线 · 三星堆数字探索平台';
    initializeArchaeologyTimeline();
  } else if (isStories) {
    initializeStories();
  } else if (isGraph) {
    document.title = '祭祀坑位探索 · 三星堆数字探索平台';
    initializeKnowledgeGraph();
  } else if (isFieldwork) {
    document.title = '互动考古 · 三星堆数字探索平台';
  } else if (isLearningOrigins) {
    document.title = '发现与命名 · 研学中心 · 三星堆数字探索平台';
  } else if (isLearningFramework) {
    document.title = '年代、文化与古城 · 研学中心 · 三星堆数字探索平台';
  } else if (isLearningPits) {
    document.title = '器物坑与雕像 · 研学中心 · 三星堆数字探索平台';
  } else if (isLearningConnections) {
    document.title = '工艺、金沙与“蜀” · 研学中心 · 三星堆数字探索平台';
  } else if (isQa) {
    document.title = '三星堆资料问答 · RAG 知识问答';
  } else if (isAiExhibition) {
    document.title = isAiFoyer ? '文明将醒 · 三星堆 AI 艺术想象展' : isAiEye ? '以目观天 · 三星堆 AI 艺术想象展' : isAiTree ? '神树探索厅 · 三星堆 AI 艺术想象展' : isAiEcho ? '人神之间 · 器物回响 · 三星堆 AI 艺术想象展' : '文明回声 · 三星堆 AI 艺术想象展';
  } else {
    document.title = '三星堆 · 古蜀文明数字探索平台';
    initializeHomeArtifacts();
    if (!storyDataPromise) loadStoriesData().catch(() => {});
  }
  window.dispatchEvent(new Event('learning-progress:refresh'));
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

function navigateToLogin() {
  history.pushState({page:'login'}, '', `${window.location.pathname}?page=login`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:'auto'});
  $('#login-username').focus({preventScroll:true});
}

async function navigateToAccount() {
  await window.AccountData?.flushAll();
  history.pushState({page:'account'}, '', `${window.location.pathname}?page=account`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:'auto'});
}

function navigateToQa(question = '') {
  qaPendingQuestion = question;
  try { sessionStorage.setItem('sxd-rag-pending-question', question); } catch {}
  history.pushState({page:'qa'}, '', `${window.location.pathname}?page=qa`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:'auto'});
  activateQaPage();
}

function navigateToArtifacts() {
  history.pushState({page:'artifacts'}, '', `${window.location.pathname}?page=artifacts`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function navigateToTimeline() {
  history.pushState({page:'timeline'}, '', `${window.location.pathname}?page=timeline`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function navigateToStories(theme = '') {
  const query = theme ? `?page=stories&theme=${encodeURIComponent(theme)}` : '?page=stories';
  history.pushState({page:'stories',theme}, '', `${window.location.pathname}${query}`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function navigateToGraph() {
  history.pushState({page:'graph'}, '', `${window.location.pathname}?page=graph`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function navigateToLearningOrigins() {
  history.pushState({page:'learning',path:'origins'}, '', `${window.location.pathname}?page=learning&path=origins`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function navigateToLearningFramework() {
  history.pushState({page:'learning',path:'framework'}, '', `${window.location.pathname}?page=learning&path=framework`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function navigateToLearningPits() {
  history.pushState({page:'learning',path:'pits'}, '', `${window.location.pathname}?page=learning&path=pits`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function navigateToLearningConnections() {
  history.pushState({page:'learning',path:'connections'}, '', `${window.location.pathname}?page=learning&path=connections`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function navigateToFieldwork() {
  history.pushState({page:'fieldwork'}, '', `${window.location.pathname}?page=fieldwork`);
  renderCurrentRoute();
  window.scrollTo({top:0, behavior:'auto'});
}

let fieldworkPagePromise = null;
async function enterFieldworkPage() {
  const mount = $('#fieldwork-page-content');
  const status = $('#fieldwork-page-loading');
  try {
    if (!mount.dataset.loaded) {
      status.hidden = false;
      status.textContent = '正在打开互动考古页面…';
      if (!fieldworkPagePromise) {
        fieldworkPagePromise = fetch('./fieldwork-page.html').then(response => {
          if (!response.ok) throw new Error(`页面文件读取失败（HTTP ${response.status}）`);
          return response.text();
        }).then(markup => { mount.innerHTML = markup; mount.dataset.loaded = 'true'; });
      }
      await fieldworkPagePromise;
      await import('./fieldwork.js');
    }
    if (new URLSearchParams(window.location.search).get('page') !== 'fieldwork') return;
    status.hidden = true;
    window.dispatchEvent(new Event('fieldwork:activate'));
  } catch (error) {
    fieldworkPagePromise = null;
    status.hidden = false;
    status.replaceChildren();
    const title = document.createElement('b'); title.textContent = '互动考古页面暂时无法打开';
    const detail = document.createElement('span'); detail.textContent = error?.message || '请检查本地页面文件后重试。';
    const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'button button-outline'; retry.id = 'fieldwork-page-retry'; retry.textContent = '重试';
    status.append(title, detail, retry);
    $('#fieldwork-page-retry')?.addEventListener('click', () => { status.innerHTML = '正在重试打开互动考古页面…'; enterFieldworkPage(); });
  }
}

$('#ai-foyer-video').addEventListener('play', () => {
  $('#ai-foyer-video-error').hidden = true;
  $('#ai-foyer-live-status').textContent = '';
  updateAiFoyerControls();
});
$('#ai-foyer-video').addEventListener('pause', updateAiFoyerControls);
$('#ai-foyer-video').addEventListener('error', () => {
  $('#ai-foyer-video-error').hidden = false;
  setAiFoyerPlaybackStatus('序厅影像暂时无法播放，当前显示静态封面。');
});
$('#ai-foyer-enter').addEventListener('click', () => {
  navigateToAiRoom('eye');
});
$('#ai-foyer-play').addEventListener('click', () => {
  const video = $('#ai-foyer-video');
  if (video.paused) {
    const source = video.querySelector('source[data-src]');
    if (source && !source.hasAttribute('src')) {
      source.src = source.dataset.src;
      video.preload = 'auto';
      video.load();
    }
    const startPlayback = () => {
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') playback.catch(() => setAiFoyerPlaybackStatus('影像暂时无法播放，当前显示静态封面。'));
    };
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) startPlayback();
    else video.addEventListener('canplay', startPlayback, {once:true});
  } else video.pause();
});
$('#ai-foyer-mute').addEventListener('click', () => {
  const video = $('#ai-foyer-video');
  video.muted = !video.muted;
  updateAiFoyerControls();
});
$('#ai-foyer-fullscreen').addEventListener('click', async () => {
  const room = $('#ai-exhibition-view');
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await room.requestFullscreen();
  } catch {
    $('#ai-foyer-live-status').textContent = '当前浏览器未允许进入全屏。';
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAiFoyer(); else resumeAiFoyer(); });
window.addEventListener('pagehide', pauseAiFoyer);

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
  const qaLink = event.target.closest('[data-qa-link]');
  if (qaLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToQa();
    return;
  }
  const aiRoomLink = event.target.closest('[data-ai-room-link]');
  if (aiRoomLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToAiRoom(aiRoomLink.dataset.aiRoomLink);
    return;
  }
  const eyeUnavailable = event.target.closest('[data-eye-unavailable]');
  if (eyeUnavailable) {
    navigateToAiRoom(eyeUnavailable.dataset.eyeUnavailable === 'tree' ? 'tree' : 'echo');
    return;
  }
  const aiExhibitionLink = event.target.closest('[data-ai-exhibition-link]');
  if (aiExhibitionLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToAiExhibition();
    return;
  }
  const aiExhibitionBack = event.target.closest('[data-ai-exhibition-back]');
  if (aiExhibitionBack && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    if (history.state?.aiExhibitionReturn) history.back();
    else navigateToHome('');
    return;
  }
  const artifactLink = event.target.closest('[data-artifact-index-link]');
  if (artifactLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToArtifact(artifactLink.dataset.artifactIndexLink);
    return;
  }
  const listLink = event.target.closest('[data-artifact-list-link]');
  if (listLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToArtifacts();
    return;
  }
  const timelineLink = event.target.closest('[data-timeline-link]');
  if (timelineLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToTimeline();
    return;
  }
  const storyLink = event.target.closest('[data-story-link]');
  if (storyLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToStories(storyLink.dataset.storyLink);
    return;
  }
  const storiesLink = event.target.closest('[data-stories-link]');
  if (storiesLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToStories();
    return;
  }
  const graphLink = event.target.closest('[data-graph-link]');
  if (graphLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToGraph();
    return;
  }
  const fieldworkLink = event.target.closest('[data-fieldwork-link]');
  if (fieldworkLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToFieldwork();
    return;
  }
  const learningLink = event.target.closest('[data-learning-link]');
  if (learningLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToLearningOrigins();
    return;
  }
  const learningFrameworkLink = event.target.closest('[data-learning-framework-link]');
  if (learningFrameworkLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToLearningFramework();
    return;
  }
  const learningPitsLink = event.target.closest('[data-learning-pits-link]');
  if (learningPitsLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToLearningPits();
    return;
  }
  const learningConnectionsLink = event.target.closest('[data-learning-connections-link]');
  if (learningConnectionsLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToLearningConnections();
    return;
  }
  const homeLink = event.target.closest('[data-home-link]');
  if (homeLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    navigateToHome('');
    return;
  }
  const storyTocLink = event.target.closest('.story-toc a[href^="#"]');
  if (storyTocLink) {
    event.preventDefault();
    document.getElementById(decodeURIComponent(storyTocLink.getAttribute('href').slice(1)))?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    return;
  }
  const link = event.target.closest('a[href^="#"]');
  if (!link || !$('#home-view').hidden) return;
  const anchor = link.getAttribute('href').slice(1);
  if (anchor === 'sources') return;
  event.preventDefault();
  navigateToHome(anchor === 'top' ? '' : anchor);
});
window.addEventListener('popstate', () => {
  renderCurrentRoute();
  if (new URLSearchParams(window.location.search).get('page') === 'qa') activateQaPage();
  else if (qaRequest) qaRequest.abort();
  if (!new URLSearchParams(window.location.search).has('artifact') && window.location.hash) {
    requestAnimationFrame(() => document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView());
  }
});
renderCurrentRoute();
$('[data-modal-ask]').addEventListener('click', () => {
  closeDialog($('#artifact-modal'));
  openGuide();
  $('#guide-input').value = `带我去看${$('#artifact-title').textContent}的相关页面`;
  $('#guide-input').focus();
});

function updateGallery(step) {
  galleryIndex = (galleryIndex + step + galleryItems.length) % galleryItems.length;
  const item = galleryItems[galleryIndex];
  const image = $('#gallery-image');
  const stage = $('.gallery-stage');
  stage.classList.remove('gallery-zoomed');
  $('[data-gallery-zoom]').setAttribute('aria-pressed', 'false');
  $('[data-gallery-zoom]').textContent = '＋ 放大影像';
  image.style.opacity = '0';
  setTimeout(() => {
    image.src = item.image.src;
    image.alt = item.image.alt;
    image.style.opacity = '1';
  }, 140);
  $('#gallery-current').textContent = String(galleryIndex + 1).padStart(2, '0');
  $('#gallery-number').innerHTML = `${String(galleryIndex + 1).padStart(2, '0')} <i> / ${String(galleryItems.length).padStart(2, '0')}</i>`;
  $('#gallery-title').textContent = item.name;
  $('#gallery-subtitle').textContent = `${item.period} · ${item.excavation}`;
  $('#gallery-credit').textContent = `${item.image.author} · ${item.image.license}`;
  $('#gallery-source').href = item.image.sourceUrl;
  $('#gallery-description').textContent = item.intro;
  $('#gallery-caveat').textContent = item.interpretation;
  $$('[data-gallery-index]').forEach((button, index) => {
    const selected = index === galleryIndex;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
$$('[data-gallery-step]').forEach(button => button.addEventListener('click', () => updateGallery(Number(button.dataset.galleryStep))));
$$('[data-gallery-index]').forEach(button => button.addEventListener('click', () => {
  const index = Number(button.dataset.galleryIndex);
  updateGallery(index - galleryIndex);
}));
$('[data-gallery-zoom]').addEventListener('click', event => {
  const zoomed = $('.gallery-stage').classList.toggle('gallery-zoomed');
  event.currentTarget.setAttribute('aria-pressed', String(zoomed));
  event.currentTarget.textContent = zoomed ? '− 还原影像' : '＋ 放大影像';
});
$('[data-gallery-record]').addEventListener('click', () => navigateToArtifact(galleryItems[galleryIndex].key));
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
  $('#form-status').textContent = '';
  $('#form-status').classList.remove('is-error');
  $('#guide-suggestions').replaceChildren();
  openGuide();
}));
$$('[data-close-guide]').forEach(button => button.addEventListener('click', closeGuide));
$$('[data-prompt]').forEach(button => button.addEventListener('click', () => {
  $('#guide-input').value = button.dataset.prompt;
  $('#form-status').textContent = '';
  $('#form-status').classList.remove('is-error');
  $('#guide-suggestions').replaceChildren();
  $('#guide-input').focus();
}));

const guideTargetLabels = {
  home:'首页', artifacts:'文物百科', timeline:'考古发现时间线', stories:'专题展览', graph:'坑位空间探索',
  fieldwork:'互动考古', learning_origins:'研学：发现与命名', learning_framework:'研学：年代、文化与古城',
  learning_pits:'研学：器物坑与雕像', learning_connections:'研学：工艺、金沙与蜀', exhibition:'数字展厅',
  ai_foyer:'AI 艺术展序厅', ai_eye:'AI 艺术展：以目观天', ai_tree:'AI 艺术展：神树探索厅',
  ai_echo:'AI 艺术展：人神之间', ai_finale:'AI 艺术展：文明回声'
};

function guideArtifactCandidates(query) {
  const normalizedQuery = query.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  if (!normalizedQuery) return [];
  return artifactList.map(item => {
    const name = String(item?.name || item?.title || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    if (name.length < 2) return null;
    let score = normalizedQuery.includes(name) || name.includes(normalizedQuery) ? 1000 + name.length : 0;
    if (!score && name.length >= 3) {
      let matched = 0;
      for (let index = 0; index < name.length - 1; index++) if (normalizedQuery.includes(name.slice(index, index + 2))) matched++;
      score = matched >= 2 ? matched / (name.length - 1) : 0;
    }
    return score > 0 && item.slug ? {slug:item.slug,name:item.name || item.title,category:item.category || item.index?.category || '' ,score} : null;
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6).map(({slug,name,category}) => ({slug,name,category}));
}

function currentGuidePage() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('artifact')) return `artifact:${params.get('artifact')}`;
  const page = params.get('page') || 'home';
  if (page === 'learning') return `${page}:${params.get('path') || ''}`;
  if (page === 'ai-exhibition') return `${page}:${params.get('room') || 'foyer'}`;
  return page;
}

function navigateGuideTarget(target) {
  if (target.startsWith('artifact_')) {
    const slug = target.slice('artifact_'.length);
    const item = artifactList.find(record => record.slug === slug);
    if (!item) return false;
    closeGuide();
    navigateToArtifact(item.slug);
    return true;
  }
  const actions = {
    home:() => navigateToHome(''),
    artifacts:navigateToArtifacts,
    timeline:navigateToTimeline,
    stories:() => navigateToStories(),
    graph:navigateToGraph,
    fieldwork:navigateToFieldwork,
    learning_origins:navigateToLearningOrigins,
    learning_framework:navigateToLearningFramework,
    learning_pits:navigateToLearningPits,
    learning_connections:navigateToLearningConnections,
    exhibition:() => navigateToHome('exhibition'),
    ai_foyer:() => navigateToAiRoom('foyer'),
    ai_eye:() => navigateToAiRoom('eye'),
    ai_tree:() => navigateToAiRoom('tree'),
    ai_echo:() => navigateToAiRoom('echo'),
    ai_finale:() => navigateToAiRoom('finale')
  };
  if (!Object.hasOwn(actions, target)) return false;
  closeGuide();
  actions[target]();
  return true;
}

function showGuideSuggestions(suggestions) {
  const container = $('#guide-suggestions');
  container.replaceChildren();
  for (const suggestion of suggestions) {
    const target = suggestion?.id;
    let label = guideTargetLabels[target];
    if (typeof target === 'string' && target.startsWith('artifact_')) {
      const record = artifactList.find(item => item.slug === target.slice('artifact_'.length));
      label = record?.name || '';
    }
    if (!label) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guide-suggestion';
    button.dataset.guideTarget = target;
    const confidence = Number(suggestion?.confidence);
    button.textContent = Number.isFinite(confidence) && confidence > 0
      ? `前往${label} · ${Math.round(confidence * 100)}%`
      : `前往${label}`;
    container.append(button);
  }
}

$('#guide-suggestions').addEventListener('click', event => {
  const button = event.target.closest('[data-guide-target]');
  if (button && !navigateGuideTarget(button.dataset.guideTarget)) $('#form-status').textContent = '这个页面目标当前不可用，请重新输入。';
});

$('#guide-form').addEventListener('submit', async event => {
  event.preventDefault();
  const status = $('#form-status');
  const question = $('#guide-input').value.trim();
  const button = $('#guide-form button[type="submit"]');
  const suggestions = $('#guide-suggestions');
  suggestions.replaceChildren();
  status.classList.remove('is-error');
  if (!question) { status.textContent = '请先输入想查看的内容。'; return; }
  status.textContent = '正在判断要打开的页面…';
  button.disabled = true;
  try {
    const response = await fetch('/api/guide/navigate', {
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({question,currentPage:currentGuidePage(),artifacts:guideArtifactCandidates(question)})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || '导览服务暂时不可用，请稍后重试。');
    showGuideSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
    status.textContent = payload.message || '请从相关页面中选择一个。';
  } catch (error) {
    status.textContent = error.message || '导览服务暂时不可用，请稍后重试。';
    status.classList.add('is-error');
  } finally {
    button.disabled = false;
  }
});

$$('[data-home-example]').forEach(button => button.addEventListener('click', () => {
  $('#home-question').value = button.dataset.homeExample;
  $('#home-question').focus();
}));
const QA_SESSIONS_STORAGE_KEY = 'sanxingdui.qa.sessions.v1';
const QA_ACTIVE_SESSION_STORAGE_KEY = 'sanxingdui.qa.active-session.v1';

function createQaSessionRecord() {
  return {id:`qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,title:'新会话',updatedAt:Date.now(),messages:[]};
}

function loadQaSessions() {
  try {
    const stored = JSON.parse(localStorage.getItem(QA_SESSIONS_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter(session => session && typeof session.id === 'string' && Array.isArray(session.messages)).map(session => ({
      id:session.id,
      title:typeof session.title === 'string' && session.title.trim() ? session.title : '新会话',
      updatedAt:Number(session.updatedAt) || Date.now(),
      messages:session.messages.filter(turn => turn && ['user','assistant'].includes(turn.role) && typeof turn.content === 'string').map(turn => ({...turn})),
    }));
  } catch {
    return [];
  }
}

let qaSessions = loadQaSessions();
if (!qaSessions.length) qaSessions = [createQaSessionRecord()];
let qaActiveSessionId = '';
try { qaActiveSessionId = localStorage.getItem(QA_ACTIVE_SESSION_STORAGE_KEY) || ''; } catch {}
if (!qaSessions.some(session => session.id === qaActiveSessionId)) qaActiveSessionId = qaSessions[0].id;
let qaConversation = qaSessions.find(session => session.id === qaActiveSessionId).messages;
let qaRequest = null;
let qaInitialized = false;
let qaPendingQuestion = '';
let qaAccountUserId = null;
let qaHydration = null;

function persistQaSessions() {
  if (window.AccountData?.authenticated) {
    for (const session of qaSessions) void window.AccountData.save('qa_sessions',session.id,session);
    void window.AccountData.save('qa_settings','active_session',{id:qaActiveSessionId});
    return;
  }
  try {
    localStorage.setItem(QA_SESSIONS_STORAGE_KEY, JSON.stringify(qaSessions));
    localStorage.setItem(QA_ACTIVE_SESSION_STORAGE_KEY, qaActiveSessionId);
  } catch (error) {
    console.warn('问答会话无法保存到当前浏览器。', error);
  }
}

function activeQaSession() {
  return qaSessions.find(session => session.id === qaActiveSessionId) || qaSessions[0];
}

function renderQaSessions() {
  const list = $('#qa-session-list');
  if (!list) return;
  list.replaceChildren();
  [...qaSessions].sort((a, b) => b.updatedAt - a.updatedAt).forEach(session => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `qa-session-tab${session.id === qaActiveSessionId ? ' is-active' : ''}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(session.id === qaActiveSessionId));
    button.disabled = Boolean(qaRequest);
    button.textContent = session.title;
    button.title = session.title;
    button.addEventListener('click', () => {
      if (qaRequest || session.id === qaActiveSessionId) return;
      qaActiveSessionId = session.id;
      qaConversation = session.messages;
      persistQaSessions();
      renderQaSessions();
      renderQaTranscript();
      $('#qa-status').textContent = qaConversation.length ? '已切换会话，可以继续提问。' : '';
      $('#qa-status').classList.remove('is-error');
      $('#qa-clear').hidden = qaConversation.length === 0;
    });
    list.append(button);
  });
  $('#qa-new-session').disabled = Boolean(qaRequest);
}

function startNewQaSession() {
  if (qaRequest) return;
  const session = createQaSessionRecord();
  qaSessions.push(session);
  qaActiveSessionId = session.id;
  qaConversation = session.messages;
  persistQaSessions();
  renderQaSessions();
  renderQaTranscript();
  $('#qa-status').textContent = '';
  $('#qa-status').classList.remove('is-error');
  $('#qa-clear').hidden = true;
  $('#qa-question').focus();
}

function renderQaAnswer(container, text) {
  const normalized = String(text || '')
    .trim()
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\s*\n\s*(?=(?:[-*•]\s+|\d+[.、)]\s+))/g, '\n\n');
  const paragraphs = normalized.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean);
  container.replaceChildren();
  for (const value of paragraphs) {
    const paragraph = document.createElement('p');
    const plain = value.replace(/^\s*(?:[-*•]\s+|\d+[.、)]\s+)/, '').replace(/\n+/g, ' ');
    const pieces = plain.split(/(\*\*[^*]+\*\*)/g);
    for (const piece of pieces) {
      const bold = piece.match(/^\*\*(.+)\*\*$/);
      if (bold) {
        const strong = document.createElement('strong');
        strong.textContent = bold[1];
        paragraph.append(strong);
      } else if (piece) {
        paragraph.append(document.createTextNode(piece.replace(/\*\*/g, '')));
      }
    }
    container.append(paragraph);
  }
}

function renderQaTranscript() {
  const transcript = $('#qa-transcript');
  transcript.replaceChildren();
  for (const turn of qaConversation) {
    const message = document.createElement('article');
    message.className = `qa-message is-${turn.role}`;
    const label = document.createElement('b');
    label.textContent = turn.role === 'user' ? '你' : '三星堆资料助手';
    const content = turn.role === 'assistant' ? document.createElement('div') : document.createElement('p');
    if (turn.role === 'assistant') {
      content.className = 'qa-answer';
      renderQaAnswer(content, turn.content);
    } else content.textContent = turn.content;
    message.append(label, content);
    if (turn.role === 'assistant') appendQaEvidence(message, turn);
    transcript.append(message);
  }
  $('#qa-welcome').hidden = qaConversation.length > 0;
  transcript.scrollTop = transcript.scrollHeight;
}

function appendQaEvidence(message, turn) {
  const citations = Array.isArray(turn.citations) ? turn.citations : [];
  if (citations.length) {
    const sourceSection = document.createElement('section');
    sourceSection.className = 'qa-evidence';
    const heading = document.createElement('div');
    heading.className = 'qa-evidence-heading';
    const title = document.createElement('b');
    title.textContent = '检索证据';
    const counter = document.createElement('span');
    counter.className = 'qa-evidence-counter';
    heading.append(title, counter);
    const card = document.createElement('article');
    card.className = 'qa-source-card';
    const cardMeta = document.createElement('div');
    cardMeta.className = 'qa-source-card-meta';
    const sourceNumber = document.createElement('span');
    sourceNumber.className = 'qa-source-number';
    const sourceStatus = document.createElement('span');
    sourceStatus.className = 'qa-source-status';
    cardMeta.append(sourceNumber, sourceStatus);
    const sourceTitle = document.createElement('h3');
    const locator = document.createElement('p');
    locator.className = 'qa-source-locator';
    const excerpt = document.createElement('p');
    excerpt.className = 'qa-source-excerpt';
    const note = document.createElement('p');
    note.className = 'qa-source-note';
    card.append(cardMeta, sourceTitle, locator, excerpt, note);
    const controls = document.createElement('div');
    controls.className = 'qa-source-controls';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'qa-source-step';
    previous.setAttribute('aria-label', '上一条证据');
    previous.textContent = '←';
    const indicators = document.createElement('div');
    indicators.className = 'qa-source-indicators';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'qa-source-step';
    next.setAttribute('aria-label', '下一条证据');
    next.textContent = '→';
    controls.append(previous, indicators, next);
    sourceSection.append(heading, card, controls);

    let activeIndex = 0;
    const renderCard = () => {
      const citation = citations[activeIndex];
      counter.textContent = `${activeIndex + 1} / ${citations.length}`;
      sourceNumber.textContent = `[S${activeIndex + 1}]`;
      sourceStatus.textContent = citation.status === 'needs_review' ? '机器提取 · 待核对' : '来源已记录';
      sourceTitle.textContent = citation.title || '三星堆资料记录';
      locator.textContent = citation.locator || '页码待确认';
      excerpt.textContent = citation.snippet || '此来源暂无可展示的原文片段。';
      note.textContent = citation.note || '';
      indicators.replaceChildren();
      citations.forEach((item, index) => {
        const indicator = document.createElement('button');
        indicator.type = 'button';
        indicator.className = `qa-source-indicator${index === activeIndex ? ' is-active' : ''}`;
        indicator.setAttribute('aria-label', `查看第 ${index + 1} 条证据`);
        indicator.setAttribute('aria-pressed', String(index === activeIndex));
        indicator.addEventListener('click', () => { activeIndex = index; renderCard(); });
        indicators.append(indicator);
      });
      previous.disabled = citations.length < 2;
      next.disabled = citations.length < 2;
    };
    previous.addEventListener('click', () => { activeIndex = (activeIndex + citations.length - 1) % citations.length; renderCard(); });
    next.addEventListener('click', () => { activeIndex = (activeIndex + 1) % citations.length; renderCard(); });
    renderCard();
    message.append(sourceSection);
  }
  const caveats = Array.isArray(turn.caveats) ? turn.caveats.filter(Boolean) : [];
  if (caveats.length) {
    const note = document.createElement('p');
    note.className = 'qa-caveats';
    note.textContent = `资料说明：${[...new Set(caveats)].join('；')}`;
    message.append(note);
  }
}

async function loadHomeGuideStatus() {
  const status = $('#home-guide-service-status');
  try {
    const response = await fetch('/api/guide/status', {headers:{accept:'application/json'},cache:'no-store'});
    if (!response.ok) throw new Error('当前运行方式没有提供问答接口。');
    const data = await response.json();
    if (!data.knowledgeReady) {
      status.lastChild.textContent = '知识库暂时不可用';
      return;
    }
    status.classList.toggle('is-ready', data.configured === true);
    const embeddingIsWarming = ['pending','warming'].includes(data.embeddingWarmup);
    if (embeddingIsWarming) {
      status.lastChild.textContent = 'RAG 问答已连接 · 正在预热本地检索模型';
      if (!qaRequest && !qaConversation.length) $('#qa-status').textContent = '正在预热本地检索模型，完成后即可快速检索…';
      window.setTimeout(loadHomeGuideStatus, 1200);
      return;
    }
    const embeddingFallback = ['fallback','bm25_only'].includes(data.embeddingWarmup);
    status.lastChild.textContent = data.configured
      ? `RAG 问答已就绪 · ${data.indexedChunks} 条资料${embeddingFallback ? ' · 关键词检索模式' : ''}`
      : `知识库已加载 ${data.indexedChunks} 条 · AI 服务待配置`;
    if (!qaRequest && !qaConversation.length) {
      $('#qa-status').textContent = data.configured
        ? (embeddingFallback ? '本地向量检索暂不可用，当前使用关键词检索。' : `资料库已就绪 · ${data.indexedChunks} 条检索资料`)
        : `资料库已加载 ${data.indexedChunks} 条；文本模型尚未配置`;
    }
  } catch {
    status.classList.remove('is-ready');
    status.lastChild.textContent = '请启动 Node 服务以使用 RAG 问答';
    if ($('#qa-status').textContent !== '正在检索资料并生成回答…') $('#qa-status').textContent = '请使用 Node 服务打开页面，以连接 RAG 问答接口。';
  }
}

function appendQaTransientMessage(role, text) {
  const message = document.createElement('article');
  message.className = `qa-message is-${role}`;
  const label = document.createElement('b');
  label.textContent = role === 'user' ? '你' : role === 'loading' ? '三星堆资料助手' : '服务提示';
  const content = document.createElement('p');
  content.textContent = text;
  message.append(label, content);
  $('#qa-transcript').append(message);
  return message;
}

async function submitQaQuestion(questionValue = '') {
  const question = String(questionValue || $('#qa-question').value).trim();
  if (!question || qaRequest) return;
  if (question.length > 500) {
    $('#qa-status').textContent = '问题最多 500 字，请缩短后再提交。';
    $('#qa-status').classList.add('is-error');
    return;
  }
  const history = qaConversation.filter(turn => !turn.failed && typeof turn.content === 'string' && turn.content.trim()).map(turn => ({role:turn.role,content:turn.content}));
  const session = activeQaSession();
  if (!session.messages.some(turn => turn.role === 'user')) {
    const title = question.replace(/\s+/g, ' ').trim();
    session.title = title.length > 22 ? `${title.slice(0, 22)}…` : title;
  }
  const controller = new AbortController();
  qaRequest = controller;
  renderQaSessions();
  $('#qa-status').textContent = '正在连接问答服务…';
  $('#qa-status').classList.remove('is-error');
  $('#qa-clear').hidden = true;
  $('#qa-welcome').hidden = true;
  const userTurn = {role:'user',content:question};
  const assistantTurn = {role:'assistant',content:'',citations:[],caveats:[]};
  qaConversation.push(userTurn, assistantTurn);
  if (qaConversation.length > 12) qaConversation.splice(0, qaConversation.length - 12);
  session.updatedAt = Date.now();
  persistQaSessions();
  renderQaSessions();
  renderQaTranscript();
  const assistantMessage = $('#qa-transcript').lastElementChild;
    const answerNode = assistantMessage.querySelector('.qa-answer');
  answerNode.classList.add('is-streaming');
  $('#qa-question').value = '';
  $('#qa-form button[type="submit"]').disabled = true;
  try {
    const response = await fetch('/api/guide/query', {
      method:'POST',
      headers:{'content-type':'application/json','accept':'text/event-stream'},
      body:JSON.stringify({question,history}),
      signal:controller.signal
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || '问答服务暂时不可用，请稍后重试。');
    }
    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('问答服务没有返回流式响应。');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;
    const handleFrame = frame => {
      let eventName = 'message';
      const dataLines = [];
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
      }
      if (!dataLines.length) return;
      const payload = JSON.parse(dataLines.join('\n'));
      if (eventName === 'status') {
        $('#qa-status').textContent = payload.message || '正在处理…';
      } else if (eventName === 'sources') {
        assistantTurn.citations = Array.isArray(payload.citations) ? payload.citations : [];
        assistantTurn.caveats = Array.isArray(payload.caveats) ? payload.caveats : [];
        appendQaEvidence(assistantMessage, assistantTurn);
        $('#qa-status').textContent = assistantTurn.citations.length ? '回答已生成，正在显示检索证据…' : '回答已生成。';
        $('#qa-transcript').scrollTop = $('#qa-transcript').scrollHeight;
      } else if (eventName === 'token') {
        assistantTurn.content += payload.text || '';
        renderQaAnswer(answerNode, assistantTurn.content);
        $('#qa-transcript').scrollTop = $('#qa-transcript').scrollHeight;
      } else if (eventName === 'done') {
        completed = true;
        assistantTurn.retrieval = payload.retrieval;
        assistantTurn.model = payload.model || null;
      } else if (eventName === 'error') {
        throw new Error(payload.error || '问答服务暂时不可用，请稍后重试。');
      }
    };
    while (true) {
      const {value,done} = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), {stream:!done});
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
    if (!completed) throw new Error('回答流提前结束，请稍后重试。');
    answerNode.classList.remove('is-streaming');
    $('#qa-status').textContent = assistantTurn.retrieval === 'no_evidence' ? '没有检索到足够相关的资料。' : '回答完成；可切换下方证据卡片查看原文片段。';
    $('#qa-clear').hidden = false;
    session.updatedAt = Date.now();
    persistQaSessions();
  } catch (error) {
    userTurn.failed = true;
    assistantTurn.failed = true;
    answerNode.classList.remove('is-streaming');
    $('#qa-question').value = question;
    const errorNote = document.createElement('p');
    errorNote.className = 'qa-stream-error';
    errorNote.textContent = error.name === 'AbortError' ? '本次提问已取消。' : error.message;
    assistantMessage.append(errorNote);
    $('#qa-status').textContent = '这条问题没有得到回答。你可以修改问题后重试。';
    $('#qa-status').classList.add('is-error');
    $('#qa-clear').hidden = false;
    session.updatedAt = Date.now();
    persistQaSessions();
  } finally {
    if (qaRequest === controller) qaRequest = null;
    renderQaSessions();
    $('#qa-form button[type="submit"]').disabled = false;
    $('#qa-question').focus();
  }
}

$('[data-home-ask]').addEventListener('click', () => {
  const question = $('#home-question').value.trim();
  if (!question) {
    showToast('先输入问题，或选择一条示例问题。');
    $('#home-question').focus();
    return;
  }
  if (question.length > 500) {
    showToast('问题最多 500 字，请缩短后再提交。');
    $('#home-question').focus();
    return;
  }
  navigateToQa(question);
});
$('#home-question').addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    $('[data-home-ask]').click();
  }
});

async function activateQaPage() {
  if (new URLSearchParams(window.location.search).get('page') !== 'qa') return;
  if (window.AccountData?.authenticated && qaAccountUserId !== window.AccountData.userId) {
    if (qaHydration) return qaHydration;
    const accountId = window.AccountData.userId;
    qaHydration = (async () => {
      $('#qa-status').textContent = '正在读取当前账号的问答历史…';
      try {
        const payload = {items:await window.AccountData.listAll()};
        const savedSessions = (payload.items || []).filter(item => item.collection === 'qa_sessions').map(item => item.value).filter(session => session && typeof session.id === 'string' && Array.isArray(session.messages));
        qaSessions = savedSessions.length ? savedSessions : [];
        const active = await window.AccountData.get('qa_settings','active_session');
        qaActiveSessionId = active?.id && qaSessions.some(session => session.id === active.id) ? active.id : qaSessions[0]?.id || '';
        if (!qaActiveSessionId) { const empty = createQaSessionRecord(); qaSessions = [empty]; qaActiveSessionId = empty.id; }
        qaConversation = qaSessions.find(session => session.id === qaActiveSessionId).messages;
        qaAccountUserId = accountId;
        qaInitialized = true;
        renderQaSessions(); renderQaTranscript();
        $('#qa-status').textContent = qaConversation.length ? '已读取账号中的问答历史。' : '';
        let pendingQuestion = qaPendingQuestion;
        qaPendingQuestion = '';
        try {
          pendingQuestion = pendingQuestion || sessionStorage.getItem('sxd-rag-pending-question') || '';
          sessionStorage.removeItem('sxd-rag-pending-question');
        } catch {}
        if (pendingQuestion) void submitQaQuestion(pendingQuestion);
      } catch (error) {
        $('#qa-status').textContent = `无法读取账号问答历史：${error.message || '请重试。'}`;
        $('#qa-status').classList.add('is-error');
        throw error;
      } finally { qaHydration = null; }
    })();
    return qaHydration;
  }
  if (!qaInitialized) {
    renderQaTranscript();
    qaInitialized = true;
  }
  let pending = qaPendingQuestion;
  qaPendingQuestion = '';
  try {
    pending = pending || sessionStorage.getItem('sxd-rag-pending-question') || '';
    sessionStorage.removeItem('sxd-rag-pending-question');
  } catch {}
  if (pending) submitQaQuestion(pending);
}
window.addEventListener('account-user-changed', () => {
  qaAccountUserId = null; qaInitialized = false;
  qaSessions = [createQaSessionRecord()]; qaActiveSessionId = qaSessions[0].id; qaConversation = qaSessions[0].messages;
  renderQaSessions(); renderQaTranscript();
});
window.addEventListener('account-record-deleted', event => {
  if (event.detail?.collection !== 'qa_sessions') return;
  const removedId = event.detail.key;
  qaSessions = qaSessions.filter(session => session.id !== removedId);
  if (!qaSessions.some(session => session.id === qaActiveSessionId)) {
    if (!qaSessions.length) qaSessions.push(createQaSessionRecord());
    qaActiveSessionId = qaSessions[0].id;
  }
  qaConversation = qaSessions.find(session => session.id === qaActiveSessionId)?.messages || [];
  renderQaSessions(); renderQaTranscript();
});

$('#qa-form').addEventListener('submit', event => {
  event.preventDefault();
  submitQaQuestion();
});
$('#qa-question').addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    $('#qa-form').requestSubmit();
  }
});
$$('[data-qa-suggestion]').forEach(button => button.addEventListener('click', () => {
  $('#qa-question').value = button.dataset.qaSuggestion;
  $('#qa-form').requestSubmit();
}));
$('#qa-clear').addEventListener('click', () => {
  qaConversation = [];
  const session = activeQaSession();
  session.messages = qaConversation;
  session.title = '新会话';
  session.updatedAt = Date.now();
  persistQaSessions();
  renderQaSessions();
  $('#qa-transcript').replaceChildren();
  $('#qa-welcome').hidden = false;
  $('#qa-status').textContent = '';
  $('#qa-status').classList.remove('is-error');
  $('#qa-clear').hidden = true;
  $('#qa-question').focus();
});
$('#qa-new-session').addEventListener('click', startNewQaSession);
persistQaSessions();
renderQaSessions();
loadHomeGuideStatus();
if (authReady && authenticatedUser && new URLSearchParams(window.location.search).get('page') === 'qa') activateQaPage();
let authRegistrationEnabled = false;
let loginMode = 'login';
function setLoginStatus(message, isError = false) {
  const status = $('#login-status');
  status.textContent = message;
  status.classList.toggle('is-visible', Boolean(message));
  status.classList.toggle('is-error', Boolean(message) && isError);
}
function updateAuthUser(user) {
  authenticatedUser = user;
  window.AccountData?.setUser(user);
  const qaNote = $('#qa-storage-note');
  if (qaNote) qaNote.textContent = user ? '问答会话保存在当前账号；不同会话使用独立上下文。' : '会话保存在此浏览器；不同会话使用独立上下文。';
  $$('[data-login]').forEach(button => {
    button.textContent = user ? '个人账号' : '登录';
    button.title = user ? `当前账号：${user.username}；打开账号设置` : '打开登录页面';
    button.setAttribute('aria-label', button.title);
  });
  $('#login-form').hidden = Boolean(user) || loginMode !== 'login';
  $('#login-register-form').hidden = Boolean(user) || loginMode !== 'register';
  $('#login-authenticated').hidden = !user;
  $('#login-register-entry').hidden = Boolean(user) || !authRegistrationEnabled;
  $('#account-delete-username-hint').textContent = user ? `请输入：${user.username}` : '';
  if (user) {
    $('#login-current-username').textContent = user.username;
    $('#account-username').textContent = user.username;
    $('#account-profile-username').textContent = user.username;
    $('#account-id').textContent = `#${user.id}`;
    $('#account-created').textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '—';
    const roleName = user.role === 'admin' ? '管理员' : '成员';
    $('#account-role').textContent = roleName;
    $('#account-profile-role').textContent = roleName;
  }
}
function formatAccountBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
async function loadAccountStorage(includeRecords = false) {
  $('#account-storage-mode').textContent = '读取中';
  if (includeRecords) $('#account-record-groups').replaceChildren(Object.assign(document.createElement('p'), {className:'account-record-empty',textContent:'正在读取账号记录…'}));
  try {
    const payload = await window.AccountData.request('/api/account/storage');
    let dataPayload = {items:[]};
    let artworkPayload = {items:[]};
    if (includeRecords) {
      [dataPayload, artworkPayload] = await Promise.all([
        window.AccountData.listAll().then(items => ({items})),
        window.AccountData.request('/api/account/artworks'),
      ]);
    }
    $('#account-storage-mode').textContent = payload.mode === 'sqlite' ? 'SQLite · 本机' : '已连接';
    $('#account-data-count').textContent = String(payload.itemCount ?? 0);
    $('#account-data-bytes').textContent = formatAccountBytes(payload.dataBytes ?? 0);
    $('#account-file-count').textContent = String(payload.fileCount ?? 0);
    $('#account-file-bytes').textContent = formatAccountBytes(payload.fileBytes ?? 0);
    $('#account-files-status').textContent = payload.fileUploadsEnabled ? '已保存的天象纹样图片位于私有目录，仅当前账号可访问。' : '个人文件存储尚未启用。';
    if (includeRecords) {
      const learningConfigs = await loadAccountLearningConfigs();
      renderAccountRecords(dataPayload.items || [], artworkPayload.items || [], learningConfigs);
      const hasLegacy = getLegacyAccountData().some(item => item.value !== null);
      const importButton = $('#account-import-local');
      importButton.disabled = !hasLegacy;
      $('#account-import-status').textContent = hasLegacy ? '检测到此浏览器中的旧记录；导入会合并到当前账号，不覆盖已有账号记录。' : '没有检测到可导入的旧学习、问答或留言记录。';
    }
  } catch (error) {
    const message = error?.message || '无法读取个人存储信息。';
    if (/请先登录|登录状态已失效/.test(message)) {
      updateAuthUser(null); authReady = true; renderCurrentRoute(); return;
    }
    $('#account-storage-mode').textContent = '暂不可用';
    $('#account-data-count').textContent = '—';
    $('#account-data-bytes').textContent = '—';
    $('#account-file-count').textContent = '—';
    $('#account-file-bytes').textContent = '—';
    if (includeRecords) $('#account-record-groups').replaceChildren(Object.assign(document.createElement('p'), {className:'account-record-empty',textContent:message}));
  }
}

const accountCollectionTitles = {
  learning_origins:'发现与名称研学', learning_pits:'坑位研学', learning_connections:'器物关联研学',
  learning_framework:'历史框架研学', qa_sessions:'首页 PDF 问答', finale_echoes:'尾厅回声留言',
  learning_origins_assistant:'发现与命名 · 学习助手',
  learning_framework_assistant:'年代、文化与古城 · 学习助手', learning_pits_assistant:'器物坑与雕像 · 学习助手',
  learning_connections_assistant:'工艺、金沙与“蜀” · 学习助手',
};
window.addEventListener('account-user-changed', () => {
  $('#account-record-groups').replaceChildren(Object.assign(document.createElement('p'), {className:'account-record-empty',textContent:'正在读取当前账号的记录…'}));
  $('#account-record-count').textContent = '读取中';
  $('#account-data-count').textContent = '—'; $('#account-data-bytes').textContent = '—';
  $('#account-file-count').textContent = '—'; $('#account-file-bytes').textContent = '—';
  $('#account-import-local').disabled = true; $('#account-import-status').textContent = '正在检查此浏览器中的旧记录…';
});
function accountDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleString('zh-CN');
}
let accountLearningConfigsPromise = null;
async function loadAccountLearningConfigs() {
  if (!accountLearningConfigsPromise) accountLearningConfigsPromise = (async () => {
    try {
      const response = await fetch('/data/manifest.json', {credentials:'same-origin',cache:'no-cache'});
      if (!response.ok) return {};
      const manifest = await response.json();
      const paths = {learning_origins:'origins',learning_framework:'framework',learning_pits:'pits',learning_connections:'connections'};
      const pairs = await Promise.all(Object.entries(paths).map(async ([collection,path]) => {
        const entry = manifest.files?.find(file => file.path === `learning/${path}.json`);
        if (!entry?.url) return [collection,null];
        try { const result = await fetch(entry.url,{credentials:'same-origin'}); return [collection,result.ok ? await result.json() : null]; }
        catch { return [collection,null]; }
      }));
      return Object.fromEntries(pairs);
    } catch { accountLearningConfigsPromise = null; return {}; }
  })();
  return accountLearningConfigsPromise;
}

function accountLearningLabels(config) {
  const labels = new Map();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.id === 'string') {
      const label = value.label || value.title || value.name || value.short;
      if (typeof label === 'string' && label) labels.set(value.id,label);
    }
    Object.values(value).forEach(visit);
  };
  visit(config);
  return labels;
}

function accountRecordNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

const accountFieldNames = {
  discovery:'发现时间判断',evidence:'判断依据',nameChange:'名称范围的变化',question:'待查问题',reflection:'个人反思',
  choice:'我的判断',selectedEvidence:'证据选择',observations:'观察线索',links:'关联线索',layer:'层位选择',
  term:'暂用称谓',confidence:'判断信心',identityConfidence:'身份判断态度',interpretation:'解释视角',strength:'证据强度',
  lower:'年代区间较晚端',upper:'年代区间较早端',reason:'判断理由',note:'学习笔记',support:'证据支持程度',
};

function accountDisplayValue(value, labels) {
  if (Array.isArray(value)) return value.map(item=>accountDisplayValue(item,labels)).filter(Boolean).join('、');
  if (value && typeof value === 'object') return Object.entries(value).map(([key,item])=>`${labels?.get(key)||accountFieldNames[key]||key}：${accountDisplayValue(item,labels)}`).join('；');
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'string') return labels?.get(value) || value.replace(/[_-]+/g,' ');
  return value === null || value === undefined ? '' : String(value);
}

function appendAccountField(host, label, value, labels) {
  const display = accountDisplayValue(value,labels);
  if (!display) return;
  const row = accountRecordNode('div','account-record-field');
  row.append(accountRecordNode('dt','',label),accountRecordNode('dd','',display));
  host.append(row);
}

function appendAccountText(host, label, value) {
  if (typeof value !== 'string' || !value.trim()) return;
  const block = accountRecordNode('section','account-record-answer');
  block.append(accountRecordNode('h5','',label),accountRecordNode('p','',value.trim()));
  host.append(block);
}

function accountSourceLocators(root) {
  const locators=new Set();
  const visit=value=>{
    if(!value||typeof value!=='object')return;
    if(typeof value.locator==='string'&&value.locator.trim())locators.add(value.locator.trim());
    Object.values(value).forEach(visit);
  };
  visit(root);
  return [...locators];
}

function learningRecordProgress(collection,value,config) {
  if (collection === 'learning_origins') {
    const questions=config?.judgment_questions||[], cards=config?.place_cards||[];
    const done=[questions.length>0&&questions.every(item=>value.judgmentSubmitted?.[item.id]),cards.length>0&&cards.every(item=>value.placeAssignments?.[item.id]),Boolean(value.selectedScope)].filter(Boolean).length;
    return {done,total:3,location:value.selectedScope?'遗址范围讨论':done>1?'完成地名辨认':done>0?'证据卡整理':value.readingComplete?'已读完材料':`阅读材料第 ${Number(value.readingIndex||0)+1} 段`};
  }
  const list=collection==='learning_framework'?value.stations:value.answers;
  const done=Array.isArray(list)?list.filter(item=>item?.submitted).length:0;
  const total=config?.stations?.length||(Array.isArray(list)?list.length:0);
  const current=Math.min(Math.max(0,Number(value.station)||0),Math.max(0,total-1));
  return {done,total,location:value.station>=total&&total?'主题已完成':config?.stations?.[current]?.title||`第 ${current+1} 站`};
}

function renderLearningAccountRecord(host,collection,value,config,updatedAt) {
  const labels=accountLearningLabels(config),progress=learningRecordProgress(collection,value,config);
  const titles={learning_origins:'发现与命名',learning_pits:'器物坑与雕像',learning_connections:'工艺、金沙与“蜀”',learning_framework:'年代、文化与古城'};
  const card=accountRecordNode('article','account-record-card account-learning-record');
  const head=accountRecordNode('header','account-record-card-head');
  head.append(accountRecordNode('h4','',titles[collection]||'研学记录'),accountRecordNode('time','',accountDate(updatedAt||value.updatedAt||value.savedAt)));
  card.append(head);
  const meta=accountRecordNode('div','account-record-meta');
  const finished=progress.total>0&&progress.done>=progress.total;
  meta.append(accountRecordNode('span',`account-record-progress-badge ${finished?'is-complete':progress.done?'is-active':''}`,finished?'已完成':progress.done?'学习中':'已保存'),accountRecordNode('span','',`${progress.done} / ${progress.total} 项完成`));
  const meter=accountRecordNode('div','account-record-progress');meter.setAttribute('role','progressbar');meter.setAttribute('aria-label',`${titles[collection]}完成进度`);meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(progress.total));meter.setAttribute('aria-valuenow',String(progress.done));
  const fill=accountRecordNode('i','');fill.style.width=`${progress.total?Math.min(100,progress.done/progress.total*100):0}%`;meter.append(fill);meta.append(meter);
  card.append(meta,accountRecordNode('p','account-record-location',`上次学习：${progress.location}`));

  if(collection==='learning_origins'){
    const names={discovery:'发现时间判断',evidence:'我的判断依据',nameChange:'名称范围变化说明',question:'想继续查证的问题'};
    const fields=accountRecordNode('dl','account-record-fields');for(const [key,label] of Object.entries(names))appendAccountField(fields,label,value.record?.[key],labels);
    if(fields.childElementCount)card.append(fields);
    const choiceFields=accountRecordNode('dl','account-record-fields');
    const questions=Object.fromEntries((config?.judgment_questions||[]).map(question=>[question.id,question.title||question.prompt||question.id]));
    for(const [id,choice] of Object.entries(value.judgmentChoices||{}))appendAccountField(choiceFields,questions[id]||'证据判断',choice,labels);
    if(choiceFields.childElementCount){card.append(accountRecordNode('h5','account-record-subheading','互动判断'),choiceFields);}
    const placeCount=Object.keys(value.placeAssignments||{}).length;if(placeCount)card.append(accountRecordNode('p','account-record-brief',`已完成 ${placeCount} 张地名辨认卡。`));
    if(value.selectedScope)appendAccountField(card,'遗址范围选择',value.selectedScope,labels);
  }else{
    appendAccountText(card,'个人反思',value.reflection);
    const answers=collection==='learning_framework'?value.stations:value.answers;
    if(Array.isArray(answers))answers.forEach((answer,index)=>{
      const station=config?.stations?.[index],title=station?.title||`第 ${index+1} 站`;
      const stationCard=accountRecordNode('section','account-record-station');
      const label=`${String(station?.number||String(index+1).padStart(2,'0'))} · ${title}`;
      stationCard.append(accountRecordNode('div','account-record-station-head',label),accountRecordNode('span','account-record-station-status',answer?.submitted?'已提交判断':(answer?.read?.length||answer?.readComplete||Number(answer?.readIndex)>0)?'学习中':'尚未完成'));
      const fields=accountRecordNode('dl','account-record-fields');
      const hidden=new Set(['read','readIndex','active','focus','visualFocus','zoom','imageZoom','submitted','correct','inputError','updatedAt','feedback']);
      for(const [key,entry]of Object.entries(answer||{})){
        if(hidden.has(key)||entry===null||entry===''||Array.isArray(entry)&&!entry.length||typeof entry==='object'&&!Array.isArray(entry)&&!Object.keys(entry).length)continue;
        appendAccountField(fields,accountFieldNames[key]||key,entry,accountLearningLabels(station));
      }
      if(fields.childElementCount)stationCard.append(fields);
      if(typeof answer?.feedback==='string'&&answer.feedback.trim())stationCard.append(accountRecordNode('p','account-record-feedback',answer.feedback));
      const locators=accountSourceLocators(station);if(locators.length)stationCard.append(accountRecordNode('p','account-record-source-note',`资料定位：${locators.join('；')}`));
      const hasAnswer=fields.childElementCount||answer?.submitted;if(hasAnswer)card.append(stationCard);
    });
  }
  const source=config?.book?.sourceNote||config?.book?.source_note||config?.source_note||config?.sourceNote;
  if(source)card.append(accountRecordNode('p','account-record-source-note',source));
  const actions=accountRecordNode('div','account-record-actions'),remove=accountRecordNode('button','account-record-delete','删除此记录');remove.type='button';remove.dataset.collection=collection;remove.dataset.recordKey='state';actions.append(remove);card.append(actions);host.append(card);
}

function accountMessageText(message) {
  const content=message?.content??message?.text??message?.answer??'';
  if(typeof content==='string')return content;
  if(Array.isArray(content))return content.map(item=>typeof item==='string'?item:item?.text||item?.content||'').filter(Boolean).join('\n');
  return '';
}

function renderAccountRecords(items, artworks, learningConfigs = {}) {
  const host=$('#account-record-groups');host.replaceChildren();
  const relevant=items.filter(item=>accountCollectionTitles[item.collection]);
  const total=relevant.length+artworks.length;$('#account-record-count').textContent=`${total} 项`;
  for(const collection of [...Object.keys(accountCollectionTitles),'artworks']){
    const title=collection==='artworks'?'我的天象纹样作品':accountCollectionTitles[collection];
    const entries=collection==='artworks'?artworks:relevant.filter(item=>item.collection===collection);
    if(!entries.length)continue;
    const section=accountRecordNode('details','account-record-group');
    const heading=accountRecordNode('summary','account-record-group-head');
    const caption=accountRecordNode('div','');caption.append(accountRecordNode('span','account-record-overline',collection==='qa_sessions'?'SAVED CONVERSATIONS':collection==='artworks'?'SAVED CREATIONS':'LEARNING ARCHIVE'),accountRecordNode('h3','',title));
    heading.append(caption,accountRecordNode('span','account-record-group-count',`${entries.length} 项`));section.append(heading);
    const list=accountRecordNode('div','account-record-list');
    for(const entry of entries){
      const value=entry.value||entry;
      if(collection.endsWith('_assistant')){
        const card=accountRecordNode('article','account-record-card account-chat-record'),head=accountRecordNode('header','account-record-card-head');
        head.append(accountRecordNode('h4','',accountCollectionTitles[collection]||'研学 · 学习助手'),accountRecordNode('time','',accountDate(value.updatedAt||entry.updatedAt)));
        card.append(head,accountRecordNode('p','account-record-location',`${(value.messages||[]).length} 条学习对话`));
        const transcript=accountRecordNode('div','account-record-transcript');
        (value.messages||[]).forEach(message=>{const bubble=accountRecordNode('article',`account-chat-message ${message.role==='assistant'?'is-answer':'is-question'}`);bubble.append(accountRecordNode('b','',`${message.taskTitle||'发现与命名'} · ${message.role==='assistant'?'学习助手':'我的问题'}`),accountRecordNode('p','',message.content||''));transcript.append(bubble);});
        if(transcript.childElementCount)card.append(transcript);
        const actions=accountRecordNode('div','account-record-actions'),remove=accountRecordNode('button','account-record-delete','删除学习助手会话');remove.type='button';remove.dataset.collection=collection;remove.dataset.recordKey=entry.key;actions.append(remove);card.append(actions);list.append(card);continue;
      }
      if(collection.startsWith('learning_')){renderLearningAccountRecord(list,collection,value,learningConfigs[collection],entry.updatedAt||value.updatedAt);continue;}
      if(collection==='qa_sessions'){
        const messages=Array.isArray(value.messages)?value.messages:[];
        const card=accountRecordNode('article','account-record-card account-chat-record'),head=accountRecordNode('header','account-record-card-head');
        head.append(accountRecordNode('h4','',value.title||'问答会话'),accountRecordNode('time','',accountDate(entry.updatedAt||value.updatedAt||entry.createdAt)));
        card.append(head,accountRecordNode('p','account-record-location',`${Math.ceil(messages.length/2)} 轮对话 · ${messages.length} 条消息`));
        const transcript=accountRecordNode('div','account-record-transcript');
        messages.forEach(message=>{
          const answer=message?.role==='assistant',bubble=accountRecordNode('article',`account-chat-message ${answer?'is-answer':'is-question'}`);
          bubble.append(accountRecordNode('b','',answer?'资料回答':'我的问题'),accountRecordNode('p','',accountMessageText(message)||'（此条消息没有可显示的文字内容）'));
          const sources=Array.isArray(message?.citations)?message.citations:(Array.isArray(message?.sources)?message.sources:[]);
          if(sources.length)bubble.append(accountRecordNode('small','',`资料来源：${sources.map(source=>typeof source==='string'?source:source.title||source.label||source.name).filter(Boolean).join('；')}`));
          transcript.append(bubble);
        });
        if(messages.length)card.append(transcript);else card.append(accountRecordNode('p','account-record-empty','这段会话目前没有消息。'));
        const actions=accountRecordNode('div','account-record-actions'),remove=accountRecordNode('button','account-record-delete','删除此会话');remove.type='button';remove.dataset.collection=collection;remove.dataset.recordKey=entry.key;actions.append(remove);card.append(actions);list.append(card);continue;
      }
      if(collection==='finale_echoes'){
        const card=accountRecordNode('article','account-record-card account-echo-record'),head=accountRecordNode('header','account-record-card-head');
        head.append(accountRecordNode('h4','','尾厅回声留言'),accountRecordNode('time','',accountDate(entry.updatedAt||value.createdAt||entry.createdAt)));card.append(head,accountRecordNode('blockquote','account-record-quote',value.text||'（留言内容为空）'));
        const actions=accountRecordNode('div','account-record-actions'),remove=accountRecordNode('button','account-record-delete','删除此留言');remove.type='button';remove.dataset.collection=collection;remove.dataset.recordKey=entry.key;actions.append(remove);card.append(actions);list.append(card);continue;
      }
      if(collection==='artworks'){
        const card=accountRecordNode('article','account-record-card account-artwork-record'),head=accountRecordNode('header','account-record-card-head');
        head.append(accountRecordNode('h4','',entry.title||'天象纹样作品'),accountRecordNode('time','',accountDate(entry.generatedAt||entry.createdAt)));card.append(head);
        const image=document.createElement('img');image.className='account-record-image';image.alt=entry.title||'已保存的天象纹样作品';image.loading='lazy';image.src=`/api/account/artworks/${encodeURIComponent(entry.id)}/image`;card.append(image);
        const fields=accountRecordNode('dl','account-record-fields');appendAccountField(fields,'主题',entry.celestialSubject);appendAccountField(fields,'构图',entry.composition);appendAccountField(fields,'细节',entry.detail);if(fields.childElementCount)card.append(fields);
        const actions=accountRecordNode('div','account-record-actions'),remove=accountRecordNode('button','account-record-delete','删除此作品');remove.type='button';remove.dataset.artworkId=entry.id;actions.append(remove);card.append(actions);list.append(card);
      }
    }
    for(const card of [...list.children]){
      const header=card.querySelector(':scope > .account-record-card-head');
      const title=header?.querySelector('h4')?.textContent||'存档记录';
      const date=header?.querySelector('time')?.textContent||'';
      const item=accountRecordNode('details','account-record-item');
      const summary=accountRecordNode('summary','account-record-item-summary');
      summary.append(accountRecordNode('span','',title),accountRecordNode('small','',date));
      const detail=accountRecordNode('div','account-record-detail');
      for(const child of [...card.children])if(child!==header)detail.append(child);
      item.append(summary,detail);card.replaceWith(item);
    }
    section.append(list);host.append(section);
  }
  if(!total)host.append(accountRecordNode('p','account-record-empty account-record-empty-state','这里还没有保存记录。完成一段研学、保存问答会话或留言后，内容会按主题显示在这里。'));
}

function getLegacyAccountData() {
  const definitions = [
    ['learning_origins','state','sanxingdui-learning-origins-v1'],
    ['learning_pits','state','sd-learning-pits-v1'],
    ['learning_connections','state','sd-learning-connections-v1'],
    ['learning_framework','state','sd-learning-framework-v1'],
  ];
  const result = definitions.map(([collection,key,localKey]) => ({collection,key,value:window.AccountData.readLocal(localKey)})).filter(item => item.value !== null);
  const sessions = window.AccountData.readLocal('sanxingdui.qa.sessions.v1');
  if (Array.isArray(sessions)) {
    for (const session of sessions) {
      if (!session || !Array.isArray(session.messages) || !session.messages.length) continue;
      const key = String(session.id || `legacy-${session.updatedAt || Date.now()}`).replace(/[^\p{L}\p{N}._-]/gu,'-').slice(0,120);
      result.push({collection:'qa_sessions',key,value:session});
    }
    const active = window.AccountData.readLocal('sanxingdui.qa.active-session.v1');
    if (active) result.push({collection:'qa_settings',key:'active_session',value:{id:active}});
  }
  const echoes = window.AccountData.readLocal('sanxingdui-finale-echoes-v1');
  if (Array.isArray(echoes)) echoes.forEach((entry,index) => {
    if (!entry || typeof entry.text !== 'string') return;
    const stamp = String(entry.createdAt || '').replace(/\D/g,'').slice(-18) || 'unknown';
    result.push({collection:'finale_echoes',key:`legacy-${stamp}-${index}`,value:{text:entry.text.slice(0,500),createdAt:entry.createdAt || new Date().toISOString()}});
  });
  return result;
}

$('#account-record-groups').addEventListener('click', async event => {
  const button = event.target.closest('.account-record-delete');
  if (!button || !confirm('确定删除这条账号记录吗？此操作无法撤销。')) return;
  button.disabled = true;
  try {
    if (button.dataset.artworkId) {
      await window.AccountData.request(`/api/account/artworks/${encodeURIComponent(button.dataset.artworkId)}`, {method:'DELETE'});
    } else {
      await window.AccountData.flushAll();
      await window.AccountData.remove(button.dataset.collection, button.dataset.recordKey);
      window.dispatchEvent(new CustomEvent('account-record-deleted', {detail:{collection:button.dataset.collection,key:button.dataset.recordKey}}));
    }
    await loadAccountStorage(true);
  } catch (error) {
    button.disabled = false;
    const status = $('#account-import-status'); status.textContent = error.message || '删除失败，请重试。'; status.className = 'is-error';
  }
});

$('#account-import-local').addEventListener('click', async event => {
  const button = event.currentTarget; const status = $('#account-import-status');
  button.disabled = true; status.className = ''; status.textContent = '正在检查并导入本机记录…';
  let saved = 0; let skipped = 0;
  try {
    for (const item of getLegacyAccountData()) {
      const result = await window.AccountData.putIfAbsent(item.collection,item.key,item.value);
      if (result.saved) saved++; else skipped++;
    }
    status.className = 'is-success'; status.textContent = `导入完成：新增 ${saved} 项，保留账号中已有的 ${skipped} 项。天象作品需在创作页单独点击保存。`;
    await loadAccountStorage(true);
  } catch (error) {
    status.className = 'is-error'; status.textContent = error.message || '导入失败；可重试，已导入项目不会重复创建。';
    button.disabled = false;
  }
});
async function refreshAuthState() {
  try {
    const [statusResponse, userResponse] = await Promise.all([fetch('/api/auth/status', {cache:'no-store'}), fetch('/api/auth/me', {cache:'no-store'})]);
    const status = await statusResponse.json();
    const payload = await userResponse.json();
    authRegistrationEnabled = status.registrationEnabled === true;
    const noteTitle = $('#login-service-title');
    const noteCopy = $('#login-service-copy');
    if (!status.configured && !authRegistrationEnabled) {
      noteTitle.textContent = '等待初始化首个账号';
      noteCopy.textContent = '由服务端环境变量创建管理员账号';
    } else if (authRegistrationEnabled) {
      noteTitle.textContent = '账号数据库已就绪';
      noteCopy.textContent = '可创建个人账号并保存个人数据';
    } else {
      noteTitle.textContent = '账号数据库已就绪';
      noteCopy.textContent = '账号与个人数据保存在本机 SQLite';
    }
    updateAuthUser(payload.user || null);
    authReady = true;
    renderCurrentRoute();
    if (authenticatedUser && new URLSearchParams(window.location.search).get('page') === 'qa') activateQaPage();
  } catch {
    $('#login-service-title').textContent = '登录服务暂时不可用';
    $('#login-service-copy').textContent = '请确认 Node 服务正在运行';
    authenticatedUser = null;
    window.AccountData?.setUser(null);
    authReady = true;
    renderCurrentRoute();
  }
}
async function logoutUser() {
  try {
    await window.AccountData?.flushAll();
    const response = await fetch('/api/auth/logout', {method:'POST'});
    if (!response.ok) throw new Error('退出登录失败，请重试。');
    updateAuthUser(null);
    loginMode = 'login';
    history.replaceState({page:'login'}, '', `${window.location.pathname}?page=login`);
    renderCurrentRoute();
    setLoginStatus('已退出登录。');
    $('#login-username').focus({preventScroll:true});
  } catch (error) {
    setLoginStatus(error.message || '退出登录失败，请重试。', true);
  }
}
$$('[data-login]').forEach(button => button.addEventListener('click', () => authenticatedUser ? navigateToAccount() : navigateToLogin()));
$('#login-page-logout').addEventListener('click', logoutUser);
$('#account-logout').addEventListener('click', logoutUser);
$('#account-delete-form').addEventListener('submit', async event => {
  event.preventDefault();
  const status = $('#account-delete-status');
  const submit = $('#account-delete-form button[type="submit"]');
  status.classList.remove('is-error');
  submit.disabled = true;
  status.textContent = '正在注销账号…';
  try {
    await window.AccountData?.flushAll();
    const response = await fetch('/api/account', {method:'DELETE',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({currentPassword:$('#account-delete-password').value,confirmation:$('#account-delete-confirmation').value})});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || '账号注销失败，请稍后重试。');
    $('#account-delete-form').reset();
    updateAuthUser(null);
    loginMode = 'login';
    history.replaceState({page:'login'}, '', `${window.location.pathname}?page=login`);
    renderCurrentRoute();
    setLoginStatus(payload.message || '账号已注销。');
    $('#login-username').focus({preventScroll:true});
  } catch (error) {
    status.textContent = error.message || '账号注销失败，请稍后重试。';
    status.classList.add('is-error');
  } finally {
    submit.disabled = false;
  }
});
$('#account-password-form').addEventListener('submit', async event => {
  event.preventDefault();
  const currentPassword = $('#account-current-password').value;
  const newPassword = $('#account-new-password').value;
  const confirmPassword = $('#account-confirm-password').value;
  const status = $('#account-password-status');
  status.classList.remove('is-error');
  if (newPassword !== confirmPassword) {
    status.textContent = '两次输入的新密码不一致。';
    status.classList.add('is-error');
    return;
  }
  const submit = $('#account-password-form button[type="submit"]');
  submit.disabled = true;
  status.textContent = '正在更新密码…';
  try {
    const response = await fetch('/api/auth/password', {method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({currentPassword,newPassword})});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || '密码更新失败。');
    $('#account-password-form').reset();
    status.textContent = payload.message || '密码已更新。';
  } catch (error) {
    status.textContent = error.message || '密码更新失败，请稍后重试。';
    status.classList.add('is-error');
  } finally {
    submit.disabled = false;
  }
});
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const submit = $('#login-form button[type="submit"]');
  submit.disabled = true;
  setLoginStatus('正在验证账号…');
  try {
    const response = await fetch('/api/auth/login', {method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({username:$('#login-username').value.trim(),password:$('#login-password').value,remember:$('#login-remember').checked})});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || '登录失败，请重试。');
    $('#login-password').value = '';
    updateAuthUser(payload.user);
    navigateToHome('');
  } catch (error) {
    setLoginStatus(error.message || '登录服务暂时不可用，请稍后重试。', true);
  } finally {
    submit.disabled = false;
  }
});
$('#login-mode-toggle').addEventListener('click', () => {
  loginMode = loginMode === 'login' ? 'register' : 'login';
  $('#login-mode-prompt').textContent = loginMode === 'login' ? '还没有账号？' : '已有账号？';
  $('#login-mode-toggle').textContent = loginMode === 'login' ? '创建账号' : '返回登录';
  updateAuthUser(authenticatedUser);
  setLoginStatus('');
});
$('#login-register-form').addEventListener('submit', async event => {
  event.preventDefault();
  const password = $('#register-password').value;
  if (password !== $('#register-confirm').value) return setLoginStatus('两次输入的密码不一致。', true);
  const submit = $('#login-register-form button[type="submit"]');
  submit.disabled = true;
  setLoginStatus('正在创建账号…');
  try {
    const response = await fetch('/api/auth/register', {method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({username:$('#register-username').value.trim(),password})});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || '无法创建账号。');
    $('#register-password').value = '';
    $('#register-confirm').value = '';
    updateAuthUser(payload.user);
    navigateToHome('');
  } catch (error) {
    setLoginStatus(error.message || '创建账号失败，请重试。', true);
  } finally {
    submit.disabled = false;
  }
});
refreshAuthState();
$('#login-password-toggle').addEventListener('click', event => {
  const password = $('#login-password');
  const showing = password.type === 'password';
  password.type = showing ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-pressed', String(showing));
  event.currentTarget.setAttribute('aria-label', showing ? '隐藏密码' : '显示密码');
});
$('#login-forgot').addEventListener('click', () => {
  setLoginStatus('暂不支持自助重置密码，请联系管理员。', true);
});
$('#login-form').addEventListener('input', () => {
  setLoginStatus('');
});
$('#login-terms-link').addEventListener('click', event => {
  event.preventDefault();
  setLoginStatus('服务条款将在公开注册开放前补充。');
});
$('#login-privacy-link').addEventListener('click', event => {
  event.preventDefault();
  setLoginStatus('账户隐私说明将在公开注册开放前补充。');
});

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


$$('[data-open-story]').forEach(button => button.addEventListener('click', () => openDialog($('#story-modal'))));
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
