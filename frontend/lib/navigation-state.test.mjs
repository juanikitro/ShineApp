import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadNavigationModule() {
	const sourcePath = resolve('lib/navigation-state.ts')
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

const navigationConfig = {
	sections: ['dashboard', 'agenda', 'cash', 'debts', 'settings'],
	settingsSections: ['business', 'cash', 'users', 'history'],
	defaultSection: 'dashboard',
	defaultSettingsSection: 'business',
}

test('reads main section and settings subsection from URL query params', () => {
	const { readNavigationStateFromUrl } = loadNavigationModule()

	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:3000/?section=settings&settings=users',
			navigationConfig,
		),
		{ section: 'settings', settingsSection: 'users' },
	)
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:3000/?section=debts',
			navigationConfig,
		),
		{ section: 'debts', settingsSection: 'business' },
	)
})

test('ignores unknown URL values and keeps safe defaults', () => {
	const { readNavigationStateFromUrl } = loadNavigationModule()

	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:3000/?section=admin&settings=secrets',
			navigationConfig,
		),
		{ section: 'dashboard', settingsSection: 'business' },
	)
})

test('writes canonical query params without dropping unrelated params', () => {
	const { navigationUrlForState } = loadNavigationModule()

	assert.equal(
		navigationUrlForState('http://localhost:3000/?foo=bar', {
			section: 'cash',
			settingsSection: 'business',
		}, navigationConfig),
		'/?foo=bar&section=cash',
	)
	assert.equal(
		navigationUrlForState('http://localhost:3000/?foo=bar&section=cash', {
			section: 'settings',
			settingsSection: 'history',
		}, navigationConfig),
		'/?foo=bar&section=settings&settings=history',
	)
})

test('falls back to controlled hash links when query params are absent', () => {
	const { readNavigationStateFromUrl } = loadNavigationModule()

	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:3000/#settings/cash',
			navigationConfig,
		),
		{ section: 'settings', settingsSection: 'cash' },
	)
})
