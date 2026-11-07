import { OBJLoader } from './assets/vendor/three/examples/jsm/loaders/OBJLoader.js';

async function readOBJText(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  let text;
  if (isGzip) {
    if (!('DecompressionStream' in self)) throw new Error('当前浏览器不支持压缩模型读取');
    text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  } else {
    text = new TextDecoder().decode(bytes);
  }
  // Some source OBJ files mix triangle faces (`f`) with wire edges (`l`) in one
  // object. Three.js then classifies the entire object as LineSegments, which
  // our surface viewer intentionally excludes. Keep faces/UVs/normals and drop
  // only standalone line primitives so the actual solid mesh is rendered.
  return text.replace(/^[ \t]*l[ \t].*$/gm, '');
}

self.onmessage = async ({ data }) => {
  const { id, url } = data;
  try {
    self.postMessage({ id, state: 'fetching' });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`模型文件读取失败（HTTP ${response.status}）`);
    const text = await readOBJText(response);
    self.postMessage({ id, state: 'parsing' });
    const root = new OBJLoader().parse(text);
    root.updateMatrixWorld(true);
    const meshes = [];
    const transfers = [];
    root.traverse((child) => {
      if (!child.isMesh) return;
      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      const position = new Float32Array(geometry.getAttribute('position').array);
      const normal = new Float32Array(geometry.getAttribute('normal').array);
      const uvAttr = geometry.getAttribute('uv');
      const uv = uvAttr ? new Float32Array(uvAttr.array) : new Float32Array();
      const index = geometry.index ? new (geometry.index.array.constructor)(geometry.index.array) : null;
      transfers.push(position.buffer, normal.buffer, uv.buffer);
      if (index) transfers.push(index.buffer);
      meshes.push({ position: position.buffer, normal: normal.buffer, uv: uv.buffer, index: index?.buffer || null, indexType: index?.constructor.name || null });
      geometry.dispose();
    });
    if (!meshes.length) throw new Error('OBJ 文件中没有可显示的网格');
    self.postMessage({ id, state: 'ready', meshes }, transfers);
  } catch (error) {
    self.postMessage({ id, state: 'error', message: error?.message || '模型读取失败' });
  }
};
