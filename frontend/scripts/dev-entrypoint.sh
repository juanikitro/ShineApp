#!/bin/sh
set -eu

LOCKFILE_HASH_PATH="node_modules/.install-lock-hash"
CURRENT_HASH="$(sha256sum package-lock.json package.json | sha256sum | awk '{print $1}')"
INSTALLED_HASH=""

if [ -f "$LOCKFILE_HASH_PATH" ]; then
	INSTALLED_HASH="$(cat "$LOCKFILE_HASH_PATH")"
fi

if [ ! -d node_modules/pdfjs-dist ] || [ "$CURRENT_HASH" != "$INSTALLED_HASH" ]; then
	echo "Syncing frontend dependencies with package-lock.json..."
	npm ci
	printf '%s' "$CURRENT_HASH" > "$LOCKFILE_HASH_PATH"
fi

exec npm run dev:docker
