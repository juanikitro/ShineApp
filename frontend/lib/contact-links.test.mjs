import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	mapsUrlIsUsable,
	normalizeWhatsappDigits,
	safeHttpUrl,
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

test('safeHttpUrl rechaza esquemas peligrosos y normaliza http(s)', () => {
	// XSS: ningun esquema peligroso debe pasar.
	assert.equal(safeHttpUrl('javascript:alert(1)'), null)
	assert.equal(safeHttpUrl('JavaScript:alert(1)'), null)
	assert.equal(safeHttpUrl('java\tscript:alert(1)'), null)
	assert.equal(safeHttpUrl('data:text/html,<script>alert(1)</script>'), null)
	assert.equal(safeHttpUrl('vbscript:msgbox(1)'), null)
	// http(s) validos pasan tal cual.
	assert.equal(safeHttpUrl('https://maps.google.com/x'), 'https://maps.google.com/x')
	assert.equal(safeHttpUrl('http://example.com'), 'http://example.com')
	// Sin esquema => se asume https.
	assert.equal(safeHttpUrl('maps.google.com/x'), 'https://maps.google.com/x')
	// Relativo same-origin: permitido.
	assert.equal(safeHttpUrl('/media/doc.pdf'), '/media/doc.pdf')
	// Vacios => null.
	assert.equal(safeHttpUrl(''), null)
	assert.equal(safeHttpUrl(null), null)
	assert.equal(safeHttpUrl(undefined), null)
})
