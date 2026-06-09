param([string]$pw)
if (-not $pw) {
  Write-Host "Usage: .\hash_pw.ps1 'password'"
  exit 1
}
$bytes=[System.Text.Encoding]::UTF8.GetBytes($pw)
$hash=([System.Security.Cryptography.SHA256]::Create()).ComputeHash($bytes)
[System.BitConverter]::ToString($hash).Replace('-','').ToLower()
