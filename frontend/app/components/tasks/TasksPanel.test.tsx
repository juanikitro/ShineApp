import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

import { TasksPanel } from './TasksPanel'

afterEach(cleanup)

test('TasksPanel keeps the six linked onboarding tasks visible, including completed steps', () => {
	const tasks = [
		['business', 'Negocio listo', 'done'],
		['services', 'Servicios vehiculares', 'pending'],
		['turnera', 'Turnera publica', 'pending'],
		['whatsapp', 'WhatsApp operativo', 'pending'],
		['agenda', 'Primer turno o trabajo', 'pending'],
		['cash-dashboard', 'Primer cobro', 'pending'],
	].map(([onboarding_step_id, title, status], index) => ({
		id: index + 1,
		onboarding_step_id,
		title,
		status: status as 'pending' | 'done',
		priority: 'medium' as const,
	}))

	render(
		<TasksPanel
			tasks={tasks}
			employees={[]}
			currentUser={{ id: 1 }}
			canViewEconomy
			onCreate={vi.fn()}
			onUpdate={vi.fn()}
			onDelete={vi.fn()}
			onComplete={vi.fn()}
			onReopen={vi.fn()}
		/>,
	)

	for (const task of tasks) assert.ok(screen.getByText(task.title))
	assert.equal(
		screen.getByRole('button', { name: 'Reabrir tarea' }).hasAttribute('disabled'),
		true,
	)
})
