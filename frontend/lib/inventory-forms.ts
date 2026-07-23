import {
	DEFAULT_PAYMENT_METHOD,
	numberValue,
	today,
	type AnyRecord,
} from '@/lib/page-support'

export const stockMovementTypeOptions = [
	{ value: 'purchase', label: 'Compra' },
	{ value: 'initial_stock', label: 'Stock inicial' },
	{ value: 'consumption', label: 'Consumo' },
	{ value: 'sale', label: 'Venta' },
]

export const stockMovementTypeLabels: Record<string, string> =
	Object.fromEntries(
		stockMovementTypeOptions.map((item) => [item.value, item.label]),
	)

export const stockDocumentTypeOptions = [
	{ value: '', label: 'Sin comprobante' },
	{ value: 'factura_a', label: 'Factura A' },
	{ value: 'factura_b', label: 'Factura B' },
	{ value: 'factura_c', label: 'Factura C' },
	{ value: 'ticket', label: 'Ticket' },
	{ value: 'remito', label: 'Remito' },
	{ value: 'otro', label: 'Otro' },
]

export const stockPaymentMethodOptions = [
	{ value: 'cash', label: 'Efectivo' },
	{ value: 'card', label: 'Tarjeta' },
	{ value: 'transfer', label: 'Transferencia' },
	{ value: 'other', label: 'Otro' },
]

export function blankSupplierForm() {
	return {
		name: '',
		legal_name: '',
		category: '',
		tax_condition: '',
		website: '',
		contact_name: '',
		phone: '',
		email: '',
		tax_id: '',
		address: '',
		notes: '',
	}
}

export function blankStockMovementLine() {
	return {
		material: '',
		quantity: '',
		unit_price: '',
	}
}

export function blankStockMovementForm(day = today) {
	return {
		movement_type: 'purchase',
		occurred_on: day,
		supplier: '',
		customer: '',
		reservation: '',
		document_type: '',
		document_number: '',
		affects_cash: true,
		products_received: false,
		payment_method: DEFAULT_PAYMENT_METHOD,
		notes: '',
		lines: [blankStockMovementLine()],
	}
}

export function stockMovementFormWithPatchedLine(
	form: AnyRecord,
	index: number,
	patch: AnyRecord,
) {
	const lines = [...(form.lines ?? [])]
	lines[index] = { ...lines[index], ...patch }
	return { ...form, lines }
}

export function stockMovementFormWithAddedLine(form: AnyRecord) {
	return {
		...form,
		lines: [...(form.lines ?? []), blankStockMovementLine()],
	}
}

export function stockMovementFormWithRemovedLine(
	form: AnyRecord,
	index: number,
) {
	const lines = (form.lines ?? []).filter(
		(_: AnyRecord, itemIndex: number) => itemIndex !== index,
	)
	return {
		...form,
		lines: lines.length ? lines : [blankStockMovementLine()],
	}
}

export function stockMovementLinesTotal(lines: AnyRecord[] | null | undefined) {
	return (lines ?? []).reduce(
		(total: number, line: AnyRecord) =>
			total + numberValue(line.quantity) * numberValue(line.unit_price),
		0,
	)
}

export function consumptionFormWithMode(
	form: AnyRecord,
	mode: 'direct' | 'open_unit',
) {
	return {
		...form,
		mode,
		material: '',
		open_unit: '',
		quantity: '',
	}
}

export function buildStockMovementPayload(
	stockMovementForm: AnyRecord,
	options: {
		requiresSupplier: boolean
		requiresCustomer: boolean
		requiresReservation: boolean
		documentFile?: Blob | null
	},
) {
	const lines = (stockMovementForm.lines ?? [])
		.filter((line: AnyRecord) => line.material && numberValue(line.quantity) > 0)
		.map((line: AnyRecord) => ({
			material: line.material,
			quantity: line.quantity,
			unit_price:
				stockMovementForm.movement_type === 'consumption'
					? line.unit_price || '0'
					: line.unit_price,
		}))

	const payload: AnyRecord = {
		...stockMovementForm,
		supplier: options.requiresSupplier
			? stockMovementForm.supplier || null
			: null,
		customer: options.requiresCustomer
			? stockMovementForm.customer || null
			: null,
		reservation: options.requiresReservation
			? stockMovementForm.reservation || null
			: null,
		document_type: options.requiresSupplier
			? stockMovementForm.document_type || ''
			: '',
		document_number: options.requiresSupplier
			? stockMovementForm.document_number || ''
			: '',
		affects_cash:
			stockMovementForm.movement_type === 'purchase'
				? Boolean(stockMovementForm.affects_cash)
				: stockMovementForm.movement_type === 'sale',
		products_received:
			stockMovementForm.movement_type === 'purchase'
				? Boolean(stockMovementForm.products_received)
				: true,
		payment_method:
			stockMovementForm.payment_method || DEFAULT_PAYMENT_METHOD,
		lines,
	}
	if (options.documentFile) {
		const formData = new FormData()
		Object.entries(payload).forEach(([key, value]) => {
			if (key === 'lines') {
				formData.append('lines', JSON.stringify(value))
			} else if (typeof value === 'boolean') {
				formData.append(key, String(value))
			} else if (value !== undefined && value !== null) {
				formData.append(key, String(value))
			}
		})
		formData.append('document_file', options.documentFile)
		return formData
	}
	return payload
}
