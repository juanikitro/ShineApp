import assert from 'node:assert/strict'
import { test } from 'vitest'

import { selectImportantTasks } from './important-tasks'

test('selectImportantTasks keeps the first three pending tasks by priority and due date', () => {
	const selected = selectImportantTasks([
		{ id: 1, title: 'Alta posterior', status: 'pending', priority: 'high', due_date: '2026-07-30' },
		{ id: 2, title: 'Media cercana', status: 'pending', priority: 'medium', due_date: '2026-07-21' },
		{ id: 3, title: 'Alta cercana', status: 'pending', priority: 'high', due_date: '2026-07-22' },
		{ id: 4, title: 'Alta sin fecha', status: 'pending', priority: 'high', due_date: null },
		{ id: 5, title: 'Alta completada', status: 'done', priority: 'high', due_date: '2026-07-20' },
		{ id: 6, title: 'Baja vencida', status: 'pending', priority: 'low', due_date: '2026-07-19' },
	])

	assert.deepEqual(
		selected.map((task) => task.id),
		[3, 1, 4],
	)
})

test('selectImportantTasks leaves missing and invalid due dates after valid dates', () => {
	const selected = selectImportantTasks([
		{ id: 1, status: 'pending', priority: 'high', due_date: null },
		{ id: 2, status: 'pending', priority: 'high', due_date: 'invalid' },
		{ id: 3, status: 'pending', priority: 'high', due_date: '2026-07-22' },
	])

	assert.deepEqual(
		selected.map((task) => task.id),
		[3, 1, 2],
	)
	assert.deepEqual(selectImportantTasks(selected, 0), [])
})
