import {
	type ReservationStatusConfig,
} from './reservation-status-config'
import { type AgendaOperationalRow } from './agenda'
import { money } from './page-support'
import { serviceDisplayName } from './service-display'

export type AnyRecord = Record<string, any>

export type WorkOrderViewMode = 'agenda' | 'status' | 'entry-date'

export const workViewModes: Array<{
	value: WorkOrderViewMode
	label: string
}> = [
	{ value: 'agenda', label: 'Agenda' },
	{ value: 'status', label: 'Estado' },
	{ value: 'entry-date', label: 'Fecha de ingreso' },
]

export const agendaRangeModes: Array<{
	value: 'week' | 'month'
	label: string
}> = [
	{ value: 'week', label: 'Semana' },
	{ value: 'month', label: 'Mes' },
]

export type ReservationStatusGroup = {
	key: string
	label: string
	statuses?: readonly string[]
	dropStatus?: string
	reservations: AnyRecord[]
}

export type WorkOrderStatusColumn = {
	key: string
	label: string
	statuses: readonly string[]
	dropStatus?: string
}

export type ReservationEntryDateGroup = {
	key: string
	entryDate: string
	reservations: AnyRecord[]
}

function normalizeId(value: any) {
	if (value === null || value === undefined || value === '') {
		return null
	}
	return String(value)
}

function serviceRefId(value: any) {
	if (value && typeof value === 'object') {
		return normalizeId(value.id)
	}
	return normalizeId(value)
}

function primaryItem(record: AnyRecord) {
	return Array.isArray(record.items) ? record.items[0] : null
}

function workOrderReservationId(workOrder: AnyRecord) {
	return normalizeId(
		workOrder.reservation_id ??
			workOrder.reservation?.id ??
			workOrder.reservation,
	)
}

function buildWorkOrderByReservationId(workOrders: AnyRecord[]) {
	return (workOrders ?? []).reduce<Record<string, AnyRecord>>(
		(byReservation, workOrder) => {
			const reservationId = workOrderReservationId(workOrder)
			if (reservationId) byReservation[reservationId] = workOrder
			return byReservation
		},
		{},
	)
}

export function workOrderForReservation(
	reservation: AnyRecord,
	workOrders: AnyRecord[] | Record<string, AnyRecord>,
) {
	const embeddedWorkOrder = reservation.work_order
	if (embeddedWorkOrder && typeof embeddedWorkOrder === 'object') {
		return embeddedWorkOrder
	}

	const reservationId = normalizeId(reservation.id)
	if (!reservationId) return null

	const workOrderByReservation = Array.isArray(workOrders)
		? buildWorkOrderByReservationId(workOrders)
		: workOrders
	return workOrderByReservation[reservationId] ?? null
}

export function workReservationRow(
	reservation: AnyRecord,
	workOrder: AnyRecord | null,
): AgendaOperationalRow {
	const reservationId = String(reservation.id ?? '')
	const entryDay = String(reservation.day ?? '')
	return {
		key: `reservation:${reservationId}`,
		day: entryDay,
		displayDay: entryDay,
		phase: 'entry',
		kind: workOrder ? 'reservation-work-order' : 'reservation-only',
		reservation,
		workOrder,
	}
}

export function createWorkReservationRow(
	workOrders: AnyRecord[] | Record<string, AnyRecord>,
) {
	return (reservation: AnyRecord) =>
		workReservationRow(
			reservation,
			workOrderForReservation(reservation, workOrders),
		)
}

export function workOrderSelectOptions(
	workOrders: AnyRecord[],
	canViewEconomy: boolean,
) {
	return workOrders.map((item) => ({
		value: String(item.id),
		label: `${item.customer_name} - ${item.vehicle_label}`,
		meta: canViewEconomy
			? `${serviceDisplayName(item)} - deuda ${money(item.balance_due)}`
			: serviceDisplayName(item),
	}))
}

export function workStatusDropValue(value: any) {
	if (value === null || value === undefined) return null
	const raw = String(value)
	return raw.startsWith('work-status:')
		? raw.replace('work-status:', '')
		: raw
}

export function entryDateForReservation(reservation: AnyRecord) {
	return normalizeId(reservation.day)
}

export function workStatusForReservation(
	reservation: AnyRecord,
	workOrders: AnyRecord[] | Record<string, AnyRecord>,
) {
	const reservationStatus = normalizeId(reservation.status)
	if (reservationStatus) {
		return reservationStatus
	}
	const workOrder = workOrderForReservation(reservation, workOrders)
	return normalizeId(workOrder?.status)
}

function reservationHasActiveWorkOrder(
	reservation: AnyRecord,
	workOrders: AnyRecord[] | Record<string, AnyRecord>,
) {
	return (
		String(reservation.status ?? '') !== 'canceled' &&
		Boolean(workOrderForReservation(reservation, workOrders))
	)
}

export function reservationCanMoveWorkStatus(
	reservation: AnyRecord,
	workOrders: AnyRecord[] | Record<string, AnyRecord>,
) {
	return (
		!['pending', 'canceled'].includes(String(reservation.status ?? '')) &&
		Boolean(workOrderForReservation(reservation, workOrders))
	)
}

export function workStatusColumnForStatus(
	status: string | null | undefined,
	statusColumns: readonly WorkOrderStatusColumn[],
) {
	if (!status) return null
	return (
		statusColumns.find((column) => column.statuses.includes(status)) ?? null
	)
}

export function workStatusColumnKeyForValue(
	value: any,
	statusColumns: readonly WorkOrderStatusColumn[],
	statusLabels: Record<string, string>,
) {
	const status = workStatusDropValue(value)
	if (!status) return null
	if (statusColumns.some((column) => column.key === status)) {
		return status
	}
	const column = workStatusColumnForStatus(status, statusColumns)
	if (column) return column.key
	return Object.prototype.hasOwnProperty.call(statusLabels, status)
		? status
		: null
}

export function workStatusDropTargetForOver(
	over: any,
	statusColumns: readonly WorkOrderStatusColumn[],
	statusLabels: Record<string, string>,
) {
	return workStatusColumnKeyForValue(
		over?.data?.current?.statusGroup ??
			over?.data?.current?.status ??
			over?.id,
		statusColumns,
		statusLabels,
	)
}

export function workStatusDropStatusForColumn(
	columnKey: string | null,
	statusColumns: readonly WorkOrderStatusColumn[],
	statusLabels: Record<string, string>,
) {
	if (!columnKey) return null
	const column = statusColumns.find((item) => item.key === columnKey)
	if (column) return column.dropStatus ?? column.statuses[0] ?? null
	return Object.prototype.hasOwnProperty.call(statusLabels, columnKey)
		? columnKey
		: null
}

export function updateReservationWorkOrder(
	reservation: AnyRecord,
	workOrder: AnyRecord,
	statusLabels: Record<string, string>,
) {
	const status = String(workOrder?.status ?? reservation.status ?? '')
	return {
		...reservation,
		...(status ? { status, status_label: statusLabels[status] ?? status } : {}),
		work_order: workOrder,
	}
}

export function upsertWorkOrderRecord(
	records: AnyRecord[],
	workOrder: AnyRecord,
) {
	const workOrderId = String(workOrder?.id ?? '')
	if (!workOrderId) return records
	const exists = records.some((item) => String(item.id) === workOrderId)
	if (!exists) return [workOrder, ...records]
	return records.map((item) =>
		String(item.id) === workOrderId ? workOrder : item,
	)
}

export function buildWorkStatusColumns(
	config: ReservationStatusConfig,
): WorkOrderStatusColumn[] {
	const columns: WorkOrderStatusColumn[] = []
	const notStartedStatuses: string[] = []
	if (config.usePending) notStartedStatuses.push('pending')
	notStartedStatuses.push('confirmed')
	columns.push({
		key: 'not_started',
		label: 'Sin ingresar',
		statuses: notStartedStatuses,
		dropStatus: 'confirmed',
	})
	if (config.useInProgress) {
		columns.push({
			key: 'in_progress',
			label: 'En proceso',
			statuses: ['in_progress'],
			dropStatus: 'in_progress',
		})
	}
	const finishedStatuses: string[] = []
	if (config.useReady) finishedStatuses.push('ready')
	finishedStatuses.push('delivered')
	columns.push({
		key: 'finished',
		label: 'Finalizados',
		statuses: finishedStatuses,
		dropStatus: config.useReady ? 'ready' : 'delivered',
	})
	return columns
}


export function groupReservationsByWorkOrderStatus(
	reservations: AnyRecord[],
	workOrders: AnyRecord[] | Record<string, AnyRecord>,
	statusLabels: Record<string, string>,
): ReservationStatusGroup[] {
	const byStatus = (reservations ?? []).reduce<Record<string, AnyRecord[]>>(
		(groups, reservation) => {
			if (!reservationCanMoveWorkStatus(reservation, workOrders)) {
				return groups
			}
			const status = workStatusForReservation(reservation, workOrders)
			if (!status) return groups
			const items = groups[status] ?? (groups[status] = [])
			items.push(reservation)
			return groups
		},
		{},
	)

	const knownGroups = Object.entries(statusLabels).map(([key, label]) => ({
		key,
		label,
		reservations: byStatus[key] ?? [],
	}))
	const unknownGroups = Object.entries(byStatus)
		.filter(([key]) => !(key in statusLabels))
		.map(([key, reservations]) => ({
			key,
			label: key,
			reservations,
		}))

	return [...knownGroups, ...unknownGroups]
}

export function groupReservationsByWorkOrderStatusColumns(
	reservations: AnyRecord[],
	workOrders: AnyRecord[] | Record<string, AnyRecord>,
	statusColumns: readonly WorkOrderStatusColumn[],
): ReservationStatusGroup[] {
	const byColumn = (reservations ?? []).reduce<Record<string, AnyRecord[]>>(
		(groups, reservation) => {
			if (!reservationHasActiveWorkOrder(reservation, workOrders)) {
				return groups
			}
			const status = workStatusForReservation(reservation, workOrders)
			if (!status) return groups
			const column = workStatusColumnForStatus(status, statusColumns)
			const key = column?.key ?? status
			const items = groups[key] ?? (groups[key] = [])
			items.push(reservation)
			return groups
		},
		{},
	)

	const knownGroups = statusColumns.map((column) => ({
		key: column.key,
		label: column.label,
		statuses: column.statuses,
		dropStatus: column.dropStatus ?? column.statuses[0] ?? column.key,
		reservations: byColumn[column.key] ?? [],
	}))
	const unknownGroups = Object.entries(byColumn)
		.filter(([key]) => !statusColumns.some((column) => column.key === key))
		.map(([key, reservations]) => ({
			key,
			label: key,
			statuses: [key],
			dropStatus: key,
			reservations,
		}))

	return [...knownGroups, ...unknownGroups]
}

export function groupReservationsByEntryDate(
	reservations: AnyRecord[],
	fromDay: string,
): ReservationEntryDateGroup[] {
	const byDate = (reservations ?? []).reduce<Record<string, AnyRecord[]>>(
		(groups, reservation) => {
			const entryDate = entryDateForReservation(reservation)
			if (!entryDate || entryDate < fromDay) return groups
			const items = groups[entryDate] ?? (groups[entryDate] = [])
			items.push(reservation)
			return groups
		},
		{},
	)

	return Object.entries(byDate)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, reservations]) => ({
			key,
			entryDate: key,
			reservations,
		}))
}

function quoteHasReservation(quote: AnyRecord) {
	return Boolean(quote.has_reservation ?? quote.reservation)
}

export function filterFreeQuotesBySector(
	quotes: AnyRecord[],
	sectorIdByServiceId: Record<string, number | null>,
	sectorId: number | null,
) {
	return (quotes ?? []).filter((quote) => {
		if (quoteHasReservation(quote) || quote.reservation_day) return false
		if (sectorId === null) return true
		const item = primaryItem(quote)
		const rawServiceId = item?.service ?? quote.service
		const serviceIdStr =
			rawServiceId != null ? serviceRefId(rawServiceId) : null
		if (!serviceIdStr) return true
		const quoteSectorId = sectorIdByServiceId[serviceIdStr]
		return quoteSectorId === sectorId
	})
}
