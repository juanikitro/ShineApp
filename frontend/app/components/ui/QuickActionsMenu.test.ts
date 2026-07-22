import assert from 'node:assert/strict'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React, { useState } from 'react'
import { test, vi } from 'vitest'

import {
	QuickActionsMenu,
	type QuickAction,
} from './QuickActionsMenu'

function QuickActionsHarness({ actions }: { actions: QuickAction[] }) {
	const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(
		null,
	)
	const [open, setOpen] = useState(false)

	function openAt(x: number, y: number) {
		setAnchorPoint({ x, y })
		setOpen(true)
	}

	return React.createElement(
		React.Fragment,
		null,
		React.createElement(
			'div',
			{
				'data-testid': 'card',
				onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => {
					event.preventDefault()
					openAt(event.clientX, event.clientY)
				},
			},
			'Tarjeta operativa',
		),
		React.createElement(
			'button',
			{
				type: 'button',
				'aria-label': 'Abrir acciones rapidas',
				onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
					const rect = event.currentTarget.getBoundingClientRect()
					openAt(rect.right, rect.bottom)
				},
			},
			'...',
		),
		React.createElement(QuickActionsMenu, {
			actions,
			anchorPoint,
			open,
			title: 'Acciones rapidas',
			onClose: () => setOpen(false),
		}),
	)
}

function ControlledQuickActionsMenu({
	actions,
	className,
	onClose = () => {},
	pendingActionId,
	returnFocusRef,
}: {
	actions: QuickAction[]
	className?: string
	onClose?: () => void
	pendingActionId?: string | null
	returnFocusRef?: React.RefObject<HTMLElement | null>
}) {
	const [open, setOpen] = useState(true)

	return React.createElement(QuickActionsMenu, {
		actions,
		anchorPoint: { x: 20, y: 20 },
		open,
		title: 'Acciones rapidas',
		onClose: () => {
			onClose()
			setOpen(false)
		},
		className,
		pendingActionId,
		returnFocusRef,
	})
}

function createDeferred() {
	let resolve!: () => void
	const promise = new Promise<void>((finish) => {
		resolve = finish
	})
	return { promise, resolve }
}

test('opens quick actions through external control and closes with Escape', async () => {
	const user = userEvent.setup()

	render(
		React.createElement(QuickActionsHarness, {
			actions: [
				{ id: 'detail', label: 'Abrir detalle', onSelect: vi.fn() },
			],
		}),
	)

	await user.pointer({
		keys: '[MouseRight]',
		target: screen.getByTestId('card'),
		coords: { clientX: 120, clientY: 80 },
	})
	assert.ok(screen.getByRole('menu', { name: 'Acciones rapidas' }))
	assert.ok(screen.getByRole('menuitem', { name: /Abrir detalle/ }))

	await user.keyboard('{Escape}')
	assert.equal(screen.queryByRole('menu'), null)

	await user.click(screen.getByRole('button', { name: 'Abrir acciones rapidas' }))
	assert.ok(screen.getByRole('menu', { name: 'Acciones rapidas' }))
})

test('renders only when it has an open anchor and visible actions', () => {
	const { rerender } = render(
		React.createElement(QuickActionsMenu, {
			open: false,
			anchorPoint: { x: 20, y: 20 },
			title: 'Acciones rapidas',
			onClose: vi.fn(),
			actions: [{ id: 'edit', label: 'Editar', onSelect: vi.fn() }],
		}),
	)

	assert.equal(screen.queryByRole('menu'), null)

	rerender(
		React.createElement(QuickActionsMenu, {
			open: true,
			anchorPoint: null,
			title: 'Acciones rapidas',
			onClose: vi.fn(),
			actions: [{ id: 'edit', label: 'Editar', onSelect: vi.fn() }],
		}),
	)
	assert.equal(screen.queryByRole('menu'), null)

	rerender(
		React.createElement(QuickActionsMenu, {
			open: true,
			anchorPoint: { x: 20, y: 20 },
			title: 'Acciones rapidas',
			onClose: vi.fn(),
			actions: [{ id: 'hidden', label: 'Oculta', hidden: true, onSelect: vi.fn() }],
		}),
	)
	assert.equal(screen.queryByRole('menu'), null)
})

test('executes enabled actions and ignores hidden or disabled actions', async () => {
	const user = userEvent.setup()
	const onEdit = vi.fn()
	const onDisabled = vi.fn()

	render(
		React.createElement(ControlledQuickActionsMenu, {
			actions: [
				{ id: 'hidden', label: 'Oculta', hidden: true, onSelect: vi.fn() },
				{
					id: 'disabled',
					label: 'No disponible',
					disabled: true,
					onSelect: onDisabled,
				},
				{ id: 'edit', label: 'Editar', onSelect: onEdit },
			],
		}),
	)

	assert.equal(screen.queryByRole('menuitem', { name: /Oculta/ }), null)
	await user.click(screen.getByRole('menuitem', { name: /No disponible/ }))
	assert.equal(onDisabled.mock.calls.length, 0)

	await user.click(screen.getByRole('menuitem', { name: /Editar/ }))
	assert.equal(onEdit.mock.calls.length, 1)
	assert.equal(screen.queryByRole('menu'), null)
})

test('requires inline confirmation before running destructive actions', async () => {
	const user = userEvent.setup()
	const onDelete = vi.fn()
	const onClose = vi.fn()

	render(
		React.createElement(ControlledQuickActionsMenu, {
			onClose,
			actions: [
				{
					id: 'delete',
					label: 'Eliminar',
					tone: 'danger',
					requiresConfirm: true,
					onSelect: onDelete,
				},
			],
		}),
	)

	await user.click(screen.getByRole('menuitem', { name: /Eliminar/ }))
	assert.equal(onDelete.mock.calls.length, 0)
	assert.equal(onClose.mock.calls.length, 0)
	assert.ok(screen.getByRole('menuitem', { name: 'Confirmar Eliminar' }))

	await user.click(screen.getByRole('menuitem', { name: 'Confirmar Eliminar' }))
	assert.equal(onDelete.mock.calls.length, 1)
	assert.equal(onClose.mock.calls.length, 1)
	assert.equal(screen.queryByRole('menu'), null)
})

test('uses Radix roving focus while preserving first enabled focus', async () => {
	const user = userEvent.setup()

	render(
		React.createElement(ControlledQuickActionsMenu, {
			actions: [
				{ id: 'first', label: 'Primera', onSelect: vi.fn() },
				{ id: 'second', label: 'Segunda', onSelect: vi.fn() },
			],
		}),
	)

	const first = screen.getByRole('menuitem', { name: 'Primera' })
	const second = screen.getByRole('menuitem', { name: 'Segunda' })
	assert.equal(document.activeElement, first)

	await user.keyboard('{ArrowDown}')
	assert.equal(document.activeElement, second)
	await user.keyboard('{Home}')
	assert.equal(document.activeElement, first)
	await user.keyboard('{ArrowUp}')
	assert.equal(document.activeElement, second)
})

test('keeps an async action open and locked until it settles', async () => {
	const user = userEvent.setup()
	const pending = createDeferred()
	const onClose = vi.fn()
	const onSave = vi.fn(() => pending.promise)

	render(
		React.createElement(ControlledQuickActionsMenu, {
			onClose,
			actions: [{ id: 'save', label: 'Guardar', onSelect: onSave }],
		}),
	)

	await user.click(screen.getByRole('menuitem', { name: 'Guardar' }))
	const item = screen.getByRole('menuitem', { name: 'Guardar' })
	assert.equal(onSave.mock.calls.length, 1)
	assert.equal(item.getAttribute('aria-busy'), 'true')
	assert.equal((item as HTMLButtonElement).disabled, true)
	assert.ok(item.querySelector('.button-spinner'))

	await user.keyboard('{Escape}')
	assert.equal(onClose.mock.calls.length, 0)
	assert.ok(screen.getByRole('menu'))

	await act(async () => {
		pending.resolve()
		await pending.promise
		await Promise.resolve()
	})
	assert.equal(onClose.mock.calls.length, 1)
	assert.equal(screen.queryByRole('menu'), null)
})

test('honors an external pending action and blocks Escape', async () => {
	const user = userEvent.setup()
	const onClose = vi.fn()
	const onSync = vi.fn()

	render(
		React.createElement(QuickActionsMenu, {
			open: true,
			anchorPoint: { x: 20, y: 20 },
			title: 'Acciones rapidas',
			onClose,
			pendingActionId: 'sync',
			actions: [{ id: 'sync', label: 'Sincronizar', onSelect: onSync }],
		}),
	)

	const item = screen.getByRole('menuitem', { name: 'Sincronizar' })
	assert.equal(item.getAttribute('aria-busy'), 'true')
	assert.equal((item as HTMLButtonElement).disabled, true)
	await user.click(item)
	assert.equal(onSync.mock.calls.length, 0)

	screen.getByRole('menu').focus()
	await user.keyboard('{Escape}')
	assert.equal(onClose.mock.calls.length, 0)
})

test('keeps title, tone, description, icon, and return focus behavior', async () => {
	const user = userEvent.setup()
	const onClose = vi.fn()
	const returnTarget = document.createElement('button')
	document.body.append(returnTarget)

	try {
		render(
			React.createElement(ControlledQuickActionsMenu, {
				className: 'custom-menu',
				onClose,
				returnFocusRef: { current: returnTarget },
				actions: [
					{
						id: 'primary',
						label: 'Primaria',
						tone: 'primary',
						description: 'Accion principal',
						icon: React.createElement('span', null, 'P'),
						onSelect: vi.fn(),
					},
					{
						id: 'danger',
						label: 'Eliminar',
						tone: 'danger',
						onSelect: vi.fn(),
					},
				],
			}),
		)

		const menu = screen.getByRole('menu', { name: 'Acciones rapidas' })
		const primary = screen.getByRole('menuitem', { name: /Primaria/ })
		const danger = screen.getByRole('menuitem', { name: /Eliminar/ })
		assert.equal(
			menu.querySelector('.quick-actions-menu-title')?.textContent,
			'Acciones rapidas',
		)
		assert.equal(menu.className.includes('custom-menu'), true)
		assert.equal(primary.className.includes('primary'), true)
		assert.equal(danger.className.includes('danger'), true)
		assert.ok(screen.getByText('Accion principal'))
		assert.ok(primary.querySelector('.quick-actions-menu-icon'))

		await user.keyboard('{Tab}')
		assert.equal(onClose.mock.calls.length, 1)
		assert.equal(document.activeElement, returnTarget)
	} finally {
		returnTarget.remove()
	}
})
