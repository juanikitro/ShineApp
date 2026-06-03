#!/bin/sh
# Habilita el hook de commit versionado (.githooks/) para este clon.
# El hook regenera CHANGELOG.md y los indices en cada commit.
# Tambien registra el merge driver union-docs usado en .gitattributes para
# resolver conflictos automaticamente en los archivos auto-generados.
set -e

cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
echo "core.hooksPath -> .githooks (hook de changelog habilitado)"

git config merge.union-docs.name "Union merge para archivos auto-generados por pre-commit"
git config merge.union-docs.driver "git merge-file --union %A %O %B || true"
echo "merge.union-docs -> driver union configurado (CHANGELOG.md, docs/registro/cambios/index.md)"
