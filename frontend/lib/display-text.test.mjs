import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadDisplayTextModule() {
	const sourcePath = resolve('lib/display-text.ts')
	const source = readFileSync(sourcePath, 'utf8')
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	}).outputText
	const module = { exports: {} }
	const loader = new Function('exports', 'module', compiled)
	loader(module.exports, module)
	return module.exports
}

test('joinDisplayParts trims and joins visible fragments with ASCII separators', () => {
	const { joinDisplayParts } = loadDisplayTextModule()

	assert.equal(
		joinDisplayParts(['  Juan ', '', null, ' juan@example.com  ']),
		'Juan - juan@example.com',
	)
})

test('joinDisplayParts returns an empty string when every fragment is blank', () => {
	const { joinDisplayParts } = loadDisplayTextModule()

	assert.equal(joinDisplayParts(['', '   ', null, undefined]), '')
})
