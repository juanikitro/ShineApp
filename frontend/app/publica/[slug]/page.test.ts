import assert from 'node:assert/strict'
import { afterEach, beforeEach, test, vi } from 'vitest'

import { generateMetadata } from './page'

function makeParams(slug: string) {
	return { params: Promise.resolve({ slug }) }
}

function mockFetch(payload: unknown, ok = true) {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue({
			ok,
			json: () => Promise.resolve(payload),
		}),
	)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

// ── Favicon con logo de imagen ────────────────────────────────────────────────

test('favicon usa el logo cuando es PNG', async () => {
	mockFetch({ business: { name: 'Shine Test', logo_url: 'https://cdn.example.com/logo.png' } })
	const meta = await generateMetadata(makeParams('shine-test'))
	const icons = meta.icons as Record<string, unknown>
	assert.ok(icons, 'icons debe estar presente')
	const iconList = icons['icon'] as Array<{ url: string }>
	assert.equal(iconList[0].url, 'https://cdn.example.com/logo.png')
})

test('favicon usa el logo cuando es JPG', async () => {
	mockFetch({ business: { name: 'Shine Test', logo_url: 'https://cdn.example.com/logo.jpg' } })
	const meta = await generateMetadata(makeParams('shine-test'))
	const icons = meta.icons as Record<string, unknown>
	assert.ok(icons)
	const iconList = icons['icon'] as Array<{ url: string }>
	assert.equal(iconList[0].url, 'https://cdn.example.com/logo.jpg')
})

test('favicon usa el logo cuando es SVG', async () => {
	mockFetch({ business: { name: 'Shine Test', logo_url: 'https://cdn.example.com/logo.svg' } })
	const meta = await generateMetadata(makeParams('shine-test'))
	const icons = meta.icons as Record<string, unknown>
	assert.ok(icons)
	const iconList = icons['icon'] as Array<{ url: string }>
	assert.equal(iconList[0].url, 'https://cdn.example.com/logo.svg')
})

test('favicon usa el logo cuando es WEBP', async () => {
	mockFetch({ business: { name: 'Shine Test', logo_url: 'https://cdn.example.com/logo.webp' } })
	const meta = await generateMetadata(makeParams('shine-test'))
	const icons = meta.icons as Record<string, unknown>
	assert.ok(icons)
	const iconList = icons['icon'] as Array<{ url: string }>
	assert.equal(iconList[0].url, 'https://cdn.example.com/logo.webp')
})

test('apple-touch-icon y shortcut también usan el logo', async () => {
	mockFetch({ business: { name: 'Shine Test', logo_url: 'https://cdn.example.com/logo.png' } })
	const meta = await generateMetadata(makeParams('shine-test'))
	const icons = meta.icons as Record<string, unknown>
	const apple = icons['apple'] as Array<{ url: string }>
	const shortcut = icons['shortcut'] as Array<{ url: string }>
	assert.equal(apple[0].url, 'https://cdn.example.com/logo.png')
	assert.equal(shortcut[0].url, 'https://cdn.example.com/logo.png')
})

// ── URL con query params ──────────────────────────────────────────────────────

test('favicon usa el logo cuando la URL tiene query params (ej. token de storage)', async () => {
	const url = 'https://storage.supabase.co/storage/v1/object/public/logos/logo.png?token=abc'
	mockFetch({ business: { name: 'Shine Test', logo_url: url } })
	const meta = await generateMetadata(makeParams('shine-test'))
	const icons = meta.icons as Record<string, unknown>
	assert.ok(icons)
	const iconList = icons['icon'] as Array<{ url: string }>
	assert.equal(iconList[0].url, url)
})

// ── Sin favicon cuando no hay logo válido ─────────────────────────────────────

test('no setea icons cuando logo_url es null', async () => {
	mockFetch({ business: { name: 'Shine Test', logo_url: null } })
	const meta = await generateMetadata(makeParams('shine-test'))
	assert.equal(meta.icons, undefined)
})

test('no setea icons cuando logo_url está ausente', async () => {
	mockFetch({ business: { name: 'Shine Test' } })
	const meta = await generateMetadata(makeParams('shine-test'))
	assert.equal(meta.icons, undefined)
})

test('no setea icons cuando el logo es un PDF', async () => {
	mockFetch({ business: { name: 'Shine Test', logo_url: 'https://cdn.example.com/logo.pdf' } })
	const meta = await generateMetadata(makeParams('shine-test'))
	assert.equal(meta.icons, undefined)
})

test('no setea icons cuando logo_url no tiene extension reconocida', async () => {
	mockFetch({ business: { name: 'Shine Test', logo_url: 'https://cdn.example.com/archivo.doc' } })
	const meta = await generateMetadata(makeParams('shine-test'))
	assert.equal(meta.icons, undefined)
})

// ── Metadatos de título ───────────────────────────────────────────────────────

test('title incluye el nombre del negocio', async () => {
	mockFetch({ business: { name: 'Lavadero Las Palmas', logo_url: null } })
	const meta = await generateMetadata(makeParams('lavadero-las-palmas'))
	assert.equal(meta.title, 'Lavadero Las Palmas · Reservas')
})

test('title usa fallback cuando la API falla', async () => {
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
	const meta = await generateMetadata(makeParams('no-existe'))
	assert.equal(meta.title, 'Reserva online · Reservas')
})

test('manifest apunta al slug correcto', async () => {
	mockFetch({ business: { name: 'Shine Test', logo_url: null } })
	const meta = await generateMetadata(makeParams('mi-negocio'))
	assert.equal(meta.manifest, '/publica/mi-negocio/manifest.webmanifest')
})
