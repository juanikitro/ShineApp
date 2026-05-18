param(
    [switch]$Install
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$FrontendDir = Join-Path $RepoRoot "frontend"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    Push-Location $FrontendDir
    try {
        & $Command
    }
    finally {
        Pop-Location
    }
}

function Assert-LastExitCode {
    param([string]$CommandName)
    if ($LASTEXITCODE -ne 0) {
        throw "$CommandName failed with exit code $LASTEXITCODE"
    }
}

if ($Install) {
    Invoke-Step "Install frontend dependencies" {
        npm install
        Assert-LastExitCode "npm install"
    }
}

Invoke-Step "Frontend tests" {
    npm run test
    Assert-LastExitCode "npm run test"
}

Invoke-Step "Frontend lint if configured" {
    $HasLint = node -e "const p=require('./package.json'); process.stdout.write(p.scripts && p.scripts.lint ? '1' : '0')"
    if ($HasLint -eq "1") {
        npm run lint
        Assert-LastExitCode "npm run lint"
    }
    else {
        Write-Host "No lint script configured; skipping."
    }
}

Invoke-Step "Frontend build" {
    npm run build
    Assert-LastExitCode "npm run build"
}

Invoke-Step "Frontend production dependency audit" {
    npm audit --omit=dev
    Assert-LastExitCode "npm audit --omit=dev"
}

Write-Host ""
Write-Host "Frontend deploy checks finished."
