import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	actions: null as Record<string, any> | null,
}))

vi.mock('./DetailEditActions', () => ({
	DetailEditActions: (props: Record<string, any>) => {
		capturedProps.actions = props
		return <span>Acciones de detalle</span>
	},
}))

import {
	createDetailEditActionsRenderer,
	renderDetailEditActions,
} from './detail-edit-actions-renderer'

afterEach(cleanup)

test('detail edit actions renderer preserves delete availability, disabled state and pre-submit content', () => {
	const onDelete = vi.fn()
	const beforeSubmit = <button type="button">Accion previa</button>

	render(
		renderDetailEditActions({
			detail: { kind: 'vehicle', data: { id: 'vehicle-1' } },
			onDelete,
			disabled: true,
			beforeSubmit,
		}),
	)

	assert.ok(screen.getByText('Acciones de detalle'))
	assert.equal(capturedProps.actions?.canDelete, true)
	assert.equal(capturedProps.actions?.onDelete, onDelete)
	assert.equal(capturedProps.actions?.disabled, true)
	assert.equal(capturedProps.actions?.beforeSubmit, beforeSubmit)
})

test('detail edit actions renderer keeps null details and non-endpoint records non-deletable', () => {
	assert.equal(
		renderDetailEditActions({
			detail: null,
			onDelete: () => {},
			disabled: false,
		}),
		null,
	)

	render(
		renderDetailEditActions({
			detail: { kind: 'unknown', data: { id: 'record-1' } },
			onDelete: () => {},
			disabled: false,
		}),
	)
	assert.equal(capturedProps.actions?.canDelete, false)
})

test('createDetailEditActionsRenderer keeps its detail action dependencies bound', () => {
	const onDelete = vi.fn()
	const renderActions = createDetailEditActionsRenderer({
		detail: { kind: 'customer', data: { id: 7 } },
		onDelete,
		disabled: false,
	})
	const beforeSubmit = <span>Antes de guardar</span>

	render(renderActions(beforeSubmit))

	assert.equal(capturedProps.actions?.onDelete, onDelete)
	assert.equal(capturedProps.actions?.disabled, false)
	assert.equal(capturedProps.actions?.beforeSubmit, beforeSubmit)
})
