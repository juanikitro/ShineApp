param(
    [string]$WebBaseUrl = $env:WEB_BASE_URL,
    [string]$ApiBaseUrl = $env:NEXT_PUBLIC_API_URL,
    [string]$Token = $env:SMOKE_TEST_TOKEN,
    [string]$AuthenticatedPath = $env:SMOKE_TEST_AUTH_PATH,
    [string]$MediaUrl = $env:SMOKE_TEST_MEDIA_URL
)

$ErrorActionPreference = "Stop"

function Invoke-SmokeRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Url,
        [int[]]$AllowedStatuses = @(200)
    )

    $Headers = @{}
    if ($Token) {
        $Headers["Authorization"] = "Token $Token"
    }

    Write-Host "==> $Name $Url"
    try {
        $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20 -Headers $Headers
        $StatusCode = [int]$Response.StatusCode
    }
    catch {
        if ($_.Exception.Response) {
            $StatusCode = [int]$_.Exception.Response.StatusCode
        }
        else {
            throw
        }
    }

    if ($AllowedStatuses -notcontains $StatusCode) {
        throw "$Name returned HTTP $StatusCode. Expected one of: $($AllowedStatuses -join ', ')."
    }

    Write-Host "$Name OK: HTTP $StatusCode"
}

if (-not $WebBaseUrl -and -not $ApiBaseUrl) {
    throw "Set WEB_BASE_URL, NEXT_PUBLIC_API_URL, or pass -WebBaseUrl/-ApiBaseUrl."
}

if ($WebBaseUrl) {
    Invoke-SmokeRequest -Name "web" -Url $WebBaseUrl -AllowedStatuses @(200, 301, 302)
}

if ($ApiBaseUrl) {
    $ApiRoot = $ApiBaseUrl.TrimEnd("/")
    Invoke-SmokeRequest -Name "api health" -Url "$ApiRoot/health/" -AllowedStatuses @(200)
    Invoke-SmokeRequest -Name "api auth/me" -Url "$ApiRoot/auth/me/" -AllowedStatuses @(200, 401, 403)

    if ($Token) {
        if (-not $AuthenticatedPath) {
            $AuthenticatedPath = "auth/me/"
        }
        $AuthenticatedUrl = "$ApiRoot/$($AuthenticatedPath.TrimStart('/'))"
        Invoke-SmokeRequest -Name "api authenticated" -Url $AuthenticatedUrl -AllowedStatuses @(200)
    }
}

if ($MediaUrl) {
    Invoke-SmokeRequest -Name "media" -Url $MediaUrl -AllowedStatuses @(200, 301, 302)
}

Write-Host ""
Write-Host "Smoke test finished."
