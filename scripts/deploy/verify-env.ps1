param(
    [switch]$Example,
    [switch]$Production,
    [string]$EnvFile
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if (-not $EnvFile) {
    $EnvFile = if ($Example) { Join-Path $RepoRoot ".env.example" } else { Join-Path $RepoRoot ".env" }
}

function Read-DotEnvFile {
    param([string]$Path)

    $Values = @{}
    if (-not (Test-Path $Path)) {
        return $Values
    }

    Get-Content -Path $Path | ForEach-Object {
        $Line = $_.Trim()
        if (-not $Line -or $Line.StartsWith("#")) {
            return
        }
        $EqualsIndex = $Line.IndexOf("=")
        if ($EqualsIndex -lt 1) {
            return
        }
        $Key = $Line.Substring(0, $EqualsIndex).Trim()
        $Value = $Line.Substring($EqualsIndex + 1).Trim().Trim('"').Trim("'")
        $Values[$Key] = $Value
    }
    return $Values
}

$FileValues = Read-DotEnvFile $EnvFile

function Get-EnvValue {
    param([string]$Name)
    if ($FileValues.ContainsKey($Name)) {
        return $FileValues[$Name]
    }
    return [Environment]::GetEnvironmentVariable($Name)
}

function Test-RequiredKey {
    param([string]$Name)
    $Value = Get-EnvValue $Name
    if ($Example) {
        if (-not $FileValues.ContainsKey($Name)) {
            throw "$Name is missing from .env.example."
        }
        return
    }
    if ($Production -and [string]::IsNullOrWhiteSpace($Value)) {
        throw "$Name must be set for production."
    }
}

$ExpectedKeys = @(
    "DJANGO_SETTINGS_MODULE",
    "DJANGO_SECRET_KEY",
    "DJANGO_DEBUG",
    "DJANGO_ALLOWED_HOSTS",
    "CORS_ALLOWED_ORIGINS",
    "CORS_ALLOWED_ORIGIN_REGEXES",
    "CSRF_TRUSTED_ORIGINS",
    "DATABASE_URL",
    "DATABASE_SSL_REQUIRE",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_HOST",
    "POSTGRES_PORT",
    "SUPABASE_STORAGE_ENABLED",
    "SUPABASE_STORAGE_BUCKET",
    "SUPABASE_S3_ENDPOINT_URL",
    "SUPABASE_S3_REGION_NAME",
    "SUPABASE_S3_ACCESS_KEY_ID",
    "SUPABASE_S3_SECRET_ACCESS_KEY",
    "SUPABASE_STORAGE_QUERYSTRING_AUTH",
    "SUPABASE_STORAGE_PUBLIC_URL",
    "SUPABASE_STORAGE_LOCATION",
    "DEFAULT_DAILY_CAPACITY",
    "BUSINESS_NAME",
    "EMAIL_BACKEND",
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_HOST_USER",
    "EMAIL_HOST_PASSWORD",
    "EMAIL_USE_TLS",
    "DEFAULT_FROM_EMAIL",
    "NEXT_PUBLIC_API_URL"
)

foreach ($Key in $ExpectedKeys) {
    Test-RequiredKey $Key
}

$ApiUrl = Get-EnvValue "NEXT_PUBLIC_API_URL"
if ($ApiUrl -and -not $ApiUrl.TrimEnd("/").EndsWith("/api")) {
    throw "NEXT_PUBLIC_API_URL must point to the API root and end with /api."
}

$StorageEnabled = (Get-EnvValue "SUPABASE_STORAGE_ENABLED")
if ($StorageEnabled -in @("1", "true", "True", "TRUE", "yes", "on")) {
    foreach ($Key in @("SUPABASE_STORAGE_BUCKET", "SUPABASE_S3_ENDPOINT_URL", "SUPABASE_S3_REGION_NAME", "SUPABASE_S3_ACCESS_KEY_ID", "SUPABASE_S3_SECRET_ACCESS_KEY")) {
        $Value = Get-EnvValue $Key
        if ($Production -and [string]::IsNullOrWhiteSpace($Value)) {
            throw "$Key must be set when SUPABASE_STORAGE_ENABLED=1."
        }
    }
}

if ($Production) {
    $SecretKey = Get-EnvValue "DJANGO_SECRET_KEY"
    if ($SecretKey -match "change-me|dev-only|<|>") {
        throw "DJANGO_SECRET_KEY still looks like a placeholder."
    }
}

Write-Host "Environment shape OK for $EnvFile"
