import assert from 'node:assert/strict'
import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import {
	NoticeToastViewport,
	monthRange,
	successToastDescription,
} from './page-support'

afterEach(cleanup)

test('monthRange devuelve el primer y ultimo dia del mes', () => {
	assert.deepEqual(monthRange('2026-06-09'), {
		from: '2026-06-01',
		to: '2026-06-30',
	})
	assert.deepEqual(monthRange('2026-12-31'), {
		from: '2026-12-01',
		to: '2026-12-31',
	})
})

test('monthRange ajusta el ultimo dia segun el mes y los anios bisiestos', () => {
	assert.deepEqual(monthRange('2026-02-15'), {
		from: '2026-02-01',
		to: '2026-02-28',
	})
	assert.deepEqual(monthRange('2024-02-10'), {
		from: '2024-02-01',
		to: '2024-02-29',
	})
})

test('monthRange con offset cruza limites de mes y de anio', () => {
	assert.deepEqual(monthRange('2026-06-09', 1), {
		from: '2026-07-01',
		to: '2026-07-31',
	})
	assert.deepEqual(monthRange('2026-12-15', 1), {
		from: '2027-01-01',
		to: '2027-01-31',
	})
	assert.deepEqual(monthRange('2026-01-20', -1), {
		from: '2025-12-01',
		to: '2025-12-31',
	})
})

test('successToastDescription explains the completed action', () => {
	assert.equal(
		successToastDescription('Reserva movida'),
		'La reserva quedo en el nuevo dia de agenda.',
	)
	assert.equal(
		successToastDescription('PDF descargado y cotizacion enviada'),
		'El archivo se descargo y la cotizacion quedo marcada como enviada.',
	)
	assert.equal(
		successToastDescription('Cliente creado'),
		'El nuevo registro quedo guardado y disponible en la app.',
	)
	assert.equal(
		successToastDescription('Material inactivado'),
		'El registro dejo de estar activo en los listados principales.',
	)
})

test('NoticeToastViewport renders globally outside local layout stacking', async () => {
	const { container } = render(
		React.createElement(
			'section',
			{ className: 'modal-backdrop' },
			React.createElement(NoticeToastViewport, {
				toasts: [
					{
						id: 1,
						tone: 'success',
						title: 'PDF descargado',
						description: 'El archivo se genero y quedo descargado.',
					},
				],
				onDismiss: () => {},
			}),
		),
	)

	await screen.findByRole('status')
	await waitFor(() => {
		const viewport = document.body.querySelector('.toast-viewport')
		assert.ok(viewport)
		assert.equal(viewport.parentElement, document.body)
	})
	assert.equal(container.querySelector('.toast-viewport'), null)
})
