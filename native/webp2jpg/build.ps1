$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$zig = Join-Path $projectRoot 'tools\native\zig-0.13.0\zig.exe'
$webp = Join-Path $projectRoot 'native\vendor\libwebp-1.4.0'
$outputDir = Join-Path $projectRoot 'native\webp2jpg\build'
$output = Join-Path $outputDir 'webp2jpg-armv7'
$moduleOutputDir = Join-Path $projectRoot 'libs\arm'
$moduleOutput = Join-Path $moduleOutputDir 'libjsapi_webp.so'
$sdkInclude = Join-Path $projectRoot 'native\vendor\iot-miniapp-sdk\include'
$moduleObjectDir = Join-Path $outputDir 'module-objects'
$env:ZIG_GLOBAL_CACHE_DIR = Join-Path $projectRoot 'tools\native\cache\global'
$env:ZIG_LOCAL_CACHE_DIR = Join-Path $projectRoot 'tools\native\cache\webp2jpg'

if (!(Test-Path -LiteralPath $zig)) { throw "Zig compiler not found: $zig" }
if (!(Test-Path -LiteralPath $webp)) { throw "libwebp source not found: $webp" }
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $moduleOutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $moduleObjectDir | Out-Null
New-Item -ItemType Directory -Force -Path $env:ZIG_GLOBAL_CACHE_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $env:ZIG_LOCAL_CACHE_DIR | Out-Null

$decoderSources = @(
    'src\dec\alpha_dec.c',
    'src\dec\buffer_dec.c',
    'src\dec\frame_dec.c',
    'src\dec\idec_dec.c',
    'src\dec\io_dec.c',
    'src\dec\quant_dec.c',
    'src\dec\tree_dec.c',
    'src\dec\vp8_dec.c',
    'src\dec\vp8l_dec.c',
    'src\dec\webp_dec.c',
    'src\dsp\alpha_processing.c',
    'src\dsp\cpu.c',
    'src\dsp\dec.c',
    'src\dsp\dec_clip_tables.c',
    'src\dsp\filters.c',
    'src\dsp\lossless.c',
    'src\dsp\rescaler.c',
    'src\dsp\upsampling.c',
    'src\dsp\yuv.c',
    'src\dsp\alpha_processing_neon.c',
    'src\dsp\dec_neon.c',
    'src\dsp\filters_neon.c',
    'src\dsp\lossless_neon.c',
    'src\dsp\rescaler_neon.c',
    'src\dsp\upsampling_neon.c',
    'src\dsp\yuv_neon.c',
    'src\utils\bit_reader_utils.c',
    'src\utils\color_cache_utils.c',
    'src\utils\filters_utils.c',
    'src\utils\huffman_utils.c',
    'src\utils\palette.c',
    'src\utils\quant_levels_dec_utils.c',
    'src\utils\random_utils.c',
    'src\utils\rescaler_utils.c',
    'src\utils\thread_utils.c',
    'src\utils\utils.c'
) | ForEach-Object { Join-Path $webp $_ }

$arguments = @(
    'cc',
    '-target', 'arm-linux-musleabihf',
    '-mcpu=cortex_a7',
    '-Os',
    '-static',
    '-s',
    '-ffunction-sections',
    '-fdata-sections',
    '-Wl,--gc-sections',
    '-I', $webp,
    (Join-Path $PSScriptRoot 'main.c'),
    (Join-Path $PSScriptRoot 'convert.c')
) + $decoderSources + @('-lm', '-o', $output)

& $zig @arguments
if ($LASTEXITCODE -ne 0) { throw "Zig failed with exit code $LASTEXITCODE" }

$moduleSources = @(
    (Join-Path $PSScriptRoot 'module.c'),
    (Join-Path $PSScriptRoot 'convert.c')
) + $decoderSources
$moduleObjects = @()
for ($index = 0; $index -lt $moduleSources.Count; $index++) {
    $object = Join-Path $moduleObjectDir ("{0:D2}.o" -f $index)
    $moduleObjects += $object
    & $zig cc -target arm-linux-musleabihf -mcpu=cortex_a7 -Os -fPIC `
        -fvisibility=hidden -ffunction-sections -fdata-sections `
        -I $webp -I $sdkInclude -c $moduleSources[$index] -o $object
    if ($LASTEXITCODE -ne 0) { throw "Zig module compile failed for $($moduleSources[$index])" }
}

& $zig cc -target arm-linux-musleabihf -mcpu=cortex_a7 -shared -nostdlib `
    '-Wl,--gc-sections' '-Wl,-soname,libjsapi_webp.so' $moduleObjects -o $moduleOutput
if ($LASTEXITCODE -ne 0) { throw "Zig module link failed with exit code $LASTEXITCODE" }
Get-Item -LiteralPath $output, $moduleOutput | Select-Object FullName, Length
