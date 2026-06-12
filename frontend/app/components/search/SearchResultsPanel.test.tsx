import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, test, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
	apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
	apiFetch: apiFetchMock,
}))

import { SearchResultsPanel } from './SearchResultsPanel'

const groupsResponse = {
	query: 'aa',
	groups: [
		{
			type: 'vehicle',
			label: 'Vehículos',
			items: [
				{
					id: 1,
					label: 'AA450KX — Volvo XC60',
					sublabel: 'Gonzalo Barbalarga',
					detail_path: '/vehicles/1',
				},
			],
		},
		{
			type: 'service',
			label: 'Servicios',
			items: [
				{
					id: 3,
					label: 'Lavado detallado de auto',
					sublabel: '$10000',
					detail_path: '/services/3',
				},
			],
		},
	],
}

afterEach(cleanup)
beforeEach(() => {
	apiFetchMock.mockReset()
})

test('agrupa resultados por modulo, permite plegarlos y abre el resultado clickeado', async () => {
	apiFetchMock.mockResolvedValue(groupsResponse)
	const opened: Array<[string, { id: number }]> = []
	const user = userEvent.setup()

	render(
		<SearchResultsPanel
			query="aa"
			onSubmitQuery={() => {}}
			onOpenResult={(type, item) => opened.push([type, item])}
		/>,
	)

	await screen.findByRole('button', { name: /AA450KX/ })
	assert.match(String(apiFetchMock.mock.calls[0][0]), /\/search\/\?q=aa&limit=10/)
	assert.ok(screen.getByText(/2 resultados en 2 categorías/))

	// Plegar el grupo de vehiculos oculta sus items sin afectar a los demas.
	const vehiclesHeader = screen.getByRole('button', { name: /Vehículos/ })
	assert.equal(vehiclesHeader.getAttribute('aria-expanded'), 'true')
	await user.click(vehiclesHeader)
	assert.equal(vehiclesHeader.getAttribute('aria-expanded'), 'false')
	assert.equal(screen.queryByRole('button', { name: /AA450KX/ }), null)
	assert.ok(screen.getByRole('button', { name: /Lavado detallado/ }))

	// Desplegar de nuevo y abrir el resultado.
	await user.click(vehiclesHeader)
	await user.click(screen.getByRole('button', { name: /AA450KX/ }))
	assert.equal(opened.length, 1)
	assert.equal(opened[0][0], 'vehicle')
	assert.equal(opened[0][1].id, 1)
})

test('el submit con un termino nuevo delega en onSubmitQuery', async () => {
	apiFetchMock.mockResolvedValue(groupsResponse)
	const submitted: string[] = []
	const user = userEvent.setup()

	render(
		<SearchResultsPanel
			query="aa"
			onSubmitQuery={(value) => submitted.push(value)}
			onOpenResult={() => {}}
		/>,
	)

	const input = screen.getByLabelText('Buscar en todos los módulos')
	await user.clear(input)
	await user.type(input, 'lavado')
	await user.click(screen.getByRole('button', { name: /^Buscar$/ }))

	assert.deepEqual(submitted, ['lavado'])
})

test('una query corta muestra la guia sin pegarle a la API', () => {
	render(
		<SearchResultsPanel query="" onSubmitQuery={() => {}} onOpenResult={() => {}} />,
	)

	assert.ok(screen.getByText('Buscá en todos los módulos'))
	assert.equal(apiFetchMock.mock.calls.length, 0)
})
