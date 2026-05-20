$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackendDir = Join-Path $RepoRoot "backend"
$FrontendDir = Join-Path $RepoRoot "frontend"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    Push-Location $WorkingDirectory
    try {
        & $Command
    }
    finally {
        Pop-Location
    }
}

function Resolve-Python {
    $VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

    if (Test-Path $VenvPython) {
        return @{
            Exe = $VenvPython
            Prefix = @()
            Label = "backend/.venv"
        }
    }

    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @{
            Exe = "py"
            Prefix = @("-3")
            Label = "py -3"
        }
    }

    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @{
            Exe = "python"
            Prefix = @()
            Label = "python"
        }
    }

    throw "No Python runtime found. Create backend/.venv or install the Python launcher."
}

function Assert-LastExitCode {
    param([string]$CommandName)
    if ($LASTEXITCODE -ne 0) {
        throw "$CommandName failed with exit code $LASTEXITCODE"
    }
}

$Python = Resolve-Python
$script:PythonExe = $Python["Exe"]
$script:PythonPrefix = @($Python["Prefix"])
$script:PythonLabel = $Python["Label"]
Write-Host "Using Python runtime: $script:PythonLabel"

function Invoke-Python {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PythonArgs)

    $Prefix = @($script:PythonPrefix)
    & $script:PythonExe @Prefix @PythonArgs
    Assert-LastExitCode "python $($PythonArgs -join ' ')"
}

Invoke-Step "Compose config" $RepoRoot {
    docker compose config --quiet
    Assert-LastExitCode "docker compose config --quiet"
}

Invoke-Step "Backend tests" $BackendDir {
    Invoke-Python "-m" "pytest"
}

Invoke-Step "Backend system check" $BackendDir {
    Invoke-Python manage.py check
}

Invoke-Step "Frontend tests" $FrontendDir {
    npm run test
    Assert-LastExitCode "npm run test"
}

Invoke-Step "Frontend build" $FrontendDir {
    npm run build
    Assert-LastExitCode "npm run build"
}

Write-Host ""
Write-Host "Validation finished."
