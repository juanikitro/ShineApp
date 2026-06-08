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
import ResetPasswordPage from './page'

afterEach(cleanup)
beforeEach(() => {
	publicApiFetchMock.mockReset()
	window.history.replaceState({}, '', '/reset-password?token=test-token')
})

test('muestra el campo "Nueva clave" y el mensaje del backend cuando new_password es rechazado', async () => {
	const payload = {
		new_password: ['La contraseña debe tener al menos 8 caracteres.'],
	}
	publicApiFetchMock.mockImplementationOnce(async () => {
		throw new ApiResponseError(
			normalizeApiErrorPayload(payload, { status: 400 }),
			{ status: 400, payload },
		)
	})

	const user = userEvent.setup()
	render(<ResetPasswordPage />)

	await user.type(screen.getByLabelText('Nueva contraseña'), 'secret12')
	await user.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

	const alert = await screen.findByRole('alert')
	await waitFor(() => {
		assert.match(alert.textContent ?? '', /Nueva clave/)
		assert.match(
			alert.textContent ?? '',
			/La contraseña debe tener al menos 8 caracteres/,
		)
	})
})

test('mensajes de error sin fields no listan campos en el alerta', async () => {
	publicApiFetchMock.mockImplementationOnce(async () => {
		throw new ApiResponseError(
			normalizeApiErrorPayload(
				{ detail: 'El link es invalido.' },
				{ status: 400 },
			),
			{ status: 400, payload: { detail: 'El link es invalido.' } },
		)
	})

	const user = userEvent.setup()
	render(<ResetPasswordPage />)

	await user.type(screen.getByLabelText('Nueva contraseña'), 'secret12')
	await user.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

	const alert = await screen.findByRole('alert')
	assert.match(alert.textContent ?? '', /El link es invalido/)
	assert.equal(alert.querySelector('.alert-fields'), null)
})
