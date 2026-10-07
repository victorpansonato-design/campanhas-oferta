param([string]$Origin = 'http://127.0.0.1:5174')
$ErrorActionPreference = 'Stop'
$resultFolder = Join-Path $PSScriptRoot '../artifacts'
New-Item -ItemType Directory -Force $resultFolder | Out-Null
$pages = @(
   @{ Name='catalogo'; Path='/catalogo' },
   @{ Name='valores'; Path='/campanhas/camp-004/editar' },
   @{ Name='aprovacao'; Path='/campanhas/camp-001' },
   @{ Name='alunos'; Path='/sem-formacao/formacao-001' }
)
$measure = @'
JSON.stringify({ url:location.pathname, width:innerWidth, scrollWidth:document.documentElement.scrollWidth, heading:document.querySelector('h1')?.innerText, brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src), externalResources:performance.getEntriesByType('resource').map(r=>r.name).filter(n=>!n.startsWith(location.origin)&&!n.startsWith('blob:')) })
'@
foreach ($size in @(1440,1280,768,390)) {
   npx --yes agent-browser --session campanhas-qa set viewport $size 1000
   foreach ($page in $pages) {
      npx --yes agent-browser --session campanhas-qa open ($Origin + $page.Path)
      $measure | npx --yes agent-browser --session campanhas-qa eval --stdin --json | Out-File -Encoding utf8 (Join-Path $resultFolder ($page.Name + '-' + $size + '-metrics.json'))
      npx --yes agent-browser --session campanhas-qa screenshot (Join-Path $resultFolder ($page.Name + '-' + $size + '.png'))
      if ($size -eq 1440) {
         npx --yes agent-browser --session campanhas-qa a11y --json | Out-File -Encoding utf8 (Join-Path $resultFolder ('a11y-' + $page.Name + '.json'))
      }
   }
}
