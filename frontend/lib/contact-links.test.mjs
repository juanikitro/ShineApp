import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	mapsUrlIsUsable,
	normalizeWhatsappDigits,
	whatsappUrl,
} from './contact-links'

test('whatsappUrl antepone +54 cuando el numero no trae codigo de pais', () => {
	assert.equal(whatsappUrl('11 6432-1234'), 'https://wa.me/541164321234')
	assert.equal(whatsappUrl('1164321234'), 'https://wa.me/541164321234')
})

test('whatsappUrl respeta el codigo de pais ya presente', () => {
	assert.equal(whatsappUrl('+54 9 11 6432-1234'), 'https://wa.me/5491164321234')
	assert.equal(whatsappUrl('5491164321234'), 'https://wa.me/5491164321234')
})

test('whatsappUrl devuelve null cuando no hay digitos', () => {
	assert.equal(whatsappUrl(''), null)
	assert.equal(whatsappUrl('   '), null)
	assert.equal(whatsappUrl(null), null)
	assert.equal(whatsappUrl(undefined), null)
	assert.equal(whatsappUrl('sin numero'), null)
})

test('normalizeWhatsappDigits limpia separadores', () => {
	assert.equal(normalizeWhatsappDigits('(011) 6432-1234'), '5401164321234')
	assert.equal(normalizeWhatsappDigits(''), null)
})

test('mapsUrlIsUsable distingue link cargado de vacio', () => {
	assert.equal(mapsUrlIsUsable('https://maps.app.goo.gl/demo'), true)
	assert.equal(mapsUrlIsUsable('   '), false)
	assert.equal(mapsUrlIsUsable(''), false)
	assert.equal(mapsUrlIsUsable(null), false)
	assert.equal(mapsUrlIsUsable(undefined), false)
})
