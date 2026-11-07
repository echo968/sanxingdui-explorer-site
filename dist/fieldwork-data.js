const MODEL_ROOT = '/assets/archaeology/models';

const bronzeArtifacts = [
  ['bronze-01', '青铜人头像', 'artifact_group_01', -1.8, -.8, '层位暂定，具体身份与模型对应关系待核。'],
  ['bronze-02', '铜鸟', 'artifact_group_02', 0, -.8, '暂用名称，具体身份与模型对应关系待核。'],
  ['bronze-03', '铜人首鸟身像', 'artifact_group_03', 1.8, -.8, '暂用名称，具体身份与模型对应关系待核。'],
  ['bronze-04', '青铜人面具残件', 'artifact_group_04', -1.8, .8, '暂用名称，具体身份与模型对应关系待核。'],
  ['bronze-05', '青铜人头像残件', 'artifact_group_05', 0, .8, '暂用名称，具体身份与模型对应关系待核。'],
  ['bronze-06', '大立人像', 'artifact_group_06', 1.8, .8, '暂用名称，具体身份与模型对应关系待核。']
].map(([id, name, group, x, z, note]) => ({
  id, code: group.replace('artifact_group_', 'BRONZE-'), name, group,
  modelUrl: `${MODEL_ROOT}/${group}/model.obj.gz`,
  proxyUrl: `${MODEL_ROOT}/${group}/proxy.json`,
  materialUrl: `${MODEL_ROOT}/${group}/material.mtl`,
  experiencePosition: [x, -.48, z], proxyColor: '#9e8b60', proxyMetalness: .32,
  interaction: 'inspect',
  note: `${note} 体验摆放不代表真实出土位置。`,
  sourceNote: `项目数字模型素材：${group}/model.obj.gz。来源身份及与具体文物的对应关系待核。`
}));

const ivoryArtifacts = [-2.05, -1.02, 0, 1.02, 2.05].map((x, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    id: `ivory-${number}`, code: `IVORY-${number}`, name: `象牙 ${number}`,
    modelUrl: `${MODEL_ROOT}/ivory-tusk/model.obj.gz`, proxyUrl: `${MODEL_ROOT}/ivory-tusk/proxy.json`,
    materialUrl: null, experiencePosition: [x, -.48, 0], proxyColor: '#d4c6a8', proxyMetalness: .04,
    interaction: index === 0 ? 'inspect' : 'remove', viewerColor: '#d8c9a7',
    note: '体验用獠牙形态数字网格，不代表经核实的三星堆出土单件。',
    sourceNote: '模型文件：tusk.obj。OBJ 内部对象名为 Seashell3dModels.003，具体来源与是否对应考古象牙待核；未提供材质文件，查看器使用中性象牙色材质。',
    ...(index === 0 ? {
      viewerTitle: '象牙 01 · 体验模型',
      viewerIntro: '这是由项目现有 tusk.obj 网格呈现的獠牙形态体验模型。现有文件对象名为 Seashell3dModels.003，具体来源及其与三星堆出土象牙的对应关系尚未核实；本次互动不将它作为已确认的馆藏或出土档案。'
    } : {})
  };
});

const jadeArtifacts = [
  {
    id: 'jade-zhang', code: 'JADE-01', name: '商玉璋（照片重建模型）', sourceName: '商玉璋_分叉穿孔照片重建',
    experiencePosition: [-1.15, -.48, 0], proxyColor: '#72806a', interaction: 'inspect',
    sceneModelUrl: `${MODEL_ROOT}/jade-approx/jade-zhang.glb`,
    modelUrl: `${MODEL_ROOT}/jade-approx/shang-jade-zhang.glb`,
    viewerFormat: 'glb',
    proxyUrl: `${MODEL_ROOT}/jade-approx/jade-zhang-proxy.json`,
    note: '依据多角度参考照片制作的近似重建网格；器物类别暂名为商玉璋，具体单件身份与出土编号未核实，不是文物实物扫描或考古级精确复原。',
    sourceNote: '网页优化网格用于考古场景展示；高密度多角度照片重建 GLB 用于弹窗观察。两者均为近似重建，不代表具体出土单件。代理网格仅用于埋藏阶段逐步显露。'
  },
  {
    id: 'jade-cong', code: 'JADE-02', name: '商玉琮（照片重建模型）', sourceName: '商玉琮_照片重建',
    experiencePosition: [1.15, -.48, 0], proxyColor: '#72806a', interaction: 'inspect',
    sceneModelUrl: `${MODEL_ROOT}/jade-approx/jade-cong.glb`,
    modelUrl: `${MODEL_ROOT}/jade-approx/shang-jade-cong.glb`,
    viewerFormat: 'glb',
    proxyUrl: `${MODEL_ROOT}/jade-approx/jade-cong-proxy.json`,
    note: '依据多角度参考照片制作的近似重建网格；器物类别暂名为商玉琮，具体单件身份与出土编号未核实，不是文物实物扫描或考古级精确复原。',
    sourceNote: '网页优化网格用于考古场景展示；高密度多角度照片重建 GLB 用于弹窗观察。两者均为近似重建，不代表具体出土单件。代理网格仅用于埋藏阶段逐步显露。'
  }
].map(item => ({ ...item, proxyMetalness: .08 }));

export const FIELDWORK_LAYERS = [
  {
    id: 'rammed-earth', label: '金色夯土层', kind: 'surface', color: '#a9854b', markerPosition: { edge: 'front', x: .5, y: .5 },
    info: { title: '夯实回填土', intro: '祭祀遗物安置后，坑体被土回填并夯实。考古资料记载部分区域能辨认夯层；金黄色是本体验的视觉表现，并非对土色的考古结论。', hint: '此处参考三星堆三号坑发掘资料。' },
    note: '金黄色夯土的体验示意。本层不配置文物；颜色、结构和层位不代表实测土壤记录。',
    artifacts: []
  },
  {
    id: 'ivory', label: '象牙堆积层', kind: 'ivory', color: '#8f8065', markerPosition: { edge: 'front', x: .5, y: .5 },
    info: { title: '象牙堆积', intro: '部分祭祀坑中，象牙集中分布在器物上方或偏上位置；不同坑的象牙数量、保存情况和摆放方式并不完全相同。', hint: '象牙层是对部分祭祀坑现象的概括，不代表每座坑都有相同的整齐分层。' },
    note: '象牙模型仅作为体验素材埋入土层；数量、摆放和埋藏层位不表示真实考古记录。',
    artifacts: ivoryArtifacts
  },
  {
    id: 'bronze-gold', label: '青铜金器器物层', kind: 'bronze', color: '#62513b', markerPosition: { edge: 'front', x: .5, y: .5 },
    info: { title: '青铜与金器遗物', intro: '祭祀坑中发现青铜器、金器、玉石器和象牙等遗物。器物摆放并非总是整齐分层；较大的青铜器和象牙总体偏上，小件遗物位置偏下。', hint: '青铜器与金器不应描述成考古确认的独立统一地层。' },
    note: '项目提供的六组青铜器模型素材；模型名称、身份和体验摆放均待核。',
    artifacts: bronzeArtifacts
  },
  {
    id: 'broken-jade', label: '碎玉石与灰烬层', kind: 'jade', color: '#53685b', markerPosition: { edge: 'front', x: .5, y: .5 },
    info: { title: '玉石器与灰烬堆积', intro: '部分玉石器与炭屑、灰烬、海贝及小件青铜器共同出现。不同祭祀坑中，玉石器的位置和组合有所差异。', hint: '把碎玉石集中展示在这一体验层，是互动设计的概括，不表示所有玉石器都出土于最底层。' },
    note: '两件玉器近似网格用于体验；不表示具体出土器物、破碎状态或真实层位。',
    artifacts: jadeArtifacts
  }
];

export const FIELDWORK_ARTIFACTS = FIELDWORK_LAYERS.flatMap((layer, layerIndex) =>
  layer.artifacts.map(item => ({ ...item, layerId: layer.id, layerIndex }))
);

export const FIELDWORK_CONFIG = {
  saveKey: 'sanxingdui-fieldwork-v4',
  previousSaveKey: 'sanxingdui-fieldwork-v3',
  gridColumns: 10,
  gridRows: 8,
  verticalCells: 2,
  chunkColumns: 5,
  chunkRows: 4,
  artifactRevealThreshold: .38,
  proxyScale: .66,
  brushDefault: 1,
  brushMin: 1,
  brushMax: 3
};
