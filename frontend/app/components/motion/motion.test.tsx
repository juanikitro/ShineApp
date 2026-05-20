import assert from 'node:assert/strict'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, vi } from 'vitest'

import { AnimatedLabelSwap } from './AnimatedLabelSwap'
import { AnimatedWorkspaceView } from './AnimatedWorkspaceView'
import { AppMotionProvider } from './AppMotionProvider'
import { MotionFlashSurface } from './MotionFlashSurface'
import { MotionModal } from './MotionModal'

test('motion wrappers render children while preserving accessible content', () => {
	render(
		<AppMotionProvider>
			<AnimatedLabelSwap label="Guardar" />
			<MotionFlashSurface className="card motion-flash selected" data-testid="surface">
				Contenido
			</MotionFlashSurface>
		</AppMotionProvider>,
	)

	assert.equal(screen.getByText('Guardar').className, 'button-label-swap')
	assert.equal(screen.getByTestId('surface').className, 'card selected')
	assert.ok(screen.getByText('Contenido'))
	assert.ok(document.querySelector('.motion-flash-overlay'))
})

test('MotionFlashSurface omits overlay and strips blank class names when inactive', () => {
	render(
		<MotionFlashSurface className="  panel   selected  " data-testid="plain-surface" layout>
			Sin flash
		</MotionFlashSurface>,
	)

	assert.equal(screen.getByTestId('plain-surface').className, 'panel selected')
	assert.equal(document.querySelector('.motion-flash-overlay'), null)
})

test('AnimatedWorkspaceView scrolls to the top when the view changes', () => {
	const scrollSpy = vi.spyOn(window, 'scrollTo')
	const { rerender } = render(
		<AnimatedWorkspaceView viewKey="agenda">
			<section>Agenda</section>
		</AnimatedWorkspaceView>,
	)

	rerender(
		<AnimatedWorkspaceView viewKey="clientes">
			<section>Clientes</section>
		</AnimatedWorkspaceView>,
	)

	assert.ok(screen.getByText('Clientes'))
	assert.equal(scrollSpy.mock.calls.length >= 2, true)
	assert.deepEqual(scrollSpy.mock.calls.at(-1)?.[0], { top: 0, left: 0, behavior: 'auto' })
})

test('MotionModal opens with a dialog and delegates close actions', async () => {
	const user = userEvent.setup()
	const onClose = vi.fn()
	const { rerender } = render(
		<MotionModal open={false} title="Detalle" onClose={onClose}>
			Contenido
		</MotionModal>,
	)

	assert.equal(screen.queryByRole('dialog'), null)

	rerender(
		<MotionModal open title="Detalle" onClose={onClose}>
			<button>Accion</button>
		</MotionModal>,
	)

	assert.ok(screen.getByRole('dialog', { name: 'Detalle' }))
	await user.keyboard('{Escape}')
	assert.equal(onClose.mock.calls.length, 1)
	await user.click(screen.getByRole('button', { name: 'Cerrar' }))
	assert.equal(onClose.mock.calls.length, 2)
})
