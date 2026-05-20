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

Invoke-Step "Backend coverage" $BackendDir {
    Invoke-Python "-m" "pytest" "--cov" "--cov-report=term-missing:skip-covered"
}

Invoke-Step "Frontend coverage" $FrontendDir {
    npm run test:coverage
    Assert-LastExitCode "npm run test:coverage"
}

Write-Host ""
Write-Host "Coverage validation finished."
