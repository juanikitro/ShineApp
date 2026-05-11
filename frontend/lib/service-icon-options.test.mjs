import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadModule() {
	const sourcePath = resolve('lib/service-icon-options.ts')
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

const {
	normalizeServiceIcon,
	serviceIconCustomCategoryName,
	serviceIconCustomEmojis,
	serviceIconFromCustomEmojiId,
	serviceIconSuggestions,
} = loadModule()

test('keeps a curated custom category for car wash services', () => {
	assert.equal(serviceIconCustomCategoryName, 'Lavadero & detailing')
	assert.ok(serviceIconSuggestions.length >= 12)
	assert.equal(
		new Set(serviceIconSuggestions.map((option) => option.emoji)).size,
		serviceIconSuggestions.length,
	)
	assert.ok(serviceIconSuggestions.every((option) => option.emoji && option.label))
})

test('custom icon suggestions stay as unicode emoji and do not include gifs', () => {
	for (const option of serviceIconSuggestions) {
		assert.doesNotMatch(option.emoji, /^https?:/i)
		assert.doesNotMatch(option.emoji, /\.gif($|\?)/i)
	}
})

test('custom picker category maps dedicated emojis back to unicode values', () => {
	assert.equal(serviceIconCustomEmojis.length, serviceIconSuggestions.length)

	for (const customEmoji of serviceIconCustomEmojis) {
		assert.match(customEmoji.id, /^shine-service-\d+$/)
		assert.match(customEmoji.imgUrl, /^data:image\/svg\+xml;utf8,/)
		assert.doesNotMatch(customEmoji.imgUrl, /\.gif($|\?)/i)
		assert.ok(customEmoji.names.includes('lavadero'))
		assert.ok(serviceIconFromCustomEmojiId(customEmoji.id))
	}
})

test('normalizes manually pasted service icons', () => {
	assert.equal(normalizeServiceIcon('  🧽  '), '🧽')
	assert.equal(normalizeServiceIcon('x'.repeat(32)), 'x'.repeat(24))
})
