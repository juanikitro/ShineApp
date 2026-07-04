import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { resolveCheckDocsPath } from '../lib/changelog-script-paths.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const changelogPath = path.resolve(dir, '../app/data/changelog.generated.json')
const cmds = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python']
const scriptPath = resolveCheckDocsPath({
	scriptDir: dir,
	cwd: process.cwd(),
	existsSync,
})

if (scriptPath) {
	for (const cmd of cmds) {
		const result = spawnSync(cmd, [scriptPath, '--write', '--skip-build'], {
			cwd: path.dirname(scriptPath),
			stdio: 'inherit',
		})
		if (result.status === 0) process.exit(0)
	}

	console.warn(
		`generate:changelog: no se pudo ejecutar ${path.relative(process.cwd(), scriptPath) || scriptPath} con ${cmds.join(', ')}; usando changelog placeholder.`,
	)
} else {
	console.warn(
		'generate:changelog: no se encontro scripts/check_docs.py; usando changelog placeholder.',
	)
}

if (!existsSync(changelogPath)) {
	mkdirSync(path.dirname(changelogPath), { recursive: true })
	writeFileSync(changelogPath, '[]')
}
process.exit(0)
