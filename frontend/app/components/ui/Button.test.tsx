import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, test, vi } from 'vitest'

import { Button } from './Button'

afterEach(cleanup)

test('Button defaults to type button and primary variant', () => {
	render(<Button>Guardar</Button>)
	const btn = screen.getByRole('button', { name: 'Guardar' })
	assert.equal(btn.getAttribute('type'), 'button')
	assert.equal(btn.className.includes('primary'), true)
	assert.equal(btn.hasAttribute('aria-busy'), false)
	assert.equal(btn.hasAttribute('aria-disabled'), false)
})

test('Button loading sets disabled + aria-busy and hides leadingIcon', () => {
	render(
		<Button loading leadingIcon={<span data-testid="icon" />}>
			Guardando
		</Button>,
	)
	const btn = screen.getByRole('button')
	assert.equal((btn as HTMLButtonElement).disabled, true)
	assert.equal(btn.getAttribute('aria-busy'), 'true')
	assert.equal(btn.getAttribute('aria-disabled'), 'true')
	assert.equal(btn.className.includes('is-loading'), true)
	assert.equal(screen.queryByTestId('icon'), null)
})

test('Button disabled (without loading) does not set aria-busy', () => {
	render(<Button disabled>Inactivo</Button>)
	const btn = screen.getByRole('button')
	assert.equal((btn as HTMLButtonElement).disabled, true)
	assert.equal(btn.hasAttribute('aria-busy'), false)
	assert.equal(btn.getAttribute('aria-disabled'), 'true')
})

test('Button does not fire onClick while loading', async () => {
	const user = userEvent.setup()
	const onClick = vi.fn()
	render(
		<Button loading onClick={onClick}>
			Guardando
		</Button>,
	)
	await user.click(screen.getByRole('button'))
	assert.equal(onClick.mock.calls.length, 0)
})

test('Button respects variant and size class names', () => {
	render(
		<Button variant="danger" size="sm" className="custom">
			Borrar
		</Button>,
	)
	const btn = screen.getByRole('button')
	assert.equal(btn.className.includes('danger'), true)
	assert.equal(btn.className.includes('button-sm'), true)
	assert.equal(btn.className.includes('custom'), true)
})

test('Button type=submit is preserved for forms', () => {
	render(
		<Button type="submit" variant="primary">
			Enviar
		</Button>,
	)
	assert.equal(screen.getByRole('button').getAttribute('type'), 'submit')
})

test('Button onClickAsync locks the button while the promise is pending', async () => {
	const user = userEvent.setup()
	const deferred: { resolve: (() => void) | null } = { resolve: null }
	const handler = vi.fn(
		() =>
			new Promise<void>((resolve) => {
				deferred.resolve = resolve
			}),
	)
	render(<Button onClickAsync={handler}>Guardar</Button>)
	const btn = screen.getByRole('button')

	await user.click(btn)
	assert.equal(handler.mock.calls.length, 1)
	assert.equal((btn as HTMLButtonElement).disabled, true)
	assert.equal(btn.getAttribute('aria-busy'), 'true')

	// Doble click durante el pending no dispara otra vez
	await user.click(btn)
	assert.equal(handler.mock.calls.length, 1)

	deferred.resolve?.()
	await new Promise((r) => setTimeout(r, 0))
	assert.equal((btn as HTMLButtonElement).disabled, false)
	assert.equal(btn.hasAttribute('aria-busy'), false)
})

test('Button onClickAsync releases lock even if the promise rejects', async () => {
	const user = userEvent.setup()
	const deferred: { reject: ((err: Error) => void) | null } = { reject: null }
	const handler = vi.fn(
		() =>
			new Promise<void>((_, reject) => {
				deferred.reject = reject
			}),
	)
	render(<Button onClickAsync={handler}>Reintentar</Button>)
	const btn = screen.getByRole('button')

	await user.click(btn)
	assert.equal((btn as HTMLButtonElement).disabled, true)

	deferred.reject?.(new Error('boom'))
	await new Promise((r) => setTimeout(r, 0))
	assert.equal((btn as HTMLButtonElement).disabled, false)
})

test('Button without onClickAsync still routes onClick synchronously', async () => {
	const user = userEvent.setup()
	const onClick = vi.fn()
	render(<Button onClick={onClick}>OK</Button>)
	await user.click(screen.getByRole('button'))
	assert.equal(onClick.mock.calls.length, 1)
})
