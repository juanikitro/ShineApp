'use client'

import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useState } from 'react'

import {
	CalendarClock,
	CheckCircle2,
	ListTodo,
	Pencil,
	Plus,
	Repeat,
	RotateCcw,
	Search,
	Trash2,
	User as UserIcon,
	Car as CarIcon,
} from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Empty } from '@/app/components/ui/Empty'
import { SegmentedControl } from '@/app/components/ui/SegmentedControl'
import { useConfirmDialog } from '@/lib/use-confirm-dialog'

import { TaskForm, type TaskRecord } from './TaskForm'

export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'done'
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export type Task = {
	id: number
	title: string
	description?: string | null
	due_date?: string | null
	priority: TaskPriority
	status: TaskStatus
	assignee?: number | null
	assignee_username?: string | null
	assignee_label?: string | null
	created_by?: number | null
	created_by_username?: string | null
	created_by_label?: string | null
	completed_at?: string | null
	completed_by_username?: string | null
	is_overdue?: boolean
	created_at?: string | null
	customer?: number | null
	customer_label?: string | null
	vehicle?: number | null
	vehicle_label?: string | null
	recurrence?: TaskRecurrence
	recurrence_label?: string | null
}

type EmployeeOption = {
	id: number
	username: string
}

type CustomerOption = {
	id: number
	name: string
}

type VehicleOption = {
	id: number
	label: string
	customerId: number | null
}

export type TaskFormPayload = {
	title: string
	description: string
	due_date: string | null
	priority: TaskPriority
	assignee: number | null
	customer?: number | null
	vehicle?: number | null
	recurrence?: TaskRecurrence
}

type TasksPanelProps = {
	tasks: Task[]
	employees: EmployeeOption[]
	customers?: CustomerOption[]
	vehicles?: VehicleOption[]
	currentUser: Record<string, any> | null
	canViewEconomy: boolean
	onCreate: (payload: TaskFormPayload) => Promise<unknown>
	onUpdate: (id: number, payload: Partial<TaskFormPayload>) => Promise<unknown>
	onDelete: (id: number) => Promise<void>
	onComplete: (id: number) => Promise<void>
	onReopen: (id: number) => Promise<void>
}

type EmployerScope = 'assigned' | 'unassigned' | 'all'
type EmployeeView = 'pending' | 'done'
type DueFilter = 'all' | 'overdue' | 'today' | 'week'
type DateBucket = 'overdue' | 'today' | 'week' | 'later' | 'none'

const PRIORITY_LABEL: Record<TaskPriority, string> = {
	high: 'Alta',
	medium: 'Media',
	low: 'Baja',
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
	high: 0,
	medium: 1,
	low: 2,
}

const RECURRENCE_LABEL: Record<TaskRecurrence, string> = {
	none: 'Sin repeticion',
	daily: 'Diaria',
	weekly: 'Semanal',
	monthly: 'Mensual',
}

const BUCKET_ORDER: DateBucket[] = ['overdue', 'today', 'week', 'later', 'none']

const BUCKET_LABEL: Record<DateBucket, string> = {
	overdue: 'Vencidas',
	today: 'Hoy',
	week: 'Esta semana',
	later: 'Mas adelante',
	none: 'Sin vencimiento',
}

function startOfToday(): number {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return today.getTime()
}

function parseDueDate(value: string | null | undefined): number | null {
	if (!value) return null
	const parsed = new Date(`${value}T00:00:00`).getTime()
	return Number.isNaN(parsed) ? null : parsed
}

function formatDateLabel(value: string | null | undefined): string {
	if (!value) return 'Sin vencimiento'
	const date = new Date(`${value}T00:00:00`)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})
}

function bucketForDue(dueTs: number | null, todayTs: number): DateBucket {
	if (dueTs == null) return 'none'
	if (dueTs < todayTs) return 'overdue'
	const dayMs = 86400000
	if (dueTs < todayTs + dayMs) return 'today'
	if (dueTs < todayTs + 7 * dayMs) return 'week'
	return 'later'
}

function friendlyLabel(raw: string | null | undefined): string {
	const value = (raw ?? '').trim()
	if (!value) return ''
	if (value.includes('@')) return value.split('@', 1)[0]
	return value
}

function initialsFor(label: string): string {
	const clean = (label || '').trim()
	if (!clean) return '?'
	const parts = clean.split(/[\s._-]+/).filter(Boolean)
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
	return (parts[0][0] + parts[1][0]).toUpperCase()
}

type EnrichedTask = Task & {
	__dueTs: number | null
	__createdTs: number
	__bucket: DateBucket
	__assigneeLabel: string
	__creatorLabel: string
}

function enrich(task: Task, todayTs: number): EnrichedTask {
	const dueTs = parseDueDate(task.due_date)
	const assigneeLabel = friendlyLabel(task.assignee_label || task.assignee_username || '')
	const creatorLabel = friendlyLabel(task.created_by_label || task.created_by_username || '')
	return {
		...task,
		__dueTs: dueTs,
		__createdTs: task.created_at ? new Date(task.created_at).getTime() : 0,
		__bucket: bucketForDue(dueTs, todayTs),
		__assigneeLabel: assigneeLabel,
		__creatorLabel: creatorLabel,
	}
}

function compareEnriched(a: EnrichedTask, b: EnrichedTask): number {
	const priorityDiff =
		(PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99)
	if (priorityDiff !== 0) return priorityDiff
	const aDate = a.__dueTs ?? Infinity
	const bDate = b.__dueTs ?? Infinity
	if (aDate !== bDate) return aDate - bDate
	return b.__createdTs - a.__createdTs
}

export function TasksPanel({
	tasks,
	employees,
	customers,
	vehicles,
	currentUser,
	canViewEconomy,
	onCreate,
	onUpdate,
	onDelete,
	onComplete,
	onReopen,
}: TasksPanelProps) {
	const [scope, setScope] = useState<EmployerScope>('all')
	const [employeeView, setEmployeeView] = useState<EmployeeView>('pending')
	const [priorityFilter, setPriorityFilter] = useState<string>('')
	const [employeeFilter, setEmployeeFilter] = useState<string>('')
	const [dueFilter, setDueFilter] = useState<DueFilter>('all')
	const [search, setSearch] = useState<string>('')
	const [editing, setEditing] = useState<Task | null>(null)
	const [creating, setCreating] = useState(false)
	const [showDone, setShowDone] = useState(false)
	const [busyTaskId, setBusyTaskId] = useState<number | null>(null)
	const [openMenu, setOpenMenu] = useState<{ id: number; field: 'priority' | 'assignee' | 'due' } | null>(null)
	const { requestConfirm, ConfirmDialog } = useConfirmDialog()

	const currentUserId = currentUser?.id != null ? Number(currentUser.id) : null
	const todayTs = useMemo(() => startOfToday(), [])

	useEffect(() => {
		if (openMenu == null) return
		function handlePointer(event: globalThis.MouseEvent) {
			const target = event.target as HTMLElement | null
			if (target?.closest('.task-inline-control')) return
			setOpenMenu(null)
		}
		function handleKey(event: globalThis.KeyboardEvent) {
			if (event.key === 'Escape') setOpenMenu(null)
		}
		window.addEventListener('mousedown', handlePointer)
		window.addEventListener('keydown', handleKey)
		return () => {
			window.removeEventListener('mousedown', handlePointer)
			window.removeEventListener('keydown', handleKey)
		}
	}, [openMenu])

	const employeeOptions = useMemo<EmployeeOption[]>(
		() =>
			employees
				.filter((employee) => (employee as any).is_active !== false)
				.map((employee) => ({
					id: Number(employee.id),
					username: String(
						(employee as any).username ?? (employee as any).email ?? `Usuario ${employee.id}`,
					),
				})),
		[employees],
	)

	const customerOptions = useMemo<CustomerOption[]>(() => customers ?? [], [customers])
	const vehicleOptions = useMemo<VehicleOption[]>(() => vehicles ?? [], [vehicles])

	const enriched = useMemo(
		() => tasks.map((task) => enrich(task, todayTs)),
		[tasks, todayTs],
	)

	const searchTerm = search.trim().toLowerCase()

	const visibleTasks = useMemo(() => {
		let next = enriched
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
		if (dueFilter !== 'all') {
			next = next.filter((task) => {
				if (task.status === 'done') return false
				if (dueFilter === 'overdue') return task.__bucket === 'overdue'
				if (dueFilter === 'today') return task.__bucket === 'today'
				if (dueFilter === 'week')
					return (
						task.__bucket === 'today' ||
						task.__bucket === 'week' ||
						task.__bucket === 'overdue'
					)
				return true
			})
		}
		if (searchTerm) {
			next = next.filter((task) => {
				const hay = `${task.title}\n${task.description ?? ''}\n${task.__assigneeLabel}\n${task.customer_label ?? ''}\n${task.vehicle_label ?? ''}`.toLowerCase()
				return hay.includes(searchTerm)
			})
		}
		return [...next].sort(compareEnriched)
	}, [enriched, scope, employeeFilter, priorityFilter, dueFilter, searchTerm, canViewEconomy])

	const pendingTasks = useMemo(
		() => visibleTasks.filter((task) => task.status !== 'done'),
		[visibleTasks],
	)
	const doneTasks = useMemo(
		() => visibleTasks.filter((task) => task.status === 'done'),
		[visibleTasks],
	)

	const buckets = useMemo(() => {
		const grouped: Record<DateBucket, EnrichedTask[]> = {
			overdue: [],
			today: [],
			week: [],
			later: [],
			none: [],
		}
		for (const task of pendingTasks) {
			grouped[task.__bucket].push(task)
		}
		return grouped
	}, [pendingTasks])

	const employeeFacingTasks =
		employeeView === 'pending' ? pendingTasks : doneTasks

	function canModify(task: Task) {
		if (canViewEconomy) return true
		return currentUserId != null && Number(task.created_by) === currentUserId
	}

	async function handleSubmitCreate(payload: TaskFormPayload) {
		const ok = await onCreate(payload)
		if (ok) setCreating(false)
	}

	async function handleSubmitEdit(payload: TaskFormPayload) {
		if (!editing) return
		const ok = await onUpdate(Number(editing.id), payload)
		if (ok) setEditing(null)
	}

	async function handleInlineUpdate(task: EnrichedTask, patch: Partial<TaskFormPayload>) {
		setBusyTaskId(task.id)
		setOpenMenu(null)
		try {
			await onUpdate(task.id, patch)
		} finally {
			setBusyTaskId(null)
		}
	}

	async function handleToggleStatus(task: EnrichedTask) {
		setBusyTaskId(task.id)
		try {
			if (task.status === 'done') {
				await onReopen(task.id)
			} else {
				await onComplete(task.id)
			}
		} finally {
			setBusyTaskId(null)
		}
	}

	function handlePopoverKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		const key = event.key
		if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return
		const container = event.currentTarget
		const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="option"]'))
		if (!buttons.length) return
		event.preventDefault()
		const currentIndex = buttons.findIndex((btn) => btn === document.activeElement)
		if (key === 'Home') {
			buttons[0]?.focus()
		} else if (key === 'End') {
			buttons[buttons.length - 1]?.focus()
		} else if (key === 'ArrowDown') {
			const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % buttons.length
			buttons[nextIndex]?.focus()
		} else if (key === 'ArrowUp') {
			const nextIndex = currentIndex === -1 ? buttons.length - 1 : (currentIndex - 1 + buttons.length) % buttons.length
			buttons[nextIndex]?.focus()
		}
	}

	function renderTaskRow(task: EnrichedTask) {
		const done = task.status === 'done'
		const overdue = task.__bucket === 'overdue'
		const allowedToModify = canModify(task)
		const busy = busyTaskId === task.id
		const recurrence = task.recurrence && task.recurrence !== 'none' ? task.recurrence : null
		const recurrenceLabel =
			task.recurrence_label ?? (recurrence ? RECURRENCE_LABEL[recurrence] : null)
		return (
			<li
				key={task.id}
				className={`task-row${done ? ' task-row--done' : ''}${overdue ? ' task-row--overdue' : ''}${busy ? ' task-row--busy' : ''}`}
			>
				<button
					type="button"
					className={`task-check${done ? ' task-check--done' : ''}`}
					onClick={() => void handleToggleStatus(task)}
					aria-label={done ? 'Reabrir tarea' : 'Marcar como completada'}
					disabled={busy}
				>
					{done ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}
				</button>
				<div className="task-main">
					<div className="task-title-row">
						<span
							className={`task-priority-dot task-priority-dot--${task.priority}`}
							aria-hidden
						/>
						<span className="task-title">{task.title}</span>
						{allowedToModify ? (
							<div className="task-inline-control">
								<button
									type="button"
									className={`task-priority task-priority--${task.priority}`}
									onClick={() =>
										setOpenMenu((current) =>
											current?.id === task.id && current.field === 'priority'
												? null
												: { id: task.id, field: 'priority' },
										)
									}
									aria-haspopup="listbox"
									aria-expanded={openMenu?.id === task.id && openMenu.field === 'priority'}
									title="Cambiar prioridad"
								>
									{PRIORITY_LABEL[task.priority]}
								</button>
								{openMenu?.id === task.id && openMenu.field === 'priority' ? (
									<div className="task-popover" role="listbox" onKeyDown={handlePopoverKeyDown}>
										{(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((value) => (
											<button
												key={value}
												type="button"
												role="option"
												aria-selected={task.priority === value}
												className={`task-popover-option${task.priority === value ? ' task-popover-option--active' : ''}`}
												onClick={() =>
													void handleInlineUpdate(task, { priority: value })
												}
											>
												<span
													className={`task-priority-dot task-priority-dot--${value}`}
													aria-hidden
												/>
												{PRIORITY_LABEL[value]}
											</button>
										))}
									</div>
								) : null}
							</div>
						) : (
							<span className={`task-priority task-priority--${task.priority}`}>
								{PRIORITY_LABEL[task.priority]}
							</span>
						)}
						{recurrence ? (
							<span className="task-meta-chip task-meta-chip--info" title={recurrenceLabel ?? ''}>
								<Repeat size={12} />
								{recurrenceLabel}
							</span>
						) : null}
					</div>
					<div className="task-meta">
						{allowedToModify ? (
							<div className="task-inline-control">
								<button
									type="button"
									className={`task-meta-chip${overdue ? ' task-meta-chip--danger' : ''}`}
									onClick={() =>
										setOpenMenu((current) =>
											current?.id === task.id && current.field === 'due'
												? null
												: { id: task.id, field: 'due' },
										)
									}
									title="Cambiar vencimiento"
								>
									<CalendarClock size={12} />
									{formatDateLabel(task.due_date)}
								</button>
								{openMenu?.id === task.id && openMenu.field === 'due' ? (
									<div className="task-popover task-popover--wide" onKeyDown={handlePopoverKeyDown}>
										<input
											type="date"
											defaultValue={task.due_date ?? ''}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												void handleInlineUpdate(task, {
													due_date: event.target.value || null,
												})
											}
											autoFocus
										/>
										<button
											type="button"
											className="ghost task-popover-clear"
											onClick={() =>
												void handleInlineUpdate(task, { due_date: null })
											}
										>
											Quitar fecha
										</button>
									</div>
								) : null}
							</div>
						) : (
							<span
								className={`task-meta-chip${overdue ? ' task-meta-chip--danger' : ''}`}
							>
								<CalendarClock size={12} />
								{formatDateLabel(task.due_date)}
							</span>
						)}
						{canViewEconomy && allowedToModify ? (
							<div className="task-inline-control">
								<button
									type="button"
									className={`task-meta-chip${task.assignee ? ' task-meta-chip--user' : ' task-meta-chip--muted'}`}
									onClick={() =>
										setOpenMenu((current) =>
											current?.id === task.id && current.field === 'assignee'
												? null
												: { id: task.id, field: 'assignee' },
										)
									}
									title="Reasignar tarea"
								>
									{task.__assigneeLabel ? (
										<>
											<span className="task-avatar" aria-hidden>
												{initialsFor(task.__assigneeLabel)}
											</span>
											{task.__assigneeLabel}
										</>
									) : (
										<>
											<UserIcon size={12} />
											Sin asignar
										</>
									)}
								</button>
								{openMenu?.id === task.id && openMenu.field === 'assignee' ? (
									<div className="task-popover task-popover--wide" role="listbox" onKeyDown={handlePopoverKeyDown}>
										<button
											type="button"
											role="option"
											aria-selected={task.assignee == null}
											className={`task-popover-option${task.assignee == null ? ' task-popover-option--active' : ''}`}
											onClick={() =>
												void handleInlineUpdate(task, { assignee: null })
											}
										>
											Sin asignar
										</button>
										{employeeOptions.map((employee) => (
											<button
												key={employee.id}
												type="button"
												role="option"
												aria-selected={Number(task.assignee) === employee.id}
												className={`task-popover-option${Number(task.assignee) === employee.id ? ' task-popover-option--active' : ''}`}
												onClick={() =>
													void handleInlineUpdate(task, { assignee: employee.id })
												}
											>
												<span className="task-avatar" aria-hidden>
													{initialsFor(friendlyLabel(employee.username))}
												</span>
												{friendlyLabel(employee.username)}
											</button>
										))}
									</div>
								) : null}
							</div>
						) : task.__assigneeLabel ? (
							<span className="task-meta-chip task-meta-chip--user">
								<span className="task-avatar" aria-hidden>
									{initialsFor(task.__assigneeLabel)}
								</span>
								{task.__assigneeLabel}
							</span>
						) : (
							<span className="task-meta-chip task-meta-chip--muted">
								Sin asignar
							</span>
						)}
						{task.customer_label ? (
							<span className="task-meta-chip task-meta-chip--customer" title="Cliente vinculado">
								<UserIcon size={12} />
								{task.customer_label}
							</span>
						) : null}
						{task.vehicle_label ? (
							<span className="task-meta-chip task-meta-chip--vehicle" title="Vehiculo vinculado">
								<CarIcon size={12} />
								{task.vehicle_label}
							</span>
						) : null}
						{task.__creatorLabel ? (
							<span className="task-meta-chip task-meta-chip--ghost" title="Creada por">
								<span className="task-avatar task-avatar--xs" aria-hidden>
									{initialsFor(task.__creatorLabel)}
								</span>
								{task.__creatorLabel}
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
								<Pencil size={16} />
							</Button>
							<Button
								type="button"
								variant="ghost"
								className="icon-button task-delete"
								onClick={async () => {
									const confirmed = await requestConfirm({
										title: 'Eliminar tarea',
										message: `¿Eliminar la tarea "${task.title}"?`,
										confirmLabel: 'Eliminar',
										tone: 'danger',
									})
									if (confirmed) void onDelete(task.id)
								}}
								aria-label="Eliminar tarea"
								title="Eliminar"
							>
								<Trash2 size={16} />
							</Button>
						</>
					) : null}
				</div>
			</li>
		)
	}

	function renderBuckets() {
		const visibleBuckets = BUCKET_ORDER.filter((bucket) => buckets[bucket].length > 0)
		if (visibleBuckets.length === 0) {
			return <Empty text="Sin tareas pendientes en esta vista." />
		}
		return (
			<div className="tasks-buckets">
				{visibleBuckets.map((bucket) => (
					<section
						key={bucket}
						className={`tasks-bucket tasks-bucket--${bucket}`}
						aria-label={BUCKET_LABEL[bucket]}
					>
						<header className="tasks-bucket-head">
							<h3>
								{BUCKET_LABEL[bucket]}
								<span className="tasks-bucket-count">{buckets[bucket].length}</span>
							</h3>
						</header>
						<ul className="tasks-list">
							{buckets[bucket].map(renderTaskRow)}
						</ul>
					</section>
				))}
			</div>
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
						<SegmentedControl
							selectionMode="tabs"
							options={[
								{ value: 'all', label: 'Todas' },
								{ value: 'assigned', label: 'Asignadas' },
								{ value: 'unassigned', label: 'Sin asignar' },
							]}
							value={scope}
							onChange={(value) => setScope(value as EmployerScope)}
							ariaLabel="Tipo de tareas"
						/>
					) : (
						<SegmentedControl
							selectionMode="tabs"
							options={[
								{ value: 'pending', label: `Pendientes (${pendingTasks.length})` },
								{ value: 'done', label: `Completadas (${doneTasks.length})` },
							]}
							value={employeeView}
							onChange={(value) => setEmployeeView(value as EmployeeView)}
							ariaLabel="Estado de tareas"
						/>
					)}
					<div className="tasks-search">
						<Search size={14} aria-hidden />
						<input
							type="search"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Buscar por titulo, descripcion, cliente, vehiculo..."
							aria-label="Buscar tareas"
						/>
					</div>
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
						<label className="tasks-filter-label">
							Vencimiento
							<select
								value={dueFilter}
								onChange={(event) => setDueFilter(event.target.value as DueFilter)}
							>
								<option value="all">Todas</option>
								<option value="overdue">Vencidas</option>
								<option value="today">Hoy</option>
								<option value="week">Esta semana</option>
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
											{friendlyLabel(employee.username)}
										</option>
									))}
								</select>
							</label>
						) : null}
					</div>
				</div>

				<div
					id="tasks-panel-content"
					role="tabpanel"
				>
					{canViewEconomy ? (
						<>
							{renderBuckets()}
							<div className="tasks-section-head">
								<Button
									type="button"
									variant="ghost"
									onClick={() => setShowDone((prev) => !prev)}
									aria-expanded={showDone}
								>
									<ListTodo size={14} />
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
					) : employeeView === 'pending' ? (
						renderBuckets()
					) : employeeFacingTasks.length ? (
						<ul className="tasks-list">{employeeFacingTasks.map(renderTaskRow)}</ul>
					) : (
						<Empty text="Sin tareas completadas todavia." />
					)}
				</div>
			</section>

			{creating ? (
				<TaskForm
					canAssign={canViewEconomy}
					employees={employeeOptions}
					customers={customerOptions}
					vehicles={vehicleOptions}
					onSubmit={handleSubmitCreate}
					onClose={() => setCreating(false)}
				/>
			) : null}
			{editing ? (
				<TaskForm
					initial={editing as Partial<TaskRecord>}
					canAssign={canViewEconomy}
					employees={employeeOptions}
					customers={customerOptions}
					vehicles={vehicleOptions}
					onSubmit={handleSubmitEdit}
					onClose={() => setEditing(null)}
				/>
			) : null}
		<ConfirmDialog />
		</div>
	)
}
