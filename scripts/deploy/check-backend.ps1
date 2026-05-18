param(
    [switch]$Install,
    [switch]$Production
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackendDir = Join-Path $RepoRoot "backend"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    Push-Location $BackendDir
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
        return @{ Exe = $VenvPython; Prefix = @(); Label = "backend/.venv" }
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @{ Exe = "py"; Prefix = @("-3"); Label = "py -3" }
    }
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @{ Exe = "python"; Prefix = @(); Label = "python" }
    }
    throw "No Python runtime found. Create backend/.venv or install Python."
}

$Python = Resolve-Python
$script:PythonExe = $Python["Exe"]
$script:PythonPrefix = @($Python["Prefix"])
$PythonLabel = $Python["Label"]
Write-Host "Using Python runtime: $PythonLabel"

function Invoke-Python {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PythonArgs)
    $Prefix = @($script:PythonPrefix)
    & $script:PythonExe @Prefix @PythonArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Python command failed with exit code ${LASTEXITCODE}: $($PythonArgs -join ' ')"
    }
}

if ($Install) {
    Invoke-Step "Install backend dependencies" {
        Invoke-Python "-m" "pip" "install" "-r" "requirements.txt"
    }
}

Invoke-Step "Django system check" {
    Invoke-Python "manage.py" "check"
}

Invoke-Step "Migration drift check" {
    Invoke-Python "manage.py" "makemigrations" "--check" "--dry-run"
}

Invoke-Step "Backend tests" {
    Invoke-Python "-m" "pytest"
}

if ($Production) {
    Invoke-Step "Production settings import" {
        $env:DJANGO_SETTINGS_MODULE = "config.settings_production"
        Invoke-Python "-c" "import django; django.setup(); print('production settings import OK')"
    }

    Invoke-Step "Django deploy check" {
        $env:DJANGO_SETTINGS_MODULE = "config.settings_production"
        Invoke-Python "manage.py" "check" "--deploy"
    }
}

Write-Host ""
Write-Host "Backend deploy checks finished."
