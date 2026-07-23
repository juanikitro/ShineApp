import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { DetailEditActions } from './DetailEditActions'

afterEach(cleanup)

test('DetailEditActions preserves delete, supplementary and enabled save actions', () => {
	const onDelete = vi.fn()
	const { container } = render(
		<DetailEditActions
			canDelete
			onDelete={onDelete}
			disabled={false}
			beforeSubmit={<button type="button">Previa</button>}
		/>,
	)

	assert.ok(container.querySelector('.modal-actions.split'))
	assert.ok(container.querySelector('.detail-save-actions'))
	fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
	assert.equal(onDelete.mock.calls.length, 1)
	assert.equal(
		(screen.getByRole('button', { name: 'Editar' }) as HTMLButtonElement)
			.disabled,
		false,
	)
	assert.ok(screen.getByRole('button', { name: 'Previa' }))
})

test('DetailEditActions preserves the no-delete spacer and disabled save state', () => {
	const { container } = render(
		<DetailEditActions canDelete={false} onDelete={() => {}} disabled />,
	)

	assert.equal(screen.queryByRole('button', { name: 'Eliminar' }), null)
	assert.ok(container.querySelector('.modal-actions.split > span'))
	assert.equal(
		(screen.getByRole('button', { name: 'Editar' }) as HTMLButtonElement)
			.disabled,
		true,
	)
})
