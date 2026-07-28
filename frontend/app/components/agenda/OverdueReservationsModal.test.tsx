import assert from 'node:assert/strict'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, vi } from 'vitest'

import { OverdueReservationsModal } from './OverdueReservationsModal'

const rows = [
	{
		id: 1,
		customer_name: 'Ana Perez',
		vehicle_label: 'Ford Focus - AA 123 BB',
		service_name: 'Lavado, Pulido',
		deadline: '2026-07-20',
		days_overdue: 8,
		status: 'confirmed',
		delivery_pending: true,
		payment_pending: true,
		balance_due: '10000.00',
		payment_work_order: { id: 91, balance_due: '10000.00' },
	},
]

test('the whole overdue row opens editing by mouse and keyboard while payment stays independent', async () => {
	const user = userEvent.setup()
	const onOpenReservation = vi.fn()
	const onOpenPayment = vi.fn()
	render(
		<OverdueReservationsModal
			canViewEconomy
			loadState="ready"
			reservations={rows}
			onClose={() => {}}
			onOpenPayment={onOpenPayment}
			onOpenReservation={onOpenReservation}
			onRetry={() => {}}
		/>,
	)

	screen.getByRole('dialog', { name: 'Reservas vencidas' })
	screen.getByText('Ana Perez')
	screen.getByText('Ford Focus - AA 123 BB')
	screen.getByText('Lavado, Pulido')
	screen.getByText(/8 dias vencida/)
	screen.getByText('Falta entregar')
	screen.getByText('Falta cobrar')
	screen.getByText(/\$\s*10\.000/)

	const row = screen.getByRole('button', {
		name: 'Abrir reserva de Ana Perez',
	})
	await user.click(row)
	row.focus()
	await user.keyboard('{Enter}')
	assert.equal(onOpenReservation.mock.calls.length, 2)

	await user.click(
		screen.getByRole('button', { name: 'Cobrar reserva de Ana Perez' }),
	)
	assert.equal(onOpenReservation.mock.calls.length, 2)
	assert.deepEqual(onOpenPayment.mock.calls[0], [rows[0].payment_work_order])
})

test('operational users see delivery details without economic fields or controls', () => {
	render(
		<OverdueReservationsModal
			canViewEconomy={false}
			loadState="ready"
			reservations={[{ ...rows[0], days_overdue: 1 }]}
			onClose={() => {}}
			onOpenPayment={() => {}}
			onOpenReservation={() => {}}
			onRetry={() => {}}
		/>,
	)

	screen.getByText(/1 dia vencida/)
	screen.getByText('Falta entregar')
	assert.equal(screen.queryByText('Falta cobrar'), null)
	assert.equal(screen.queryByText(/\$\s*10\.000/), null)
	assert.equal(screen.queryByRole('button', { name: /Cobrar reserva/ }), null)
})

test('loading, error, and ready-empty states are explicit', () => {
	const onRetry = vi.fn()
	const { rerender } = render(
		<OverdueReservationsModal
			canViewEconomy
			loadState="idle"
			reservations={[]}
			onClose={() => {}}
			onOpenPayment={() => {}}
			onOpenReservation={() => {}}
			onRetry={onRetry}
		/>,
	)
	screen.getByRole('status')
	screen.getByText('Cargando reservas vencidas')

	rerender(
		<OverdueReservationsModal
			canViewEconomy
			loadState="loading"
			reservations={[]}
			onClose={() => {}}
			onOpenPayment={() => {}}
			onOpenReservation={() => {}}
			onRetry={onRetry}
		/>,
	)
	screen.getByText('Cargando reservas vencidas')

	rerender(
		<OverdueReservationsModal
			canViewEconomy
			loadState="error"
			reservations={[]}
			onClose={() => {}}
			onOpenPayment={() => {}}
			onOpenReservation={() => {}}
			onRetry={onRetry}
		/>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
	assert.equal(onRetry.mock.calls.length, 1)

	rerender(
		<OverdueReservationsModal
			canViewEconomy
			loadState="ready"
			reservations={[]}
			onClose={() => {}}
			onOpenPayment={() => {}}
			onOpenReservation={() => {}}
			onRetry={onRetry}
		/>,
	)
	screen.getByText('Agenda al dia')
	screen.getByText('No quedan reservas vencidas pendientes de resolver.')
})
