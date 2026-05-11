import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadServiceDisplayModule() {
	const sourcePath = resolve('lib/service-display.ts')
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

const { serviceDisplayName } = loadServiceDisplayModule()

test('prefixes service names with a manual icon when present', () => {
	assert.equal(
		serviceDisplayName({ service_icon: '🧽', service_name: 'Lavado premium' }),
		'🧽 Lavado premium',
	)
	assert.equal(
		serviceDisplayName({ icon: '✨', name: 'Sellado ceramico' }),
		'✨ Sellado ceramico',
	)
})

test('keeps service names clean when icon is blank', () => {
	assert.equal(serviceDisplayName({ service_name: 'Lavado premium' }), 'Lavado premium')
	assert.equal(serviceDisplayName({ icon: '', name: 'Combo interior' }), 'Combo interior')
	assert.equal(serviceDisplayName({}, 'Servicio'), 'Servicio')
})
