import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const longNotes =
	'Lavado premium con espuma activa, secado a mano, limpieza profunda de tapizados, perfumado interior y tratamiento ceramico de larga duracion para la carroceria.'

const landingPayload = {
	business: {
		name: 'Lavadero Test',
		slug: 'test',
		logo_url: 'https://cdn.example.com/logo.png',
		contact_phone: '11 6432-1234',
		address: 'Av. Siempre Viva 742',
		maps_url: 'https://maps.app.goo.gl/demo',
		opening_time: null,
		closing_time: null,
	},
	actions: { booking_requests: true, quote_requests: true },
	display: { show_service_description: true, show_service_price: false },
	sectors: [
		{ id: 1, name: 'Lavadero', key: 'lavadero', color: '', order: 0 },
		{ id: 2, name: 'Detailing', key: 'detailing', color: '', order: 1 },
	],
	services: [
		{
			id: 7,
			name: 'Lavado Premium',
			sector: 1,
			estimated_duration_minutes: null,
			notes: longNotes,
		},
		{
			id: 9,
			name: 'Detailing Total',
			sector: 2,
			estimated_duration_minutes: null,
			notes: 'Corto.',
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

	await user.click(await screen.findByRole('button', { name: /Lavadero/ }))
	await user.click(screen.getByRole('button', { name: /Lavado Premium/ }))
	await user.type(screen.getByLabelText('Nombre y apellido'), 'Juan Pablo')
	await user.type(screen.getByLabelText('Celular'), '1164321234')
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

	await screen.findByRole('button', { name: /Lavadero/ })
	await user.type(screen.getByLabelText('Nombre y apellido'), 'Juan Pablo')
	await user.type(screen.getByLabelText('Celular'), '1164321234')
	await user.click(screen.getByRole('button', { name: /Enviar solicitud/i }))

	const alert = await screen.findByRole('alert')
	assert.match(alert.textContent ?? '', /Selecciona al menos un servicio/)
	assert.equal(alert.querySelector('.alert-fields'), null)
})

test('los grupos de servicios arrancan colapsados y se abren al tocar el encabezado', async () => {
	publicApiFetchMock.mockImplementationOnce(async () => landingPayload)

	const user = userEvent.setup()
	render(<PublicLandingClient slug="test" />)

	const groupToggle = await screen.findByRole('button', { name: /Lavadero/ })
	assert.equal(groupToggle.getAttribute('aria-expanded'), 'false')
	assert.equal(screen.queryByRole('button', { name: /Lavado Premium/ }), null)

	await user.click(groupToggle)
	assert.equal(groupToggle.getAttribute('aria-expanded'), 'true')
	assert.ok(screen.getByRole('button', { name: /Lavado Premium/ }))
})

test('las descripciones largas se truncan con "Ver mas" y se expanden', async () => {
	publicApiFetchMock.mockImplementationOnce(async () => landingPayload)

	const user = userEvent.setup()
	const { container } = render(<PublicLandingClient slug="test" />)

	await user.click(await screen.findByRole('button', { name: /Lavadero/ }))
	const desc = container.querySelector('.public-service-desc small')
	assert.equal(desc?.getAttribute('data-clamped'), 'true')

	await user.click(screen.getByRole('button', { name: /Ver mas/i }))
	assert.equal(desc?.getAttribute('data-clamped'), 'false')
	assert.ok(screen.getByRole('button', { name: /Ver menos/i }))
})

test('las descripciones cortas no muestran el boton "Ver mas"', async () => {
	publicApiFetchMock.mockImplementationOnce(async () => landingPayload)

	const user = userEvent.setup()
	render(<PublicLandingClient slug="test" />)

	await user.click(await screen.findByRole('button', { name: /Detailing/ }))
	assert.ok(screen.getByRole('button', { name: /Detailing Total/ }))
	assert.equal(screen.queryByRole('button', { name: /Ver mas/i }), null)
})

test('los precios de servicios y el total siguen al tipo de vehiculo seleccionado', async () => {
	const formatPrice = (value: number) =>
		value.toLocaleString('es-AR', {
			style: 'currency',
			currency: 'ARS',
			maximumFractionDigits: 0,
		})
	const payload = {
		...landingPayload,
		display: { show_service_description: true, show_service_price: true },
		services: [
			{
				...landingPayload.services[0],
				base_price: '15000.00',
				price_camioneta: '20000.00',
			},
			landingPayload.services[1],
		],
	}
	publicApiFetchMock.mockImplementationOnce(async () => payload)

	const user = userEvent.setup()
	const { container } = render(<PublicLandingClient slug="test" />)

	const priceTag = () =>
		container.querySelector('.public-svc-price')?.textContent
	const totalTag = () =>
		container.querySelector('.public-summary-total')?.textContent

	await user.click(await screen.findByRole('button', { name: /Lavadero/ }))
	await user.click(screen.getByRole('button', { name: /Agregar Lavado Premium/ }))

	// tipo default "auto" sin precio propio -> base_price
	assert.equal(priceTag(), formatPrice(15000))
	assert.equal(totalTag(), formatPrice(15000))

	await user.selectOptions(
		screen.getByLabelText('Tipo de vehículo'),
		'camioneta',
	)
	assert.equal(priceTag(), formatPrice(20000))
	assert.equal(totalTag(), formatPrice(20000))

	// tipo sin precio propio vuelve al base
	await user.selectOptions(screen.getByLabelText('Tipo de vehículo'), 'moto')
	assert.equal(priceTag(), formatPrice(15000))
	assert.equal(totalTag(), formatPrice(15000))
})

test('el telefono abre WhatsApp y la direccion abre Google Maps', async () => {
	publicApiFetchMock.mockImplementationOnce(async () => landingPayload)
	render(<PublicLandingClient slug="test" />)

	const whatsapp = await screen.findByRole('link', { name: /11 6432-1234/ })
	assert.equal(whatsapp.getAttribute('href'), 'https://wa.me/541164321234')
	assert.equal(whatsapp.getAttribute('target'), '_blank')
	assert.match(whatsapp.getAttribute('rel') ?? '', /noopener/)

	const maps = screen.getByRole('link', { name: /Av\. Siempre Viva 742/ })
	assert.equal(maps.getAttribute('href'), 'https://maps.app.goo.gl/demo')
})

test('sin enlace de Maps, la direccion queda como texto plano', async () => {
	const payload = {
		...landingPayload,
		business: { ...landingPayload.business, maps_url: undefined },
	}
	publicApiFetchMock.mockImplementationOnce(async () => payload)
	render(<PublicLandingClient slug="test" />)

	await screen.findByRole('button', { name: /Lavadero/ })
	assert.equal(screen.queryByRole('link', { name: /Av\. Siempre Viva 742/ }), null)
	assert.ok(screen.getByText(/Av\. Siempre Viva 742/))
})

test('muestra el logo del negocio en la marca del header', async () => {
	publicApiFetchMock.mockImplementationOnce(async () => landingPayload)
	const { container } = render(<PublicLandingClient slug="test" />)

	await screen.findByRole('button', { name: /Lavadero/ })
	const brandMark = container.querySelector('.public-brand-mark')
	const logo = brandMark?.querySelector('img')
	assert.equal(logo?.getAttribute('src'), 'https://cdn.example.com/logo.png')
	assert.equal(brandMark?.textContent, '')
	assert.ok(brandMark?.classList.contains('public-brand-mark--logo'))
})

test('sin logo cargado, la marca usa la inicial del negocio', async () => {
	const payload = {
		...landingPayload,
		business: { ...landingPayload.business, logo_url: null },
	}
	publicApiFetchMock.mockImplementationOnce(async () => payload)
	const { container } = render(<PublicLandingClient slug="test" />)

	await screen.findByRole('button', { name: /Lavadero/ })
	const brandMark = container.querySelector('.public-brand-mark')
	assert.equal(brandMark?.textContent, 'L')
	assert.equal(brandMark?.querySelector('img'), null)
	assert.ok(!brandMark?.classList.contains('public-brand-mark--logo'))
})

test('un logo PDF no se renderiza como imagen en la marca', async () => {
	const payload = {
		...landingPayload,
		business: {
			...landingPayload.business,
			logo_url: 'https://cdn.example.com/logo.pdf',
		},
	}
	publicApiFetchMock.mockImplementationOnce(async () => payload)
	const { container } = render(<PublicLandingClient slug="test" />)

	await screen.findByRole('button', { name: /Lavadero/ })
	const brandMark = container.querySelector('.public-brand-mark')
	assert.equal(brandMark?.textContent, 'L')
	assert.equal(brandMark?.querySelector('img'), null)
})

test('si la imagen del logo falla, la marca vuelve a la inicial', async () => {
	publicApiFetchMock.mockImplementationOnce(async () => landingPayload)
	const { container } = render(<PublicLandingClient slug="test" />)

	await screen.findByRole('button', { name: /Lavadero/ })
	const logo = container.querySelector('.public-brand-mark img')
	assert.ok(logo)
	fireEvent.error(logo)

	await waitFor(() => {
		const brandMark = container.querySelector('.public-brand-mark')
		assert.equal(brandMark?.querySelector('img'), null)
		assert.equal(brandMark?.textContent, 'L')
		assert.ok(!brandMark?.classList.contains('public-brand-mark--logo'))
	})
})
