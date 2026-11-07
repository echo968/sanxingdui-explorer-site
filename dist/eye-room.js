const $eye = (selector, root = document) => root.querySelector(selector);

const eyeHotspotConfig = [
  {
    id:'mask-left-eye',
    label:'查看面具左眼部资料',
    // 模型 OBJ 为单一连续网格，没有独立眼部 mesh。探针用原始网格局部 X/Z 定位，
    // 沿局部 +Y 射线吸附到实际三角面；按当前模型视角将 X 向负方向微调，使标记向画面左侧移动。
    // Y 与表面法线仍由加载后的网格计算，不使用固定屏幕坐标。
    surfaceProbe:{x:-.75,z:-7.40,frontY:-2},
    tag:'造型观察 · 资料参照',
    title:'纵目：被强调的目光',
    observation:'三星堆青铜纵目面具的一项醒目特征，是眼球呈柱状向前凸出，眼角上挑，眉部厚重。面具还可见方阔的面部、宽阔的鼻部和向两侧展开的耳部。以上描述来自博物馆对具体器物的介绍；不同面具的尺寸、结构和细节可能不同。',
    observationSources:['shu-mask'],
    question:'这些眼睛意味着什么？',
    interpretation:'目前没有定论。博物馆资料列举了几种解释：有人将其与古籍中蜀人始祖蚕丛“纵目”的记载联系起来；也有观点把“纵目”理解为“竖眼”，或将面具与烛龙等神话形象比较。这些属于研究解释，不应表述为已证实的历史身份、神灵形象或古蜀人的天文知识。',
    interpretationSources:['shu-mask','shm-kuilong'],
    note:'本资料介绍博物馆所述的纵目面具造型和研究观点。当前展示的数字模型素材来源及其与具体馆藏器物的对应关系仍待核实。'
  }
];
const eyeHotspotSources = {
  'shu-mask':{title:'上海大学博物馆：《青铜纵目面具》',url:'https://museum.shu.edu.cn/info/1030/3736.htm'},
  'shm-kuilong':{title:'上海博物馆：《夔龙冠纵目青铜面具》',url:'https://www.shanghaimuseum.net/mu/frontend/pg/m/article/id/CI00159720'}
};

let apiConfigured = false;
let activeRequest = null;
let sceneState = null;
let modelLoadController = null;
let syncFeatureCardPosition = () => {};
let currentArtwork = null;

function currentPrompt() {
  const form = $eye('#ai-eye-create-form');
  if (!form) return '';
  const celestial = [...form.querySelectorAll('[name="celestial"]:checked')].map(input => input.value);
  const customSubject = $eye('#ai-eye-custom-subject')?.value.trim();
  if (customSubject) celestial.push(customSubject);
  const composition = form.querySelector('[name="composition"]:checked')?.value || '三层堆叠，天象符号居中，上下装饰纹带平衡呼应';
  const detailFeatures = [...form.querySelectorAll('[name="detail_feature"]:checked')].map(input => input.value);
  const extra = $eye('#ai-eye-extra')?.value.trim();
  const detail = [detailFeatures.length ? `纹样细节：${detailFeatures.join('、')}` : '',extra ? `补充要求：${extra}` : ''].filter(Boolean).join('；') || '无额外补充，遵循工作流预设的风格与排除要求。';
  return `celestial_subject：${celestial.join('、') || '请先选择或输入天象主题'}\ncomposition：${composition}\ndetail：${detail}\n\n固定风格由 Coze 工作流提示词和参考图控制：二维平面装饰纹样、黑白线描、三层分带；只借鉴参考图的装饰语言，不复刻具体文物或人物。`;
}

function collectWorkflowFields() {
  const form = $eye('#ai-eye-create-form');
  const celestial = [...form.querySelectorAll('[name="celestial"]:checked')].map(input => input.value);
  const customSubject = $eye('#ai-eye-custom-subject').value.trim();
  if (customSubject) celestial.push(customSubject);
  const detailFeatures = [...form.querySelectorAll('[name="detail_feature"]:checked')].map(input => input.value);
  const extra = $eye('#ai-eye-extra').value.trim();
  const detail = [detailFeatures.length ? `纹样细节：${detailFeatures.join('、')}` : '',extra ? `补充要求：${extra}` : ''].filter(Boolean).join('；') || '无额外补充，遵循工作流预设的风格与排除要求。';
  return {
    celestial_subject:celestial.join('、'),
    composition:form.querySelector('[name="composition"]:checked')?.value || '三层堆叠，天象符号居中，上下装饰纹带平衡呼应',
    detail
  };
}

function imageUrlFromWorkflowValue(value, depth = 0) {
  if (depth > 4 || value == null) return '';
  if (typeof value === 'string') {
    const text = value.trim();
    if (/^https:\/\//i.test(text)) return text;
    try { return imageUrlFromWorkflowValue(JSON.parse(text), depth + 1); } catch { return ''; }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = imageUrlFromWorkflowValue(item, depth + 1);
      if (found) return found;
    }
    return '';
  }
  if (typeof value === 'object') {
    for (const key of ['url','image_url','imageUrl','download_url','file_url','data']) {
      const found = imageUrlFromWorkflowValue(value[key], depth + 1);
      if (found) return found;
    }
  }
  return '';
}

function updatePromptPreview() {
  const preview = $eye('#ai-eye-prompt-preview');
  if (preview) preview.textContent = currentPrompt();
  const fields = collectWorkflowFields();
  const button = $eye('#ai-eye-generate');
  if (button && !activeRequest) button.disabled = !apiConfigured || !fields.celestial_subject;
}

async function readServiceStatus() {
  const status = $eye('#ai-eye-api-state');
  const button = $eye('#ai-eye-generate');
  try {
    const response = await fetch('/api/coze/status', {headers:{accept:'application/json'}, cache:'no-store'});
    if (!response.ok) throw new Error('当前静态服务器未提供图像生成接口。');
    const data = await response.json();
    apiConfigured = data.configured === true;
    status.textContent = apiConfigured ? 'Coze 总工作流已连接 · 将调用天象纹样生成分支' : 'Coze 工作流尚未配置；你仍可预览生成参数。';
    if (!apiConfigured) button.textContent = '服务尚未配置';
    else button.textContent = '生成天象纹样';
  } catch (error) {
    apiConfigured = false;
    status.textContent = 'Coze 工作流服务暂时不可用；你仍可预览和复制提示词。';
    button.textContent = '服务尚未配置';
  }
  updatePromptPreview();
}

function setGenerationMessage(message) {
  const status = $eye('#ai-eye-generation-status');
  if (status) status.textContent = message;
}

function stopGeneration(message = '已取消本次请求。') {
  if (!activeRequest) return;
  const pending = activeRequest;
  activeRequest = null;
  pending.abort();
  $eye('#ai-eye-cancel').hidden = true;
  $eye('#ai-eye-generate').disabled = !apiConfigured;
  $eye('#ai-eye-generate').textContent = '重新生成';
  setGenerationMessage(message);
}

async function submitGeneration(event) {
  event.preventDefault();
  if (!apiConfigured || activeRequest) return;
  const fields = collectWorkflowFields();
  if (!fields.celestial_subject) {
    setGenerationMessage('请至少勾选或输入一种天象主题。');
    return;
  }
  const controller = new AbortController();
  activeRequest = controller;
  $eye('#ai-eye-result').hidden = true;
  $eye('#ai-eye-generate').disabled = true;
  $eye('#ai-eye-generate').textContent = '正在生成…';
  $eye('#ai-eye-cancel').hidden = false;
  setGenerationMessage('已将 celestial_subject、composition 和 detail 提交到 Coze 天象纹样分支，正在等待图片返回。你可以取消本次等待。');
  try {
    const outputs = await window.SanxingduiCoze.run('space2_image', {
      ...fields
    }, {signal:controller.signal});
    const imageUrl = imageUrlFromWorkflowValue(outputs.generated_image || outputs.image || outputs.Group1);
    if (!imageUrl) throw new Error('工作流没有返回可显示的图片地址。请检查结束节点是否返回 generated_image。');
    const proxyResponse = await fetch('/api/coze/image-proxy', {method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({imageUrl}),signal:controller.signal});
    const proxyPayload = await proxyResponse.json().catch(() => ({}));
    if (!proxyResponse.ok || typeof proxyPayload.imageUrl !== 'string') throw new Error(proxyPayload.error || 'Coze 已生成图片，但本站服务暂时无法读取，请检查项目服务端网络后重试。');
    const previewUrl = proxyPayload.imageUrl;
    currentArtwork = {imageUrl,previewUrl,fields,createdAt:new Date().toISOString(),savedId:null};
    $eye('#ai-eye-result-image').src = previewUrl;
    $eye('#ai-eye-result-label').textContent = 'Coze 工作流生成的天象纹样 · 本次会话预览';
    const download = $eye('#ai-eye-download');
    download.href = previewUrl;
    download.target = '_blank';
    download.rel = 'noopener noreferrer';
    download.removeAttribute('download');
    $eye('#ai-eye-save').disabled = false;
    $eye('#ai-eye-save').textContent = '保存到我的作品';
    $eye('#ai-eye-save-status').textContent = '';
    $eye('#ai-eye-result').hidden = false;
    setGenerationMessage('天象纹样已由 Coze 工作流返回。作品仅在当前会话展示。');
    sessionStorage.setItem('aiEyeLastArtwork', JSON.stringify({imageUrl:previewUrl,label:'Coze 工作流生成的天象纹样'}));
  } catch (error) {
    if (error.name === 'AbortError') setGenerationMessage('本次等待已取消；你的选项和提示词已保留。');
    else setGenerationMessage(`${error.message} 你的选项和提示词已保留，可以重试。`);
  } finally {
    if (activeRequest === controller) activeRequest = null;
    $eye('#ai-eye-cancel').hidden = true;
    $eye('#ai-eye-generate').disabled = !apiConfigured || !collectWorkflowFields().celestial_subject;
    $eye('#ai-eye-generate').textContent = '生成天象纹样';
  }
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(currentPrompt());
    setGenerationMessage('本次工作流参数描述已复制。');
  } catch {
    setGenerationMessage('浏览器未允许自动复制，请选中参数预览手动复制。');
  }
}

function appendEyeSourceList(container, sourceIds) {
  if (!sourceIds?.length) return;
  const row = document.createElement('p');
  row.className = 'ai-eye-feature-source';
  row.append('资料来源：');
  sourceIds.forEach((sourceId, index) => {
    const source = eyeHotspotSources[sourceId];
    if (!source) return;
    if (index) row.append(' · ');
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${source.title} ↗`;
    row.append(link);
  });
  container.append(row);
}

function renderEyeHotspotCard(config) {
  const content = $eye('#ai-eye-feature-content');
  content.replaceChildren();
  const tag = document.createElement('p');
  tag.className = 'ai-eye-feature-tag';
  tag.textContent = config.tag;
  const title = document.createElement('h2');
  title.id = 'ai-eye-feature-title';
  title.textContent = config.title;
  const observation = document.createElement('p');
  observation.textContent = config.observation;
  content.append(tag, title, observation);
  appendEyeSourceList(content, config.observationSources);
  const question = document.createElement('h3');
  question.textContent = config.question;
  const interpretation = document.createElement('p');
  interpretation.textContent = config.interpretation;
  content.append(question, interpretation);
  appendEyeSourceList(content, config.interpretationSources);
  const note = document.createElement('p');
  note.className = 'ai-eye-feature-caveat';
  note.textContent = config.note;
  content.append(note);
  $eye('#ai-eye-feature-dialog').setAttribute('aria-labelledby', title.id);
}

function createEyeHotspot(config) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ai-eye-hotspot';
  button.dataset.eyeHotspot = config.id;
  button.setAttribute('aria-label', config.label);
  const sparkle = document.createElement('span');
  sparkle.setAttribute('aria-hidden', 'true');
  sparkle.textContent = '✦';
  const tooltip = document.createElement('span');
  tooltip.className = 'ai-eye-hotspot-tooltip';
  tooltip.textContent = '点击查看眼部资料';
  button.append(sparkle, tooltip);
  return button;
}

function wireDialogs() {
  const createDialog = $eye('#ai-eye-create-dialog');
  $eye('#ai-eye-create-open').addEventListener('click', () => createDialog.showModal());
  $eye('#ai-eye-create-close').addEventListener('click', () => createDialog.close());
  createDialog.addEventListener('close', () => {
    if (activeRequest) stopGeneration('面板已关闭，本次等待已取消；选项和提示词仍保留。');
  });
  $eye('#ai-eye-create-form').addEventListener('change', event => {
    if (event.target.matches('[name="celestial"],[name="detail_feature"]') && event.target.checked) {
      const selected = $eye('#ai-eye-create-form').querySelectorAll(`[name="${event.target.name}"]:checked`);
      if (selected.length > 3) {
        event.target.checked = false;
        setGenerationMessage(event.target.name === 'celestial' ? '预设天象主题最多选择 3 项；还可补充自定义主题。' : '纹样细节最多选择 3 项。');
      }
    }
    updatePromptPreview();
  });
  $eye('#ai-eye-create-form').addEventListener('input', updatePromptPreview);
  $eye('#ai-eye-create-form').addEventListener('submit', submitGeneration);
  $eye('#ai-eye-copy-prompt').addEventListener('click', copyPrompt);
  $eye('#ai-eye-save').addEventListener('click', async () => {
    if (!currentArtwork || !window.AccountData?.authenticated) {
      $eye('#ai-eye-save-status').textContent = '请先登录账号，再保存作品。';
      return;
    }
    const button = $eye('#ai-eye-save');
    const status = $eye('#ai-eye-save-status');
    button.disabled = true; status.textContent = '正在复制图片并保存到账号私有存储…';
    try {
      const title = $eye('#ai-eye-art-title').value.trim() || `${currentArtwork.fields.celestial_subject.slice(0,72)}纹样`;
      const result = await window.AccountData.request('/api/account/artworks', {method:'POST',body:JSON.stringify({
        title, celestialSubject:currentArtwork.fields.celestial_subject,
        composition:currentArtwork.fields.composition, detail:currentArtwork.fields.detail, generatedAt:currentArtwork.createdAt,
        imageUrl:currentArtwork.imageUrl,
      })});
      currentArtwork.savedId = result.item.id;
      const privateUrl = result.item.imageUrl;
      $eye('#ai-eye-result-image').src = privateUrl;
      const download = $eye('#ai-eye-download');
      const extension = result.item.mimeType === 'image/jpeg' ? 'jpg' : result.item.mimeType === 'image/webp' ? 'webp' : 'png';
      download.href = privateUrl; download.removeAttribute('target'); download.download = `${title}.${extension}`;
      button.textContent = '已保存到我的作品';
      status.textContent = '作品与图片已保存在当前账号，可在个人账号页面查看。';
    } catch (error) {
      button.disabled = false;
      status.textContent = error.message || '作品保存失败，请检查图片链接后重试。';
    }
  });
  window.addEventListener('account-user-changed', () => {
    currentArtwork = null;
    $eye('#ai-eye-create-form').reset();
    $eye('#ai-eye-result').hidden = true;
    $eye('#ai-eye-result-image').removeAttribute('src');
    $eye('#ai-eye-result-label').textContent = '';
    $eye('#ai-eye-save').disabled = true;
    $eye('#ai-eye-save-status').textContent = '';
    try { sessionStorage.removeItem('aiEyeLastArtwork'); } catch {}
    updatePromptPreview();
  });
  $eye('#ai-eye-cancel').addEventListener('click', () => stopGeneration());
  $eye('#ai-eye-echo').addEventListener('click', () => {
    createDialog.close();
    const state = history.state || {};
    history.pushState({...state,page:'ai-exhibition',room:'echo'}, '', `${location.pathname}?page=ai-exhibition&room=echo`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  window.addEventListener('ai-exhibition:reset', () => {
    try { sessionStorage.removeItem('aiEyeLastArtwork'); } catch {}
    const result = $eye('#ai-eye-result');
    if (result) result.hidden = true;
    $eye('#ai-eye-result-image')?.removeAttribute('src');
    $eye('#ai-eye-result-label').textContent = '';
  });

  const featureDialog = $eye('#ai-eye-feature-dialog');
  const hotspotLayer = $eye('#ai-eye-hotspots');
  let activeHotspot = null;
  const closeFeatureDialog = (restoreFocus = true) => {
    const returnTarget = activeHotspot;
    if (featureDialog.open) featureDialog.close();
    featureDialog.classList.remove('is-ready');
    activeHotspot = null;
    if (restoreFocus && returnTarget && !returnTarget.hidden) returnTarget.focus();
  };
  const positionFeatureDialog = () => {
    if (!featureDialog.open || !activeHotspot) return;
    if (activeHotspot.hidden) { closeFeatureDialog(false); return; }
    if (window.matchMedia('(max-width: 680px)').matches) {
      featureDialog.dataset.side = 'mobile';
      featureDialog.style.left = '0px';
      featureDialog.style.top = 'auto';
      featureDialog.style.bottom = '0px';
      return;
    }
    const anchor = activeHotspot.getBoundingClientRect();
    const card = featureDialog.getBoundingClientRect();
    const gap = 13;
    const margin = 16;
    let side = 'right';
    let left = anchor.right + gap;
    if (left + card.width > window.innerWidth - margin) {
      side = 'left';
      left = anchor.left - gap - card.width;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - card.width - margin));
    const top = Math.max(margin, Math.min(anchor.top + anchor.height / 2 - card.height / 2, window.innerHeight - card.height - margin));
    featureDialog.dataset.side = side;
    featureDialog.style.left = `${left}px`;
    featureDialog.style.top = `${top}px`;
    featureDialog.style.bottom = 'auto';
  };
  syncFeatureCardPosition = positionFeatureDialog;
  eyeHotspotConfig.forEach(config => {
    const button = createEyeHotspot(config);
    hotspotLayer.append(button);
    button.addEventListener('click', () => {
      if (activeHotspot === button && featureDialog.open) { closeFeatureDialog(); return; }
      activeHotspot = button;
      renderEyeHotspotCard(config);
      featureDialog.show();
      featureDialog.classList.remove('is-ready');
      positionFeatureDialog();
      requestAnimationFrame(() => {
        positionFeatureDialog();
        featureDialog.classList.add('is-ready');
      });
      $eye('#ai-eye-feature-close').focus();
    });
  });
  $eye('#ai-eye-feature-close').addEventListener('click', () => closeFeatureDialog());
  document.addEventListener('click', event => {
    if (!featureDialog.open || featureDialog.contains(event.target) || event.target.closest?.('[data-eye-hotspot]')) return;
    closeFeatureDialog(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && featureDialog.open) { event.preventDefault(); closeFeatureDialog(); }
  });
  window.addEventListener('resize', positionFeatureDialog);
  featureDialog.addEventListener('close', () => featureDialog.classList.remove('is-ready'));

  const modelMode = $eye('#ai-eye-model-mode');
  modelMode.addEventListener('click', () => {
    const expanded = $eye('#ai-eye-room').classList.toggle('is-model-focus');
    modelMode.setAttribute('aria-pressed', String(expanded));
    modelMode.setAttribute('aria-label', expanded ? '关闭模型观察模式' : '打开模型观察模式');
    modelMode.textContent = expanded ? '关闭观察' : '观察模式';
    sceneState?.resize();
  });
  $eye('#ai-eye-model-reset').addEventListener('click', () => sceneState?.reset());
}

async function loadModel() {
  const canvas = $eye('#ai-eye-model-canvas');
  const fallback = $eye('#ai-eye-model-fallback');
  const error = $eye('#ai-eye-model-error');
  error.textContent = '正在读取纵目面具数字模型素材。';
  modelLoadController = new AbortController();
  try {
    const [THREE, {OBJLoader}, {OrbitControls}] = await Promise.all([
      import('three'),
      import('three/addons/loaders/OBJLoader.js'),
      import('three/addons/controls/OrbitControls.js')
    ]);
    if (!document.body.classList.contains('ai-eye-room-mode')) return;
    const response = await fetch('/assets/ai-exhibition/eye-mask-model.obj', {signal:modelLoadController.signal});
    if (!response.ok) throw new Error(`模型文件读取失败（${response.status}）。`);
    const source = await response.text();
    const object = new OBJLoader().parse(source);
    object.rotation.x = -Math.PI / 2;
    object.updateMatrixWorld(true);
    const sourceBox = new THREE.Box3().setFromObject(object);
    const sourceSize = sourceBox.getSize(new THREE.Vector3());
    const center = sourceBox.getCenter(new THREE.Vector3());
    object.position.sub(center);
    object.scale.setScalar(3.3 / Math.max(sourceSize.x, sourceSize.y, sourceSize.z));
    object.traverse(child => {
      if (!child.isMesh) return;
      child.geometry.computeVertexNormals();
      const hasVertexColor = Boolean(child.geometry.attributes.color);
      child.material = new THREE.MeshStandardMaterial({
        color:hasVertexColor ? 0xd9c6a0 : 0x53685b,
        metalness:.58,
        roughness:.43,
        vertexColors:hasVertexColor,
        side:THREE.DoubleSide
      });
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    camera.position.set(0, .1, 5.8);
    scene.add(new THREE.HemisphereLight(0xe4d8bd, 0x1c211d, 2.1));
    const keyLight = new THREE.DirectionalLight(0xe7d7b6, 2.5);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x53685b, 1.3);
    fillLight.position.set(4, -1, -3);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0xa9854b, 16, 12);
    rimLight.position.set(0, 2.5, -2.5);
    scene.add(rimLight);
    scene.add(object);
    canvas.hidden = false;
    fallback.hidden = true;
    const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.dampingFactor = .065;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 10;
    controls.target.set(0, 0, 0);
    controls.update();
    const eyeMarkers = eyeHotspotConfig.map(config => $eye(`[data-eye-hotspot="${config.id}"]`));
    const eyeMesh = [];
    object.traverse(child => { if (child.isMesh) eyeMesh.push(child); });
    if (!eyeMesh.length) throw new Error('模型中没有可用于热点定位的网格。');
    object.updateMatrixWorld(true);
    // 当前 OBJ 是一个连续 mesh；从其真实三角面沿源模型局部 +Y 方向吸附热点。
    // 若素材未来拆分出独立眼部 mesh，可将探针限定到该 mesh，继续使用同一投影与遮挡逻辑。
    const eyeAnchors = eyeHotspotConfig.map(config => {
      const mesh = eyeMesh[0];
      mesh.updateWorldMatrix(true, false);
      const probe = config.surfaceProbe;
      const sourceOrigin = new THREE.Vector3(probe.x, probe.frontY, probe.z);
      const sourceDirection = new THREE.Vector3(0, 1, 0);
      const worldOrigin = mesh.localToWorld(sourceOrigin.clone());
      const worldDirection = sourceDirection.transformDirection(mesh.matrixWorld);
      const snapRay = new THREE.Raycaster(worldOrigin, worldDirection, 0, 20);
      const hit = snapRay.intersectObjects(eyeMesh, false)[0];
      if (!hit) throw new Error(`无法在 OBJ 网格上吸附 ${config.id} 的眼部探针。`);
      const hitMesh = hit.object;
      const outwardNormal = hit.normal?.clone() || hit.face.normal.clone().transformDirection(hitMesh.matrixWorld);
      if (outwardNormal.dot(worldDirection) > 0) outwardNormal.negate();
      const localSurface = hitMesh.worldToLocal(hit.point.clone());
      const localNormal = hitMesh.worldToLocal(hit.point.clone().add(outwardNormal)).sub(localSurface).normalize();
      // 轻微离开表面，避免深度闪烁；保存到 mesh 局部坐标而非屏幕坐标。
      const surfaceAnchor = hitMesh.worldToLocal(hit.point.clone().addScaledVector(outwardNormal, .012));
      return {mesh:hitMesh, point:surfaceAnchor, normalLocal:localNormal, sourceSurface:localSurface};
    });
    const markerWorldPosition = new THREE.Vector3();
    const towardCamera = new THREE.Vector3();
    const markerNormal = new THREE.Vector3();
    const viewRay = new THREE.Raycaster();
    const placeEyeMarkers = () => {
      camera.updateMatrixWorld();
      object.updateMatrixWorld(true);
      eyeAnchors.forEach((anchor, index) => {
        const marker = eyeMarkers[index];
        markerWorldPosition.copy(anchor.point);
        anchor.mesh.localToWorld(markerWorldPosition);
        const projected = markerWorldPosition.clone().project(camera);
        towardCamera.copy(camera.position).sub(markerWorldPosition).normalize();
        const inView = projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1;
        markerNormal.copy(anchor.normalLocal).transformDirection(anchor.mesh.matrixWorld);
        // 法线以网格局部方向保存，跟随旋转；点位被背面或其他网格遮挡时不显示。
        const facesViewer = markerNormal.dot(towardCamera) > .025;
        let unobstructed = false;
        if (inView && facesViewer) {
          viewRay.set(camera.position, towardCamera.clone().negate());
          viewRay.far = camera.position.distanceTo(markerWorldPosition) + .03;
          const nearestHit = viewRay.intersectObjects(eyeMesh, false)[0];
          unobstructed = Boolean(nearestHit && nearestHit.point.distanceTo(markerWorldPosition) < .022);
        }
        marker.hidden = !inView || !facesViewer || !unobstructed;
        if (!marker.hidden) {
          marker.style.left = `${(projected.x + 1) * 50}%`;
          marker.style.top = `${(1 - projected.y) * 50}%`;
        }
      });
      syncFeatureCardPosition();
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let userActive = false;
    let lastInteraction = 0;
    let frameId = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);
    resize();
    $eye('#ai-eye-hotspots').hidden = false;
    controls.addEventListener('start', () => { userActive = true; lastInteraction = performance.now(); });
    controls.addEventListener('end', () => { userActive = false; lastInteraction = performance.now(); });
    let visibilityFrame = 0;
    const animate = now => {
      frameId = requestAnimationFrame(animate);
      if (!reducedMotion && !userActive && now - lastInteraction > 2200 && document.visibilityState === 'visible') object.rotation.y += .0018;
      controls.update();
      if (++visibilityFrame % 2 === 0) placeEyeMarkers();
      renderer.render(scene, camera);
    };
    frameId = requestAnimationFrame(animate);
    sceneState = {
      reset:() => { controls.reset(); object.rotation.y = 0; lastInteraction = performance.now(); },
      resize,
      dispose:() => {
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        controls.dispose();
        object.traverse(child => { if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); } });
        renderer.dispose();
        sceneState = null;
      }
    };
    $eye('#ai-eye-model-hint').textContent = reducedMotion ? '点击眼部闪光标记查看资料 · 拖动旋转 · 已减少自动转动' : '点击眼部闪光标记查看资料 · 拖动旋转 · 滚轮或双指缩放';
  } catch (errorValue) {
    if (errorValue.name === 'AbortError') return;
    fallback.hidden = false;
    canvas.hidden = true;
    $eye('#ai-eye-hotspots').hidden = true;
    error.textContent = `模型暂时无法显示：${errorValue.message}。当前展厅封面仅作氛围背景，不代表模型图。`;
  }
}

function activateEyeRoom() {
  readServiceStatus();
  const video = $eye('#ai-eye-video');
  const source = video?.querySelector('source[data-src]');
  if (video && source && !source.hasAttribute('src')) {
    source.src = source.dataset.src;
    video.load();
  }
  video?.addEventListener('error', () => {
    const message = $eye('#ai-eye-video-error');
    message.textContent = '背景影像暂时无法读取，当前使用静态封面。';
    message.hidden = false;
  }, {once:true});
  if (video && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.play().catch(() => {
      const message = $eye('#ai-eye-video-error');
      message.textContent = '浏览器未允许背景影像自动播放，当前使用静态封面。';
      message.hidden = false;
    });
  }
  loadModel();
}

function deactivateEyeRoom() {
  $eye('#ai-eye-video')?.pause();
  $eye('#ai-eye-hotspots').hidden = true;
  modelLoadController?.abort();
  modelLoadController = null;
  sceneState?.dispose();
  const dialog = $eye('#ai-eye-create-dialog');
  if (dialog.open) dialog.close();
  const feature = $eye('#ai-eye-feature-dialog');
  if (feature.open) feature.close();
}

wireDialogs();
$eye('#ai-eye-result-image').addEventListener('error', () => {
  setGenerationMessage('作品临时预览地址暂时无法读取；可以尝试通过下载按钮获取，或重新生成。');
});
updatePromptPreview();
window.addEventListener('ai-eye-room:activate', activateEyeRoom);
window.addEventListener('ai-eye-room:deactivate', deactivateEyeRoom);
if (document.body.classList.contains('ai-eye-room-mode')) activateEyeRoom();
