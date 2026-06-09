import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, test, vi } from 'vitest'

import { BusinessSettingsPanel } from './BusinessSettingsPanel'

afterEach(cleanup)

function baseForm(overrides: Record<string, unknown> = {}) {
	return {
		name: 'King Shine',
		cuit: '',
		vat_condition: '',
		contact_phone: '',
		contact_email: '',
		address: '',
		maps_url: '',
		public_landing_enabled: true,
		allow_public_booking_requests: true,
		allow_public_quote_requests: true,
		...overrides,
	}
}

function renderPanel(
	overrides: {
		businessForm?: Record<string, unknown>
		onPatchBusinessForm?: (patch: Record<string, unknown>) => void
	} = {},
) {
	const inputRef = createRef<HTMLInputElement>()
	return render(
		<BusinessSettingsPanel
			businessForm={overrides.businessForm ?? baseForm()}
			businessLogoFile={null}
			businessLogoInputKey={0}
			businessLogoInputRef={inputRef}
			businessLogoIsPdf={false}
			businessLogoPdfStatus="idle"
			businessLogoPreview={null}
			businessProfile={null}
			safeBusinessLogoPdfThumbnail={null}
			safeBusinessLogoPreview={null}
			onBusinessLogoChange={() => {}}
			onOpenBusinessLogoPicker={() => {}}
			onPatchBusinessForm={overrides.onPatchBusinessForm ?? (() => {})}
			onSaveBusinessProfile={() => {}}
		/>,
	)
}

test('BusinessSettingsPanel renderiza el enlace de Google Maps con el valor del form', () => {
	renderPanel({
		businessForm: baseForm({ maps_url: 'https://maps.app.goo.gl/demo' }),
	})
	const input = screen.getByLabelText(
		'Enlace de Google Maps',
	) as HTMLInputElement
	assert.equal(input.value, 'https://maps.app.goo.gl/demo')
})

test('BusinessSettingsPanel propaga el cambio del enlace de Google Maps', async () => {
	const user = userEvent.setup()
	const patch = vi.fn()
	renderPanel({ onPatchBusinessForm: patch })
	await user.type(screen.getByLabelText('Enlace de Google Maps'), 'h')
	assert.deepEqual(patch.mock.calls[0][0], { maps_url: 'h' })
})
