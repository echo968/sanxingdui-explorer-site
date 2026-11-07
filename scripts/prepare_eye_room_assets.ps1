param(
  [string]$VideoPath = 'D:\三星堆\视频\13436867473577522.mp4',
  [string]$ModelZipPath = 'D:\三星堆\984-三星堆青铜器3D素材\sanxingdui-mask-model\source\Sanxingdui Mask Model.zip'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $projectRoot 'dist\assets\ai-exhibition'
$posterSource = Join-Path $projectRoot 'assets\ai-exhibition\eye-room-16x9.png'
$posterTarget = Join-Path $assetRoot 'eye-room-16x9.png'
$videoTarget = Join-Path $assetRoot 'eye-room-loop.mp4'
$modelTarget = Join-Path $assetRoot 'eye-mask-model.obj'

New-Item -ItemType Directory -Force -Path $assetRoot | Out-Null
if (-not (Test-Path -LiteralPath $posterSource)) { throw "展厅封面不存在：$posterSource" }
if (-not (Test-Path -LiteralPath $VideoPath)) { throw "背景视频不存在：$VideoPath" }
if (-not (Test-Path -LiteralPath $ModelZipPath)) { throw "模型压缩包不存在：$ModelZipPath" }
Copy-Item -LiteralPath $posterSource -Destination $posterTarget -Force
Copy-Item -LiteralPath $VideoPath -Destination $videoTarget -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($ModelZipPath)
try {
  $entry = $archive.GetEntry('Sanxingdui Mask Model.obj')
  if (-not $entry) { throw '模型压缩包中未找到 OBJ 文件。' }
  $inputStream = $entry.Open()
  $reader = [IO.StreamReader]::new($inputStream, [Text.Encoding]::UTF8, $true)
  $writer = [IO.StreamWriter]::new($modelTarget, $false, [Text.UTF8Encoding]::new($false))
  $counts = @{ vertices = 0; textureCoordinates = 0; faces = 0 }
  try {
    while ($null -ne ($line = $reader.ReadLine())) {
      $trimmed = $line.Trim()
      if (-not $trimmed -or $trimmed.StartsWith('#') -or $trimmed.StartsWith('mtllib ')) { continue }
      if ($trimmed -match '^(v|vt|vn)\s+(.+)$') {
        $kind = $Matches[1]
        $parts = $Matches[2] -split '\s+'
        $formatted = foreach ($part in $parts) {
          $number = [double]::Parse($part, [Globalization.CultureInfo]::InvariantCulture)
          $number.ToString('0.######', [Globalization.CultureInfo]::InvariantCulture)
        }
        $writer.WriteLine("$kind $($formatted -join ' ')")
        if ($kind -eq 'v') { $counts.vertices++ }
        if ($kind -eq 'vt') { $counts.textureCoordinates++ }
      } elseif ($trimmed -match '^f\s+') {
        $writer.WriteLine(('f ' + (($trimmed -split '\s+' | Select-Object -Skip 1) -join ' ')))
        $counts.faces++
      } else {
        $writer.WriteLine(($trimmed -replace '\s+', ' '))
      }
    }
  } finally {
    $writer.Dispose()
    $reader.Dispose()
  }
} finally {
  $archive.Dispose()
}

$report = [ordered]@{
  poster = $posterTarget
  video = $videoTarget
  model = $modelTarget
  modelBytes = (Get-Item -LiteralPath $modelTarget).Length
  counts = $counts
  note = 'OBJ 保留原始几何和顶点颜色；只压缩文本格式并将数值保留到小数点后六位。'
}
$report | ConvertTo-Json -Depth 4

