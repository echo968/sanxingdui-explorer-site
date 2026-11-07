import { FIELDWORK_ARTIFACTS, FIELDWORK_CONFIG, FIELDWORK_LAYERS } from './fieldwork-data.js';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const section = $('#fieldwork');
  if (!section) return;

  const ui = {
    canvas: $('#field-scene-canvas'), scene: $('#field-scene'), loading: $('#field-scene-loading'), fallback: $('#field-scene-fallback'),
    layerMarkers: $('#field-layer-hotspots'), layerInfo: $('#field-layer-info-dialog'), layerInfoTitle: $('#field-layer-info-title'), layerInfoIntro: $('#field-layer-info-intro'), layerInfoHint: $('#field-layer-info-hint'), layerInfoClose: $('#field-layer-info-close'),
    error: $('#field-scene-error'), currentLayer: $('#field-current-layer'), layerNote: $('#field-layer-note'), layerList: $('#field-layer-list'),
    progress: $('#field-progress'), progressText: $('#field-progress-text'), progressHint: $('#field-progress-hint'), removedCount: $('#field-removed-count'), depthText: $('#field-depth-text'),
    startDig: $('#field-start-dig'), sceneMode: $('#field-scene-mode'), toolHint: $('#field-tool-hint'), foundCount: $('#field-found-count'),
    inventory: $('#field-inventory'), emptyInventory: $('#field-empty-inventory'), findingsNote: $('#field-findings-note'), modelStatus: $('#field-model-status'), legend: $('#field-scene-legend'),
    reset: $('#field-reset'), resetView: $('#field-reset-view'), brushSize: $('#field-brush-size'), brushValue: $('#field-brush-value'),
    totalProgress: $('#field-total-progress'), brushCursor: $('#field-keyboard-brush'),
    viewer: $('#field-viewer-dialog'), viewerCanvas: $('#field-viewer-canvas'), viewerTitle: $('#field-viewer-title'),
    viewerNote: $('#field-viewer-note'), viewerSource: $('#field-viewer-source'), viewerLoading: $('#field-viewer-loading'),
    viewerStage: $('#field-viewer-stage'), viewerClose: $('#field-viewer-close'), viewerReset: $('#field-viewer-reset'), viewerRetry: $('#field-viewer-retry')
  };

  const WIDTH = 5.8, DEPTH = 4.15, LAYER_HEIGHT = .56;
  const NX = FIELDWORK_CONFIG.gridColumns, NZ = FIELDWORK_CONFIG.gridRows, NY = FIELDWORK_CONFIG.verticalCells;
  const CHUNK_X = FIELDWORK_CONFIG.chunkColumns, CHUNK_Z = FIELDWORK_CONFIG.chunkRows;
  const VOXELS_PER_LAYER = NX * NY * NZ, TOTAL_VOXELS = VOXELS_PER_LAYER * FIELDWORK_LAYERS.length;
  const CELL_X = WIDTH / NX, CELL_Y = LAYER_HEIGHT / NY, CELL_Z = DEPTH / NZ;
  let THREE, OrbitControls, MTLLoader, OBJLoader, GLTFLoader;
  let active = false, initialized = false, initPromise = null, sceneInitGeneration = 0, sceneAbort = null, raf = 0, activeWorker = null, activeWorkerReject = null;
  let renderer, scene, camera, controls, raycaster, soilLayers = [];
  let proxyRoots = new Map(), proxyLoads = new Map(), viewerRenderer, viewerScene, viewerCamera, viewerControls, viewerRoot, viewerResizeObserver, viewerDragAbort, viewerMaterials = [], viewerInitialDistance = 3.25;
  let digging = false, currentTool = 'trowel', toolRange = FIELDWORK_CONFIG.brushDefault, strokePointer = null, artifactGesture = null, mousePosition = { x: .5, y: .5 }, currentViewerItem = null, activeLayerIndex = 0, experienceGeneration = 0;

  // Excavation is intentionally session-only. Old saved state is ignored and removed on entry.
  function freshState() { return { extracted: [] }; }
  function freshRemovedSets() { return Array.from({ length: FIELDWORK_LAYERS.length }, () => new Set()); }
  let state = freshState();
  let removedSets = freshRemovedSets();
  function clearStoredProgress() {
    try {
      localStorage.removeItem(FIELDWORK_CONFIG.saveKey);
      if (FIELDWORK_CONFIG.previousSaveKey) localStorage.removeItem(FIELDWORK_CONFIG.previousSaveKey);
    } catch { /* Storage can be unavailable in private browsing; it is not used for progress. */ }
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function stageTop(index) { return 1.42 - index * LAYER_HEIGHT; }
  function itemById(id) { return FIELDWORK_ARTIFACTS.find(item => item.id === id); }
  function voxelId(x, y, z) { return (y * NZ + z) * NX + x; }
  function voxelCoords(id) { const x = id % NX, z = Math.floor(id / NX) % NZ, y = Math.floor(id / (NX * NZ)); return { x, y, z }; }
  function layerProgress(index) { return removedSets[index]?.size || 0; }
  function layerComplete(index) { return layerProgress(index) >= VOXELS_PER_LAYER; }
  function layerArtifacts(index) { return FIELDWORK_ARTIFACTS.filter(item => item.layerIndex === index); }
  function layerArtifactsComplete(index) { return layerArtifacts(index).every(isItemExtracted); }
  function experienceComplete() { return FIELDWORK_LAYERS.every((_, index) => layerComplete(index) && layerArtifactsComplete(index)); }
  function isSolid(layerIndex, x, y, z) { return x >= 0 && x < NX && y >= 0 && y < NY && z >= 0 && z < NZ && !removedSets[layerIndex].has(voxelId(x, y, z)); }
  function firstIncompleteLayer() { const index = removedSets.findIndex(cells => cells.size < VOXELS_PER_LAYER); return index < 0 ? FIELDWORK_LAYERS.length - 1 : index; }
  function setActiveLayer(index) { activeLayerIndex = clamp(index, 0, FIELDWORK_LAYERS.length - 1); }
  function isItemExtracted(item) { return state.extracted.includes(item.id); }

  const VOXEL_FACES = [
    { d: [1, 0, 0], n: [1, 0, 0], c: [[1,0,0],[1,0,1],[1,1,1],[1,1,0]], shade: .76 },
    { d: [-1, 0, 0], n: [-1, 0, 0], c: [[0,0,1],[0,0,0],[0,1,0],[0,1,1]], shade: .68 },
    { d: [0, -1, 0], n: [0, 1, 0], c: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]], shade: 1.06 },
    { d: [0, 1, 0], n: [0, -1, 0], c: [[0,0,1],[1,0,1],[1,0,0],[0,0,0]], shade: .52 },
    { d: [0, 0, 1], n: [0, 0, 1], c: [[1,0,1],[0,0,1],[0,1,1],[1,1,1]], shade: .82 },
    { d: [0, 0, -1], n: [0, 0, -1], c: [[0,0,0],[1,0,0],[1,1,0],[0,1,0]], shade: .72 }
  ];

  function soilMaterial(index) {
    return new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .96, metalness: 0, flatShading: true });
  }
  function chunkKey(x, z) { return `${x}:${z}`; }
  function makeVoxelChunk(layerIndex, chunkX, chunkZ) {
    const positions = [], normals = [], colors = [], indices = [], color = new THREE.Color(FIELDWORK_LAYERS[layerIndex].color || '#887a62');
    const startX = chunkX * CHUNK_X, endX = Math.min(NX, startX + CHUNK_X), startZ = chunkZ * CHUNK_Z, endZ = Math.min(NZ, startZ + CHUNK_Z), top = stageTop(layerIndex);
    for (let y = 0; y < NY; y += 1) for (let z = startZ; z < endZ; z += 1) for (let x = startX; x < endX; x += 1) {
      if (!isSolid(layerIndex, x, y, z)) continue;
      const x0 = -WIDTH / 2 + x * CELL_X, x1 = x0 + CELL_X, y1 = top - y * CELL_Y, y0 = y1 - CELL_Y, z0 = -DEPTH / 2 + z * CELL_Z, z1 = z0 + CELL_Z;
      const bounds = [[x0,x1],[y0,y1],[z0,z1]], id = voxelId(x, y, z);
      for (let faceIndex = 0; faceIndex < VOXEL_FACES.length; faceIndex += 1) {
        const face = VOXEL_FACES[faceIndex]; if (isSolid(layerIndex, x + face.d[0], y + face.d[1], z + face.d[2])) continue;
        const base = positions.length / 3, variation = .92 + (((id * 31 + faceIndex * 17 + layerIndex * 13) % 19) / 100), shade = face.shade * variation;
        for (const corner of face.c) { positions.push(bounds[0][corner[0]], bounds[1][corner[1]], bounds[2][corner[2]]); normals.push(...face.n); colors.push(color.r * shade, color.g * shade, color.b * shade); }
        // Face corner order must agree with the outward normals so WebGL culling and
        // Raycaster hit the visible surface from outside the soil volume.
        indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); if (positions.length) geometry.computeBoundingSphere(); return geometry;
  }
  function rebuildChunk(layerIndex, key) {
    const layer = soilLayers[layerIndex]; if (!layer) return;
    const oldMesh = layer.chunkMeshes.get(key); if (oldMesh) { scene.remove(oldMesh); oldMesh.geometry.dispose(); layer.chunkMeshes.delete(key); }
    const [chunkX, chunkZ] = key.split(':').map(Number), geometry = makeVoxelChunk(layerIndex, chunkX, chunkZ);
    if (!geometry.getAttribute('position').count) { geometry.dispose(); return; }
    const mesh = new THREE.Mesh(geometry, layer.material); mesh.userData.layerIndex = layerIndex; mesh.userData.chunkKey = key; mesh.castShadow = true; mesh.receiveShadow = true; layer.chunkMeshes.set(key, mesh); scene.add(mesh);
  }
  function rebuildAllChunks() {
    for (let layerIndex = 0; layerIndex < FIELDWORK_LAYERS.length; layerIndex += 1) for (let x = 0; x < Math.ceil(NX / CHUNK_X); x += 1) for (let z = 0; z < Math.ceil(NZ / CHUNK_Z); z += 1) rebuildChunk(layerIndex, chunkKey(x, z));
  }

  function renderLayerLegend() {
    if (!ui.legend) return;
    ui.legend.replaceChildren();
    FIELDWORK_LAYERS.forEach(layer => {
      const entry = document.createElement('span'), swatch = document.createElement('i'), label = document.createElement('b');
      swatch.className = 'legend-soil'; swatch.style.backgroundColor = layer.color; swatch.setAttribute('aria-hidden', 'true');
      label.textContent = layer.label; entry.append(swatch, label); ui.legend.append(entry);
    });
    const model = document.createElement('span'), dot = document.createElement('i'), caption = document.createElement('b');
    dot.className = 'legend-object'; dot.setAttribute('aria-hidden', 'true'); caption.textContent = '体验模型'; model.append(dot, caption); ui.legend.append(model);
  }

  function renderLayerMarkers() {
    if (!ui.layerMarkers) return;
    ui.layerMarkers.replaceChildren();
    FIELDWORK_LAYERS.forEach((layer, index) => {
      if (!layer.markerPosition || !layer.info) return;
      const button = document.createElement('button'), glint = document.createElement('span'), label = document.createElement('span');
      button.type = 'button'; button.className = 'field-layer-hotspot'; button.dataset.layerMarkerIndex = String(index);
      button.setAttribute('aria-label', `查看${layer.label}介绍`); button.title = `查看${layer.label}介绍`;
      glint.className = 'field-layer-hotspot-glint'; glint.setAttribute('aria-hidden', 'true');
      label.className = 'field-layer-hotspot-label'; label.textContent = layer.label;
      button.append(glint, label);
      button.addEventListener('pointerdown', event => { event.stopPropagation(); });
      button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openLayerInfo(index); });
      ui.layerMarkers.append(button);
    });
    ui.layerMarkers.hidden = false;
    positionLayerMarkers();
  }

  function positionLayerMarkers() {
    if (!ui.layerMarkers || ui.layerMarkers.hidden || !camera || !active) return;
    const rect = ui.scene.getBoundingClientRect(); if (rect.width < 2 || rect.height < 2) return;
    camera.updateMatrixWorld(true);
    FIELDWORK_LAYERS.forEach((layer, index) => {
      const button = ui.layerMarkers.querySelector(`[data-layer-marker-index="${index}"]`), anchor = layer.markerPosition;
      if (!button || !anchor) return;
      const x = -WIDTH / 2 + WIDTH * anchor.x;
      const y = stageTop(index) - LAYER_HEIGHT * anchor.y;
      const z = anchor.edge === 'front' ? DEPTH / 2 + .025 : anchor.edge === 'back' ? -DEPTH / 2 - .025 : 0;
      const point = new THREE.Vector3(x, y, z).project(camera);
      const left = (point.x * .5 + .5) * rect.width, top = (-point.y * .5 + .5) * rect.height;
      const hidden = point.z < -1 || point.z > 1 || left < 8 || left > rect.width - 8 || top < 8 || top > rect.height - 8;
      button.hidden = hidden;
      if (!hidden) { button.style.left = `${left}px`; button.style.top = `${top}px`; }
    });
  }

  function openLayerInfo(index) {
    const layer = FIELDWORK_LAYERS[index]; if (!layer?.info || !ui.layerInfo) return;
    // Opening an information card pauses the tool so the same gesture cannot
    // continue into excavation; the removed cells and layer progression remain intact.
    digging = false; strokePointer = null; artifactGesture = null; refreshUI();
    ui.layerInfoTitle.textContent = layer.info.title;
    ui.layerInfoIntro.textContent = layer.info.intro;
    ui.layerInfoHint.textContent = layer.info.hint;
    if (!ui.layerInfo.open) ui.layerInfo.showModal();
    ui.layerInfoClose.focus();
  }

  function buildScene() {
    scene = new THREE.Scene(); scene.background = new THREE.Color('#171a15'); scene.fog = new THREE.Fog('#171a15', 13, 27);
    camera = new THREE.PerspectiveCamera(34, 1, .1, 50); camera.position.set(4.5, 6.6, 8.3); camera.lookAt(0, -.08, 0);
    renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: (window.devicePixelRatio || 1) <= 1.5, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    scene.add(new THREE.HemisphereLight('#d9d3c1', '#2a2118', 2.1));
    const keyLight = new THREE.DirectionalLight('#f0dfbd', 2.25); keyLight.position.set(-3.4, 7.2, 5.6); scene.add(keyLight);
    const fill = new THREE.PointLight('#a9854b', 20, 14, 2); fill.position.set(4, 2.4, -3); scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), new THREE.MeshStandardMaterial({ color: '#141714', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.55; scene.add(floor);
    soilLayers = FIELDWORK_LAYERS.map((layer, index) => ({ id: layer.id, material: soilMaterial(index), chunkMeshes: new Map() }));
    rebuildAllChunks();
    const base = new THREE.Mesh(new THREE.BoxGeometry(WIDTH, .12, DEPTH), new THREE.MeshStandardMaterial({ color: '#403a2e', roughness: 1 }));
    base.position.set(0, stageTop(FIELDWORK_LAYERS.length) + .06, 0); scene.add(base);
    raycaster = new THREE.Raycaster();
    controls = new OrbitControls(camera, ui.canvas); controls.enableDamping = false; controls.enablePan = false; controls.minDistance = 6.6; controls.maxDistance = 15; controls.minPolarAngle = .2; controls.maxPolarAngle = 1.32; controls.target.set(0, -.1, 0); controls.enabled = false;
    controls.addEventListener('change', requestRender);
    sceneAbort = new AbortController();
    ui.canvas.addEventListener('pointerdown', onPointerDown, { capture: true, signal: sceneAbort.signal }); ui.canvas.addEventListener('pointermove', onPointerMove, { signal: sceneAbort.signal });
    ui.canvas.addEventListener('pointerup', onPointerUp, { signal: sceneAbort.signal }); ui.canvas.addEventListener('pointercancel', onPointerUp, { signal: sceneAbort.signal });
    ui.canvas.addEventListener('keydown', onCanvasKeyDown, { signal: sceneAbort.signal });
    ui.canvas.addEventListener('wheel', event => { if (currentTool !== 'observe') event.preventDefault(); }, { passive: false, signal: sceneAbort.signal });
    window.addEventListener('resize', resize, { signal: sceneAbort.signal }); document.addEventListener('visibilitychange', requestRender, { signal: sceneAbort.signal });
    renderLayerLegend(); renderLayerMarkers(); resize(); refreshUI(); syncProxies(); requestRender();
  }

  function resize() {
    if (renderer && active) {
      const rect = ui.scene.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) { renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); requestRender(); }
    }
    if (viewerRenderer && ui.viewer.open) resizeViewer();
  }

  function requestRender() {
    if (!active || document.hidden || raf) return;
    raf = requestAnimationFrame((time) => {
      raf = 0;
      if (!active || document.hidden) return;
      if (!ui.viewer.open && renderer && scene && camera) { positionLayerMarkers(); renderer.render(scene, camera); }
      if (viewerRenderer && ui.viewer.open) { viewerControls?.update(); viewerRenderer.render(viewerScene, viewerCamera); }
    });
  }

  function canvasRay(clientX, clientY) {
    const rect = ui.canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return false;
    raycaster.setFromCamera(new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1), camera); return true;
  }
  function raycastExcavation(clientX, clientY) {
    if (!canvasRay(clientX, clientY)) return null;
    const chunks = soilLayers.flatMap(layer => [...layer.chunkMeshes.values()]), hit = raycaster.intersectObjects(chunks, false)[0];
    if (!hit?.face) return null;
    const point = hit.point.clone().addScaledVector(hit.face.normal, -.002), layerIndex = hit.object.userData.layerIndex;
    const x = clamp(Math.floor((point.x + WIDTH / 2) / CELL_X), 0, NX - 1), z = clamp(Math.floor((point.z + DEPTH / 2) / CELL_Z), 0, NZ - 1), y = clamp(Math.floor((stageTop(layerIndex) - point.y + 1e-5) / CELL_Y), 0, NY - 1);
    if (!isSolid(layerIndex, x, y, z)) return null;
    return { layerIndex, x, y, z };
  }
  function raycastArtifact(clientX, clientY) {
    if (!camera || !proxyRoots.size || !canvasRay(clientX, clientY)) return null;
    const visibleRoots = [...proxyRoots.entries()].filter(([id, root]) => {
      const item = itemById(id);
      return item?.layerIndex === activeLayerIndex && root.visible && getArtifactExposure(item) >= FIELDWORK_CONFIG.artifactRevealThreshold;
    }).map(([, root]) => root);
    const artifactHit = raycaster.intersectObjects(visibleRoots, true)[0]; if (!artifactHit) return null;
    const soilHit = raycaster.intersectObjects(soilLayers.flatMap(layer => [...layer.chunkMeshes.values()]), false)[0];
    if (soilHit && soilHit.distance < artifactHit.distance - .01) return null;
    return artifactHit.object.userData.artifactId || null;
  }

  function exposedChunks(layerIndex, x, y, z) {
    const chunkX = Math.floor(x / CHUNK_X), chunkZ = Math.floor(z / CHUNK_Z), dirty = new Set([chunkKey(chunkX, chunkZ)]);
    if (x % CHUNK_X === 0 && chunkX > 0) dirty.add(chunkKey(chunkX - 1, chunkZ));
    if (x % CHUNK_X === CHUNK_X - 1 && chunkX < Math.ceil(NX / CHUNK_X) - 1) dirty.add(chunkKey(chunkX + 1, chunkZ));
    if (z % CHUNK_Z === 0 && chunkZ > 0) dirty.add(chunkKey(chunkX, chunkZ - 1));
    if (z % CHUNK_Z === CHUNK_Z - 1 && chunkZ < Math.ceil(NZ / CHUNK_Z) - 1) dirty.add(chunkKey(chunkX, chunkZ + 1));
    return dirty;
  }
  function removeAround(voxel, dirty) {
    const { layerIndex, x: cx, y: cy, z: cz } = voxel, radius = Math.max(0, toolRange - 1) + (currentTool === 'trowel' ? 1 : 0);
    let changed = false;
    for (let z = Math.max(0, cz - radius); z <= Math.min(NZ - 1, cz + radius); z += 1) for (let x = Math.max(0, cx - radius); x <= Math.min(NX - 1, cx + radius); x += 1) {
      if (Math.abs(x - cx) + Math.abs(z - cz) > radius) continue;
      let y = cy; while (y < NY && !isSolid(layerIndex, x, y, z)) y += 1;
      if (!isSolid(layerIndex, x, y, z)) continue;
      removedSets[layerIndex].add(voxelId(x, y, z)); dirty.set(layerIndex, [...(dirty.get(layerIndex) || []), ...exposedChunks(layerIndex, x, y, z)]); changed = true;
    }
    return changed;
  }
  function removeAlong(from, to) {
    if (to.layerIndex !== activeLayerIndex) {
      const waitingForArtifacts = layerComplete(activeLayerIndex) && !layerArtifactsComplete(activeLayerIndex);
      ui.progressHint.textContent = to.layerIndex > activeLayerIndex && waitingForArtifacts
        ? `${FIELDWORK_LAYERS[activeLayerIndex].label}土块已挖完；请先逐件点击并处理本层文物，之后才会开放${FIELDWORK_LAYERS[to.layerIndex]?.label || '下一层'}。`
        : to.layerIndex > activeLayerIndex
          ? `${FIELDWORK_LAYERS[activeLayerIndex].label}尚未挖完，请先完成当前层。`
          : `当前可挖层位为${FIELDWORK_LAYERS[activeLayerIndex].label}。`;
      return false;
    }
    if (from.layerIndex !== to.layerIndex) from = to;
    const dirty = new Map(), dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z, steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz), 1);
    let changed = false;
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps, voxel = { layerIndex: to.layerIndex, x: Math.round(from.x + dx * t), y: Math.round(from.y + dy * t), z: Math.round(from.z + dz * t) };
      if (voxel.x < 0 || voxel.x >= NX || voxel.y < 0 || voxel.y >= NY || voxel.z < 0 || voxel.z >= NZ) continue;
      changed = removeAround(voxel, dirty) || changed;
    }
    if (!changed) return false;
    for (const [layerIndex, keys] of dirty) for (const key of new Set(keys)) rebuildChunk(layerIndex, key);
    const excavatedLayer = to.layerIndex;
    syncProxies();
    if (layerComplete(excavatedLayer)) {
      if (layerArtifactsComplete(excavatedLayer)) {
        advanceLayer(excavatedLayer);
      } else {
        refreshUI();
        ui.progressHint.textContent = `${FIELDWORK_LAYERS[excavatedLayer].label}土块已全部挖完；请点击并处理本层剩余文物，下一层才会开放。`;
      }
    } else updateProgress('土体已按拖动路径移除；凹坑和层间截面已更新。');
    requestRender(); return true;
  }

  function advanceLayer(index) {
    if (index !== activeLayerIndex || !layerComplete(index) || !layerArtifactsComplete(index)) return false;
    if (index >= FIELDWORK_LAYERS.length - 1) {
      refreshUI();
      ui.progressHint.textContent = '最后一层土体和本层文物均已处理，体验完成。';
      return true;
    }
    setActiveLayer(index + 1);
    refreshUI();
    ui.progressHint.textContent = `${FIELDWORK_LAYERS[index].label}土块与本层文物均已处理；${FIELDWORK_LAYERS[activeLayerIndex].label}现已开放。`;
    return true;
  }

  function finishArtifactAction(item) {
    if (advanceLayer(item.layerIndex)) return;
    ui.progressHint.textContent = layerComplete(item.layerIndex)
      ? `${item.name}已处理；请继续点击并处理本层剩余文物，下一层才会开放。`
      : `${item.name}已处理；请继续完成本层土块，之后再处理本层其他文物。`;
  }

  function onPointerDown(event) {
    if (!initialized || event.button > 0) return;
    const rect = ui.scene.getBoundingClientRect(); mousePosition = { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
    const artifactId = raycastArtifact(event.clientX, event.clientY);
    if (artifactId) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (currentTool === 'observe') artifactGesture = { id: artifactId, x: event.clientX, y: event.clientY };
      else { const item = itemById(artifactId); if (item) activateArtifact(item); }
      return;
    }
    if (currentTool === 'observe') return;
    if (!digging) { ui.progressHint.textContent = '请先点击“开始挖掘”，再沿土体表面拖动工具。'; return; }
    const voxel = raycastExcavation(event.clientX, event.clientY);
    if (!voxel) { ui.progressHint.textContent = '没有命中土体。请从土块表面开始拖动；坑外区域不会改变进度。'; return; }
    if (voxel.layerIndex !== activeLayerIndex) { removeAlong(voxel, voxel); return; }
    strokePointer = { id: event.pointerId, voxel }; ui.canvas.setPointerCapture(event.pointerId); removeAlong(voxel, voxel); event.preventDefault();
  }

  function onPointerMove(event) {
    const rect = ui.scene.getBoundingClientRect(); mousePosition = { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
    if (artifactGesture && Math.hypot(event.clientX - artifactGesture.x, event.clientY - artifactGesture.y) > 6) artifactGesture = null;
    if (currentTool !== 'observe' && digging) ui.brushCursor.classList.add('is-visible');
    if (!strokePointer || strokePointer.id !== event.pointerId) return;
    const voxel = raycastExcavation(event.clientX, event.clientY);
    if (!voxel) { ui.progressHint.textContent = '工具已离开土体；把指针移回土面可继续挖掘。'; return; }
    if (voxel.layerIndex !== activeLayerIndex) { removeAlong(strokePointer.voxel, voxel); strokePointer.voxel = voxel; return; }
    removeAlong(strokePointer.voxel, voxel); strokePointer.voxel = voxel; event.preventDefault();
  }

  function onPointerUp(event) {
    if (artifactGesture) { const item = itemById(artifactGesture.id); artifactGesture = null; if (item) activateArtifact(item); event.stopPropagation(); }
    if (!strokePointer || strokePointer.id !== event.pointerId) return;
    strokePointer = null; if (ui.canvas.hasPointerCapture(event.pointerId)) ui.canvas.releasePointerCapture(event.pointerId);
  }

  function onCanvasKeyDown(event) {
    if (currentTool === 'observe') return;
    const step = event.shiftKey ? 9 : 3;
    if (event.key === 'ArrowLeft') mousePosition.x = clamp(mousePosition.x - step, 1, 99);
    else if (event.key === 'ArrowRight') mousePosition.x = clamp(mousePosition.x + step, 1, 99);
    else if (event.key === 'ArrowUp') mousePosition.y = clamp(mousePosition.y - step, 1, 99);
    else if (event.key === 'ArrowDown') mousePosition.y = clamp(mousePosition.y + step, 1, 99);
    else if (event.code === 'Space') { event.preventDefault(); if (!digging) { ui.progressHint.textContent = '请先点击“开始挖掘”。'; return; } const rect = ui.canvas.getBoundingClientRect(), voxel = raycastExcavation(rect.left + rect.width * mousePosition.x / 100, rect.top + rect.height * mousePosition.y / 100); if (voxel) removeAlong(voxel, voxel); else ui.progressHint.textContent = '没有命中土体。请用方向键把工具移到土块表面，再按空格挖掘。'; return; }
    else return;
    event.preventDefault(); ui.brushCursor.style.left = `${mousePosition.x}%`; ui.brushCursor.style.top = `${mousePosition.y}%`; ui.brushCursor.classList.add('is-visible');
  }

  function updateProgress(message = '') {
    const count = layerProgress(activeLayerIndex), percent = Math.round(count / VOXELS_PER_LAYER * 100), totalRemoved = removedSets.reduce((sum, set) => sum + set.size, 0);
    ui.progress.value = percent; ui.progressText.textContent = `${percent}%`; ui.removedCount.textContent = `${totalRemoved.toLocaleString()} / ${TOTAL_VOXELS.toLocaleString()}`;
    ui.depthText.textContent = FIELDWORK_LAYERS[activeLayerIndex]?.label || '体验完成';
    const completedLayers = FIELDWORK_LAYERS.filter((_, index) => layerComplete(index) && layerArtifactsComplete(index)).length;
    ui.totalProgress.textContent = `整体进度 ${completedLayers} / ${FIELDWORK_LAYERS.length} 层`;
    const waitingForArtifacts = layerComplete(activeLayerIndex) && !layerArtifactsComplete(activeLayerIndex);
    ui.progressHint.textContent = message || (waitingForArtifacts
      ? '本层土块已挖完；请点击并处理本层所有已显露文物，之后才能继续下一层。'
      : count ? `当前层已移除 ${count} / ${VOXELS_PER_LAYER} 块示意土体；完成本层并处理文物后才开放下层。` : '按住并拖动工具，每次只移除覆盖区域内的土块。');
    refreshArtifacts(); refreshLayerList();
  }

  function refreshUI() {
    const totalRemoved = removedSets.reduce((sum, set) => sum + set.size, 0), complete = experienceComplete(), waitingForArtifacts = layerComplete(activeLayerIndex) && !layerArtifactsComplete(activeLayerIndex);
    ui.currentLayer.textContent = complete ? '体验完成' : FIELDWORK_LAYERS[activeLayerIndex].label;
    ui.layerNote.textContent = complete ? '连续土体已全部移除。层位和器物摆放均为体验示意。' : FIELDWORK_LAYERS[activeLayerIndex].note;
    ui.startDig.disabled = complete || waitingForArtifacts; ui.startDig.textContent = complete ? '体验已完成' : waitingForArtifacts ? '先处理本层文物' : digging ? '暂停挖掘' : totalRemoved ? '继续挖掘' : '开始挖掘';
    ui.startDig.setAttribute('aria-pressed', String(digging));
    ui.sceneMode.textContent = complete ? '体验完成' : waitingForArtifacts ? '等待处理本层文物' : !digging ? '等待操作' : `${currentTool === 'trowel' ? '小铲' : currentTool === 'brush' ? '鬃刷' : '观察'} · ${FIELDWORK_LAYERS[activeLayerIndex].label}`;
    updateProgress();
  }

  function refreshLayerList() {
    ui.layerList.setAttribute('aria-label', `${FIELDWORK_LAYERS.length} 层体验进度`);
    ui.layerList.replaceChildren();
    FIELDWORK_LAYERS.forEach((layer, index) => {
      const count = layerProgress(index), percent = Math.round(count / VOXELS_PER_LAYER * 100), li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.disabled = index !== activeLayerIndex; button.setAttribute('aria-current', index === activeLayerIndex ? 'step' : 'false'); button.setAttribute('aria-label', `${layer.label}，已移除 ${count} / ${VOXELS_PER_LAYER} 块示意土体`);
      const n = document.createElement('small'), name = document.createElement('span'), status = document.createElement('em'); n.textContent = String(index + 1).padStart(2, '0'); name.textContent = layer.label;
      status.textContent = layerComplete(index) && !layerArtifactsComplete(index) ? '待处理文物' : layerComplete(index) ? '已完成' : count ? `${percent}%` : index === activeLayerIndex ? '当前可挖' : '待解锁'; button.append(n, name, status);
      button.title = index === activeLayerIndex ? layerComplete(index) && !layerArtifactsComplete(index) ? `${layer.label}土块已完成，请先点击并处理本层文物` : `${layer.label}当前开放` : `${layer.label}需等待上一层土块挖完并处理该层文物后解锁`;
      li.append(button); ui.layerList.append(li);
    });
  }

  function getArtifactExposure(item) {
    const root = proxyRoots.get(item?.id); if (!root || !item) return 0;
    root.updateMatrixWorld(true); const bounds = new THREE.Box3().setFromObject(root.userData.proxyMesh || root), layerIndex = item.layerIndex, top = stageTop(layerIndex);
    const minX = clamp(Math.floor((bounds.min.x + WIDTH / 2) / CELL_X), 0, NX - 1), maxX = clamp(Math.floor((bounds.max.x + WIDTH / 2) / CELL_X), 0, NX - 1);
    const minZ = clamp(Math.floor((bounds.min.z + DEPTH / 2) / CELL_Z), 0, NZ - 1), maxZ = clamp(Math.floor((bounds.max.z + DEPTH / 2) / CELL_Z), 0, NZ - 1);
    const minY = clamp(Math.floor((top - bounds.max.y) / CELL_Y), 0, NY - 1), maxY = clamp(Math.floor((top - bounds.min.y) / CELL_Y), 0, NY - 1);
    let total = 0, removed = 0;
    for (let y = minY; y <= maxY; y += 1) for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) { total += 1; if (removedSets[layerIndex].has(voxelId(x, y, z))) removed += 1; }
    return total ? removed / total : 0;
  }

  function itemColumnReached(item) {
    const x = clamp(Math.floor((item.experiencePosition[0] + WIDTH / 2) / CELL_X), 0, NX - 1), z = clamp(Math.floor((item.experiencePosition[2] + DEPTH / 2) / CELL_Z), 0, NZ - 1);
    for (let layer = 0; layer < item.layerIndex; layer += 1) for (let y = 0; y < NY; y += 1) if (isSolid(layer, x, y, z)) return false;
    return Array.from({ length: NY }, (_, y) => y).some(y => removedSets[item.layerIndex].has(voxelId(x, y, z)));
  }

  function refreshArtifacts() {
    const available = FIELDWORK_ARTIFACTS.filter(item => isItemExtracted(item) || (proxyRoots.has(item.id) && getArtifactExposure(item) > 0));
    ui.foundCount.textContent = String(available.length); ui.emptyInventory.hidden = available.length > 0;
    ui.findingsNote.textContent = available.length ? '土体中的代理随周围土块移除逐步显露；已提取模型可从此重新查看。' : '继续在器物堆积层附近挖掘；文物代理不会在土体完整时显示。';
    ui.inventory.replaceChildren();
    available.forEach(item => {
      const extracted = isItemExtracted(item), exposure = getArtifactExposure(item), li = document.createElement('li'), button = document.createElement('button');
      const layerLocked = !extracted && item.layerIndex !== activeLayerIndex;
      button.type = 'button'; button.className = extracted ? 'is-proxy is-revealed is-extracted' : 'is-proxy is-revealed'; button.disabled = extracted ? item.interaction !== 'inspect' : layerLocked || exposure < FIELDWORK_CONFIG.artifactRevealThreshold;
      button.dataset.fieldArtifactId = item.id;
      button.setAttribute('aria-label', extracted ? (item.interaction === 'inspect' ? `重新打开已取出的${item.name}介绍与三维模型` : `${item.name}已从场景移除`) : layerLocked ? `${item.name}位于未开放层位` : `已显露 ${Math.round(exposure * 100)}%，${item.interaction === 'inspect' ? '提取并查看' : '点击移除'}${item.name}`);
      const group = document.createElement('small'); group.textContent = item.code;
      const copy = document.createElement('span'), name = document.createElement('b'), layer = document.createElement('em'); name.textContent = item.name; layer.textContent = `${FIELDWORK_LAYERS[item.layerIndex].label} · 体验层位暂定`;
      copy.append(name, layer); const status = document.createElement('i'); status.textContent = extracted ? (item.interaction === 'inspect' ? '已取出 · 查看模型' : '已移除') : layerLocked ? '待解锁' : button.disabled ? `显露 ${Math.round(exposure * 100)}%` : item.interaction === 'inspect' ? '提取并查看' : '点击移除'; button.append(group, copy, status);
      li.append(button); ui.inventory.append(li);
    });
    ui.emptyInventory.textContent = '当前土体尚无已显露的体验模型。';
  }

  function extractFromScene(item) {
    if (!item || isItemExtracted(item)) return false;
    const root = proxyRoots.get(item.id);
    if (root) root.visible = false;
    state.extracted.push(item.id);
    refreshUI(); requestRender();
    finishArtifactAction(item);
    return true;
  }

  function activateArtifact(item) {
    if (!item || isItemExtracted(item)) {
      if (item?.interaction === 'inspect') openFieldwork3DViewer(item);
      return;
    }
    if (item.layerIndex !== activeLayerIndex) {
      ui.progressHint.textContent = `${FIELDWORK_LAYERS[item.layerIndex].label}尚未开放；请先挖完当前层并处理本层文物。`;
      return;
    }
    if (getArtifactExposure(item) < FIELDWORK_CONFIG.artifactRevealThreshold) {
      ui.progressHint.textContent = '继续清理模型周围土块，露出后才能选择。';
      return;
    }
    if (item.interaction === 'inspect') openFieldwork3DViewer(item);
    else extractFromScene(item);
  }

  function resetExperience(rebuild = true) {
    experienceGeneration += 1;
    clearStoredProgress();
    if (strokePointer && ui.canvas.hasPointerCapture(strokePointer.id)) ui.canvas.releasePointerCapture(strokePointer.id);
    strokePointer = null; artifactGesture = null; digging = false;
    if (ui.viewer.open) releaseViewerResources(true);
    else if (viewerRenderer || viewerRoot) releaseViewerResources(false);
    for (const root of proxyRoots.values()) { scene?.remove(root); disposeTree(root); }
    proxyRoots.clear(); proxyLoads.clear();
    state = freshState(); removedSets = freshRemovedSets(); activeLayerIndex = 0;
    currentTool = 'trowel'; toolRange = FIELDWORK_CONFIG.brushDefault;
    if (controls) controls.enabled = false;
    section.querySelectorAll('[data-field-tool]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.fieldTool === currentTool)));
    ui.brushSize.value = String(toolRange); ui.brushValue.value = String(toolRange); ui.brushValue.textContent = String(toolRange);
    ui.brushCursor.classList.remove('is-visible');
    if (rebuild && scene) {
      for (const layer of soilLayers) {
        for (const mesh of layer.chunkMeshes.values()) { scene.remove(mesh); mesh.geometry.dispose(); }
        layer.chunkMeshes.clear();
      }
      rebuildAllChunks();
    }
    refreshUI(); requestRender();
  }

  function setTool(tool) {
    currentTool = tool; if (controls) controls.enabled = tool === 'observe'; if (tool === 'observe') digging = false;
    section.querySelectorAll('[data-field-tool]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.fieldTool === tool)));
    ui.sceneMode.textContent = !digging ? '等待开始' : tool === 'observe' ? '观察模式' : `${tool === 'trowel' ? '小铲' : '鬃刷'} · 挖掘中`;
    ui.toolHint.textContent = tool === 'observe' ? '拖动旋转土体 · 滚轮或双指缩放 · 点击充分显露的文物提取。' : tool === 'trowel' ? '按住并拖动小铲，铲过的体素会从土体中移除并形成凹坑。' : '鬃刷逐块清理较小范围；坑壁和下方层位会随挖掘显露。';
    ui.canvas.style.cursor = tool === 'observe' ? 'grab' : 'crosshair'; if (tool === 'observe') ui.brushCursor.classList.remove('is-visible');
    refreshUI(); requestRender();
  }

  function syncProxies() {
    if (!initialized) return;
    for (const item of FIELDWORK_ARTIFACTS) if (!isItemExtracted(item) && itemColumnReached(item)) {
      loadProxy(item).then(root => {
        if (!root || !item.sceneModelUrl || isItemExtracted(item) || getArtifactExposure(item) < FIELDWORK_CONFIG.artifactRevealThreshold) return;
        return loadSceneArtifactModel(item, root);
      }).catch(error => { ui.modelStatus.textContent = `${item.name}的三维模型加载失败：${error.message}（${item.sceneModelUrl || item.proxyUrl}）`; });
    }
    refreshArtifacts();
  }

  function loadProxy(item) {
    if (proxyRoots.has(item.id)) return Promise.resolve(proxyRoots.get(item.id));
    if (proxyLoads.has(item.id)) return proxyLoads.get(item.id);
    const generation = experienceGeneration;
    let task;
    task = fetch(item.proxyUrl).then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }).then(data => {
      if (!active || !scene || generation !== experienceGeneration) return null;
      const positions = new Float32Array(data.vertices.flat()); const indices = new Uint32Array(data.faces.flat());
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setIndex(new THREE.BufferAttribute(indices, 1)); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const material = new THREE.MeshStandardMaterial({ color: item.proxyColor || '#9e8b60', roughness: .82, metalness: item.proxyMetalness ?? .12, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material); mesh.userData.artifactId = item.id; mesh.castShadow = true; mesh.receiveShadow = true;
      const root = new THREE.Group(); root.name = `${item.name}-reveal-proxy`; root.add(mesh);
      const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      const scale = FIELDWORK_CONFIG.proxyScale / Math.max(size.x, size.y, size.z, .001); root.scale.setScalar(scale);
      const experienceCenterY = stageTop(item.layerIndex) + item.experiencePosition[1] * LAYER_HEIGHT;
      root.position.set(item.experiencePosition[0] - center.x * scale, experienceCenterY - center.y * scale, item.experiencePosition[2] - center.z * scale);
      root.traverse(child => { if (child.isMesh) child.userData.artifactId = item.id; });
      root.userData.itemId = item.id; root.userData.experiencePlacement = true; root.userData.proxyMesh = mesh; root.userData.proxyCenter = center.clone(); root.userData.proxyMaxDimension = Math.max(size.x, size.y, size.z, .001); root.visible = !isItemExtracted(item); scene.add(root); proxyRoots.set(item.id, root); requestRender(); refreshArtifacts(); return root;
    }).finally(() => { if (proxyLoads.get(item.id) === task) proxyLoads.delete(item.id); });
    proxyLoads.set(item.id, task); return task;
  }

  function loadSceneArtifactModel(item, root) {
    if (root.userData.displayModelReady || root.userData.displayModelLoading) return root.userData.displayModelLoading || Promise.resolve(root);
    const generation = experienceGeneration;
    root.userData.displayModelLoading = new GLTFLoader().loadAsync(item.sceneModelUrl).then(gltf => {
      if (!active || generation !== experienceGeneration || isItemExtracted(item) || proxyRoots.get(item.id) !== root) { disposeTree(gltf.scene); return null; }
      const model = gltf.scene; model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      const scale = root.userData.proxyMaxDimension / Math.max(size.x, size.y, size.z, .001);
      model.scale.setScalar(scale); model.position.copy(root.userData.proxyCenter).sub(center.multiplyScalar(scale)); model.updateMatrixWorld(true);
      model.traverse(child => { if (child.isMesh) { child.userData.artifactId = item.id; child.castShadow = true; child.receiveShadow = true; } });
      root.add(model); root.userData.displayModel = model; root.userData.displayModelReady = true;
      if (root.userData.proxyMesh) root.userData.proxyMesh.visible = false;
      ui.modelStatus.textContent = `${item.name}已显露优化三维网格。`; refreshArtifacts(); requestRender(); return root;
    }).catch(error => {
      root.userData.displayModelLoading = null;
      ui.modelStatus.textContent = `${item.name}优化 GLB 加载失败：${error?.message || '未知错误'}。文件：${item.sceneModelUrl}`;
      requestRender(); throw error;
    });
    return root.userData.displayModelLoading;
  }

  function beginDig() {
    if (experienceComplete() || (layerComplete(activeLayerIndex) && !layerArtifactsComplete(activeLayerIndex))) return;
    digging = !digging; if (!digging) strokePointer = null;
    if (currentTool === 'observe' && digging) setTool('brush');
    refreshUI();
    ui.progressHint.textContent = digging ? '沿土块表面拖动工具；每次操作只移除覆盖范围内的土体。' : '挖掘已暂停；已移除的土块会保留。';
  }

  function loadObjInWorker(item) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./fieldwork-model-worker.js', import.meta.url), { type: 'module' }); activeWorker = worker;
      activeWorkerReject = reject;
      worker.onmessage = ({ data }) => {
        if (data.id !== item.id) { ui.viewerLoading.textContent = `收到其他模型的解析消息（${data.id}），继续等待当前文物…`; return; }
        if (data.state === 'fetching') ui.viewerLoading.textContent = `正在读取「${item.name}」模型文件…`;
        else if (data.state === 'parsing') ui.viewerLoading.textContent = `正在解析「${item.name}」完整三维网格…`;
        else if (data.state === 'ready') { ui.viewerLoading.textContent = '网格已解析，正在构建模型与材质…'; worker.terminate(); activeWorker = null; activeWorkerReject = null; resolve(data.meshes); }
        else if (data.state === 'error') { worker.terminate(); activeWorker = null; activeWorkerReject = null; reject(new Error(data.message)); }
      };
      worker.onerror = event => { worker.terminate(); activeWorker = null; activeWorkerReject = null; reject(new Error(event.message || '模型工作线程读取失败')); };
      worker.postMessage({ id: item.id, url: item.modelUrl });
    }).catch(async workerError => {
      // Closing the viewer cancels the pending worker. Do not turn that cancellation
      // into a second full-size download on the main thread.
      if (workerError?.name === 'AbortError') throw workerError;
      ui.viewerLoading.textContent = '切换兼容读取方式载入模型…';
      try {
        const response = await fetch(item.modelUrl); if (!response.ok) throw new Error(`模型文件读取失败（HTTP ${response.status}）`);
        const bytes = new Uint8Array(await response.arrayBuffer()), isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
        let text;
        if (isGzip) {
          if (!('DecompressionStream' in window)) throw new Error('此浏览器不支持压缩模型读取');
          text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
        } else text = new TextDecoder().decode(bytes);
        // Preserve the source's triangle surface and discard optional wire edges.
        // OBJLoader treats a mixed face/line object as LineSegments as a whole.
        text = text.replace(/^[ \t]*l[ \t].*$/gm, '');
        const root = new OBJLoader().parse(text); root.updateMatrixWorld(true); const meshes = [];
        root.traverse(child => {
          if (!child.isMesh) return;
          const geometry = child.geometry.clone(); geometry.applyMatrix4(child.matrixWorld); if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
          const position = new Float32Array(geometry.getAttribute('position').array), normal = new Float32Array(geometry.getAttribute('normal').array), uvAttr = geometry.getAttribute('uv'), uv = uvAttr ? new Float32Array(uvAttr.array) : new Float32Array();
          const index = geometry.index ? new geometry.index.array.constructor(geometry.index.array) : null; meshes.push({ position, normal, uv, index, indexType: index?.constructor.name || null }); geometry.dispose();
        });
        if (!meshes.length) throw new Error('OBJ 文件中没有可显示的网格'); return meshes;
      } catch (fallbackError) { throw new Error(fallbackError?.message || workerError?.message || '模型读取失败'); }
    });
  }

  function makeModelRoot(meshData, material) {
    const root = new THREE.Group();
    meshData.forEach(record => {
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(record.position), 3)); geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(record.normal), 3));
      if (record.uv?.byteLength) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(record.uv), 2));
      if (record.index) { const Index = record.indexType === 'Uint16Array' ? Uint16Array : Uint32Array; geometry.setIndex(new THREE.BufferAttribute(new Index(record.index), 1)); }
      geometry.computeBoundingSphere(); const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    });
    const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3()), scale = 2 / Math.max(size.x, size.y, size.z, .001);
    root.scale.setScalar(scale); root.position.copy(center).multiplyScalar(-scale); root.updateMatrixWorld(true); return root;
  }

  function makeGLTFViewerRoot(modelScene) {
    modelScene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(modelScene), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    if (bounds.isEmpty() || !Number.isFinite(size.length()) || size.length() < .0001) throw new Error('GLB 中没有有效的三维网格');
    const scale = 2 / Math.max(size.x, size.y, size.z, .001), centered = new THREE.Group(), orientation = new THREE.Group();
    centered.add(modelScene); centered.scale.setScalar(scale); centered.position.copy(center).multiplyScalar(-scale); orientation.add(centered);
    orientation.userData.viewerBounds = new THREE.Vector3(size.x * scale, size.y * scale, size.z * scale);
    return orientation;
  }

  async function loadViewerModel(item) {
    ui.viewerRetry.hidden = true; ui.viewerLoading.hidden = false; ui.viewerLoading.textContent = '正在准备模型文件…';
    releaseViewerResources(false); currentViewerItem = item;
    try {
      let meshData, material, gltfScene = null;
      if (item.viewerFormat === 'glb') {
        ui.viewerLoading.textContent = `正在读取多角度重建 GLB：${item.modelUrl}`;
        const gltf = await new GLTFLoader().loadAsync(item.modelUrl); gltfScene = gltf.scene;
        if (!ui.viewer.open || currentViewerItem?.id !== item.id) { disposeTree(gltfScene); return; }
      } else if (item.materialUrl) {
        const base = item.materialUrl.slice(0, item.materialUrl.lastIndexOf('/') + 1), loader = new MTLLoader(); loader.setPath(base); loader.setResourcePath(base);
        const loaded = await Promise.all([loadObjInWorker(item), loader.loadAsync(item.materialUrl.slice(item.materialUrl.lastIndexOf('/') + 1))]);
        meshData = loaded[0]; const materials = loaded[1]; materials.preload();
        if (!ui.viewer.open || currentViewerItem?.id !== item.id) { Object.values(materials.materials).forEach(disposeMaterial); return; }
        if (item.materialName && !materials.materials[item.materialName]) {
          Object.values(materials.materials).forEach(disposeMaterial);
          throw new Error(`材质文件 ${item.materialUrl} 中缺少 OBJ 所需材质“${item.materialName}”`);
        }
        material = materials.materials[item.materialName] || materials.materials.Mat || Object.values(materials.materials)[0];
        if (!material) throw new Error(`材质文件 ${item.materialUrl} 没有可用材质`);
        viewerMaterials = [...new Set(Object.values(materials.materials))];
        viewerMaterials.forEach(mat => { mat.side = THREE.DoubleSide; if ('roughness' in mat) mat.roughness = .76; if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace; });
      } else {
        meshData = await loadObjInWorker(item);
        if (!ui.viewer.open || currentViewerItem?.id !== item.id) return;
        material = new THREE.MeshStandardMaterial({ color: item.viewerColor || '#d8c9a7', roughness: .82, metalness: .02, side: THREE.DoubleSide });
        viewerMaterials = [material];
      }
      ui.viewerLoading.textContent = '网格与材质已读取，正在整理器物视角…';
      if (!ui.viewer.open || currentViewerItem?.id !== item.id) { viewerMaterials.forEach(disposeMaterial); viewerMaterials = []; return; }
      // showModal() has already made the viewer measurable. Avoid waiting for
      // animation frames here: background/embedded tabs may pause rAF indefinitely.
      await new Promise(resolve => setTimeout(resolve, 0));
      if (!ui.viewer.open || currentViewerItem?.id !== item.id) { viewerMaterials.forEach(disposeMaterial); viewerMaterials = []; return; }
      const stageRect = ui.viewerStage.getBoundingClientRect();
      if (stageRect.width < 32 || stageRect.height < 32) throw new Error('查看器区域尺寸不足；请关闭后重新打开文物资料卡。');
      viewerRenderer = new THREE.WebGLRenderer({ canvas: ui.viewerCanvas, alpha: false, antialias: true, powerPreference: 'low-power' }); viewerRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2)); viewerRenderer.outputColorSpace = THREE.SRGBColorSpace; viewerRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      viewerScene = new THREE.Scene(); viewerScene.background = new THREE.Color('#1a1d18'); viewerScene.add(new THREE.HemisphereLight('#d9d0bd', '#241d15', 2)); const light = new THREE.DirectionalLight('#fff0d1', 2.3); light.position.set(-3, 4, 5); viewerScene.add(light);
      viewerCamera = new THREE.PerspectiveCamera(34, stageRect.width / stageRect.height, .01, 100);
      viewerRoot = gltfScene ? makeGLTFViewerRoot(gltfScene) : makeModelRoot(meshData, material);
      viewerRoot.rotation.set(...(item.viewerRotation || [0, 0, 0])); viewerScene.add(viewerRoot);
      const fittedBounds = new THREE.Box3().setFromObject(viewerRoot), fittedSize = fittedBounds.getSize(new THREE.Vector3()), aspect = stageRect.width / stageRect.height;
      const verticalFit = fittedSize.y / (2 * Math.tan(THREE.MathUtils.degToRad(viewerCamera.fov / 2)));
      const horizontalFit = fittedSize.x / (2 * Math.tan(THREE.MathUtils.degToRad(viewerCamera.fov / 2)) * Math.max(aspect, .1));
      viewerInitialDistance = Math.max(verticalFit, horizontalFit, fittedSize.z * .55, 1) * 1.22;
      viewerCamera.near = Math.max(.001, viewerInitialDistance / 250); viewerCamera.far = viewerInitialDistance * 30;
      viewerCamera.position.set(0, 0, viewerInitialDistance); viewerCamera.lookAt(0, 0, 0); viewerCamera.updateProjectionMatrix();
      viewerRenderer.setSize(stageRect.width, stageRect.height, false);
      // Rotate the loaded artifact directly from pointer input. This avoids browsers
      // or embedded canvases swallowing OrbitControls' mouse/touch gesture handlers.
      viewerControls = new OrbitControls(viewerCamera, ui.viewerCanvas); viewerControls.enabled = false;
      bindViewerCanvasControls();
      viewerResizeObserver = new ResizeObserver(resizeViewer); viewerResizeObserver.observe(ui.viewerStage); resizeViewer(); ui.viewerLoading.hidden = true; renderViewer();
    } catch (error) {
      if (!ui.viewer.open || currentViewerItem?.id !== item.id) return;
      ui.viewerLoading.hidden = false; ui.viewerLoading.textContent = `模型载入失败：${error?.message || '未知错误'}。文件：${item.modelUrl}`; ui.viewerRetry.hidden = false;
    }
  }

  function disposeMaterial(material) { if (!material) return; for (const value of Object.values(material)) if (value?.isTexture) value.dispose(); material.dispose?.(); }
  function disposeTree(root) { const materials = new Set(); root?.traverse?.(node => { node.geometry?.dispose?.(); if (Array.isArray(node.material)) node.material.forEach(material => materials.add(material)); else if (node.material) materials.add(node.material); }); materials.forEach(disposeMaterial); }

  function openFieldwork3DViewer(item) {
    if (!initialized) return;
    if (item.interaction !== 'inspect') return;
    const extracted = isItemExtracted(item), exposure = getArtifactExposure(item);
    if (!extracted && exposure < FIELDWORK_CONFIG.artifactRevealThreshold) { ui.progressHint.textContent = '请先清除文物周围更多土块；露出后即可提取。'; return; }
    if (!extracted) {
      state.extracted.push(item.id); const root = proxyRoots.get(item.id); if (root) root.visible = false;
      refreshUI(); requestRender();
      finishArtifactAction(item);
    }
    // Keep excavation model viewing separate from the site's photographic artifact modal.
    currentViewerItem = item;
    ui.viewerTitle.textContent = item.viewerTitle || item.name;
    ui.viewerNote.textContent = `${FIELDWORK_LAYERS[item.layerIndex].label} · 体验层位暂定，待考证。${item.viewerIntro || item.note}`;
    ui.viewerSource.textContent = `${item.sourceNote} 弹窗高密度模型：${item.modelUrl}。场景优化模型：${item.sceneModelUrl || '不单独加载'}；埋藏代理：${item.proxyUrl}。模型是依据多角度参考照片制作的近似重建，不是实物扫描或考古级精确复原。`;
    ui.viewerLoading.hidden = false; ui.viewerLoading.textContent = '准备按需载入完整模型…'; ui.viewerRetry.hidden = true;
    if (!ui.viewer.open) ui.viewer.showModal();
    loadViewerModel(item); ui.viewerClose.focus();
  }

  function releaseViewerResources(closeDialog = true) {
    if (activeWorker) { activeWorker.terminate(); activeWorker = null; activeWorkerReject?.(new DOMException('模型读取已取消。', 'AbortError')); activeWorkerReject = null; }
    viewerDragAbort?.abort(); viewerDragAbort = null;
    viewerResizeObserver?.disconnect(); viewerResizeObserver = null; viewerControls?.dispose(); viewerControls = null;
    disposeTree(viewerRoot); viewerRoot = null; viewerScene = null; viewerCamera = null;
    viewerMaterials.forEach(disposeMaterial); viewerMaterials = [];
    viewerRenderer?.dispose(); viewerRenderer?.forceContextLoss(); viewerRenderer = null;
    if (ui.viewerCanvas?.isConnected) { const replacement = ui.viewerCanvas.cloneNode(false); ui.viewerCanvas.replaceWith(replacement); ui.viewerCanvas = replacement; }
    currentViewerItem = null;
    if (closeDialog && ui.viewer.open) ui.viewer.close();
  }

  function renderViewer() { if (!viewerRenderer || !ui.viewer.open) return; viewerControls?.update(); viewerRenderer.render(viewerScene, viewerCamera); }
  function bindViewerCanvasControls() {
    viewerDragAbort?.abort(); viewerDragAbort = new AbortController();
    const canvas = ui.viewerCanvas, signal = viewerDragAbort.signal;
    let drag = null;
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', event => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing'; event.preventDefault();
    }, { signal });
    canvas.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id || !viewerRoot) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y; drag.x = event.clientX; drag.y = event.clientY;
      viewerRoot.rotation.y += dx * .009;
      const baseRotationX = currentViewerItem?.viewerRotation?.[0] || 0;
      viewerRoot.rotation.x = clamp(viewerRoot.rotation.x + dy * .009, baseRotationX - Math.PI * .48, baseRotationX + Math.PI * .48);
      renderViewer(); event.preventDefault();
    }, { signal });
    const endDrag = event => {
      if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.id)) return;
      if (canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
      drag = null; canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('pointerup', endDrag, { signal });
    canvas.addEventListener('pointercancel', endDrag, { signal });
    canvas.addEventListener('lostpointercapture', endDrag, { signal });
    canvas.addEventListener('wheel', event => {
      if (!viewerCamera) return;
      event.preventDefault();
      const distance = clamp(viewerCamera.position.length() * Math.exp(event.deltaY * .001), viewerInitialDistance * .38, viewerInitialDistance * 3.5);
      viewerCamera.position.normalize().multiplyScalar(distance); renderViewer();
    }, { passive: false, signal });
  }
  function resizeViewer() {
    if (!viewerRenderer || !viewerCamera || !ui.viewer.open) return; const rect = ui.viewerStage.getBoundingClientRect(); if (rect.width < 2 || rect.height < 2) return;
    viewerRenderer.setSize(rect.width, rect.height, false); viewerCamera.aspect = rect.width / rect.height; viewerCamera.updateProjectionMatrix(); renderViewer();
  }

  function bindControls() {
    ui.startDig.addEventListener('click', beginDig);
    ui.reset.addEventListener('click', () => resetExperience(true));
    ui.resetView.addEventListener('click', () => { controls?.reset(); if (camera) { camera.position.set(4.5, 6.6, 8.3); camera.lookAt(0, -.08, 0); } requestRender(); });
    ui.brushSize.addEventListener('input', () => { toolRange = Number(ui.brushSize.value); ui.brushValue.value = String(toolRange); ui.brushValue.textContent = String(toolRange); });
    section.querySelectorAll('[data-field-tool]').forEach(button => button.addEventListener('click', () => setTool(button.dataset.fieldTool)));
    ui.inventory.addEventListener('click', event => {
      const button = event.target.closest('[data-field-artifact-id]');
      if (!button || !ui.inventory.contains(button)) return;
      event.preventDefault(); event.stopPropagation();
      const item = itemById(button.dataset.fieldArtifactId);
      if (item) activateArtifact(item);
    });
    ui.viewerClose.addEventListener('click', () => releaseViewerResources(true));
    ui.viewer.addEventListener('close', () => { releaseViewerResources(false); requestRender(); });
    ui.viewer.addEventListener('cancel', event => { event.preventDefault(); releaseViewerResources(true); requestRender(); });
    ui.viewer.addEventListener('click', event => { const rect = ui.viewer.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) releaseViewerResources(true); });
    ui.viewerRetry.addEventListener('click', () => currentViewerItem && loadViewerModel(currentViewerItem));
    ui.layerInfoClose.addEventListener('click', () => ui.layerInfo.close());
    ui.layerInfo.addEventListener('click', event => { if (event.target === ui.layerInfo) ui.layerInfo.close(); });
    ui.layerInfo.addEventListener('close', () => { refreshUI(); requestRender(); });
    ui.viewerReset.addEventListener('click', () => { if (viewerRoot) viewerRoot.rotation.set(...(currentViewerItem?.viewerRotation || [0, 0, 0])); viewerCamera?.position.set(0, 0, viewerInitialDistance); viewerCamera?.lookAt(0, 0, 0); renderViewer(); });
    $('#field-scene-retry').addEventListener('click', () => { deactivate(); activate(); });
  }

  function activate() {
    if (active) { requestRender(); return initPromise; }
    clearStoredProgress();
    active = true; ui.loading.hidden = false; ui.fallback.hidden = true;
    if (initialized) { resize(); refreshUI(); syncProxies(); ui.loading.hidden = true; requestRender(); return; }
    if (initPromise) return initPromise;
    const initToken = ++sceneInitGeneration;
    const pending = Promise.all([import('three'), import('three/addons/controls/OrbitControls.js'), import('three/addons/loaders/MTLLoader.js'), import('three/addons/loaders/OBJLoader.js'), import('three/addons/loaders/GLTFLoader.js')])
      .then(([three, controlsModule, mtl, obj, gltf]) => {
        if (!active || initToken !== sceneInitGeneration) return false;
        THREE = three; OrbitControls = controlsModule.OrbitControls; MTLLoader = mtl.MTLLoader; OBJLoader = obj.OBJLoader; GLTFLoader = gltf.GLTFLoader;
        try { buildScene(); initialized = true; ui.loading.hidden = true; ui.fallback.hidden = true; ui.modelStatus.textContent = '玉器先以代理网格埋藏显露；露出后加载优化 GLB，点击后再加载高密度 GLB。'; refreshUI(); syncProxies(); return true; }
        catch (error) { ui.loading.hidden = true; ui.fallback.hidden = false; ui.error.textContent = error?.message || '请检查浏览器对 WebGL 的支持。'; return false; }
      })
      .catch(error => {
        if (active && initToken === sceneInitGeneration) { ui.loading.hidden = true; ui.fallback.hidden = false; ui.error.textContent = `三维组件无法加载：${error?.message || '请检查网络或 WebGL 支持。'}`; }
        return false;
      })
      .finally(() => { if (initToken === sceneInitGeneration) initPromise = null; });
    initPromise = pending;
    return pending;
  }

  function deactivate() {
    active = false; sceneInitGeneration += 1; resetExperience(false);
    if (ui.layerInfo.open) ui.layerInfo.close();
    if (ui.viewer.open) releaseViewerResources(true); else releaseViewerResources(false);
    if (raf) cancelAnimationFrame(raf); raf = 0; sceneAbort?.abort(); sceneAbort = null; controls?.dispose(); controls = null;
    if (renderer) { disposeTree(scene); renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
    if (ui.canvas?.isConnected) { const replacement = ui.canvas.cloneNode(false); ui.canvas.replaceWith(replacement); ui.canvas = replacement; }
    scene = null; camera = null; raycaster = null; soilLayers = []; proxyRoots.clear(); proxyLoads.clear(); initialized = false; initPromise = null;
  }

  bindControls(); ui.brushSize.value = String(toolRange); ui.brushValue.value = String(toolRange); ui.brushValue.textContent = String(toolRange);
  window.addEventListener('fieldwork:activate', activate); window.addEventListener('fieldwork:deactivate', deactivate);
  if (new URLSearchParams(location.search).get('page') === 'fieldwork') activate();
})();

