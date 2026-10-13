# Verifies all four dev servers are serving, and that each app's entry modules
# actually transform through Vite (which catches JSX/import errors a plain
# HTTP 200 on index.html would miss).

$ErrorActionPreference = 'Continue'
$apps = @(
  @{ name = 'portfolio'; port = 5180; modules = @('/src/main.jsx', '/src/App.jsx', '/src/components/ProjectCard.jsx', '/src/components/Layout.jsx', '/src/data/projects.js') },
  @{ name = 'timeline';  port = 5181; modules = @('/src/main.jsx', '/src/App.jsx', '/src/store.jsx', '/src/lib/snap.js', '/src/lib/scale.js', '/src/hooks/useClipDrag.js', '/src/hooks/useFakePeers.js', '/src/components/Timeline.jsx', '/src/components/Clip.jsx', '/src/components/Preview.jsx', '/src/components/Ruler.jsx', '/src/components/Toolbar.jsx', '/src/components/Playhead.jsx', '/src/components/SnapGuide.jsx', '/src/components/TrackHeader.jsx', '/src/components/PeerCursors.jsx', '/src/components/ActivityFeed.jsx', '/src/components/Icons.jsx') },
  @{ name = 'motion';    port = 5182; modules = @('/src/main.jsx', '/src/App.jsx', '/src/components/Scene.jsx', '/src/components/ControlPanel.jsx', '/src/shaders/index.js') },
  @{ name = 'search';    port = 5183; modules = @('/src/main.jsx', '/src/App.jsx', '/src/lib/search.js', '/src/lib/geometry.js', '/src/data/clips.js', '/src/hooks/useSearchPipeline.js', '/src/components/ResultCard.jsx', '/src/components/ContextPanel.jsx', '/src/components/SearchBox.jsx', '/src/components/RetrievalOrbit.jsx') }
)

$fail = 0
foreach ($app in $apps) {
  $base = "http://localhost:$($app.port)"
  try {
    $r = Invoke-WebRequest "$base/" -UseBasicParsing -TimeoutSec 20
    Write-Output ("[{0}] index HTTP {1}" -f $app.name, $r.StatusCode)
  } catch {
    Write-Output ("[{0}] INDEX FAILED: {1}" -f $app.name, $_.Exception.Message)
    $fail++
    continue
  }

  foreach ($m in $app.modules) {
    try {
      $mr = Invoke-WebRequest "$base$m" -UseBasicParsing -TimeoutSec 25
      $len = $mr.Content.Length
      if ($len -lt 20) { Write-Output ("   !! {0} suspiciously small ({1} bytes)" -f $m, $len); $fail++ }
    } catch {
      Write-Output ("   !! {0} FAILED: {1}" -f $m, $_.Exception.Message)
      $fail++
    }
  }
  Write-Output ("[{0}] {1} modules transformed OK" -f $app.name, $app.modules.Count)
}

Write-Output ""
Write-Output "TOTAL FAILURES: $fail"
