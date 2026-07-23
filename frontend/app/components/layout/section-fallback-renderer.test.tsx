import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import {
	createSectionFallbackRenderer,
	renderSectionFallback,
} from './section-fallback-renderer'

afterEach(cleanup)

test('section fallback renderer preserves the six-row loading skeleton and label', () => {
	render(
		renderSectionFallback({
			showLoading: true,
			loadingLabel: 'Cargando servicios',
			errorNotice: null,
			onReload: () => {},
		}),
	)

	assert.equal(screen.getByRole('status').getAttribute('aria-label'), 'Cargando servicios')
	assert.equal(document.querySelectorAll('.skeleton-row').length, 6)
	assert.equal(screen.queryByRole('button', { name: 'Actualizar' }), null)
})

test('section fallback renderer preserves error copy and reload action', () => {
	const onReload = vi.fn()
	render(
		renderSectionFallback({
			showLoading: false,
			loadingLabel: 'Ignorado',
			errorNotice: {
				title: 'No se pudo cargar servicios',
				description: 'Reintenta en unos segundos.',
				fields: [],
			},
			onReload,
		}),
	)

	assert.equal(screen.getByRole('alert').textContent?.includes('No se pudo cargar servicios'), true)
	assert.ok(screen.getByText('Reintenta en unos segundos.'))
	fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
	assert.equal(onReload.mock.calls.length, 1)
})

test('section fallback renderer keeps the existing default error title', () => {
	render(
		renderSectionFallback({
			showLoading: false,
			loadingLabel: 'Ignorado',
			errorNotice: null,
			onReload: () => {},
		}),
	)

	assert.ok(screen.getByText('No se pudieron cargar los datos'))
})

test('createSectionFallbackRenderer keeps loading and reload dependencies bound', () => {
	const onReload = vi.fn()
	const renderFallback = createSectionFallbackRenderer({
		isDataSetLoading: (key: string) => key === 'customers',
		errorNotice: null,
		onReload,
	})

	render(renderFallback('customers', false, 'Cargando clientes'))
	assert.equal(screen.getByRole('status').getAttribute('aria-label'), 'Cargando clientes')
	cleanup()
	render(renderFallback('customers', true, 'Ignorado'))
	fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
	assert.equal(onReload.mock.calls.length, 1)
})
