'use client'

import { type FormEvent, useMemo, useState } from 'react'

import { ModalFrame } from '@/app/components/ui/ModalFrame'

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export type TaskRecord = {
	id?: number
	title: string
	description?: string | null
	due_date?: string | null
	priority: 'high' | 'medium' | 'low'
	assignee?: number | null
	customer?: number | null
	vehicle?: number | null
	recurrence?: TaskRecurrence
}

type TaskEmployeeOption = {
	id: number
	username: string
}

type TaskCustomerOption = {
	id: number
	name: string
}

type TaskVehicleOption = {
	id: number
	label: string
	customerId: number | null
}

type TaskFormProps = {
	initial?: Partial<TaskRecord>
	canAssign: boolean
	employees: TaskEmployeeOption[]
	customers?: TaskCustomerOption[]
	vehicles?: TaskVehicleOption[]
	onSubmit: (payload: {
		title: string
		description: string
		due_date: string | null
		priority: 'high' | 'medium' | 'low'
		assignee: number | null
		customer: number | null
		vehicle: number | null
		recurrence: TaskRecurrence
	}) => Promise<void> | void
	onClose: () => void
}

const PRIORITY_OPTIONS = [
	{ value: 'high', label: 'Alta' },
	{ value: 'medium', label: 'Media' },
	{ value: 'low', label: 'Baja' },
] as const

const RECURRENCE_OPTIONS: { value: TaskRecurrence; label: string }[] = [
	{ value: 'none', label: 'No se repite' },
	{ value: 'daily', label: 'Cada dia' },
	{ value: 'weekly', label: 'Cada semana' },
	{ value: 'monthly', label: 'Cada mes' },
]

export function TaskForm({
	initial,
	canAssign,
	employees,
	customers,
	vehicles,
	onSubmit,
	onClose,
}: TaskFormProps) {
	const [title, setTitle] = useState(initial?.title ?? '')
	const [description, setDescription] = useState(initial?.description ?? '')
	const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
	const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(
		(initial?.priority as 'high' | 'medium' | 'low') ?? 'medium',
	)
	const [assignee, setAssignee] = useState<string>(
		initial?.assignee != null ? String(initial.assignee) : '',
	)
	const [customer, setCustomer] = useState<string>(
		initial?.customer != null ? String(initial.customer) : '',
	)
	const [vehicle, setVehicle] = useState<string>(
		initial?.vehicle != null ? String(initial.vehicle) : '',
	)
	const [recurrence, setRecurrence] = useState<TaskRecurrence>(
		(initial?.recurrence as TaskRecurrence) ?? 'none',
	)
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const customerOptions = customers ?? []
	const vehicleOptions = vehicles ?? []

	const filteredVehicles = useMemo(() => {
		if (!customer) return vehicleOptions
		const target = Number(customer)
		return vehicleOptions.filter(
			(item) => item.customerId == null || item.customerId === target,
		)
	}, [customer, vehicleOptions])

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const cleanTitle = title.trim()
		if (!cleanTitle) {
			setError('El titulo es obligatorio.')
			return
		}
		setSubmitting(true)
		setError(null)
		try {
			await onSubmit({
				title: cleanTitle,
				description: (description ?? '').trim(),
				due_date: dueDate ? dueDate : null,
				priority,
				assignee: canAssign && assignee ? Number(assignee) : null,
				customer: customer ? Number(customer) : null,
				vehicle: vehicle ? Number(vehicle) : null,
				recurrence,
			})
		} catch (err) {
			setError((err as Error)?.message ?? 'No se pudo guardar la tarea.')
		} finally {
			setSubmitting(false)
		}
	}

	const editing = Boolean(initial?.id)

	return (
		<ModalFrame
			title={editing ? 'Editar tarea' : 'Nueva tarea'}
			onClose={onClose}
		>
			<form className="task-form" onSubmit={handleSubmit}>
				<label>
					Titulo
					<input
						type="text"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						maxLength={200}
						required
						autoFocus
					/>
				</label>
				<label>
					Descripcion
					<textarea
						value={description ?? ''}
						onChange={(event) => setDescription(event.target.value)}
						rows={3}
						placeholder="Opcional"
					/>
				</label>
				<div className="task-form-row">
					<label>
						Fecha de vencimiento
						<input
							type="date"
							value={dueDate ?? ''}
							onChange={(event) => setDueDate(event.target.value)}
						/>
					</label>
					<label>
						Prioridad
						<select
							value={priority}
							onChange={(event) =>
								setPriority(event.target.value as 'high' | 'medium' | 'low')
							}
						>
							{PRIORITY_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>
				</div>
				{canAssign ? (
					<label>
						Asignar a
						<select
							value={assignee}
							onChange={(event) => setAssignee(event.target.value)}
						>
							<option value="">Sin asignar (recordatorio del negocio)</option>
							{employees.map((employee) => (
								<option key={employee.id} value={String(employee.id)}>
									{employee.username}
								</option>
							))}
						</select>
					</label>
				) : null}
				{customerOptions.length > 0 || vehicleOptions.length > 0 ? (
					<div className="task-form-row">
						{customerOptions.length > 0 ? (
							<label>
								Cliente
								<select
									value={customer}
									onChange={(event) => {
										setCustomer(event.target.value)
										setVehicle('')
									}}
								>
									<option value="">Sin cliente</option>
									{customerOptions.map((item) => (
										<option key={item.id} value={String(item.id)}>
											{item.name}
										</option>
									))}
								</select>
							</label>
						) : null}
						{vehicleOptions.length > 0 ? (
							<label>
								Vehiculo
								<select
									value={vehicle}
									onChange={(event) => setVehicle(event.target.value)}
								>
									<option value="">Sin vehiculo</option>
									{filteredVehicles.map((item) => (
										<option key={item.id} value={String(item.id)}>
											{item.label}
										</option>
									))}
								</select>
							</label>
						) : null}
					</div>
				) : null}
				<label>
					Repeticion
					<select
						value={recurrence}
						onChange={(event) => setRecurrence(event.target.value as TaskRecurrence)}
					>
						{RECURRENCE_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
				{error ? <p className="task-form-error">{error}</p> : null}
				<div className="task-form-actions">
					<button
						type="button"
						className="ghost"
						onClick={onClose}
						disabled={submitting}
					>
						Cancelar
					</button>
					<button type="submit" className="primary" disabled={submitting}>
						{submitting
							? 'Guardando...'
							: editing
								? 'Guardar cambios'
								: 'Crear tarea'}
					</button>
				</div>
			</form>
		</ModalFrame>
	)
}
