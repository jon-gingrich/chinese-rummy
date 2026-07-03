# Configure OAuth and Resend secrets on the Convex deployment.
# Run from repo root after: npx @convex-dev/auth --web-server-url http://localhost:3000 --skip-git-check

$ErrorActionPreference = "Stop"

function Read-EnvValue([string]$Name) {
    $envFile = Join-Path $PSScriptRoot ".." ".env.local"
    if (-not (Test-Path $envFile)) {
        return $null
    }
    foreach ($line in Get-Content $envFile) {
        if ($line -match "^\s*$Name=(.*)$") {
            return $Matches[1].Trim()
        }
    }
    return $null
}

function Read-Secret([string]$Prompt) {
    $secure = Read-Host $Prompt -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}

$siteUrl = Read-EnvValue "NEXT_PUBLIC_CONVEX_SITE_URL"
if (-not $siteUrl) {
    Write-Host "NEXT_PUBLIC_CONVEX_SITE_URL not found in .env.local. Run npx convex dev first." -ForegroundColor Yellow
    $siteUrl = Read-Host "Enter your Convex site URL (e.g. https://handsome-snake-32.convex.site)"
}

$baseUrl = $siteUrl.TrimEnd('/')

Write-Host ""
Write-Host "OAuth redirect URIs (add these in each provider console):" -ForegroundColor Cyan
Write-Host "  $baseUrl/api/auth/callback/google"
Write-Host "  $baseUrl/api/auth/callback/microsoft-entra-id"
Write-Host "  $baseUrl/api/auth/callback/yahoo"
Write-Host ""

$googleId = Read-Host "Google Client ID (AUTH_GOOGLE_ID)"
$googleSecretPlain = Read-Secret "Google Client Secret (AUTH_GOOGLE_SECRET)"

$microsoftId = Read-Host "Microsoft Application Client ID (AUTH_MICROSOFT_ENTRA_ID_ID)"
$microsoftSecretPlain = Read-Secret "Microsoft Client Secret (AUTH_MICROSOFT_ENTRA_ID_SECRET)"

$yahooId = Read-Host "Yahoo Client ID (AUTH_YAHOO_ID)"
$yahooSecretPlain = Read-Secret "Yahoo Client Secret (AUTH_YAHOO_SECRET)"

$resendKeyPlain = Read-Secret "Resend API key (AUTH_RESEND_KEY)"

$defaultFrom = "Chinese Rummy <onboarding@resend.dev>"
$emailFrom = Read-Host "Email from address (AUTH_EMAIL_FROM) [$defaultFrom]"
if ([string]::IsNullOrWhiteSpace($emailFrom)) {
    $emailFrom = $defaultFrom
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
    Write-Host ""
    Write-Host "Setting Convex environment variables..." -ForegroundColor Cyan

    npx convex env set AUTH_GOOGLE_ID $googleId
    if ($LASTEXITCODE -ne 0) { throw "convex env set AUTH_GOOGLE_ID failed" }

    npx convex env set AUTH_GOOGLE_SECRET $googleSecretPlain
    if ($LASTEXITCODE -ne 0) { throw "convex env set AUTH_GOOGLE_SECRET failed" }

    npx convex env set AUTH_MICROSOFT_ENTRA_ID_ID $microsoftId
    if ($LASTEXITCODE -ne 0) { throw "convex env set AUTH_MICROSOFT_ENTRA_ID_ID failed" }

    npx convex env set AUTH_MICROSOFT_ENTRA_ID_SECRET $microsoftSecretPlain
    if ($LASTEXITCODE -ne 0) { throw "convex env set AUTH_MICROSOFT_ENTRA_ID_SECRET failed" }

    npx convex env set AUTH_YAHOO_ID $yahooId
    if ($LASTEXITCODE -ne 0) { throw "convex env set AUTH_YAHOO_ID failed" }

    npx convex env set AUTH_YAHOO_SECRET $yahooSecretPlain
    if ($LASTEXITCODE -ne 0) { throw "convex env set AUTH_YAHOO_SECRET failed" }

    npx convex env set AUTH_RESEND_KEY $resendKeyPlain
    if ($LASTEXITCODE -ne 0) { throw "convex env set AUTH_RESEND_KEY failed" }

    npx convex env set AUTH_EMAIL_FROM $emailFrom
    if ($LASTEXITCODE -ne 0) { throw "convex env set AUTH_EMAIL_FROM failed" }

    Write-Host ""
    Write-Host "Done. Start the app with npm run dev and test sign-in at http://localhost:3000/sign-in" -ForegroundColor Green
}
finally {
    Pop-Location
    $googleSecretPlain = $null
    $microsoftSecretPlain = $null
    $yahooSecretPlain = $null
    $resendKeyPlain = $null
}
