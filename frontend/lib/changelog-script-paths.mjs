import path from 'node:path'

export function buildCheckDocsCandidates({ scriptDir, cwd = process.cwd() }) {
	return [
		...new Set([
			path.resolve(scriptDir, '../../scripts/check_docs.py'),
			path.resolve(cwd, '../scripts/check_docs.py'),
			path.resolve(cwd, 'scripts/check_docs.py'),
		]),
	]
}

export function resolveCheckDocsPath({
	scriptDir,
	cwd = process.cwd(),
	existsSync,
}) {
	for (const candidate of buildCheckDocsCandidates({ scriptDir, cwd })) {
		if (existsSync(candidate)) {
			return candidate
		}
	}

	return null
}
