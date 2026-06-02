#!/bin/sh
# Habilita el hook de commit versionado (.githooks/) para este clon.
# El hook regenera CHANGELOG.md y los indices en cada commit.
set -e

cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
echo "core.hooksPath -> .githooks (hook de changelog habilitado)"
