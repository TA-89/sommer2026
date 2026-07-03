# Regeneriert data/fixtures.js aus data/fixtures.json.
# fixtures.json ist die kanonische Quelle; fixtures.js ist nur der Browser-Wrapper
# (damit die App auch per Doppelklick / file:// ohne Server laedt).
# Aufruf:  powershell -ExecutionPolicy Bypass -File build-fixtures.ps1
$ErrorActionPreference = "Stop"
$dir = Join-Path $PSScriptRoot "data"
$jsonPath = Join-Path $dir "fixtures.json"
$json = Get-Content $jsonPath -Raw -Encoding UTF8
# Validierung
$null = $json | ConvertFrom-Json
$out = "/* AUTO-GENERIERT aus fixtures.json - nicht direkt bearbeiten. Quelle bleibt fixtures.json. */`r`nwindow.FIXTURES = " + $json + ";`r`n"
Set-Content -Path (Join-Path $dir "fixtures.js") -Value $out -Encoding utf8
Write-Host ("OK - fixtures.js neu generiert (" + ((Get-Item (Join-Path $dir 'fixtures.js')).Length) + " Bytes)")
