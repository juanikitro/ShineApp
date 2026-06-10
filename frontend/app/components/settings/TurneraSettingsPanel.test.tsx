import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, test, vi } from 'vitest'

import { TurneraSettingsPanel } from './TurneraSettingsPanel'

afterEach(cleanup)

function baseForm(overrides: Record<string, unknown> = {}) {
	return {
		public_landing_enabled: true,
		public_landing_intro: '',
		allow_public_booking_requests: true,
		allow_public_quote_requests: true,
		public_hidden_service_ids: [],
		public_show_service_description: true,
		public_show_service_price: false,
		opening_time: null,
		closing_time: null,
		...overrides,
	}
}

test('TurneraSettingsPanel renders description and price checkboxes with profile defaults', () => {
	render(
		<TurneraSettingsPanel
			businessForm={baseForm()}
			businessSlug="king-shine"
			services={[]}
			onPatchBusinessForm={() => {}}
			onSaveBusinessProfile={() => {}}
		/>,
	)
	const description = screen.getByLabelText(
		'Mostrar descripcion del servicio',
	) as HTMLInputElement
	const price = screen.getByLabelText(
		'Mostrar precio del servicio',
	) as HTMLInputElement
	assert.equal(description.checked, true)
	assert.equal(price.checked, false)
})

test('TurneraSettingsPanel propagates toggling the description flag', async () => {
	const user = userEvent.setup()
	const patch = vi.fn()
	render(
		<TurneraSettingsPanel
			businessForm={baseForm()}
			businessSlug="king-shine"
			services={[]}
			onPatchBusinessForm={patch}
			onSaveBusinessProfile={() => {}}
		/>,
	)
	await user.click(screen.getByLabelText('Mostrar descripcion del servicio'))
	assert.deepEqual(patch.mock.calls[0][0], {
		public_show_service_description: false,
	})
})

test('TurneraSettingsPanel propagates toggling the price flag', async () => {
	const user = userEvent.setup()
	const patch = vi.fn()
	render(
		<TurneraSettingsPanel
			businessForm={baseForm()}
			businessSlug="king-shine"
			services={[]}
			onPatchBusinessForm={patch}
			onSaveBusinessProfile={() => {}}
		/>,
	)
	await user.click(screen.getByLabelText('Mostrar precio del servicio'))
	assert.deepEqual(patch.mock.calls[0][0], {
		public_show_service_price: true,
	})
})

test('TurneraSettingsPanel exposes an "Abrir turnera" link when a slug is present', () => {
	render(
		<TurneraSettingsPanel
			businessForm={baseForm()}
			businessSlug="king-shine"
			services={[]}
			onPatchBusinessForm={() => {}}
			onSaveBusinessProfile={() => {}}
		/>,
	)
	const link = screen.getByLabelText(
		'Abrir turnera en una nueva pestana',
	) as HTMLAnchorElement
	assert.equal(link.tagName, 'A')
	assert.equal(link.target, '_blank')
	assert.match(link.href, /\/publica\/king-shine$/)
})

test('TurneraSettingsPanel hides the "Abrir" link when there is no slug', () => {
	render(
		<TurneraSettingsPanel
			businessForm={baseForm()}
			businessSlug=""
			services={[]}
			onPatchBusinessForm={() => {}}
			onSaveBusinessProfile={() => {}}
		/>,
	)
	assert.equal(
		screen.queryByLabelText('Abrir turnera en una nueva pestana'),
		null,
	)
})
