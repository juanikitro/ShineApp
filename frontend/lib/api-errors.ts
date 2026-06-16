export type ApiErrorField = {
	path: string
	label: string
	message: string
}

export type ApiErrorNotice = {
	title: string
	description: string
	fields: ApiErrorField[]
}

type NormalizeOptions = {
	status?: number
	fallbackTitle?: string
	fallbackDescription?: string
}

type ApiResponseErrorOptions = {
	status?: number
	payload?: unknown
	requestId?: string
}

const GENERIC_TITLE = 'No se pudo completar la accion'
const GENERIC_DESCRIPTION =
	'Intenta nuevamente. Si el problema continua, revisa los datos cargados.'
const FIELD_ERROR_TITLE = 'Revisa los datos ingresados'
const FIELD_ERROR_DESCRIPTION =
	'Hay campos que necesitan correccion antes de guardar.'

const FIELD_LABELS: Record<string, string> = {
	amount: 'Importe',
	base_price: 'Precio base',
	business_industry: 'Rubro',
	business_name: 'Negocio',
	category: 'Categoria',
	city: 'Ciudad',
	color: 'Color',
	consumed_at: 'Fecha',
	country: 'Pais',
	customer: 'Cliente',
	customer_email: 'Email',
	customer_name: 'Nombre',
	customer_phone: 'Telefono',
	day: 'Fecha',
	debt: 'Deuda',
	description: 'Descripcion',
	due_date: 'Vencimiento',
	email: 'Email',
	estimated_delivery_at: 'Entrega estimada',
	estimated_duration_minutes: 'Duracion estimada',
	estimated_unit_cost: 'Costo unitario estimado',
	exit_day: 'Fecha de salida',
	exit_time: 'Hora de egreso',
	items: 'Servicios',
	industry: 'Rubro',
	license_plate: 'Patente',
	material: 'Material',
	message: 'Mensaje',
	method: 'Metodo de pago',
	name: 'Nombre',
	new_password: 'Nueva clave',
	non_field_errors: 'General',
	observations: 'Observaciones',
	opened_by_work_order: 'Trabajo de apertura',
	paid_at: 'Fecha de pago',
	password: 'Clave',
	payment_type: 'Tipo de pago',
	phone: 'Telefono',
	owner_name: 'Responsable',
	preferred_day: 'Fecha preferida',
	preferred_time: 'Hora preferida',
	principal_amount: 'Importe principal',
	purchased_at: 'Fecha de compra',
	quantity: 'Cantidad',
	reservation_day: 'Fecha de reserva',
	reservation_start_time: 'Hora de reserva',
	service: 'Servicio',
	service_ids: 'Servicios',
	service_type: 'Tipo de servicio',
	start_time: 'Hora de ingreso',
	stock_quantity: 'Stock',
	stock_quantity_to_decrement: 'Cantidad al cerrar',
	token: 'Link de recuperacion',
	total_cost: 'Costo total',
	unit: 'Unidad',
	unit_price: 'Precio unitario',
	username: 'Usuario',
	vehicle: 'Vehiculo',
	vehicle_brand: 'Marca',
	vehicle_license_plate: 'Patente',
	vehicle_model: 'Modelo',
	vehicle_type: 'Tipo de vehiculo',
	work_order: 'Trabajo',
}

export class ApiResponseError extends Error {
	status?: number
	payload?: unknown
	requestId?: string
	notice: ApiErrorNotice

	constructor(notice: ApiErrorNotice, options: ApiResponseErrorOptions = {}) {
		super(notice.description)
		this.name = 'ApiResponseError'
		this.notice = notice
		this.status = options.status
		this.payload = options.payload
		this.requestId = options.requestId
	}
}

export function createValidationNotice(
	title: string,
	description: string,
	fields: ApiErrorField[] = [],
): ApiErrorNotice {
	return { title, description, fields }
}

export function normalizeApiErrorPayload(
	payload: unknown,
	options: NormalizeOptions = {},
): ApiErrorNotice {
	const parsedPayload = parsePossibleJson(payload)
	const fields = collectFieldErrors(parsedPayload)
	const detail = detailMessage(parsedPayload)
	const statusNotice = noticeForStatus(options.status)

	if (fields.length) {
		return {
			title: options.fallbackTitle ?? FIELD_ERROR_TITLE,
			description: options.fallbackDescription ?? FIELD_ERROR_DESCRIPTION,
			fields,
		}
	}

	if (detail) {
		return {
			title: options.fallbackTitle ?? statusNotice.title ?? GENERIC_TITLE,
			description: normalizeDetailForStatus(detail, options.status),
			fields: [],
		}
	}

	return {
		title: options.fallbackTitle ?? statusNotice.title ?? GENERIC_TITLE,
		description:
			options.fallbackDescription ??
			statusNotice.description ??
			GENERIC_DESCRIPTION,
		fields: [],
	}
}

export function formatApiError(
	error: unknown,
	options: NormalizeOptions = {},
): ApiErrorNotice {
	if (error instanceof ApiResponseError) {
		return error.notice
	}

	if (hasNotice(error)) {
		return error.notice
	}

	if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
		return {
			title: options.fallbackTitle ?? 'No pudimos conectar con el servidor',
			description:
				options.fallbackDescription ??
				'Revisa la conexion o intenta nuevamente en unos segundos.',
			fields: [],
		}
	}

	if (error instanceof Error) {
		return normalizeApiErrorPayload(error.message, options)
	}

	return normalizeApiErrorPayload(error, options)
}

function hasNotice(value: unknown): value is { notice: ApiErrorNotice } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'notice' in value &&
		isNotice((value as { notice?: unknown }).notice)
	)
}

function isNotice(value: unknown): value is ApiErrorNotice {
	return (
		typeof value === 'object' &&
		value !== null &&
		'title' in value &&
		'description' in value &&
		'fields' in value
	)
}

function noticeForStatus(status?: number) {
	if (status === 401) {
		return {
			title: 'Sesion no valida',
			description: 'Volve a iniciar sesion para continuar.',
		}
	}
	if (status === 403) {
		return {
			title: 'Acceso no permitido',
			description: 'No tenes permisos para realizar esta accion.',
		}
	}
	if (status === 404) {
		return {
			title: 'Registro no encontrado',
			description: 'El registro solicitado ya no esta disponible.',
		}
	}
	if (status && status >= 500) {
		return {
			title: 'Problema del servidor',
			description:
				'El servidor no pudo completar la operacion. Intenta nuevamente.',
		}
	}
	return {}
}

function normalizeDetailForStatus(message: string, status?: number) {
	const clean = sanitizeMessage(message)
	const lower = clean.toLowerCase()

	if (
		status === 401 &&
		/(authentication|credentials|not authenticated|token)/i.test(clean)
	) {
		return 'Volve a iniciar sesion para continuar.'
	}
	if (status === 403 && /(permission|forbidden|denied)/i.test(clean)) {
		return 'No tenes permisos para realizar esta accion.'
	}
	if (status === 404 && /(not found|no encontrado)/i.test(clean)) {
		return 'El registro solicitado ya no esta disponible.'
	}
	if (lower.includes('<html') || lower.includes('<!doctype')) {
		return GENERIC_DESCRIPTION
	}

	return clean || GENERIC_DESCRIPTION
}

function detailMessage(payload: unknown): string {
	const value = parsePossibleJson(payload)

	if (typeof value === 'string') {
		return sanitizeMessage(value)
	}

	if (Array.isArray(value)) {
		return value
			.map((item) => (typeof item === 'string' ? sanitizeMessage(item) : ''))
			.filter(Boolean)
			.join(' ')
	}

	if (isPlainObject(value) && 'detail' in value) {
		const detail = value.detail
		if (typeof detail === 'string') return sanitizeMessage(detail)
		if (Array.isArray(detail)) {
			return detail
				.map((item) =>
					typeof item === 'string' ? sanitizeMessage(item) : '',
				)
				.filter(Boolean)
				.join(' ')
		}
	}

	return ''
}

function collectFieldErrors(payload: unknown): ApiErrorField[] {
	const value = parsePossibleJson(payload)
	if (!isPlainObject(value)) return []

	const fields: ApiErrorField[] = []
	walkErrorObject(value, '', fields)
	return fields
}

function walkErrorObject(
	value: unknown,
	path: string,
	fields: ApiErrorField[],
) {
	if (Array.isArray(value)) {
		if (value.every((item) => typeof item === 'string')) {
			if (path) {
				for (const item of value) {
					fields.push({
						path,
						label: labelForPath(path),
						message: sanitizeMessage(item),
					})
				}
			}
			return
		}

		value.forEach((item, index) => {
			const itemPath = path ? `${path}[${index + 1}]` : `[${index + 1}]`
			walkErrorObject(item, itemPath, fields)
		})
		return
	}

	if (!isPlainObject(value)) {
		if (path && typeof value === 'string') {
			fields.push({
				path,
				label: labelForPath(path),
				message: sanitizeMessage(value),
			})
		}
		return
	}

	Object.entries(value).forEach(([key, nested]) => {
		if (key === 'detail') return
		const nextPath = path ? `${path}.${key}` : key
		walkErrorObject(nested, nextPath, fields)
	})
}

function labelForPath(path: string) {
	return path
		.split('.')
		.map((part) => {
			const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
			if (arrayMatch) {
				return `${fieldLabel(arrayMatch[1])} ${arrayMatch[2]}`
			}
			const rootArrayMatch = part.match(/^\[(\d+)\]$/)
			if (rootArrayMatch) {
				return `Item ${rootArrayMatch[1]}`
			}
			return fieldLabel(part)
		})
		.join(' - ')
}

function fieldLabel(key: string) {
	if (FIELD_LABELS[key]) return FIELD_LABELS[key]
	return key
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (character) => character.toUpperCase())
}

function parsePossibleJson(value: unknown): unknown {
	if (typeof value !== 'string') return value
	const trimmed = value.trim()
	if (!trimmed) return ''
	if (!['{', '['].includes(trimmed[0])) return value
	try {
		return JSON.parse(trimmed)
	} catch {
		return value
	}
}

function sanitizeMessage(value: string) {
	return value.replace(/\s+/g, ' ').trim()
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
