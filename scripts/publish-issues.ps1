# Creates GitHub issues from docs/issues/*.md (requires git credential for github.com)
$ErrorActionPreference = "Stop"
$repo = "jon-gingrich/chinese-rummy"
$issueDir = Join-Path $PSScriptRoot "..\docs\issues"

$credInput = "protocol=https`nhost=github.com`n`n"
$cred = $credInput | git credential fill
$token = ($cred | Where-Object { $_ -match "^password=" }) -replace "^password=", ""
if (-not $token) { throw "No GitHub token from git credential" }

$headers = @{
  Authorization = "Bearer $token"
  Accept        = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

function Ensure-Label {
  $body = @{ name = "ready-for-agent"; color = "0E8A16"; description = "Ready for AFK agent implementation" } | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/labels" -Method Post -Headers $headers -Body $body -ContentType "application/json"
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 422) { throw }
  }
}

Ensure-Label | Out-Null

$files = Get-ChildItem $issueDir -Filter "*.md" | Sort-Object Name
$created = @{}

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  if ($content -match "(?s)^---\s*\n(.*?)\n---\s*\n(.*)$") {
    $front = $matches[1]
    $body = $matches[2].Trim()
    $title = ($front | Select-String "^title:\s*(.+)$").Matches.Groups[1].Value.Trim()
  } else {
    throw "Invalid issue file format: $($file.Name)"
  }

  foreach ($key in $created.Keys) {
    $body = $body -replace "#$key\b", "#$($created[$key])"
  }

  $payload = @{
    title  = $title
    body   = $body
    labels = @("ready-for-agent")
  } | ConvertTo-Json -Depth 5

  $result = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/issues" -Method Post -Headers $headers -Body $payload -ContentType "application/json"
  $num = [int]($file.BaseName -replace "\D", "")
  $created[$num] = $result.number
  Write-Output "$($file.Name) -> #$($result.number) $($result.html_url)"
}
