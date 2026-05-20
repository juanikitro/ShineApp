import assert from 'node:assert/strict'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Car } from 'lucide-react'
import { test, vi } from 'vitest'

import { BirthdayFields } from './BirthdayFields'
import { DetailModal } from './DetailModal'
import { Empty, ErrorState, LoadingState, StateNotice } from './Empty'
import { Field } from './Field'
import { MetricCard } from './MetricCard'
import { ModalFrame } from './ModalFrame'
import { Panel } from './Panel'
import { RecordCard, RecordCardHeader } from './RecordCard'
import { SearchSelect } from './SearchSelect'
import { SegmentedControl } from './SegmentedControl'
import { ServiceIconPicker } from './ServiceIconPicker'
import { StatusPill } from './StatusPill'

test('state components expose roles and optional copy/actions', () => {
	render(
		<>
			<Empty text="Sin datos" hint="Carga un registro" action={<button>Crear</button>} />
			<LoadingState text="Cargando turnos" hint="Un momento" />
			<ErrorState text="No se pudo cargar" hint="Reintenta" />
			<StateNotice title="Manual" tone="empty" />
		</>,
	)

	assert.ok(screen.getByText('Sin datos'))
	assert.ok(screen.getByRole('button', { name: 'Crear' }))
	assert.equal(screen.getByRole('status').getAttribute('aria-live'), 'polite')
	assert.equal(screen.getByRole('alert').getAttribute('aria-live'), 'assertive')
	assert.ok(screen.getByText('Manual'))
})

test('simple structural UI components render labels, values and actions', async () => {
	const user = userEvent.setup()
	const onPrimary = vi.fn()
	render(
		<>
			<Field label="Nombre">
				<input />
			</Field>
			<Panel title="Caja" subtitle="Resumen diario" actions={<button>Exportar</button>}>
				Contenido
			</Panel>
			<MetricCard label="Ingresos" value="$100" hint="Hoy" className="highlight" data-testid="metric" />
			<StatusPill value="ready" labels={{ ready: 'Listo' }} />
			<RecordCard
				title="Cliente"
				subtitle="Vehiculo"
				primaryAction={{ ariaLabel: 'Ver cliente', onClick: onPrimary }}
				actions={<button>Editar</button>}
			>
				Detalle
			</RecordCard>
			<RecordCardHeader title="Sin accion" className="custom-head">
				Extra
			</RecordCardHeader>
		</>,
	)

	assert.ok(screen.getByLabelText('Nombre'))
	assert.ok(screen.getByRole('heading', { name: 'Caja' }))
	assert.equal(screen.getByTestId('metric').className, 'metric highlight')
	assert.equal(screen.getByText('Listo').className, 'status ready')
	await user.click(screen.getByRole('button', { name: 'Ver cliente' }))
	assert.equal(onPrimary.mock.calls.length, 1)
	assert.ok(screen.getByRole('button', { name: 'Editar' }))
	assert.ok(screen.getByText('Extra'))
})

test('structural UI components keep optional sections absent until needed', () => {
	const { container } = render(
		<>
			<Panel>Solo contenido</Panel>
			<MetricCard label="Turnos" value="3" />
			<StatusPill value="unknown" labels={{ ready: 'Listo' }} />
		</>,
	)

	assert.equal(container.querySelector('.panel-head'), null)
	assert.equal(container.querySelector('.metric small'), null)
	assert.equal(screen.getByText('unknown').className, 'status unknown')
})

test('ModalFrame closes from backdrop, escape and traps tab focus', () => {
	const onClose = vi.fn()
	const before = document.createElement('button')
	document.body.append(before)
	before.focus()
	const { container, unmount } = render(
		<ModalFrame title="Editar" onClose={onClose}>
			<button>Primero</button>
			<button>Segundo</button>
		</ModalFrame>,
	)
	screen.getAllByRole('button').forEach((button) => {
		button.getClientRects = () => [{ width: 10, height: 10 }] as any
	})

	const dialog = screen.getByRole('dialog', { name: 'Editar' })
	fireEvent.keyDown(dialog, { key: 'Escape' })
	assert.equal(onClose.mock.calls.length, 1)

	fireEvent.mouseDown(container.querySelector('.modal-backdrop') as HTMLElement)
	assert.equal(onClose.mock.calls.length, 2)

	screen.getByRole('button', { name: 'Segundo' }).focus()
	fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false })
	assert.equal(document.activeElement, screen.getByRole('button', { name: 'Cerrar' }))

	unmount()
	assert.equal(document.activeElement, before)
})

test('BirthdayFields normalizes empty values and emits day/month changes', async () => {
	const user = userEvent.setup()
	const dayChanges: string[] = []
	const monthChanges: string[] = []

	render(
		<BirthdayFields
			day={null}
			month={undefined}
			dayName="birthday_day"
			monthName="birthday_month"
			dayFocusKey="day"
			monthFocusKey="month"
			onDayChange={(value) => dayChanges.push(value)}
			onMonthChange={(value) => monthChanges.push(value)}
		/>,
	)

	await user.selectOptions(screen.getByLabelText('Dia'), '9')
	await user.selectOptions(screen.getByLabelText('Mes'), '5')

	assert.deepEqual(dayChanges, ['9'])
	assert.deepEqual(monthChanges, ['5'])
	assert.equal(screen.getByLabelText('Dia').getAttribute('name'), 'birthday_day')
	assert.equal(screen.getByText(/Opcional/).tagName, 'P')
})

test('SegmentedControl supports click, roving focus and tab semantics', async () => {
	const user = userEvent.setup()
	const changes: string[] = []

	render(
		<SegmentedControl
			ariaLabel="Vista"
			selectionMode="tabs"
			value="agenda"
			onChange={(value) => changes.push(value)}
			options={[
				{ value: 'agenda', label: 'Agenda', icon: Car },
				{ value: 'clientes', label: 'Clientes' },
				{ value: 'caja', label: 'Caja', disabled: true },
			]}
		/>,
	)

	const agenda = screen.getByRole('tab', { name: 'Agenda' })
	const clientes = screen.getByRole('tab', { name: 'Clientes' })
	assert.equal(agenda.getAttribute('aria-selected'), 'true')

	agenda.focus()
	await user.keyboard('{ArrowRight}')
	assert.equal(document.activeElement, clientes)
	await user.keyboard('{Enter}')
	assert.deepEqual(changes, ['clientes'])
	await user.keyboard('{Home}')
	assert.equal(document.activeElement, agenda)
})

test('SegmentedControl supports segmented button semantics and reverse keyboard navigation', async () => {
	const user = userEvent.setup()
	const changes: string[] = []
	render(
		<SegmentedControl
			ariaLabel="Prioridad"
			className="priority-toggle"
			value="media"
			onChange={(value) => changes.push(value)}
			options={[
				{ value: 'alta', label: 'Alta', ariaLabel: 'Prioridad alta' },
				{ value: 'media', label: 'Media' },
				{ value: 'baja', label: 'Baja', disabled: true },
			]}
		/>,
	)

	const group = screen.getByRole('group', { name: 'Prioridad' })
	const alta = screen.getByRole('button', { name: 'Prioridad alta' })
	const media = screen.getByRole('button', { name: 'Media' })
	assert.equal(group.className.includes('priority-toggle'), true)
	assert.equal(media.getAttribute('aria-pressed'), 'true')

	media.focus()
	await user.keyboard('{ArrowLeft}{ }')
	assert.equal(document.activeElement, alta)
	assert.deepEqual(changes, ['alta'])
	await user.keyboard('{End}')
	assert.equal(document.activeElement, media)
	await user.click(screen.getByRole('button', { name: 'Baja' }))
	assert.deepEqual(changes, ['alta'])
})

test('SearchSelect filters, creates and clears selections from the current surface', async () => {
	const user = userEvent.setup()
	const changes: string[] = []
	const created: string[] = []
	const added = vi.fn()

	render(
		<SearchSelect
			label="Cliente"
			name="customer"
			value=""
			options={[
				{ value: '1', label: 'Ana Lopez', meta: 'Toyota' },
				{ value: '2', label: 'Juan Perez', meta: 'Ford' },
			]}
			onChange={(value) => changes.push(value)}
			onAdd={added}
			addLabel="Nuevo cliente"
			onCreate={(value) => created.push(value)}
			focusKey="customer"
		/>,
	)

	await user.click(screen.getByRole('combobox', { name: 'Cliente' }))
	await user.type(screen.getByLabelText('Buscar Cliente'), 'Ana')
	assert.ok(screen.getByRole('option', { name: /Ana Lopez/ }))
	await user.click(screen.getByRole('option', { name: /Ana Lopez/ }))
	await waitFor(() => assert.equal(changes.at(-1), '1'))

	await user.click(screen.getByRole('combobox', { name: 'Cliente' }))
	await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
	assert.equal(added.mock.calls.length, 1)

	await user.click(screen.getByRole('combobox', { name: 'Cliente' }))
	await user.type(screen.getByLabelText('Buscar Cliente'), 'Nuevo')
	await user.click(screen.getByRole('button', { name: 'Crear "Nuevo"' }))
	assert.deepEqual(created, ['Nuevo'])
})

test('SearchSelect supports selected labels, disabled hidden inputs and trigger toggling', async () => {
	const user = userEvent.setup()
	const changes: string[] = []
	const { container, rerender } = render(
		<SearchSelect
			label="Vehiculo"
			name="vehicle"
			value="2"
			options={[
				{ value: '1', label: 'Toyota' },
				{ value: '2', label: 'Ford' },
			]}
			onChange={(value) => changes.push(value)}
			disabled
			className="custom-combo"
			focusKey="vehicle"
		/>,
	)

	const hiddenInput = container.querySelector<HTMLInputElement>('input[name="vehicle"]')
	const trigger = screen.getByRole('combobox', { name: 'Vehiculo' })
	assert.equal(hiddenInput?.value, '2')
	assert.equal(hiddenInput?.disabled, true)
	assert.equal(trigger.hasAttribute('disabled'), true)
	assert.equal(trigger.textContent?.includes('Ford'), true)
	assert.equal(container.querySelector('[data-focus-key="vehicle"]')?.className.includes('custom-combo'), true)

	await user.click(trigger)
	assert.equal(screen.queryByRole('listbox'), null)

	rerender(
		<SearchSelect
			label="Vehiculo"
			value="2"
			options={[
				{ value: '1', label: 'Toyota' },
				{ value: '2', label: 'Ford' },
			]}
			onChange={(value) => changes.push(value)}
		/>,
	)

	await user.click(screen.getByRole('combobox', { name: 'Vehiculo' }))
	assert.ok(screen.getByRole('listbox'))
	await user.click(screen.getByRole('combobox', { name: 'Vehiculo' }))
	await waitFor(() => assert.equal(screen.queryByRole('listbox'), null))
})

test('SearchSelect supports keyboard opening, roving focus and escape close', async () => {
	const user = userEvent.setup()
	const changes: string[] = []
	render(
		<SearchSelect
			label="Cliente"
			value=""
			options={[
				{ value: '1', label: 'Ana Lopez' },
				{ value: '2', label: 'Juan Perez' },
			]}
			onChange={(value) => changes.push(value)}
		/>,
	)

	const trigger = screen.getByRole('combobox', { name: 'Cliente' })
	trigger.focus()
	await user.keyboard('{ArrowDown}')
	await waitFor(() =>
		assert.equal(document.activeElement, screen.getByRole('option', { name: 'Seleccionar' })),
	)
	await user.keyboard('{ArrowDown}{Enter}')
	assert.deepEqual(changes, ['1'])
	await waitFor(() => assert.equal(document.activeElement, trigger))

	trigger.focus()
	await user.keyboard('{ArrowUp}')
	await waitFor(() =>
		assert.equal(document.activeElement, screen.getByRole('option', { name: 'Juan Perez' })),
	)
	await user.keyboard('{Home}')
	assert.equal(document.activeElement, screen.getByRole('option', { name: 'Seleccionar' }))
	await user.keyboard('{End}')
	assert.equal(document.activeElement, screen.getByRole('option', { name: 'Juan Perez' }))
	await user.keyboard('{Escape}')
	assert.equal(screen.queryByRole('listbox'), null)
	assert.equal(document.activeElement, trigger)
})

test('SearchSelect handles menu keyboard events from the search input and placeholder', async () => {
	const user = userEvent.setup()
	const changes: string[] = []
	render(
		<SearchSelect
			label="Cliente"
			value="1"
			options={[
				{ value: '1', label: 'Ana Lopez' },
				{ value: '2', label: 'Juan Perez' },
			]}
			onChange={(value) => changes.push(value)}
		/>,
	)

	const trigger = screen.getByRole('combobox', { name: 'Cliente' })
	await user.click(trigger)
	await user.keyboard('{ArrowDown}')
	assert.equal(document.activeElement, screen.getByRole('option', { name: 'Seleccionar' }))
	await user.keyboard('{Enter}')
	assert.deepEqual(changes, [''])

	await user.click(trigger)
	trigger.focus()
	await user.keyboard('{ArrowUp}')
	assert.equal(document.activeElement, screen.getByRole('option', { name: 'Juan Perez' }))
	await user.keyboard('{Escape}')
	assert.equal(screen.queryByRole('listbox'), null)

	await user.click(trigger)
	trigger.focus()
	await user.keyboard('{Escape}')
	assert.equal(screen.queryByRole('listbox'), null)
})

test('SearchSelect blocks duplicate creates and exposes empty results', async () => {
	const user = userEvent.setup()
	const created: string[] = []
	render(
		<SearchSelect
			label="Cliente"
			value=""
			options={[{ value: 'ana', label: 'Ana Lopez' }]}
			onChange={vi.fn()}
			onCreate={(value) => created.push(value)}
			createLabel="Crear cliente"
		/>,
	)

	await user.click(screen.getByRole('combobox', { name: 'Cliente' }))
	const search = screen.getByLabelText('Buscar Cliente')
	await user.type(search, 'Ana Lopez')
	assert.equal(screen.queryByRole('button', { name: 'Crear cliente' }), null)

	await user.clear(search)
	await user.type(search, 'Nuevo')
	assert.ok(screen.getByText('Sin resultados'))
	await user.click(screen.getByRole('button', { name: 'Crear cliente' }))
	assert.deepEqual(created, ['Nuevo'])
})

test('ServiceIconPicker normalizes selected and cleared emojis', async () => {
	const user = userEvent.setup()
	const changes: string[] = []
	const { rerender } = render(
		<ServiceIconPicker value="" onChange={(value) => changes.push(value)} focusKey="icon" />,
	)

	await user.click(screen.getByRole('button', { name: 'Abrir selector de emojis' }))
	assert.ok(screen.getByRole('dialog', { name: 'Selector de emojis' }))
	await user.click(screen.getByTestId('emoji-picker'))
	assert.deepEqual(changes, ['🧽'])

	rerender(<ServiceIconPicker value="✨" onChange={(value) => changes.push(value)} />)
	await user.click(screen.getByRole('button', { name: 'Limpiar emoji' }))
	assert.deepEqual(changes, ['🧽', ''])
})

test('ServiceIconPicker closes from escape and outside pointer events', async () => {
	const user = userEvent.setup()
	render(<ServiceIconPicker value="✨" onChange={vi.fn()} label="Icono" />)

	const trigger = screen.getByRole('button', {
		name: 'Emoji seleccionado ✨. Abrir selector de emojis',
	})
	assert.equal(trigger.textContent?.includes('Cambiar emoji'), true)
	await user.click(trigger)
	assert.ok(screen.getByRole('dialog', { name: 'Selector de emojis' }))

	fireEvent.keyDown(document, { key: 'Escape' })
	await waitFor(() => assert.equal(screen.queryByRole('dialog'), null))

	await user.click(trigger)
	assert.ok(screen.getByRole('dialog', { name: 'Selector de emojis' }))
	fireEvent.pointerDown(document.body)
	await waitFor(() => assert.equal(screen.queryByRole('dialog'), null))
})

test('DetailModal formats readonly data and swaps to edit form when editing', () => {
	const onClose = vi.fn()
	const { rerender } = render(
		<DetailModal
			title="Detalle"
			onClose={onClose}
			data={{
				name: 'Ana',
				active: true,
				tags: ['vip'],
				extra: { visits: 2 },
				_empty: 'hidden',
				notes: '',
			}}
		/>,
	)

	assert.ok(screen.getByRole('dialog', { name: 'Detalle' }))
	assert.ok(screen.getByText('Si'))
	assert.ok(screen.getByText('1 items'))
	assert.ok(screen.getByText('{"visits":2}'))
	assert.ok(screen.getByText('Sin dato'))
	assert.equal(screen.queryByText('hidden'), null)

	rerender(
		<DetailModal title="Detalle" onClose={onClose} data={{}} editing editForm={<form>Formulario</form>} />,
	)
	assert.ok(screen.getByText('Formulario'))
})
