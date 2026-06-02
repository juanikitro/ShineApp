$ErrorActionPreference = "Stop"

# Habilita el hook de commit versionado (.githooks/) para este clon.
# El hook regenera CHANGELOG.md y los indices en cada commit.

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot
try {
    git config core.hooksPath .githooks
    if ($LASTEXITCODE -ne 0) {
        throw "git config core.hooksPath fallo con codigo $LASTEXITCODE"
    }
    Write-Host "core.hooksPath -> .githooks (hook de changelog habilitado)"
}
finally {
    Pop-Location
}
