export type AnyRecord = Record<string, any>

export type AgendaOperationalRowKind =
	| 'reservation-only'
	| 'reservation-work-order'

export type AgendaOperationalPhase = 'entry' | 'stay' | 'exit'

export type AgendaOperationalRow = {
	key: string
	day: string
	displayDay: string
	phase: AgendaOperationalPhase
	kind: AgendaOperationalRowKind
	reservation: AnyRecord | null
	workOrder: AnyRecord | null
}

export type AgendaCalendarSegment = {
	key: string
	startDay: string
	endDay: string
	startColumn: number
	spanDays: number
	stackRow: number
	startsBeforeWindow: boolean
	endsAfterWindow: boolean
	row: AgendaOperationalRow
	reservation: AnyRecord
	workOrder: AnyRecord | null
}

export type AgendaDisplayOptions = {
	showStayDays?: boolean
}

function normalizeId(value: any) {
	if (value === null || value === undefined || value === '') {
		return null
	}
	return String(value)
}

export function agendaSectorForReservation(reservation: AnyRecord): number | null {
	const sectorId = reservation?.sector
	if (sectorId === null || sectorId === undefined || sectorId === '') return null
	const n = Number(sectorId)
	return Number.isFinite(n) && n > 0 ? n : null
}

export function filterAgendaReservationsBySector(
	reservations: AnyRecord[],
	sectorId: number | null,
): AnyRecord[] {
	if (sectorId === null) return reservations ?? []
	return (reservations ?? []).filter(
		(r) => agendaSectorForReservation(r) === sectorId,
	)
}

function getReservationId(workOrder: AnyRecord) {
	return normalizeId(
		workOrder.reservation_id ??
			workOrder.reservation?.id ??
			workOrder.reservation,
	)
}

function reservationSortTime(reservation: AnyRecord | null) {
	const startTime = String(reservation?.start_time ?? '')
	return startTime.length >= 5 ? startTime.slice(0, 5) : '99:99'
}

function resolveReservationExitDay(reservation: AnyRecord, entryDay: string) {
	const exitDay = normalizeId(reservation.exit_day)
	return exitDay && exitDay >= entryDay ? exitDay : entryDay
}

function resolvedStayDaysOption(options?: AgendaDisplayOptions) {
	return options?.showStayDays !== false
}

function agendaPhaseForDay(
	entryDay: string,
	exitDay: string,
	displayDay: string,
): AgendaOperationalPhase {
	if (displayDay === entryDay) {
		return 'entry'
	}
	if (displayDay === exitDay) {
		return 'exit'
	}
	return 'stay'
}

function compareAgendaRows(a: AgendaOperationalRow, b: AgendaOperationalRow) {
	const timeA = reservationSortTime(a.reservation)
	const timeB = reservationSortTime(b.reservation)

	if (timeA !== timeB) {
		return timeA.localeCompare(timeB)
	}

	return a.key.localeCompare(b.key)
}

function agendaSegmentsOverlap(
	aStartColumn: number,
	aSpanDays: number,
	bStartColumn: number,
	bSpanDays: number,
) {
	const aEndColumn = aStartColumn + aSpanDays - 1
	const bEndColumn = bStartColumn + bSpanDays - 1
	return aStartColumn <= bEndColumn && bStartColumn <= aEndColumn
}

function assignAgendaStackRows(segments: AgendaCalendarSegment[]) {
	const rows: AgendaCalendarSegment[][] = []

	return segments.map((segment) => {
		let rowIndex = rows.findIndex(
			(row) =>
				!row.some((placedSegment) =>
					agendaSegmentsOverlap(
						segment.startColumn,
						segment.spanDays,
						placedSegment.startColumn,
						placedSegment.spanDays,
					),
				),
		)

		if (rowIndex === -1) {
			rowIndex = rows.length
			rows.push([])
		}

		const placedSegment = { ...segment, stackRow: rowIndex + 1 }
		rows[rowIndex].push(placedSegment)
		return placedSegment
	})
}

export function buildWorkOrderByReservation(workOrders: AnyRecord[]) {
	return (workOrders ?? []).reduce<Record<string, AnyRecord>>(
		(byReservation, workOrder) => {
			const reservationId = getReservationId(workOrder)
			if (!reservationId) return byReservation
			byReservation[reservationId] = workOrder
			return byReservation
		},
		{},
	)
}

export function buildAgendaOperationalRows(
	reservations: AnyRecord[],
	workOrders: AnyRecord[],
	weekDays: string[],
	options?: AgendaDisplayOptions,
	workOrderByReservationOverride?: Record<string, AnyRecord>,
) {
	const showStayDays = resolvedStayDaysOption(options)
	const workOrderByReservation =
		workOrderByReservationOverride ?? buildWorkOrderByReservation(workOrders)
	const rowsByDay = (reservations ?? []).reduce<
		Record<string, AgendaOperationalRow[]>
	>((rows, reservation) => {
		const day = normalizeId(reservation.day)
		const reservationId = normalizeId(reservation.id)
		if (!day || !reservationId) {
			return rows
		}

		const exitDay = resolveReservationExitDay(reservation, day)
		const lastVisibleDay = showStayDays ? exitDay : day
		const workOrder = reservation.work_order ?? workOrderByReservation[reservationId] ?? null
		weekDays.forEach((displayDay) => {
			if (displayDay < day || displayDay > lastVisibleDay) {
				return
			}
			const dayRows = rows[displayDay] ?? (rows[displayDay] = [])
			dayRows.push({
				key: `reservation:${reservationId}:${displayDay}`,
				day: displayDay,
				displayDay,
				phase: agendaPhaseForDay(day, exitDay, displayDay),
				kind: workOrder ? 'reservation-work-order' : 'reservation-only',
				reservation,
				workOrder,
			})
		})
		return rows
	}, {})

	Object.values(rowsByDay).forEach((dayRows) => dayRows.sort(compareAgendaRows))

	return rowsByDay
}

export function buildAgendaCalendarSegments(
	reservations: AnyRecord[],
	workOrders: AnyRecord[],
	weekDays: string[],
	options?: AgendaDisplayOptions,
	workOrderByReservationOverride?: Record<string, AnyRecord>,
) {
	if (!weekDays.length) return []

	const showStayDays = resolvedStayDaysOption(options)
	const firstVisibleDay = weekDays[0]
	const lastVisibleDay = weekDays[weekDays.length - 1]
	const workOrderByReservation =
		workOrderByReservationOverride ?? buildWorkOrderByReservation(workOrders)

	const segments = (reservations ?? []).reduce<AgendaCalendarSegment[]>(
		(items, reservation) => {
			const day = normalizeId(reservation.day)
			const reservationId = normalizeId(reservation.id)
			if (!day || !reservationId) {
				return items
			}

			const exitDay = resolveReservationExitDay(reservation, day)
			const segmentExitDay = showStayDays ? exitDay : day
			if (segmentExitDay < firstVisibleDay || day > lastVisibleDay) {
				return items
			}

			const startDay = day < firstVisibleDay ? firstVisibleDay : day
			const endDay =
				segmentExitDay > lastVisibleDay ? lastVisibleDay : segmentExitDay
			const startIndex = weekDays.indexOf(startDay)
			const endIndex = weekDays.indexOf(endDay)
			if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
				return items
			}

			const workOrder =
				reservation.work_order ?? workOrderByReservation[reservationId] ?? null
			const row: AgendaOperationalRow = {
				key: `reservation:${reservationId}`,
				day: startDay,
				displayDay: startDay,
				phase: agendaPhaseForDay(day, exitDay, startDay),
				kind: workOrder ? 'reservation-work-order' : 'reservation-only',
				reservation,
				workOrder,
			}

			items.push({
				key: row.key,
				startDay,
				endDay,
				startColumn: startIndex + 1,
				spanDays: endIndex - startIndex + 1,
				stackRow: 0,
				startsBeforeWindow: day < firstVisibleDay,
				endsAfterWindow: segmentExitDay > lastVisibleDay,
				row,
				reservation,
				workOrder,
			})
			return items
		},
		[],
	)

	const sortedSegments = segments.sort((a, b) => {
		if (a.startColumn !== b.startColumn) {
			return a.startColumn - b.startColumn
		}
		return compareAgendaRows(a.row, b.row)
	})

	return assignAgendaStackRows(sortedSegments)
}
