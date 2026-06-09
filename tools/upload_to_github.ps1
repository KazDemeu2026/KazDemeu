param(
  [string]$Owner = 'KazDemeu2026',
  [string]$Repo = 'KazDemeu',
  [string]$Branch = 'main',
  [string]$RootPath = "$PSScriptRoot\.."
)

$token = $env:GITHUB_TOKEN
if (-not $token) { Write-Error 'GITHUB_TOKEN environment variable is not set'; exit 2 }

$root = Resolve-Path $RootPath
Write-Host "Root: $root"
$files = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Name -ne '.DS_Store' }
Write-Host "Found $($files.Count) files to upload"

foreach ($f in $files) {
  $rel = $f.FullName.Substring($root.Path.Length + 1) -replace '\\','/'
  Write-Host "Uploading: $rel"
  $content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName))
  $url = "https://api.github.com/repos/$Owner/$Repo/contents/$rel"
  $headers = @{ Authorization = "token $token"; 'User-Agent' = 'kazdemeu-uploader' }

  $sha = $null
  try {
    $existing = Invoke-RestMethod -Uri $url -Headers $headers -ErrorAction Stop
    $sha = $existing.sha
  } catch {
    # file does not exist
  }

  $body = @{ message = "Add/Update $rel"; branch = $Branch; content = $content }
  if ($sha) { $body.sha = $sha }
  $json = $body | ConvertTo-Json -Depth 10

  try {
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Put -Body $json -ContentType 'application/json'
    Write-Host " -> OK: $($res.content.path)"
  } catch {
    Write-Host " -> ERROR uploading $rel : $($_.Exception.Message)"
  }
  Start-Sleep -Milliseconds 150
}

Write-Host 'Upload complete.'
