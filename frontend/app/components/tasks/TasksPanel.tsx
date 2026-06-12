'use client'

import { useMemo, useState } from 'react'

import {
	CalendarClock,
	CheckCircle2,
	ListTodo,
	Pencil,
	Plus,
	RotateCcw,
	Trash2,
} from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Empty } from '@/app/components/ui/Empty'

import { TaskForm, type TaskRecord } from './TaskForm'

type AnyRecord = Record<string, any>

type TasksPanelProps = {
	tasks: AnyRecord[]
	employees: AnyRecord[]
	currentUser: AnyRecord | null
	canViewEconomy: boolean
	onCreate: (payload: TaskFormPayload) => Promise<void>
	onUpdate: (id: number, payload: TaskFormPayload) => Promise<void>
	onDelete: (id: number) => Promise<void>
	onComplete: (id: number) => Promise<void>
	onReopen: (id: number) => Promise<void>
}

type TaskFormPayload = {
	title: string
	description: string
	due_date: string | null
	priority: 'high' | 'medium' | 'low'
	assignee: number | null
}

type EmployerScope = 'assigned' | 'unassigned' | 'all'
type EmployeeView = 'pending' | 'done'

const PRIORITY_LABEL: Record<string, string> = {
	high: 'Alta',
	medium: 'Media',
	low: 'Baja',
}

const PRIORITY_RANK: Record<string, number> = {
	high: 0,
	medium: 1,
	low: 2,
}

function formatDateLabel(value: string | null | undefined) {
	if (!value) return 'Sin vencimiento'
	const date = new Date(`${value}T00:00:00`)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})
}

function isOverdue(task: AnyRecord) {
	if (task.status === 'done') return false
	if (!task.due_date) return false
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const due = new Date(`${task.due_date}T00:00:00`)
	return due.getTime() < today.getTime()
}

function compareTasks(a: AnyRecord, b: AnyRecord) {
	const priorityDiff =
		(PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99)
	if (priorityDiff !== 0) return priorityDiff
	const aDate = a.due_date ? new Date(`${a.due_date}T00:00:00`).getTime() : Infinity
	const bDate = b.due_date ? new Date(`${b.due_date}T00:00:00`).getTime() : Infinity
	if (aDate !== bDate) return aDate - bDate
	const aCreated = new Date(a.created_at ?? 0).getTime()
	const bCreated = new Date(b.created_at ?? 0).getTime()
	return bCreated - aCreated
}

export function TasksPanel({
	tasks,
	employees,
	currentUser,
	canViewEconomy,
	onCreate,
	onUpdate,
	onDelete,
	onComplete,
	onReopen,
}: TasksPanelProps) {
	const [scope, setScope] = useState<EmployerScope>('assigned')
	const [employeeView, setEmployeeView] = useState<EmployeeView>('pending')
	const [priorityFilter, setPriorityFilter] = useState<string>('')
	const [employeeFilter, setEmployeeFilter] = useState<string>('')
	const [editing, setEditing] = useState<AnyRecord | null>(null)
	const [creating, setCreating] = useState(false)
	const [showDone, setShowDone] = useState(false)

	const currentUserId = currentUser?.id != null ? Number(currentUser.id) : null

	const employeeOptions = useMemo(
		() =>
			employees
				.filter((employee) => employee.is_active !== false)
				.map((employee) => ({
					id: Number(employee.id),
					username: String(employee.username ?? employee.email ?? `Usuario ${employee.id}`),
				})),
		[employees],
	)

	const visibleTasks = useMemo(() => {
		let next = [...tasks]
		if (canViewEconomy) {
			if (scope === 'assigned') {
				next = next.filter((task) => task.assignee != null)
			} else if (scope === 'unassigned') {
				next = next.filter((task) => task.assignee == null)
			}
			if (employeeFilter) {
				const target = Number(employeeFilter)
				next = next.filter((task) => Number(task.assignee) === target)
			}
		}
		if (priorityFilter) {
			next = next.filter((task) => task.priority === priorityFilter)
		}
		return next.sort(compareTasks)
	}, [tasks, scope, employeeFilter, priorityFilter, canViewEconomy])

	const pendingTasks = useMemo(
		() => visibleTasks.filter((task) => task.status !== 'done'),
		[visibleTasks],
	)
	const doneTasks = useMemo(
		() => visibleTasks.filter((task) => task.status === 'done'),
		[visibleTasks],
	)

	const employeeFacingTasks =
		employeeView === 'pending' ? pendingTasks : doneTasks

	function canModify(task: AnyRecord) {
		if (canViewEconomy) return true
		return currentUserId != null && Number(task.created_by) === currentUserId
	}

	async function handleSubmitCreate(payload: TaskFormPayload) {
		await onCreate(payload)
		setCreating(false)
	}

	async function handleSubmitEdit(payload: TaskFormPayload) {
		if (!editing) return
		await onUpdate(Number(editing.id), payload)
		setEditing(null)
	}

	function renderTaskRow(task: AnyRecord) {
		const done = task.status === 'done'
		const overdue = isOverdue(task)
		const allowedToModify = canModify(task)
		return (
			<li
				key={task.id}
				className={`task-row${done ? ' task-row--done' : ''}${overdue ? ' task-row--overdue' : ''}`}
			>
				<button
					type="button"
					className={`task-check${done ? ' task-check--done' : ''}`}
					onClick={() =>
						done ? onReopen(Number(task.id)) : onComplete(Number(task.id))
					}
					aria-label={done ? 'Reabrir tarea' : 'Marcar como completada'}
				>
					{done ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
				</button>
				<div className="task-main">
					<div className="task-title-row">
						<span className="task-title">{task.title}</span>
						<span className={`task-priority task-priority--${task.priority}`}>
							{PRIORITY_LABEL[task.priority] ?? task.priority}
						</span>
					</div>
					<div className="task-meta">
						<span
							className={`task-meta-chip${overdue ? ' task-meta-chip--danger' : ''}`}
						>
							<CalendarClock size={12} />
							{formatDateLabel(task.due_date)}
						</span>
						{task.assignee_username ? (
							<span className="task-meta-chip task-meta-chip--user">
								{task.assignee_username}
							</span>
						) : (
							<span className="task-meta-chip task-meta-chip--muted">
								Sin asignar
							</span>
						)}
						{task.created_by_username ? (
							<span className="task-meta-chip task-meta-chip--ghost">
								Creada por {task.created_by_username}
							</span>
						) : null}
					</div>
					{task.description ? (
						<details className="task-description">
							<summary>Ver descripcion</summary>
							<p>{task.description}</p>
						</details>
					) : null}
				</div>
				<div className="task-actions">
					{allowedToModify ? (
						<>
							<Button
								type="button"
								variant="ghost"
								className="icon-button"
								onClick={() => setEditing(task)}
								aria-label="Editar tarea"
								title="Editar"
							>
								<Pencil size={14} />
							</Button>
							<Button
								type="button"
								variant="ghost"
								className="icon-button task-delete"
								onClick={() => {
									if (window.confirm('¿Eliminar la tarea?')) {
										void onDelete(Number(task.id))
									}
								}}
								aria-label="Eliminar tarea"
								title="Eliminar"
							>
								<Trash2 size={14} />
							</Button>
						</>
					) : null}
				</div>
			</li>
		)
	}

	return (
		<div className="grid">
			<section className="panel tasks-panel">
				<div className="panel-head">
					<div>
						<h2>Tareas</h2>
						<p>
							{canViewEconomy
								? 'Coordina los pendientes del negocio y los asignados a cada empleado.'
								: 'Tus tareas pendientes y completadas.'}
						</p>
					</div>
					<Button
						type="button"
						variant="primary"
						onClick={() => setCreating(true)}
					>
						<Plus size={16} />
						Nueva tarea
					</Button>
				</div>
				<div className="tasks-filters">
					{canViewEconomy ? (
						<div className="tasks-tabs" role="tablist" aria-label="Tipo de tareas">
							{(['assigned', 'unassigned', 'all'] as EmployerScope[]).map(
								(value) => (
									<button
										key={value}
										type="button"
										role="tab"
										aria-selected={scope === value}
										className={`tasks-tab${scope === value ? ' tasks-tab--active' : ''}`}
										onClick={() => setScope(value)}
									>
										{value === 'assigned'
											? 'Asignadas'
											: value === 'unassigned'
												? 'Sin asignar'
												: 'Todas'}
									</button>
								),
							)}
						</div>
					) : (
						<div
							className="tasks-tabs"
							role="tablist"
							aria-label="Estado de tareas"
						>
							{(['pending', 'done'] as EmployeeView[]).map((value) => (
								<button
									key={value}
									type="button"
									role="tab"
									aria-selected={employeeView === value}
									className={`tasks-tab${employeeView === value ? ' tasks-tab--active' : ''}`}
									onClick={() => setEmployeeView(value)}
								>
									{value === 'pending'
										? `Pendientes (${pendingTasks.length})`
										: `Completadas (${doneTasks.length})`}
								</button>
							))}
						</div>
					)}
					<div className="tasks-filter-row">
						<label className="tasks-filter-label">
							Prioridad
							<select
								value={priorityFilter}
								onChange={(event) => setPriorityFilter(event.target.value)}
							>
								<option value="">Todas</option>
								<option value="high">Alta</option>
								<option value="medium">Media</option>
								<option value="low">Baja</option>
							</select>
						</label>
						{canViewEconomy && scope === 'assigned' ? (
							<label className="tasks-filter-label">
								Empleado
								<select
									value={employeeFilter}
									onChange={(event) => setEmployeeFilter(event.target.value)}
								>
									<option value="">Cualquiera</option>
									{employeeOptions.map((employee) => (
										<option key={employee.id} value={String(employee.id)}>
											{employee.username}
										</option>
									))}
								</select>
							</label>
						) : null}
					</div>
				</div>

				{canViewEconomy ? (
					<>
						<div className="tasks-section-head">
							<h3>
								<ListTodo size={14} /> Pendientes ({pendingTasks.length})
							</h3>
						</div>
						{pendingTasks.length ? (
							<ul className="tasks-list">{pendingTasks.map(renderTaskRow)}</ul>
						) : (
							<Empty text="Sin tareas pendientes en esta vista." />
						)}
						<div className="tasks-section-head">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setShowDone((prev) => !prev)}
								aria-expanded={showDone}
							>
								{showDone ? 'Ocultar completadas' : 'Mostrar completadas'} (
								{doneTasks.length})
							</Button>
						</div>
						{showDone ? (
							doneTasks.length ? (
								<ul className="tasks-list">{doneTasks.map(renderTaskRow)}</ul>
							) : (
								<Empty text="Sin tareas completadas en esta vista." />
							)
						) : null}
					</>
				) : employeeFacingTasks.length ? (
					<ul className="tasks-list">{employeeFacingTasks.map(renderTaskRow)}</ul>
				) : (
					<Empty
						text={
							employeeView === 'pending'
								? 'No tenes tareas pendientes.'
								: 'Sin tareas completadas todavia.'
						}
					/>
				)}
			</section>

			{creating ? (
				<TaskForm
					canAssign={canViewEconomy}
					employees={employeeOptions}
					onSubmit={handleSubmitCreate}
					onClose={() => setCreating(false)}
				/>
			) : null}
			{editing ? (
				<TaskForm
					initial={editing as Partial<TaskRecord>}
					canAssign={canViewEconomy}
					employees={employeeOptions}
					onSubmit={handleSubmitEdit}
					onClose={() => setEditing(null)}
				/>
			) : null}
		</div>
	)
}
