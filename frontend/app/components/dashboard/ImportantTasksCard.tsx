'use client'

import { RecordCard } from '@/app/components/ui/RecordCard'
import { selectImportantTasks } from '@/lib/important-tasks'
import { formatDateLabel, type AnyRecord } from '@/lib/page-support'

type ImportantTasksCardProps = {
	tasks: readonly AnyRecord[]
	onOpenTasks: () => void
}

const priorityLabel: Record<string, string> = {
	high: 'Alta',
	medium: 'Media',
	low: 'Baja',
}

function taskDueLabel(task: AnyRecord): string {
	if (task.is_overdue === true) return 'Vencida'
	return formatDateLabel(task.due_date)
}

export function ImportantTasksCard({ tasks, onOpenTasks }: ImportantTasksCardProps) {
	const importantTasks = selectImportantTasks(tasks)

	return (
		<RecordCard className="dashboard-important-tasks">
			<div className="dashboard-important-tasks-head">
				<h3>Tareas importantes</h3>
				<button
					type="button"
					className="ghost dashboard-important-tasks-link"
					aria-label="Ver todas las tareas"
					onClick={onOpenTasks}
				>
					Ver todas
				</button>
			</div>
			{importantTasks.length ? (
				<div className="dashboard-important-tasks-list">
					{importantTasks.map((task) => (
						<div className="dashboard-important-task" key={task.id}>
							<span
								className={`dashboard-important-task-priority dashboard-important-task-priority--${task.priority}`}
								aria-hidden="true"
							/>
							<div className="dashboard-important-task-copy">
								<strong>{String(task.title ?? 'Tarea sin titulo')}</strong>
								<span>{priorityLabel[String(task.priority)] ?? 'Sin prioridad'}</span>
							</div>
							<span
								className={
									task.is_overdue === true
										? 'dashboard-important-task-due dashboard-important-task-due--overdue'
										: 'dashboard-important-task-due'
								}
							>
								{taskDueLabel(task)}
							</span>
						</div>
					))}
				</div>
			) : (
				<p className="dashboard-important-tasks-empty">Sin tareas pendientes.</p>
			)}
		</RecordCard>
	)
}
