'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { RefreshCw, RotateCcw, Search, Trash2 } from 'lucide-react'

import { apiFetch } from '@/lib/api'
import { Button } from '@/app/components/ui/Button'
import { Empty, ErrorState, LoadingState } from '@/app/components/ui/Empty'
import { Field } from '@/app/components/ui/Field'
import { MetricCard } from '@/app/components/ui/MetricCard'
import {
	RecordCard,
	RecordCardHeader,
} from '@/app/components/ui/RecordCard'
import {
	SegmentedControl,
	type SegmentedOption,
} from '@/app/components/ui/SegmentedControl'
import { formatDateTimeLabel } from '@/lib/page-support'

type TrashItem = {
	id: number
	type: string
	type_label: string
	module: string
	label: string
	secondary: string
	deleted_at: string | null
}

type TrashGroup = {
	type: string
	label_singular: string
	label_plural: string
	module: string
	count: number
	items: TrashItem[]
}

type TrashPayload = {
	total: number
	groups: TrashGroup[]
}

const ALL_TYPES_FILTER = 'all'

type PendingAction =
	| { kind: 'restore'; type: string; id: number }
	| { kind: 'purge'; type: string; id: number }
	| null

export function TrashSettingsPanel() {
	const [payload, setPayload] = useState<TrashPayload | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES_FILTER)
	const [searchTerm, setSearchTerm] = useState('')
	const [pending, setPending] = useState<PendingAction>(null)
	const [feedback, setFeedback] = useState<string | null>(null)

	const fetchTrash = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const data = await apiFetch<TrashPayload>('/trash/')
			setPayload(data)
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'No se pudo cargar la papelera.',
			)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchTrash()
	}, [fetchTrash])

	const groups = payload?.groups ?? []
	const total = payload?.total ?? 0

	const visibleGroups = useMemo(() => {
		const needle = searchTerm.trim().toLowerCase()
		return groups
			.filter((group) =>
				typeFilter === ALL_TYPES_FILTER ? true : group.type === typeFilter,
			)
			.map((group) => {
				if (!needle) return group
				const items = group.items.filter(
					(item) =>
						item.label.toLowerCase().includes(needle) ||
						(item.secondary || '').toLowerCase().includes(needle),
				)
				return { ...group, items }
			})
	}, [groups, typeFilter, searchTerm])

	const visibleCount = visibleGroups.reduce(
		(accum, group) => accum + group.items.length,
		0,
	)
	const hiddenCount = total - visibleCount

	const filterOptions = useMemo<SegmentedOption<string>[]>(() => {
		const options: SegmentedOption<string>[] = [
			{ value: ALL_TYPES_FILTER, label: `Todo (${total})` },
		]
		for (const group of groups) {
			if (group.count > 0) {
				options.push({
					value: group.type,
					label: `${group.label_plural} (${group.count})`,
				})
			}
		}
		return options
	}, [groups, total])

	async function handleRestore(group: TrashGroup, item: TrashItem) {
		const confirmed = window.confirm(
			`¿Restaurar ${group.label_singular.toLowerCase()} "${item.label}"?`,
		)
		if (!confirmed) return
		setPending({ kind: 'restore', type: group.type, id: item.id })
		setFeedback(null)
		try {
			await apiFetch(`/trash/${group.type}/${item.id}/restore/`, {
				method: 'POST',
			})
			setFeedback(`${group.label_singular} restaurado.`)
			await fetchTrash()
		} catch (err) {
			setFeedback(
				err instanceof Error
					? err.message
					: `No se pudo restaurar el ${group.label_singular.toLowerCase()}.`,
			)
		} finally {
			setPending(null)
		}
	}

	async function handlePurge(group: TrashGroup, item: TrashItem) {
		const confirmed = window.confirm(
			`¿Eliminar definitivamente ${group.label_singular.toLowerCase()} "${item.label}"? Esta accion no se puede deshacer.`,
		)
		if (!confirmed) return
		setPending({ kind: 'purge', type: group.type, id: item.id })
		setFeedback(null)
		try {
			await apiFetch(`/trash/${group.type}/${item.id}/`, {
				method: 'DELETE',
			})
			setFeedback(`${group.label_singular} eliminado definitivamente.`)
			await fetchTrash()
		} catch (err) {
			setFeedback(
				err instanceof Error
					? err.message
					: `No se pudo eliminar ${group.label_singular.toLowerCase()}.`,
			)
		} finally {
			setPending(null)
		}
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Control operativo</span>
					<h2>Papelera</h2>
					<p>
						Revisá los registros borrados, restauralos para volver a usarlos o
						eliminalos definitivamente.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-secondary-actions">
						<Button variant="ghost" onClick={fetchTrash}>
							<RefreshCw size={16} />
							Actualizar
						</Button>
					</div>
				</div>
			</div>

			<section className="settings-operational-metrics section-block-end">
				<MetricCard label="Items en papelera" value={total} />
				<MetricCard label="Visibles" value={visibleCount} />
				<MetricCard label="Filtrados" value={Math.max(hiddenCount, 0)} />
			</section>

			{filterOptions.length > 1 ? (
				<SegmentedControl
					ariaLabel="Filtrar papelera por tipo"
					className="settings-section-toggle"
					options={filterOptions}
					value={typeFilter}
					onChange={setTypeFilter}
				/>
			) : null}

			<form
				className="audit-filter-grid"
				onSubmit={(event) => event.preventDefault()}
			>
				<Field label="Buscar">
					<input
						placeholder="Nombre o descripcion"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
					/>
				</Field>
				<div className="record-actions audit-filter-actions">
					<Button
						variant="ghost"
						disabled={!searchTerm}
						onClick={() => setSearchTerm('')}
					>
						<Search size={16} />
						Limpiar
					</Button>
				</div>
			</form>

			{feedback ? (
				<div className="record-sub trash-feedback" role="status" aria-live="polite">
					{feedback}
				</div>
			) : null}

			{loading && !payload ? (
				<LoadingState
					text="Cargando papelera..."
					hint="Buscando registros borrados para esta operacion."
				/>
			) : error ? (
				<ErrorState
					text="No se pudo cargar la papelera."
					hint={error}
					action={
						<Button variant="ghost" onClick={fetchTrash}>
							<RefreshCw size={16} />
							Reintentar
						</Button>
					}
				/>
			) : total === 0 ? (
				<Empty
					text="No hay nada en la papelera."
					hint="Cuando borres registros, podras restaurarlos desde aca durante el tiempo que decidas conservarlos."
				/>
			) : visibleCount === 0 ? (
				<Empty
					text="Sin resultados para los filtros aplicados."
					hint="Limpia la busqueda o cambia el tipo seleccionado para ver mas registros."
				/>
			) : (
				<div className="trash-groups">
					{visibleGroups.map((group) =>
						group.items.length === 0 ? null : (
							<section className="trash-group" key={group.type}>
								<header className="trash-group-head">
									<h3>{group.label_plural}</h3>
									<span className="record-sub">
										{group.items.length} de {group.count} mostrados
									</span>
								</header>
								<div className="records">
									{group.items.map((item) => {
										const isRestoring =
											pending?.kind === 'restore' &&
											pending.id === item.id &&
											pending.type === group.type
										const isPurging =
											pending?.kind === 'purge' &&
											pending.id === item.id &&
											pending.type === group.type
										const isBusy = isRestoring || isPurging
										return (
											<RecordCard key={`${group.type}-${item.id}`}>
												<RecordCardHeader
													title={item.label}
													subtitle={
														<>
															{item.secondary ? (
																<span>{item.secondary} · </span>
															) : null}
															Borrado el{' '}
															{item.deleted_at
																? formatDateTimeLabel(item.deleted_at)
																: 'sin fecha'}
														</>
													}
													actions={
														<>
															<Button
																variant="ghost"
																disabled={isBusy}
																loading={isRestoring}
																onClick={() => handleRestore(group, item)}
															>
																<RotateCcw size={16} />
																{isRestoring ? 'Restaurando...' : 'Restaurar'}
															</Button>
															<Button
																variant="danger"
																disabled={isBusy}
																loading={isPurging}
																onClick={() => handlePurge(group, item)}
															>
																<Trash2 size={16} />
																{isPurging ? 'Eliminando...' : 'Eliminar'}
															</Button>
														</>
													}
												/>
											</RecordCard>
										)
									})}
								</div>
							</section>
						),
					)}
				</div>
			)}
		</section>
	)
}
