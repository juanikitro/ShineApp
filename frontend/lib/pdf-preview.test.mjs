import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadPdfPreviewModule() {
	const sourcePath = resolve('lib/pdf-preview.ts')
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

const { isPdfAssetName, isPdfAssetSource } = loadPdfPreviewModule()

test('detects pdf file names regardless of case', () => {
	assert.equal(isPdfAssetName('logo.pdf'), true)
	assert.equal(isPdfAssetName('LOGO.PDF'), true)
	assert.equal(isPdfAssetName('logo.png'), false)
	assert.equal(isPdfAssetName(''), false)
})

test('detects pdf asset urls with querystrings and ignores other assets', () => {
	assert.equal(isPdfAssetSource('http://localhost:8000/media/logo.pdf'), true)
	assert.equal(
		isPdfAssetSource('http://localhost:8000/media/logo.pdf?token=123'),
		true,
	)
	assert.equal(
		isPdfAssetSource('http://localhost:8000/media/logo.png?download=1'),
		false,
	)
	assert.equal(isPdfAssetSource(null), false)
})
