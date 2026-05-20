import assert from 'node:assert/strict'
import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { NoticeToastViewport, successToastDescription } from './page-support'

afterEach(cleanup)

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
