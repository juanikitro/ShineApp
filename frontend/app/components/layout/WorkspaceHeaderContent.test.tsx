import assert from 'node:assert/strict'
import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { WorkspaceHeaderContent } from './WorkspaceHeaderContent'

afterEach(cleanup)

function renderHeader(overrides = {}) {
	const calls = { sector: [], dashboard: [], refresh: 0, create: 0 } as {
		sector: string[]
		dashboard: Array<'summary' | 'analysis'>
		refresh: number
		create: number
	}
	const props = {
		title: 'Agenda',
		activeView: 'agenda',
		canViewEconomy: true,
		showAgendaSectorControl: true,
		agendaSectorOptions: [
			{ value: 'todos', label: 'Todos' },
			{ value: '1', label: 'Lavado' },
		],
		agendaSectorValue: 'todos',
		onAgendaSectorChange: (value: string) => calls.sector.push(value),
		period: { from: '2026-07-01', to: '2026-07-31' },
		onDashboardPeriodSubmit: (event: React.FormEvent<HTMLFormElement>) =>
			event.preventDefault(),
		onPreviousMonth: () => {},
		onNextMonth: () => {},
		onFromChange: () => {},
		onToChange: () => {},
		dashboardView: 'summary' as const,
		onDashboardViewChange: (value: 'summary' | 'analysis') =>
			calls.dashboard.push(value),
		dashboardLoading: false,
		mobileToggleRef: createRef<HTMLButtonElement>(),
		sidebarNavId: 'sidebar-nav',
		mobileOpen: false,
		onToggleMobileMenu: () => {},
		onCreateReservation: () => {
			calls.create += 1
		},
		onRefresh: () => {
			calls.refresh += 1
		},
		loading: false,
		...overrides,
	} as Parameters<typeof WorkspaceHeaderContent>[0]

	return { ...render(<WorkspaceHeaderContent {...props} />), calls }
}

test('WorkspaceHeaderContent preserves agenda title addon and shared actions', () => {
	const { calls } = renderHeader()

	assert.ok(screen.getByRole('heading', { name: 'Agenda' }))
	assert.ok(screen.getByRole('tablist', { name: 'Sector de agenda' }))
	fireEvent.click(screen.getByRole('tab', { name: 'Lavado' }))
	fireEvent.click(
		screen.getByRole('button', { name: 'Crear reserva para el dia seleccionado' }),
	)
	fireEvent.click(screen.getByRole('button', { name: 'Actualizar agenda' }))
	assert.deepEqual(calls.sector, ['1'])
	assert.equal(calls.create, 1)
	assert.equal(calls.refresh, 1)
})

test('WorkspaceHeaderContent renders dashboard period controls only for economic dashboard access', () => {
	const { calls } = renderHeader({
		title: 'Dashboard',
		activeView: 'dashboard',
		showAgendaSectorControl: false,
	})

	assert.equal(screen.queryByRole('tablist', { name: 'Sector de agenda' }), null)
	assert.ok(screen.getByRole('form', { name: 'Filtrar dashboard por periodo' }))
	assert.ok(screen.getByRole('group', { name: 'Vista del dashboard' }))
	fireEvent.click(screen.getByRole('button', { name: 'Análisis' }))
	assert.deepEqual(calls.dashboard, ['analysis'])
	assert.equal(
		screen.queryByRole('button', {
			name: 'Crear reserva para el dia seleccionado',
		}),
		null,
	)
})
