param(
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$caseFolderName = ([char]0xC5C5 + [char]0xBB34 + [char]0xC0AC + [char]0xB840)
$caseDir = Join-Path $root $caseFolderName
$outputPath = Join-Path $root 'cases-fallback.js'

if (-not (Test-Path -LiteralPath $caseDir -PathType Container)) {
  throw "Case folder was not found: $caseDir"
}

$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
$files = @(
  Get-ChildItem -LiteralPath $caseDir -File -Filter '*.txt' |
    Where-Object { -not $_.Name.StartsWith('_') } |
    Sort-Object Name
)

$fileNames = @()
$texts = [ordered]@{}
foreach ($file in $files) {
  $fileNames += $file.Name
  try {
    $text = [System.IO.File]::ReadAllText($file.FullName, $utf8Strict)
  }
  catch {
    $text = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::Default)
  }
  $texts[$file.Name] = $text
}

$payload = [ordered]@{
  files = $fileNames
  texts = $texts
}
$json = $payload | ConvertTo-Json -Depth 4
$header = @'
/*
   Local preview data, generated from the case text files by preview.ps1.
   On the deployed site, the live manifest and text files are used first.
*/
'@
$javascript = $header + "`r`nwindow.CASES_FALLBACK = " + $json + ";`r`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $javascript, $utf8NoBom)

Write-Host ("Updated local preview with {0} case(s)." -f $files.Count)

if (-not $NoOpen) {
  Start-Process (Join-Path $root 'index.html')
}
