# Captures real screenshots of each running app with headless Chrome.
#
# Why this exists: the build and module checks prove the code compiles and
# loads, but they cannot see a blank WebGL canvas or a broken layout. Headless
# Chrome with SwiftShader renders WebGL in software, so the screenshots show
# what the app actually draws.
#
# --virtual-time-budget lets the page run for that much virtual time before the
# shot is taken, which is what allows React to mount and first-frame animations
# to settle.

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "screenshots"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$targets = @(
  @{ name = "portfolio"; port = 5180; budget = 9000 },
  @{ name = "timeline";  port = 5181; budget = 9000 },
  @{ name = "motion";    port = 5182; budget = 14000 },
  @{ name = "search";    port = 5183; budget = 9000 }
)

$fail = 0
foreach ($t in $targets) {
  $out = Join-Path $outDir "$($t.name).png"
  if (Test-Path $out) { Remove-Item $out -Force }

  $args = @(
    "--headless=new",
    "--disable-gpu",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--hide-scrollbars",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--window-size=1600,1000",
    "--virtual-time-budget=$($t.budget)",
    "--screenshot=$out",
    "http://localhost:$($t.port)/"
  )

  & $chrome @args 2>&1 | Out-Null

  if (Test-Path $out) {
    $size = (Get-Item $out).Length
    Write-Output ("[ok]   {0,-10} -> {1} bytes  ({2})" -f $t.name, $size, $out)
    if ($size -lt 12000) {
      Write-Output ("       !! suspiciously small - page may not have rendered")
      $fail++
    }
  } else {
    Write-Output ("[FAIL] {0,-10} no screenshot produced" -f $t.name)
    $fail++
  }
}

Write-Output ""
Write-Output "CAPTURE FAILURES: $fail"
