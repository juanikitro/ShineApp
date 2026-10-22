import assert from 'node:assert/strict'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, vi } from 'vitest'

import {
	AgendaSettingsPanel,
	CashSettingsPanel,
	NewsSettingsPanel,
	WhatsappSettingsPanel,
} from './SettingsWorkspace'
import { whatsappDemoTemplates } from '@/lib/whatsapp-onboarding'

function whatsappProps(config = {}) {
	return {
		automationRules: [],
		config,
		messages: [],
		templates: [],
		onCreateTemplate: vi.fn().mockResolvedValue({ id: 1 }),
		onPrepareDemo: vi.fn().mockResolvedValue({}),
		onSaveConfig: vi.fn().mockResolvedValue({}),
		onUpdateAutomationRule: vi.fn().mockResolvedValue({}),
		onUpdateTemplate: vi.fn().mockResolvedValue({}),
	}
}

test('free onboarding has no credentials or demo shortcut and saves only visible config', async () => {
	const user = userEvent.setup()
	const props = whatsappProps({ mode: 'free', provider: 'meta', phone_number_id: 'old-id' })
	render(<WhatsappSettingsPanel {...props} />)
	assert.ok(screen.getByText('Gratis (wa.me)', { selector: '.whatsapp-mode-badge' }))
	assert.equal(screen.queryByRole('textbox', { name: 'Phone number ID' }), null)
	assert.equal(screen.queryByLabelText('Token'), null)
	assert.equal(screen.queryByLabelText('Content SID (Twilio)'), null)
	assert.equal(screen.queryByRole('button', { name: /Preparar WhatsApp demo/ }), null)
	await user.click(screen.getByRole('button', { name: 'Guardar conexion' }))
	assert.equal('access_token' in props.onSaveConfig.mock.calls[0][0], false)
	assert.equal('phone_number_id' in props.onSaveConfig.mock.calls[0][0], false)
})

test('fake requires enablement without real credentials and preserves saved state until save', async () => {
	const user = userEvent.setup()
	const props = whatsappProps({ mode: 'paid', provider: 'fake' })
	render(<WhatsappSettingsPanel {...props} />)
	assert.equal(screen.queryByLabelText('Token'), null)
	assert.equal(screen.queryByLabelText('Business account ID (opcional)'), null)
	assert.ok(screen.getByRole('checkbox', { name: 'Canal habilitado' }))
	await user.click(screen.getByRole('checkbox', { name: 'Canal habilitado' }))
	assert.ok(screen.getByText('Configuracion pendiente'))
	await user.click(screen.getByRole('button', { name: 'Guardar conexion' }))
	assert.equal(props.onSaveConfig.mock.calls[0][0].is_enabled, true)
})

test('stored token stays write-only, blank saves omit it, and return updates provider fields', async () => {
	const user = userEvent.setup()
	const props = whatsappProps({ mode: 'paid', provider: 'meta', has_access_token: true })
	const { rerender } = render(<WhatsappSettingsPanel {...props} />)
	const token = screen.getByLabelText('Token') as HTMLInputElement
	assert.equal(token.type, 'password')
	assert.equal(token.value, '')
	assert.equal(token.placeholder, 'Configurado (no visible)')
	assert.equal(screen.queryByText('Produccion Meta'), null)
	await user.click(screen.getByRole('button', { name: 'Guardar conexion' }))
	assert.equal('access_token' in props.onSaveConfig.mock.calls[0][0], false)
	rerender(
		<WhatsappSettingsPanel
			{...props}
			config={{ mode: 'paid', provider: 'twilio', has_access_token: true }}
		/>,
	)
	assert.ok(screen.getByLabelText('Account SID (Twilio)'))
	assert.ok(screen.getByLabelText('Numero emisor (Twilio)'))
	assert.ok(screen.getByLabelText('Auth Token (Twilio)'))
	assert.ok(screen.getByLabelText('Content SID (Twilio)'))
	assert.equal(screen.queryByLabelText('Phone number ID'), null)
})

test('switching providers clears incompatible draft fields and requires replacement of stored token', async () => {
	const user = userEvent.setup()
	const props = whatsappProps({
		mode: 'paid',
		provider: 'meta',
		has_access_token: true,
		phone_number_id: 'meta-id',
		business_account_id: 'meta-business',
	})
	render(<WhatsappSettingsPanel {...props} />)
	await user.type(screen.getByLabelText('Token'), 'synthetic-token')
	await user.selectOptions(screen.getByRole('combobox', { name: 'Provider' }), 'twilio')
	assert.equal((screen.getByLabelText('Auth Token (Twilio)') as HTMLInputElement).value, '')
	assert.equal((screen.getByLabelText('Numero emisor (Twilio)') as HTMLInputElement).value, '')
	assert.equal(
		(screen.getByRole('button', { name: 'Guardar conexion' }) as HTMLButtonElement).disabled,
		true,
	)
	await user.type(screen.getByLabelText('Auth Token (Twilio)'), 'new-synthetic-token')
	await user.click(screen.getByRole('button', { name: 'Guardar conexion' }))
	assert.equal(props.onSaveConfig.mock.calls[0][0].access_token, 'new-synthetic-token')
	assert.equal((screen.getByLabelText('Auth Token (Twilio)') as HTMLInputElement).value, '')
})

test('template draft validates before save and retains content when API action fails', async () => {
	const user = userEvent.setup()
	const props = whatsappProps({ mode: 'free', provider: 'fake' })
	props.onCreateTemplate.mockResolvedValue(undefined)
	const { container } = render(<WhatsappSettingsPanel {...props} />)
	const form = container.querySelector('#whatsapp-template-form') as HTMLFormElement
	fireEvent.submit(form)
	assert.equal(props.onCreateTemplate.mock.calls.length, 0)
	await user.type(within(form).getByLabelText('Nombre interno del mensaje'), 'demo')
	await user.type(
		within(form).getByLabelText('Mensaje (texto libre)', { exact: false }),
		'Mensaje de prueba',
	)
	await user.type(within(form).getByLabelText('Variables', { exact: true }), 'desconocida')
	assert.equal(
		(screen.getByRole('button', { name: 'Crear template' }) as HTMLButtonElement).disabled,
		true,
	)
	await user.clear(within(form).getByLabelText('Variables', { exact: true }))
	await user.click(screen.getByRole('button', { name: 'Crear template' }))
	assert.equal(props.onCreateTemplate.mock.calls.length, 1)
	assert.equal(
		(within(form).getByLabelText('Nombre interno del mensaje') as HTMLInputElement).value,
		'demo',
	)
	props.onCreateTemplate.mockResolvedValue({ id: 2 })
	await user.click(screen.getByRole('button', { name: 'Crear template' }))
	assert.equal(
		(within(form).getByLabelText('Nombre interno del mensaje') as HTMLInputElement).value,
		'',
	)
})

test('rules show invalid bindings and offer only active matching templates', async () => {
	const user = userEvent.setup()
	const props = whatsappProps({ mode: 'paid', provider: 'fake' })
	render(
		<WhatsappSettingsPanel
			{...props}
			automationRules={[
				{ id: 1, event: 'reservation_confirmed', template: null, dispatch: 'manual' },
			]}
			templates={[
				{ ...whatsappDemoTemplates[0], id: 11 },
				{ ...whatsappDemoTemplates[1], id: 12 },
				{ ...whatsappDemoTemplates[0], id: 13, is_active: false },
			]}
		/>,
	)
	const select = screen.getByRole('combobox', { name: 'Template reservation_confirmed' })
	assert.equal(within(select).getAllByRole('option').length, 2)
	assert.ok(screen.getByText('Asigna un template activo del mismo evento.'))
	await user.selectOptions(select, '11')
	assert.deepEqual(props.onUpdateAutomationRule.mock.calls[0], [1, { template: '11' }])
})

test('NewsSettingsPanel renders the panel heading and kicker', () => {
	render(<NewsSettingsPanel />)
	assert.ok(screen.getByRole('heading', { name: 'Novedades' }))
	assert.ok(screen.getByText('Sistema'))
	assert.ok(screen.getByText('Cambios funcionales recientes de ShineApp.'))
})

test('NewsSettingsPanel shows "Ultima version" for the first date group', () => {
	render(<NewsSettingsPanel />)
	assert.ok(screen.getByText('Ultima version'))
})

test('NewsSettingsPanel first group is expanded by default showing its items', () => {
	const { container } = render(<NewsSettingsPanel />)
	// The expanded group renders .changelog-items
	assert.ok(container.querySelector('.changelog-items'))
})

test('NewsSettingsPanel collapses the active group when its header is clicked', async () => {
	const user = userEvent.setup()
	const { container } = render(<NewsSettingsPanel />)

	// Items visible initially
	assert.ok(container.querySelector('.changelog-items'))

	// Click the expanded header (first button)
	const [firstBtn] = screen.getAllByRole('button')
	await user.click(firstBtn)

	// Items gone after collapse
	assert.equal(container.querySelector('.changelog-items'), null)
})

test('NewsSettingsPanel expands a different group when its header is clicked', async () => {
	const user = userEvent.setup()
	const { container } = render(<NewsSettingsPanel />)

	const buttons = screen.getAllByRole('button')
	if (buttons.length < 2) {
		// Only one date group in changelog — skip multi-group check
		return
	}

	// Collapse first, then expand second
	await user.click(buttons[0])
	assert.equal(container.querySelector('.changelog-items'), null)

	await user.click(buttons[1])
	assert.ok(container.querySelector('.changelog-items'))
})

test('NewsSettingsPanel renders at least one date group button', () => {
	render(<NewsSettingsPanel />)
	const buttons = screen.getAllByRole('button')
	assert.ok(buttons.length >= 1)
})

test('WhatsappSettingsPanel shows demo onboarding and calls prepare action', async () => {
	const user = userEvent.setup()
	const onPrepareDemo = vi.fn().mockResolvedValue(undefined)

	render(
		<WhatsappSettingsPanel
			automationRules={[]}
			config={null}
			messages={[]}
			templates={[]}
			onCreateTemplate={vi.fn().mockResolvedValue({})}
			onPrepareDemo={onPrepareDemo}
			onSaveConfig={vi.fn().mockResolvedValue({})}
			onUpdateAutomationRule={vi.fn().mockResolvedValue({})}
			onUpdateTemplate={vi.fn().mockResolvedValue({})}
		/>,
	)

	assert.ok(screen.getByRole('heading', { name: 'Preparacion de WhatsApp' }))
	await user.click(screen.getByRole('button', { name: /Preparar WhatsApp demo/ }))
	assert.equal(onPrepareDemo.mock.calls.length, 1)
	assert.ok(screen.getByText('Estado guardado'))
})

test('AgendaSettingsPanel patches automatic charge preference', async () => {
	const user = userEvent.setup()
	const onPatchBusinessForm = vi.fn()

	render(
		<AgendaSettingsPanel
			reservationAutoChargeOnDelivery={false}
			reservationUseCanceled={true}
			reservationUseInProgress={true}
			reservationUsePending={true}
			reservationUseReady={true}
			showStayDaysInAgenda={true}
			useReservationTimes={true}
			onPatchBusinessForm={onPatchBusinessForm}
			onSaveBusinessProfile={vi.fn()}
		/>,
	)

	await user.click(screen.getByRole('button', { name: 'Automatico' }))

	assert.deepEqual(onPatchBusinessForm.mock.calls.at(-1)?.[0], {
		reservation_auto_charge_on_delivery: true,
	})
})

test('CashSettingsPanel patches the continuous cash preference', async () => {
	const user = userEvent.setup()
	const onPatchBusinessForm = vi.fn()

	render(
		<CashSettingsPanel
			businessForm={{ use_cash_closures: false }}
			cashClassificationPairs={[]}
			incomeCategoryTree={{}}
			expenseCategoryTree={{}}
			onAddSubcategory={() => {}}
			onDeleteCashCategory={() => {}}
			onDeleteExpenseClassification={() => {}}
			onEditCashCategory={() => {}}
			onEditExpenseClassification={() => {}}
			onOpenCashCategoryForm={() => {}}
			onPatchBusinessForm={onPatchBusinessForm}
			onSaveBusinessProfile={() => {}}
		/>,
	)

	await user.click(screen.getByRole('checkbox', { name: 'Usar cierres diarios de caja' }))

	assert.deepEqual(onPatchBusinessForm.mock.calls.at(-1)?.[0], {
		use_cash_closures: true,
	})
})
