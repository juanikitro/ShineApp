import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	normalizeServiceIcon,
	serviceIconCustomCategoryName,
	serviceIconCustomEmojis,
	serviceIconFromCustomEmojiId,
	serviceIconSuggestions,
} from './service-icon-options'

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

test('custom emoji lookup is case-insensitive and safe for unknown ids', () => {
	const first = serviceIconCustomEmojis[0]
	assert.equal(
		serviceIconFromCustomEmojiId(first.id.toUpperCase()),
		serviceIconSuggestions[0].emoji,
	)
	assert.equal(serviceIconFromCustomEmojiId('missing-id'), '')
	assert.equal(normalizeServiceIcon('   '), '')
})
