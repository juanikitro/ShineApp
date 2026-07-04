import assert from 'node:assert/strict'
import path from 'node:path'
import { test } from 'vitest'

import {
	buildCheckDocsCandidates,
	resolveCheckDocsPath,
} from './changelog-script-paths.mjs'

test('resolveCheckDocsPath encuentra check_docs.py desde frontend/scripts', () => {
	const scriptDir = path.resolve('workspace/frontend/scripts')
	const cwd = path.resolve('workspace/frontend')
	const expected = path.resolve('workspace/scripts/check_docs.py')

	const resolved = resolveCheckDocsPath({
		scriptDir,
		cwd,
		existsSync: (candidate) => candidate === expected,
	})

	assert.equal(resolved, expected)
})

test('resolveCheckDocsPath usa la ruta relativa al cwd cuando evita escapar fuera del checkout', () => {
	const scriptDir = path.join(path.sep, 'vercel', 'path0', 'scripts')
	const cwd = path.join(path.sep, 'vercel', 'path0', 'frontend')
	const expected = path.resolve(cwd, '../scripts/check_docs.py')

	const resolved = resolveCheckDocsPath({
		scriptDir,
		cwd,
		existsSync: (candidate) => candidate === expected,
	})

	assert.equal(resolved, expected)
})

test('buildCheckDocsCandidates deduplica rutas repetidas', () => {
	const scriptDir = path.resolve('workspace/frontend/scripts')
	const cwd = path.resolve('workspace/frontend')

	assert.deepEqual(buildCheckDocsCandidates({ scriptDir, cwd }), [
		path.resolve('workspace/scripts/check_docs.py'),
		path.resolve('workspace/frontend/scripts/check_docs.py'),
	])
})

test('resolveCheckDocsPath devuelve null si no encuentra check_docs.py', () => {
	const resolved = resolveCheckDocsPath({
		scriptDir: path.resolve('workspace/frontend/scripts'),
		cwd: path.resolve('workspace/frontend'),
		existsSync: () => false,
	})

	assert.equal(resolved, null)
})
