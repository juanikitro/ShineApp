export type ImportantTask = {
	status?: string | null
	priority?: string | null
	due_date?: string | null
}

const priorityRank: Record<string, number> = {
	high: 0,
	medium: 1,
	low: 2,
}

function dueDateTimestamp(value: string | null | undefined): number {
	if (!value) return Number.POSITIVE_INFINITY
	const timestamp = new Date(`${value}T00:00:00`).getTime()
	return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

export function selectImportantTasks<T extends ImportantTask>(
	tasks: readonly T[],
	limit = 3,
): T[] {
	return tasks
		.filter((task) => task.status === 'pending')
		.sort((left, right) => {
			const priorityDifference =
				(priorityRank[left.priority ?? ''] ?? 99) -
				(priorityRank[right.priority ?? ''] ?? 99)
			if (priorityDifference !== 0) return priorityDifference
			const leftDueDate = dueDateTimestamp(left.due_date)
			const rightDueDate = dueDateTimestamp(right.due_date)
			if (leftDueDate === rightDueDate) return 0
			return leftDueDate - rightDueDate
		})
		.slice(0, Math.max(0, limit))
}
