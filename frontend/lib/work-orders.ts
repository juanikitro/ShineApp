export type AnyRecord = Record<string, any>

export type WorkOrderViewMode = 'agenda' | 'status' | 'entry-date'

export type WorkOrderServiceBucket = 'wash' | 'detailing'

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

export type WorkOrderServiceTypeLookup = Record<
	string,
	string | AnyRecord | null | undefined
>

function normalizeId(value: any) {
	if (value === null || value === undefined || value === '') {
		return null
	}
	return String(value)
}

function normalizeServiceType(value: any) {
	const raw =
		value && typeof value === 'object' ? value.service_type : value
	const serviceType = String(raw ?? '').trim().toLowerCase()
	return serviceType || null
}

function serviceRefId(value: any) {
	if (value && typeof value === 'object') {
		return normalizeId(value.id)
	}
	return normalizeId(value)
}

function serviceTypeForRef(
	value: any,
	serviceTypeById: WorkOrderServiceTypeLookup,
) {
	const id = serviceRefId(value)
	const fromLookup = id ? normalizeServiceType(serviceTypeById[id]) : null
	return fromLookup ?? normalizeServiceType(value)
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

export function serviceBucketForRecord(
	record: AnyRecord,
	serviceTypeById: WorkOrderServiceTypeLookup = {},
): WorkOrderServiceBucket {
	const item = primaryItem(record)
	const serviceType =
		normalizeServiceType(record.service_type) ??
		normalizeServiceType(record.primary_service_type) ??
		serviceTypeForRef(record.service, serviceTypeById) ??
		serviceTypeForRef(item?.service, serviceTypeById) ??
		normalizeServiceType(item)

	return serviceType === 'detailing' ? 'detailing' : 'wash'
}

export function filterReservationsByServiceBucket(
	reservations: AnyRecord[],
	serviceTypeById: WorkOrderServiceTypeLookup,
	bucket: WorkOrderServiceBucket,
) {
	return (reservations ?? []).filter(
		(reservation) =>
			serviceBucketForRecord(reservation, serviceTypeById) === bucket,
	)
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

export function filterFreeQuotesByServiceBucket(
	quotes: AnyRecord[],
	serviceTypeById: WorkOrderServiceTypeLookup,
	bucket: WorkOrderServiceBucket,
) {
	return (quotes ?? []).filter(
		(quote) =>
			!quoteHasReservation(quote) &&
			!quote.reservation_day &&
			serviceBucketForRecord(quote, serviceTypeById) === bucket,
	)
}
