import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	form: null as Record<string, any> | null,
	groupEditor: null as Record<string, any> | null,
	summary: null as Record<string, any> | null,
}))

vi.mock('./QuoteDetailEditForm', () => ({
	QuoteDetailEditForm: (props: Record<string, any>) => {
		capturedProps.form = props
		return (
			<>
				<span>Editor de cotizacion</span>
				{props.summary}
				{props.groupEditor}
				{props.downloadActions}
				{props.actions}
			</>
		)
	},
}))

vi.mock('./QuoteDetailSummary', () => ({
	QuoteDetailSummary: (props: Record<string, any>) => {
		capturedProps.summary = props
		return <span>Resumen de cotizacion</span>
	},
}))

vi.mock('@/app/components/forms/QuoteGroupVehicleLinesEditor', () => ({
	QuoteGroupVehicleLinesEditor: (props: Record<string, any>) => {
		capturedProps.groupEditor = props
		return <span>Editor de autos del grupo</span>
	},
}))

import { renderQuoteDetailEditor } from './quote-detail-edit-renderer'

afterEach(cleanup)

function renderQuote(overrides: Record<string, unknown> = {}) {
	const onPatch = vi.fn()
	const onDownloadQuotePdf = vi.fn()
	const onDownloadQuotePdfAndMarkSent = vi.fn()
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)
	const data = {
		id: 'quote-1',
		public_code: 'Q-001',
		status: 'draft',
		is_group: true,
		customer: '1',
		vehicle_lines: [{ vehicle: '1' }],
		subtotal: '100',
		discount_amount: '0',
		taxable_amount: '100',
		tax_amount: '21',
		total: '121',
		...overrides,
	}
	const vehicles = [
		{ id: '1', customer: 1, label: 'Ford Fiesta', customer_name: 'Ana' },
		{ id: '2', customer: 2, label: 'Toyota Etios', customer_name: 'Beto' },
	]
	const vehicleOptions = [
		{ value: '1', label: 'Ford Fiesta', meta: 'Ana' },
		{ value: '2', label: 'Toyota Etios', meta: 'Beto' },
	]

	return {
		...render(
			renderQuoteDetailEditor({
				data,
				onSubmit: () => {},
				onPatch,
				quoteStatusLabels: { draft: 'Sin enviar', sent: 'Enviada' },
				vehicles,
				vehicleOptions,
				serviceOptions: [{ value: '1', label: 'Lavado' }],
				services: [{ id: '1', name: 'Lavado' }],
				canViewEconomy: true,
				useReservationTimes: true,
				openQuickCreate: () => {},
				serviceNotesForLine: () => '',
				focusNextOnEnter: () => () => {},
				flashClass: () => '',
				fieldFlashKey: (target) => target,
				quoteTentativeTimeLabel: () => '',
				onDownloadQuotePdf,
				onDownloadQuotePdfAndMarkSent,
				renderActions,
			}),
		),
		data,
		onPatch,
		onDownloadQuotePdf,
		onDownloadQuotePdfAndMarkSent,
		renderActions,
		vehicleOptions,
	}
}

test('quote detail renderer preserves editable grouped quote props and download callbacks', () => {
	capturedProps.groupEditor = null
	const {
		data,
		onPatch,
		onDownloadQuotePdf,
		onDownloadQuotePdfAndMarkSent,
		renderActions,
	} = renderQuote()

	assert.ok(screen.getByText('Editor de cotizacion'))
	assert.ok(screen.getByText('Resumen de cotizacion'))
	assert.ok(screen.getByText('Editor de autos del grupo'))
	assert.equal(renderActions.mock.calls.length, 1)
	assert.equal(capturedProps.summary?.quote, data)
	assert.equal(capturedProps.summary?.code, 'Q-001')
	assert.equal(capturedProps.summary?.statusLabel, 'Sin enviar')
	assert.equal(capturedProps.summary?.hasReservation, false)
	const groupEditor = capturedProps.groupEditor as Record<string, any> | null
	assert.ok(groupEditor)
	assert.equal(groupEditor.fieldPrefix, 'detail.quote')
	assert.deepEqual(groupEditor.vehicleOptions, [
		{ value: '1', label: 'Ford Fiesta', meta: 'Ana' },
	])
	groupEditor.onChange([{ vehicle: '2' }])
	fireEvent.click(screen.getByRole('button', { name: 'Bajar PDF' }))
	fireEvent.click(
		screen.getByRole('button', { name: 'Bajar y marcar enviado' }),
	)

	assert.deepEqual(onPatch.mock.calls, [[{ vehicle_lines: [{ vehicle: '2' }] }]])
	assert.deepEqual(onDownloadQuotePdf.mock.calls, [[data]])
	assert.deepEqual(onDownloadQuotePdfAndMarkSent.mock.calls, [[data]])
})

test('quote detail renderer preserves the group-reservation notice and hides draft-only download', () => {
	capturedProps.groupEditor = null
	renderQuote({ status: 'sent', reservation: 'reservation-1' })

	assert.ok(
		screen.getByText(
			'Las reservas hijas se editan individualmente desde la agenda.',
		),
	)
	assert.equal(screen.queryByText('Editor de autos del grupo'), null)
	assert.equal(
		screen.queryByRole('button', { name: 'Bajar y marcar enviado' }),
		null,
	)
})

test('quote detail renderer keeps a non-group quote without a group editor', () => {
	capturedProps.groupEditor = null
	const { vehicleOptions } = renderQuote({ is_group: false, customer: null })

	assert.equal(capturedProps.form?.groupEditor, null)
	assert.equal(capturedProps.groupEditor, null)
	assert.equal(capturedProps.summary?.groupLines.length, 0)
	assert.equal(capturedProps.form?.statusOptions.length, 4)
	assert.equal(vehicleOptions.length, 2)
})
