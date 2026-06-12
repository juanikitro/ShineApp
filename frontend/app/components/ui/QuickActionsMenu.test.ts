import assert from 'node:assert/strict'
import { render, screen, waitFor } from '@testing-library/react'
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

test('opens quick actions from right click and from the trigger button', async () => {
	const user = userEvent.setup()
	const onOpenDetail = vi.fn()

	render(
		React.createElement(QuickActionsHarness, {
			actions: [
				{ id: 'detail', label: 'Abrir detalle', onSelect: onOpenDetail },
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
	await waitFor(() => {
		assert.equal(screen.queryByRole('menu'), null)
	})

	await user.click(screen.getByRole('button', { name: 'Abrir acciones rapidas' }))
	assert.ok(screen.getByRole('menu', { name: 'Acciones rapidas' }))
})

test('executes enabled actions and ignores hidden or disabled actions', async () => {
	const user = userEvent.setup()
	const onEdit = vi.fn()
	const onDisabled = vi.fn()

	render(
		React.createElement(QuickActionsMenu, {
			open: true,
			anchorPoint: { x: 20, y: 20 },
			title: 'Acciones rapidas',
			onClose: vi.fn(),
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
})

test('requires inline confirmation before running destructive actions', async () => {
	const user = userEvent.setup()
	const onDelete = vi.fn()
	const onClose = vi.fn()

	render(
		React.createElement(QuickActionsMenu, {
			open: true,
			anchorPoint: { x: 20, y: 20 },
			title: 'Acciones rapidas',
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
	assert.ok(screen.getByRole('menuitem', { name: 'Confirmar Eliminar' }))

	await user.click(screen.getByRole('menuitem', { name: 'Confirmar Eliminar' }))
	assert.equal(onDelete.mock.calls.length, 1)
	assert.equal(onClose.mock.calls.length, 1)
})

test('supports keyboard navigation and closes on outside click', async () => {
	const user = userEvent.setup()
	const onFirst = vi.fn()
	const onSecond = vi.fn()
	const onClose = vi.fn()

	const { unmount } = render(
		React.createElement(
			React.Fragment,
			null,
			React.createElement('button', { type: 'button' }, 'Fuera'),
			React.createElement(QuickActionsMenu, {
				open: true,
				anchorPoint: { x: 20, y: 20 },
				title: 'Acciones rapidas',
				onClose,
				actions: [
					{ id: 'first', label: 'Primera', onSelect: onFirst },
					{ id: 'second', label: 'Segunda', onSelect: onSecond },
				],
			}),
		),
	)

	await waitFor(() => {
		assert.equal(
			document.activeElement,
			screen.getByRole('menuitem', { name: /Primera/ }),
		)
	})
	await user.keyboard('{ArrowDown}{Enter}')
	assert.equal(onFirst.mock.calls.length, 0)
	assert.equal(onSecond.mock.calls.length, 1)

	unmount()
	render(
		React.createElement(
			React.Fragment,
			null,
			React.createElement('button', { type: 'button' }, 'Fuera'),
			React.createElement(QuickActionsMenu, {
				open: true,
				anchorPoint: { x: 20, y: 20 },
				title: 'Acciones rapidas',
				onClose,
				actions: [{ id: 'first', label: 'Primera', onSelect: onFirst }],
			}),
		),
	)

	await user.click(screen.getByRole('button', { name: 'Fuera' }))
	assert.ok(onClose.mock.calls.length >= 1)
})

test('does not render until it has an open anchor and visible actions', () => {
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

test('clamps menu position and returns focus when it closes from keyboard', async () => {
	const user = userEvent.setup()
	const onClose = vi.fn()
	const returnTarget = document.createElement('button')
	document.body.append(returnTarget)
	const getBoundingClientRect = vi
		.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
		.mockReturnValue({
			bottom: 0,
			height: 140,
			left: 0,
			right: 0,
			top: 0,
			width: 180,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		} as DOMRect)
	Object.defineProperty(window, 'innerWidth', { configurable: true, value: 200 })
	Object.defineProperty(window, 'innerHeight', { configurable: true, value: 160 })

	render(
		React.createElement(QuickActionsMenu, {
			open: true,
			anchorPoint: { x: 500, y: 400 },
			title: '',
			onClose,
			returnFocusRef: { current: returnTarget },
			className: 'custom-menu',
			actions: [
				{
					id: 'primary',
					label: 'Primaria',
					tone: 'primary',
					description: 'Accion principal',
					icon: React.createElement('span', null, 'P'),
					onSelect: vi.fn(),
				},
				{ id: 'second', label: 'Segunda', onSelect: vi.fn() },
			],
		}),
	)

	const menu = screen.getByRole('menu')
	await waitFor(() => {
		assert.equal(menu.style.left, '12px')
		assert.equal(menu.style.top, '12px')
	})
	assert.equal(screen.queryByText('Acciones rapidas'), null)
	assert.equal(menu.className.includes('custom-menu'), true)
	assert.ok(screen.getByText('Accion principal'))
	assert.ok(document.querySelector('.quick-actions-menu-icon'))

	await user.keyboard('{End}')
	assert.equal(document.activeElement, screen.getByRole('menuitem', { name: /Segunda/ }))
	await user.keyboard('{Home}')
	assert.equal(document.activeElement, screen.getByRole('menuitem', { name: /Primaria/ }))
	await user.keyboard('{ArrowUp}')
	assert.equal(document.activeElement, screen.getByRole('menuitem', { name: /Segunda/ }))
	await user.keyboard('{Escape}')
	assert.equal(onClose.mock.calls.length, 1)
	assert.equal(document.activeElement, returnTarget)

	getBoundingClientRect.mockRestore()
})

test('keyboard navigation is inert when all visible actions are disabled', async () => {
	const user = userEvent.setup()
	const onClose = vi.fn()
	const onDisabled = vi.fn()
	render(
		React.createElement(QuickActionsMenu, {
			open: true,
			anchorPoint: { x: 20, y: 20 },
			title: 'Acciones rapidas',
			onClose,
			actions: [
				{
					id: 'disabled',
					label: 'No disponible',
					disabled: true,
					onSelect: onDisabled,
				},
			],
		}),
	)

	const menu = screen.getByRole('menu')
	menu.focus()
	await user.keyboard('{ArrowDown}{Enter}')
	assert.equal(onDisabled.mock.calls.length, 0)
	assert.equal(onClose.mock.calls.length, 0)
})
