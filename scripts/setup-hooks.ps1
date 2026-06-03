$ErrorActionPreference = "Stop"

# Habilita el hook de commit versionado (.githooks/) para este clon.
# El hook regenera CHANGELOG.md y los indices en cada commit.
# Tambien registra el merge driver union-docs usado en .gitattributes para
# resolver conflictos automaticamente en los archivos auto-generados.

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot
try {
    git config core.hooksPath .githooks
    if ($LASTEXITCODE -ne 0) {
        throw "git config core.hooksPath fallo con codigo $LASTEXITCODE"
    }
    Write-Host "core.hooksPath -> .githooks (hook de changelog habilitado)"

    git config merge.union-docs.name "Union merge para archivos auto-generados por pre-commit"
    git config merge.union-docs.driver "git merge-file --union %A %O %B || true"
    if ($LASTEXITCODE -ne 0) {
        throw "git config merge.union-docs fallo con codigo $LASTEXITCODE"
    }
    Write-Host "merge.union-docs -> driver union configurado (CHANGELOG.md, docs/registro/cambios/index.md)"
}
finally {
    Pop-Location
}
