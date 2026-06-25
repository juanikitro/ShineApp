import { type AnyRecord, formatDateLabel, formatDateTimeLabel, money } from '@/lib/page-support'

// Etiquetas en español para las claves tecnicas mas comunes de los registros.
// Si una clave no esta aca, se humaniza el nombre (snake_case -> "Snake case").
const detailFieldLabels: Record<string, string> = {
	name: 'Nombre',
	full_name: 'Nombre',
	phone: 'Telefono',
	email: 'Email',
	notes: 'Notas',
	description: 'Detalle',
	concept: 'Concepto',
	category: 'Categoria',
	subcategory: 'Subcategoria',
	amount: 'Importe',
	signed_amount: 'Importe',
	movement_type: 'Tipo',
	payment_method: 'Metodo de pago',
	occurred_at: 'Fecha',
	created_at: 'Registrado',
	updated_at: 'Actualizado',
	paid_at: 'Pagado el',
	due_date: 'Vence',
	date: 'Fecha',
	status: 'Estado',
	reference_label: 'Referencia',
	counterparty_label: 'Contraparte',
	source_label: 'Origen',
	created_by_username: 'Registrado por',
	license_plate: 'Patente',
	brand: 'Marca',
	model: 'Modelo',
	color: 'Color',
	vehicle_type: 'Tipo de vehiculo',
	customer_name: 'Cliente',
	supplier_name: 'Proveedor',
	creditor_name: 'Acreedor',
	service_name: 'Servicio',
	material_name: 'Material',
	tool_name: 'Herramienta',
	vehicle_label: 'Vehiculo',
	quantity: 'Cantidad',
	unit: 'Unidad',
	unit_label: 'Unidad',
	unit_price: 'Precio unitario',
	unit_cost: 'Costo unitario',
	total: 'Total',
	total_amount: 'Total',
	subtotal: 'Subtotal',
	base_price: 'Precio base',
	balance_due: 'Saldo',
	stock: 'Stock',
	min_stock: 'Stock minimo',
	birthday_label: 'Cumpleanos',
	estimated_duration_minutes: 'Duracion estimada (min)',
	scheduled_at: 'Agendado',
	day: 'Dia',
	exit_day: 'Salida',
	entry_day: 'Ingreso',
	items: 'Items',
	material_overrides: 'Materiales personalizados',
	public_code: 'Codigo',
	valid_until: 'Validez',
	sent_at: 'Enviada',
	reservation_day: 'Dia de reserva',
	start_time: 'Hora de inicio',
}

// Etiquetas legibles para los valores de estado mas comunes (reservas, ordenes,
// deudas, herramientas, cotizaciones). Si el backend ya envia `status_label`,
// se prefiere ese; este mapa es el fallback.
const statusValueLabels: Record<string, string> = {
	pending: 'Pendiente',
	confirmed: 'Confirmada',
	in_progress: 'En proceso',
	ready: 'Listo',
	delivered: 'Entregada',
	completed: 'Completada',
	canceled: 'Cancelada',
	cancelled: 'Cancelada',
	partial: 'En pago',
	paid: 'Pagada',
	overdue: 'Vencida',
	expired: 'Vencida',
	in_use: 'En uso',
	maintenance: 'Mantenimiento',
	retired: 'Retirada',
	draft: 'Borrador',
	sent: 'Enviada',
	accepted: 'Aceptada',
	rejected: 'Rechazada',
	active: 'Activo',
	inactive: 'Inactivo',
}

// Traduce un valor de estado a su etiqueta legible. Si no esta en el mapa,
// devuelve el valor crudo (no inventa traducciones).
export function detailStatusLabel(value: unknown): string {
	const raw = String(value ?? '').trim()
	if (!raw) return 'Sin dato'
	return statusValueLabels[raw.toLowerCase()] ?? raw
}

// Claves que no aportan al detalle legible (ids, banderas internas, redundantes).
// Incluye claves foraneas "crudas" que guardan un id numerico y que ya tienen
// su version legible companion (`customer_name`, `supplier_name`, etc.).
const hiddenDetailFields = new Set<string>([
	'id',
	'business',
	'business_id',
	'slug',
	'source_kind',
	'counterparty_kind',
	'cashflow_effect',
	'economic_effect',
	'signed_amount',
	'icon',
	'service_icon',
	'status_label',
	'sector',
	'customer',
	'supplier',
	'creditor',
	'vehicle',
	'service',
	'material',
	'debt',
	'reservation',
	'work_order',
])

const moneyFieldPattern = /(amount|price|cost|total|subtotal|balance|importe|saldo|paid|due)/i
const dateFieldPattern = /(_at$|_date$|^date$|birthday)/i
const dateTimeFieldPattern = /(_at$|scheduled)/i

export function detailFieldLabel(key: string): string {
	const known = detailFieldLabels[key]
	if (known) return known
	const cleaned = key.replace(/_id$/, '').replaceAll('_', ' ').trim()
	if (!cleaned) return key
	return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function isHiddenDetailField(key: string, value: unknown): boolean {
	if (key.startsWith('_')) return true
	if (hiddenDetailFields.has(key)) return true
	// Claves de clave foranea (numericas) cuando ya existe la version legible.
	if (/_id$/.test(key)) return true
	if (key.endsWith('_url')) return true
	if (value === null || value === undefined || value === '') return true
	return false
}

function isNumericLike(value: unknown): value is number | string {
	if (typeof value === 'number') return Number.isFinite(value)
	if (typeof value === 'string' && value.trim() !== '') {
		return Number.isFinite(Number(value))
	}
	return false
}

export function formatDetailValue(key: string, value: unknown): string {
	if (value === null || value === undefined || value === '') return 'Sin dato'
	if (typeof value === 'boolean') return value ? 'Si' : 'No'
	if (Array.isArray(value)) {
		if (!value.length) return 'Sin items'
		return value.length === 1 ? '1 item' : `${value.length} items`
	}
	if (typeof value === 'object') {
		const named = (value as AnyRecord).name ?? (value as AnyRecord).label
		return named ? String(named) : 'Ver mas'
	}
	if (moneyFieldPattern.test(key) && isNumericLike(value)) {
		return money(value)
	}
	if (dateFieldPattern.test(key)) {
		return dateTimeFieldPattern.test(key) ? formatDateTimeLabel(value) : formatDateLabel(value)
	}
	return String(value)
}

// `status` lleva el valor crudo (ej. "confirmed") para que la UI pueda pintar el
// chip de estado con el color correcto reutilizando las clases `.status`.
export type DetailField = { key: string; label: string; value: string; status?: string }

// Convierte un registro plano en una lista ordenada de campos legibles,
// descartando el ruido tecnico.
export function buildDetailFields(data: AnyRecord): DetailField[] {
	return Object.entries(data)
		.filter(([key, value]) => !isHiddenDetailField(key, value))
		.map(([key, value]) => {
			if (key === 'status') {
				const raw = String(value).trim().toLowerCase()
				return {
					key,
					label: detailFieldLabel(key),
					value: data.status_label ? String(data.status_label) : detailStatusLabel(raw),
					status: raw,
				}
			}
			return {
				key,
				label: detailFieldLabel(key),
				value: formatDetailValue(key, value),
			}
		})
}
