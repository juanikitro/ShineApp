import assert from 'node:assert/strict'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, test, vi } from 'vitest'

const { publicApiFetchMock } = vi.hoisted(() => ({
	publicApiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
	publicApiFetch: publicApiFetchMock,
}))

import { ApiResponseError, normalizeApiErrorPayload } from '@/lib/api-errors'
import { PublicLandingClient } from './PublicLandingClient'

const landingPayload = {
	business: {
		name: 'Lavadero Test',
		slug: 'test',
		logo_url: null,
		opening_time: null,
		closing_time: null,
	},
	actions: { booking_requests: true, quote_requests: true },
	services: [
		{
			id: 7,
			name: 'Lavado Premium',
			service_type: 'wash',
			estimated_duration_minutes: null,
		},
	],
}

afterEach(cleanup)
beforeEach(() => {
	publicApiFetchMock.mockReset()
})

test('muestra el campo "Hora preferida" y el mensaje del backend cuando el submit falla por field error', async () => {
	publicApiFetchMock.mockImplementationOnce(async () => landingPayload)
	const payload = { preferred_time: ['Fuera del horario del negocio.'] }
	publicApiFetchMock.mockImplementationOnce(async () => {
		throw new ApiResponseError(
			normalizeApiErrorPayload(payload, { status: 400 }),
			{ status: 400, payload },
		)
	})

	const user = userEvent.setup()
	render(<PublicLandingClient slug="test" />)

	await screen.findByRole('button', { name: /Lavado Premium/ })
	await user.type(screen.getByLabelText('Nombre'), 'Juan Pablo')
	await user.type(screen.getByLabelText('Celular'), '1164321234')
	await user.click(screen.getByRole('button', { name: /Lavado Premium/ }))
	await user.click(screen.getByRole('button', { name: /Enviar solicitud/i }))

	const alert = await screen.findByRole('alert')
	await waitFor(() => {
		assert.match(alert.textContent ?? '', /Hora preferida/)
		assert.match(alert.textContent ?? '', /Fuera del horario del negocio/)
	})
})

test('validaciones locales muestran el mensaje sin listar campos', async () => {
	publicApiFetchMock.mockImplementationOnce(async () => landingPayload)

	const user = userEvent.setup()
	render(<PublicLandingClient slug="test" />)

	await screen.findByRole('button', { name: /Lavado Premium/ })
	await user.type(screen.getByLabelText('Nombre'), 'Juan Pablo')
	await user.type(screen.getByLabelText('Celular'), '1164321234')
	await user.click(screen.getByRole('button', { name: /Enviar solicitud/i }))

	const alert = await screen.findByRole('alert')
	assert.match(alert.textContent ?? '', /Selecciona al menos un servicio/)
	assert.equal(alert.querySelector('.alert-fields'), null)
})
