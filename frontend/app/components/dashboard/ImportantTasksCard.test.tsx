import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, test, vi } from 'vitest'

import { ImportantTasksCard } from './ImportantTasksCard'

afterEach(cleanup)

test('ImportantTasksCard shows prioritized pending work and opens the tasks section', async () => {
	const user = userEvent.setup()
	const onOpenTasks = vi.fn()
	render(
		<ImportantTasksCard
			tasks={[
				{
					id: 1,
					title: 'Confirmar entrega',
					status: 'pending',
					priority: 'high',
					due_date: '2026-07-22',
					is_overdue: true,
				},
				{
					id: 2,
					title: 'Ordenar insumos',
					status: 'pending',
					priority: 'medium',
					due_date: null,
				},
				{
					id: 3,
					title: 'Ya terminada',
					status: 'done',
					priority: 'high',
				},
			]}
			onOpenTasks={onOpenTasks}
		/>,
	)

	assert.ok(screen.getByRole('heading', { name: 'Tareas importantes' }))
	assert.ok(screen.getByText('Confirmar entrega'))
	assert.ok(screen.getByText('Vencida'))
	assert.equal(screen.queryByText('Ya terminada'), null)

	await user.click(screen.getByRole('button', { name: 'Ver todas las tareas' }))

	assert.equal(onOpenTasks.mock.calls.length, 1)
})

test('ImportantTasksCard keeps the compact empty state actionable', async () => {
	const user = userEvent.setup()
	const onOpenTasks = vi.fn()
	render(<ImportantTasksCard tasks={[]} onOpenTasks={onOpenTasks} />)

	assert.ok(screen.getByText('Sin tareas pendientes.'))

	await user.click(screen.getByRole('button', { name: 'Ver todas las tareas' }))

	assert.equal(onOpenTasks.mock.calls.length, 1)
})
