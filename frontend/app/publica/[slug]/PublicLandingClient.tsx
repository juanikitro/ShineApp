'use client'

import {
	Armchair,
	CalendarDays,
	Car,
	CheckCircle2,
	ChevronDown,
	Clock,
	Layers,
	Mail,
	MapPin,
	MessageCircle,
	Phone,
	RotateCcw,
	Send,
	ShieldCheck,
	Sparkles,
	Wrench,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { cx } from '@/app/components/utils'
import { publicApiFetch } from '@/lib/api'
import { mapsUrlIsUsable, whatsappUrl } from '@/lib/contact-links'
import {
	type ApiErrorNotice,
	createValidationNotice,
	formatApiError,
} from '@/lib/api-errors'
import { isPdfAssetSource, safeImageAssetSource } from '@/lib/pdf-preview'
import {
	type AvailabilityOccupied,
	buildTimeSlots,
	todayIsoDate,
} from '@/lib/scheduling-availability'
import { formatDurationLabel } from '@/lib/service-duration'
import { VEHICLE_TYPE_OPTIONS } from '@/lib/service-pricing'

type PublicAvailabilityPayload = {
	date: string
	allow_overlapping: boolean
	capacity_enforced: boolean
	sectors: Array<{
		id: number
		name: string
		key: string
		color: string
		max_slots: number
		used_slots: number
		available_slots: number
	}>
	occupied: AvailabilityOccupied[]
}

type PublicLandingSector = {
	id: number
	name: string
	key: string
	color: string
	order: number
}

type PublicService = {
	id: number
	name: string
	icon?: string
	sector?: number | null
	estimated_duration_minutes?: number | null
	notes?: string
	base_price?: string | number | null
}

// A partir de cuantos caracteres una descripcion se trunca con "Ver mas".
const DESCRIPTION_TRUNCATE_THRESHOLD = 120

type PublicLandingPayload = {
	business: {
		name: string
		slug: string
		logo_url?: string | null
		contact_phone?: string
		contact_email?: string
		address?: string
		maps_url?: string
		intro?: string
		opening_time?: string | null
		closing_time?: string | null
	}
	actions: {
		booking_requests: boolean
		quote_requests: boolean
	}
	display?: {
		show_service_description?: boolean
		show_service_price?: boolean
	}
	sectors?: PublicLandingSector[]
	services: PublicService[]
}

function formatPublicPrice(value: PublicService['base_price']) {
	if (value === null || value === undefined || value === '') return ''
	const numeric = Number(value)
	if (!Number.isFinite(numeric)) return ''
	return numeric.toLocaleString('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0,
	})
}

type PublicRequestForm = {
	customer_name: string
	customer_phone: string
	customer_email: string
	vehicle_license_plate: string
	vehicle_brand: string
	vehicle_model: string
	vehicle_type: string
	preferred_day: string
	preferred_time: string
	message: string
	website: string
	service_ids: string[]
}

type SavedClientData = {
	customer_name: string
	customer_phone: string
	customer_email: string
	vehicle_license_plate: string
	vehicle_brand: string
	vehicle_model: string
	vehicle_type: string
}

const STORAGE_PREFIX = 'shine_client_'

function saveClientData(slug: string, data: SavedClientData) {
	try { localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(data)) } catch {}
}

function loadClientData(slug: string): SavedClientData | null {
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + slug)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		return typeof parsed?.customer_name === 'string' ? (parsed as SavedClientData) : null
	} catch { return null }
}

function clearClientData(slug: string) {
	try { localStorage.removeItem(STORAGE_PREFIX + slug) } catch {}
}

type RecallVehicle = { license_plate: string; brand: string; model: string; vehicle_type: string }
type RecallResult = {
	customer_name: string | null
	customer_phone: string | null
	customer_email: string | null
	vehicles: RecallVehicle[]
}

const blankForm: PublicRequestForm = {
	customer_name: '',
	customer_phone: '',
	customer_email: '',
	vehicle_license_plate: '',
	vehicle_brand: '',
	vehicle_model: '',
	vehicle_type: 'auto',
	preferred_day: '',
	preferred_time: '',
	message: '',
	website: '',
	service_ids: [],
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
	const rawData = atob(base64)
	return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

async function registerPushSubscription(): Promise<object | null> {
	const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
	if (!vapidKey) return null
	if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
	const permission = await Notification.requestPermission()
	if (permission !== 'granted') return null
	const registration = await navigator.serviceWorker.register('/sw.js')
	await navigator.serviceWorker.ready
	const existing = await registration.pushManager.getSubscription()
	if (existing) return existing.toJSON()
	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: urlBase64ToUint8Array(vapidKey),
	})
	return subscription.toJSON()
}

function serviceDurationLabel(service: PublicService) {
	return formatDurationLabel(service.estimated_duration_minutes)
}

function errorNoticeFrom(error: unknown): ApiErrorNotice {
	return formatApiError(error, {
		fallbackTitle: 'No se pudo completar la solicitud',
		fallbackDescription: 'Revisa los datos ingresados e intenta nuevamente.',
	})
}

function localValidationNotice(description: string): ApiErrorNotice {
	return createValidationNotice('Revisa los datos del formulario', description)
}

function PublicFormErrorNotice({ notice }: { notice: ApiErrorNotice }) {
	return (
		<div className="public-form-error" role="alert">
			<strong>{notice.title}</strong>
			{notice.description ? <p>{notice.description}</p> : null}
			{notice.fields.length ? (
				<ul className="alert-fields">
					{notice.fields.map((field, index) => (
						<li key={`${field.path}-${index}`}>
							<strong>{field.label}</strong>
							<span>{field.message}</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}

type ServiceIconComponent = typeof Wrench

const publicServiceIconMap: Record<string, ServiceIconComponent> = {
	combo: Layers,
	polish: Sparkles,
	seat: Armchair,
	shield: ShieldCheck,
}

function PublicServiceIcon({ service }: { service: PublicService }) {
	const Icon = publicServiceIconMap[service.icon?.trim().toLowerCase() ?? '']
	if (Icon) {
		return <Icon aria-hidden="true" size={20} strokeWidth={1.9} />
	}
	const fallback = service.name.trim().charAt(0).toUpperCase() || 'S'
	return <span aria-hidden="true">{fallback}</span>
}

export function PublicLandingClient({ slug }: { slug: string }) {
	const [landing, setLanding] = useState<PublicLandingPayload | null>(null)
	const [form, setForm] = useState<PublicRequestForm>(blankForm)
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [errorNotice, setErrorNotice] = useState<ApiErrorNotice | null>(null)
	const [success, setSuccess] = useState(false)
	const [logoFailed, setLogoFailed] = useState(false)
	const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({})
	const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(
		new Set(),
	)

	const [savedData, setSavedData] = useState<SavedClientData | null>(null)
	const [recallOpen, setRecallOpen] = useState(false)
	const [recallIdentifier, setRecallIdentifier] = useState('')
	const [recalling, setRecalling] = useState(false)
	const [recallFeedback, setRecallFeedback] = useState<
		| { tone: 'ok'; text: string }
		| { tone: 'err'; notice: ApiErrorNotice }
		| null
	>(null)
	const [availability, setAvailability] = useState<PublicAvailabilityPayload | null>(null)
	const [availabilityLoading, setAvailabilityLoading] = useState(false)
	const today = todayIsoDate()

	useEffect(() => {
		let mounted = true
		async function loadLanding() {
			setLoading(true)
			setErrorNotice(null)
			try {
				const payload = await publicApiFetch<PublicLandingPayload>(
					`/public/landing/${encodeURIComponent(slug)}/`,
					{ cache: 'default' },
				)
				if (!mounted) return
				setLanding(payload)
				setLogoFailed(false)
			} catch (err) {
				if (!mounted) return
				setErrorNotice(errorNoticeFrom(err))
			} finally {
				if (mounted) setLoading(false)
			}
		}
		loadLanding()
		return () => {
			mounted = false
		}
	}, [slug])

	useEffect(() => {
		setSavedData(loadClientData(slug))
	}, [slug])

	useEffect(() => {
		const day = form.preferred_day
		if (!day) {
			setAvailability(null)
			setAvailabilityLoading(false)
			return
		}
		if (day < today) {
			setAvailability(null)
			setAvailabilityLoading(false)
			return
		}
		let cancelled = false
		setAvailabilityLoading(true)
		publicApiFetch<PublicAvailabilityPayload>(
			`/public/landing/${encodeURIComponent(slug)}/availability/?date=${encodeURIComponent(day)}`,
			{ cache: 'no-store' },
		)
			.then((payload) => {
				if (cancelled) return
				setAvailability(payload)
			})
			.catch(() => {
				if (cancelled) return
				setAvailability(null)
			})
			.finally(() => {
				if (cancelled) return
				setAvailabilityLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [form.preferred_day, slug, today])

	const servicesBySector = useMemo(() => {
		const groups: Record<number, PublicService[]> = {}
		if (!landing) return groups
		for (const sector of landing.sectors ?? []) groups[sector.id] = []
		for (const service of landing.services) {
			const sectorId = service.sector
			if (sectorId != null && groups[sectorId] !== undefined) {
				groups[sectorId].push(service)
			}
		}
		return groups
	}, [landing])

	const selectedServiceDuration = useMemo(() => {
		if (!landing) return 60
		const byId = new Map<number, PublicService>()
		for (const service of landing.services) byId.set(service.id, service)
		let total = 0
		for (const idString of form.service_ids) {
			const id = Number(idString)
			if (!Number.isFinite(id)) continue
			const service = byId.get(id)
			if (!service) continue
			total += Number(service.estimated_duration_minutes ?? 0) || 0
		}
		return total || 60
	}, [form.service_ids, landing])

	const selectedSectors = useMemo(() => {
		const result: Record<number, number> = {}
		if (!landing) return result
		const byId = new Map<number, PublicService>()
		for (const service of landing.services) byId.set(service.id, service)
		for (const idString of form.service_ids) {
			const id = Number(idString)
			if (!Number.isFinite(id)) continue
			const service = byId.get(id)
			if (!service || service.sector == null) continue
			result[service.sector] = (result[service.sector] ?? 0) + 1
		}
		return result
	}, [form.service_ids, landing])

	const selectedTotal = useMemo(() => {
		if (!landing || landing.display?.show_service_price !== true) return 0
		const byId = new Map<number, PublicService>()
		for (const service of landing.services) byId.set(service.id, service)
		let total = 0
		for (const idString of form.service_ids) {
			const id = Number(idString)
			if (!Number.isFinite(id)) continue
			const service = byId.get(id)
			if (!service) continue
			const price = Number(service.base_price ?? 0)
			if (Number.isFinite(price)) total += price
		}
		return total
	}, [form.service_ids, landing])

	const timeSlots = useMemo(() => {
		if (!form.preferred_day || form.preferred_day < today) return []
		const allowOverlap = availability?.allow_overlapping ?? false
		return buildTimeSlots({
			openingTime: landing?.business.opening_time ?? null,
			closingTime: landing?.business.closing_time ?? null,
			occupied: availability?.occupied ?? [],
			durationMinutes: selectedServiceDuration,
			allowOverlap,
		})
	}, [
		availability,
		form.preferred_day,
		landing,
		selectedServiceDuration,
		today,
	])

	const isPastPreferredDay = Boolean(
		form.preferred_day && form.preferred_day < today,
	)
	const capacityWarning = useMemo(() => {
		if (!availability || !availability.capacity_enforced) return null
		const issues: string[] = []
		const availBySectorId = new Map(availability.sectors.map((s) => [s.id, s]))
		for (const [sectorIdStr, requested] of Object.entries(selectedSectors)) {
			const sectorId = Number(sectorIdStr)
			const bucket = availBySectorId.get(sectorId)
			if (!bucket) continue
			if (bucket.available_slots < requested) {
				issues.push(
					`No hay cupo de ${bucket.name} disponible (${bucket.used_slots}/${bucket.max_slots}).`,
				)
			}
		}
		if (!issues.length && Object.keys(selectedSectors).length === 0) {
			const allFull = availability.sectors.every((s) => s.available_slots === 0)
			if (allFull && availability.sectors.length > 0) {
				const names = availability.sectors.map((s) => s.name).join(' ni de ')
				issues.push(`Este dia ya no tiene cupo de ${names}.`)
			}
		}
		return issues.length ? issues.join(' ') : null
	}, [availability, selectedSectors])
	const blockSubmit = Boolean(capacityWarning) || isPastPreferredDay

	function patchForm(patch: Partial<PublicRequestForm>) {
		setSuccess(false)
		setForm((current) => ({ ...current, ...patch }))
	}

	function toggleService(serviceId: number) {
		const value = String(serviceId)
		setSuccess(false)
		setForm((current) => ({
			...current,
			service_ids: current.service_ids.includes(value)
				? current.service_ids.filter((item) => item !== value)
				: [...current.service_ids, value],
		}))
	}

	function toggleGroup(sectorId: number) {
		setOpenGroups((current) => ({ ...current, [sectorId]: !current[sectorId] }))
	}

	function toggleDescription(serviceId: number) {
		setExpandedDescriptions((current) => {
			const next = new Set(current)
			if (next.has(serviceId)) next.delete(serviceId)
			else next.add(serviceId)
			return next
		})
	}

	function applySavedData() {
		if (!savedData) return
		patchForm({
			customer_name: savedData.customer_name,
			customer_phone: savedData.customer_phone,
			customer_email: savedData.customer_email,
			vehicle_license_plate: savedData.vehicle_license_plate,
			vehicle_brand: savedData.vehicle_brand,
			vehicle_model: savedData.vehicle_model,
			vehicle_type: savedData.vehicle_type,
		})
		setSavedData(null)
	}

	function dismissSavedData() {
		clearClientData(slug)
		setSavedData(null)
	}

	async function recallCustomer() {
		if (!recallIdentifier.trim() || recalling) return
		setRecalling(true)
		setRecallFeedback(null)
		try {
			const data = await publicApiFetch<RecallResult>(
				`/public/landing/${encodeURIComponent(slug)}/recall/`,
				{
					method: 'POST',
					body: JSON.stringify(
						recallIdentifier.includes('@')
							? { email: recallIdentifier.trim() }
							: { phone: recallIdentifier.trim() }
					),
				}
			)
			if (data.customer_name) {
				const vehicle = data.vehicles[0] ?? null
				patchForm({
					customer_name: data.customer_name,
					customer_phone: data.customer_phone ?? '',
					customer_email: data.customer_email ?? '',
					...(vehicle
						? {
								vehicle_license_plate: vehicle.license_plate,
								vehicle_brand: vehicle.brand,
								vehicle_model: vehicle.model,
								vehicle_type: vehicle.vehicle_type,
							}
						: {}),
				})
				saveClientData(slug, {
					customer_name: data.customer_name,
					customer_phone: data.customer_phone ?? '',
					customer_email: data.customer_email ?? '',
					vehicle_license_plate: vehicle?.license_plate ?? '',
					vehicle_brand: vehicle?.brand ?? '',
					vehicle_model: vehicle?.model ?? '',
					vehicle_type: vehicle?.vehicle_type ?? 'auto',
				})
				setRecallOpen(false)
				setRecallIdentifier('')
				setRecallFeedback({ tone: 'ok', text: 'Datos autocompletados.' })
			} else {
				setRecallFeedback({
					tone: 'err',
					notice: localValidationNotice(
						'No encontramos un cliente con ese dato.',
					),
				})
			}
		} catch (err) {
			setRecallFeedback({ tone: 'err', notice: errorNoticeFrom(err) })
		} finally {
			setRecalling(false)
		}
	}

	async function submitRequest(event: FormEvent) {
		event.preventDefault()
		if (!landing || submitting) return
		const hasCustomerName = Boolean(form.customer_name.trim())
		const hasContact = Boolean(
			form.customer_phone.trim() || form.customer_email.trim(),
		)
		if (!hasCustomerName) {
			setErrorNotice(localValidationNotice('Ingresa tu nombre.'))
			setSuccess(false)
			return
		}
		if (!hasContact) {
			setErrorNotice(
				localValidationNotice('Deja un celular o un email de contacto.'),
			)
			setSuccess(false)
			return
		}
		if (!form.service_ids.length) {
			setErrorNotice(
				localValidationNotice('Selecciona al menos un servicio.'),
			)
			setSuccess(false)
			return
		}
		const requestType = form.preferred_day ? 'booking' : 'quote'
		if (requestType === 'booking' && !landing.actions.booking_requests) {
			setErrorNotice(
				localValidationNotice('El negocio no acepta solicitudes de reserva.'),
			)
			setSuccess(false)
			return
		}
		if (requestType === 'quote' && !landing.actions.quote_requests) {
			setErrorNotice(
				localValidationNotice('Carga una fecha para solicitar una reserva.'),
			)
			setSuccess(false)
			return
		}
		if (isPastPreferredDay) {
			setErrorNotice(
				localValidationNotice('La fecha elegida ya paso. Selecciona una fecha igual o posterior a hoy.'),
			)
			setSuccess(false)
			return
		}
		if (capacityWarning) {
			setErrorNotice(localValidationNotice(capacityWarning))
			setSuccess(false)
			return
		}
		if (requestType === 'booking' && form.preferred_time) {
			const opening = landing.business.opening_time ?? null
			const closing = landing.business.closing_time ?? null
			const time = form.preferred_time
			if (opening && closing) {
				const overnight = closing <= opening
				const inRange = overnight
					? time >= opening || time <= closing
					: time >= opening && time <= closing
				if (!inRange) {
					setErrorNotice(
						localValidationNotice(
							overnight
								? 'El horario solicitado esta fuera del horario de atencion.'
								: time < opening
									? 'El horario solicitado es antes del horario de apertura.'
									: 'El horario solicitado es despues del horario de cierre.',
						),
					)
					setSuccess(false)
					return
				}
			} else if (opening && time < opening) {
				setErrorNotice(
					localValidationNotice('El horario solicitado es antes del horario de apertura.'),
				)
				setSuccess(false)
				return
			} else if (closing && time > closing) {
				setErrorNotice(
					localValidationNotice('El horario solicitado es despues del horario de cierre.'),
				)
				setSuccess(false)
				return
			}
		}
		setSubmitting(true)
		setErrorNotice(null)
		setSuccess(false)
		let pushSubscription: object | null = null
		try {
			pushSubscription = await registerPushSubscription()
		} catch (_) {}
		try {
			await publicApiFetch(`/public/landing/${encodeURIComponent(slug)}/requests/`, {
				method: 'POST',
				body: JSON.stringify({
					...form,
					request_type: requestType,
					service_ids: form.service_ids.map(Number),
					push_subscription: pushSubscription,
				}),
			})
			saveClientData(slug, {
				customer_name: form.customer_name,
				customer_phone: form.customer_phone,
				customer_email: form.customer_email,
				vehicle_license_plate: form.vehicle_license_plate,
				vehicle_brand: form.vehicle_brand,
				vehicle_model: form.vehicle_model,
				vehicle_type: form.vehicle_type,
			})
			setSuccess(true)
			setForm(blankForm)
		} catch (err) {
			setErrorNotice(errorNoticeFrom(err))
		} finally {
			setSubmitting(false)
		}
	}

	if (loading) {
		return (
			<main className="public-landing">
				<div className="public-state">Cargando negocio...</div>
			</main>
		)
	}

	if (!landing) {
		const fallbackTitle = 'La pagina publica no esta disponible.'
		const fallbackText = errorNotice
			? [errorNotice.title, errorNotice.description].filter(Boolean).join(' - ')
			: fallbackTitle
		return (
			<main className="public-landing">
				<div className="public-state public-state--error">
					{fallbackText || fallbackTitle}
				</div>
			</main>
		)
	}

	const business = landing.business
	// El logo puede ser un PDF (el backend lo permite); en ese caso se cae a la inicial.
	const brandLogoSrc =
		logoFailed || isPdfAssetSource(business.logo_url)
			? null
			: safeImageAssetSource(business.logo_url)
	const isOvernightHours = Boolean(
		business.opening_time &&
			business.closing_time &&
			business.closing_time <= business.opening_time,
	)
	const hoursLabel =
		business.opening_time && business.closing_time
			? isOvernightHours
				? business.closing_time === '00:00'
					? `${business.opening_time} – ${business.closing_time} (cierra a medianoche)`
					: `${business.opening_time} – ${business.closing_time} (cierra al dia siguiente)`
				: `${business.opening_time} – ${business.closing_time}`
			: business.opening_time
				? `Desde ${business.opening_time}`
				: business.closing_time
					? `Hasta ${business.closing_time}`
					: null

	const phoneWhatsappUrl = whatsappUrl(business.contact_phone)
	const addressMapsUrl =
		business.maps_url && mapsUrlIsUsable(business.maps_url)
			? business.maps_url
			: null
	const contact = [
		business.contact_phone
			? {
					icon: MessageCircle,
					label: business.contact_phone,
					href: phoneWhatsappUrl ?? undefined,
				}
			: null,
		business.contact_email ? { icon: Mail, label: business.contact_email } : null,
		business.address
			? {
					icon: MapPin,
					label: business.address,
					href: addressMapsUrl ?? undefined,
				}
			: null,
		hoursLabel ? { icon: Clock, label: hoursLabel } : null,
	].filter(Boolean) as Array<{
		icon: typeof Phone
		label: string
		href?: string
	}>

	return (
		<div className="public-root">
			{/* ── Header ─────────────────────────────────────────────── */}
			<header className="public-header">
				<div className="public-header-inner">
					<div className="public-header-brand">
						<div className="public-brand-mark">
							{brandLogoSrc ? (
								<img
									src={brandLogoSrc}
									alt=""
									onError={() => setLogoFailed(true)}
								/>
							) : (
								<span>{business.name.slice(0, 1).toUpperCase()}</span>
							)}
						</div>
						<span className="public-header-name">{business.name}</span>
					</div>
					<div className="public-header-actions">
						{savedData && !success ? (
							<button
								type="button"
								className="public-btn-ghost"
								onClick={applySavedData}
							>
								<RotateCcw size={15} aria-hidden="true" />
								Reusar datos del último turno
							</button>
						) : null}
						{!recallOpen ? (
							<button
								type="button"
								className="public-btn-primary"
								onClick={() => {
									setRecallOpen(true)
									setRecallFeedback(null)
								}}
							>
								Ya soy cliente
							</button>
						) : null}
					</div>
				</div>
			</header>

			{/* ── Main ───────────────────────────────────────────────── */}
			<main className="public-main">
				<div className="public-hero">
					<h1>Reserva tu Turno</h1>
					<p>
						{business.intro ||
							`Mantenemos tu vehículo como nuevo con la precisión de ${business.name}.`}
					</p>
				</div>

				<div className="public-body">
					{/* LEFT – form */}
					<form className="public-form-col" onSubmit={submitRequest}>
						<input
							className="public-honeypot"
							tabIndex={-1}
							autoComplete="off"
							value={form.website}
							onChange={(e) => patchForm({ website: e.target.value })}
						/>

						{/* recall inline */}
						{recallOpen ? (
							<div className="public-card">
								<div className="public-card-head">
									<RotateCcw size={18} aria-hidden="true" />
									<h2>Ya soy cliente</h2>
								</div>
								<div className="public-recall-lookup">
									<label>
										Teléfono o email para buscar
										<div className="public-recall-lookup-row">
											<input
												autoFocus
												value={recallIdentifier}
												placeholder="1164321234 o usuario@email.com"
												onChange={(e) => setRecallIdentifier(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === 'Enter') {
														e.preventDefault()
														recallCustomer()
													}
												}}
											/>
											<button
												type="button"
												disabled={recalling}
												onClick={recallCustomer}
											>
												{recalling ? 'Buscando...' : 'Buscar'}
											</button>
										</div>
									</label>
									{recallFeedback ? (
										recallFeedback.tone === 'ok' ? (
											<div className="public-form-success">
												<CheckCircle2 size={16} aria-hidden="true" />
												{recallFeedback.text}
											</div>
										) : (
											<PublicFormErrorNotice notice={recallFeedback.notice} />
										)
									) : null}
									<button
										type="button"
										className="public-recall-trigger"
										onClick={() => {
											setRecallOpen(false)
											setRecallIdentifier('')
											setRecallFeedback(null)
										}}
									>
										Cancelar
									</button>
								</div>
							</div>
						) : null}

						{recallFeedback && !recallOpen ? (
							recallFeedback.tone === 'ok' ? (
								<div className="public-form-success">
									<CheckCircle2 size={16} aria-hidden="true" />
									{recallFeedback.text}
								</div>
							) : (
								<PublicFormErrorNotice notice={recallFeedback.notice} />
							)
						) : null}

						{/* Datos del Turno */}
						<div className="public-card">
							<div className="public-card-head">
								<CalendarDays size={18} aria-hidden="true" />
								<h2>Datos del Turno</h2>
							</div>
							<label>
								Nombre
								<input
									required
									autoComplete="name"
									value={form.customer_name}
									onChange={(e) => patchForm({ customer_name: e.target.value })}
								/>
							</label>
							<div className="public-form-row">
								<label>
									Celular
									<input
										inputMode="tel"
										autoComplete="tel"
										value={form.customer_phone}
										onChange={(e) => patchForm({ customer_phone: e.target.value })}
									/>
								</label>
								<label>
									Email
									<input
										type="email"
										autoComplete="email"
										value={form.customer_email}
										onChange={(e) => patchForm({ customer_email: e.target.value })}
									/>
								</label>
							</div>
							<div className="public-form-row">
								<label>
									Fecha preferida
									<input
										type="date"
										min={today}
										value={form.preferred_day}
										onChange={(e) =>
											patchForm({
												preferred_day: e.target.value,
												preferred_time: e.target.value ? form.preferred_time : '',
											})
										}
									/>
								</label>
								<label>
									Hora preferida
									<select
										disabled={!form.preferred_day || isPastPreferredDay}
										value={form.preferred_time}
										onChange={(e) => patchForm({ preferred_time: e.target.value })}
									>
										<option value="">--</option>
										{timeSlots.map((slot) => (
											<option
												key={slot.value}
												value={slot.value}
												disabled={slot.disabled}
											>
												{slot.label}
												{slot.disabled && slot.disabledReason
													? ` (${slot.disabledReason})`
													: ''}
											</option>
										))}
									</select>
								</label>
							</div>
							{isPastPreferredDay ? (
								<div className="public-form-error">
									La fecha elegida ya paso. Selecciona una fecha igual o posterior a
									hoy.
								</div>
							) : null}
							{availabilityLoading && !isPastPreferredDay ? (
								<div className="public-availability-note">
									Verificando disponibilidad...
								</div>
							) : null}
							{!availabilityLoading && availability && !isPastPreferredDay ? (
								<div
									className={
										capacityWarning
											? 'public-form-error'
											: 'public-availability-note'
									}
								>
									{capacityWarning ??
										(availability.capacity_enforced ? (
											<>
												{availability.sectors.map((s, i) => (
													<span key={s.id}>
														{i > 0 ? ' · ' : ''}
														{s.name}: {s.used_slots}/{s.max_slots}
													</span>
												))}
											</>
										) : (
											'Sin límite de cupos'
										))}
								</div>
							) : null}
						</div>

						{/* Datos del Vehículo */}
						<div className="public-card">
							<div className="public-card-head">
								<Car size={18} aria-hidden="true" />
								<h2>Datos del Vehículo</h2>
							</div>
							<div className="public-form-row">
								<label>
									Patente
									<input
										value={form.vehicle_license_plate}
										onChange={(e) =>
											patchForm({ vehicle_license_plate: e.target.value })
										}
									/>
								</label>
								<label>
									Tipo de vehículo
									<select
										value={form.vehicle_type}
										onChange={(e) => patchForm({ vehicle_type: e.target.value })}
									>
										{VEHICLE_TYPE_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</label>
							</div>
							<div className="public-form-row">
								<label>
									Marca
									<input
										value={form.vehicle_brand}
										placeholder="Ej: Toyota"
										onChange={(e) => patchForm({ vehicle_brand: e.target.value })}
									/>
								</label>
								<label>
									Modelo
									<input
										value={form.vehicle_model}
										placeholder="Ej: Corolla"
										onChange={(e) => patchForm({ vehicle_model: e.target.value })}
									/>
								</label>
							</div>
							<label>
								Mensaje o aclaraciones
								<textarea
									rows={3}
									value={form.message}
									placeholder="Alguna especificación sobre el estado del vehículo..."
									onChange={(e) => patchForm({ message: e.target.value })}
								/>
							</label>
						</div>

						{/* Resumen + enviar */}
						<div className="public-card public-summary">
							<div className="public-summary-header">Resumen de solicitud</div>
							<div className="public-summary-row">
								<span>
									Turno para:{' '}
									<strong>{form.customer_name || 'Pendiente'}</strong>
								</span>
								<span className="public-summary-total">
									{selectedTotal > 0 ? formatPublicPrice(selectedTotal) : '$0'}
								</span>
							</div>
							{errorNotice ? (
								<PublicFormErrorNotice notice={errorNotice} />
							) : null}
							{success ? (
								<div className="public-form-success">
									<CheckCircle2 size={18} aria-hidden="true" />
									Solicitud enviada.
								</div>
							) : null}
							<button
								type="submit"
								className="public-btn-submit"
								disabled={submitting || blockSubmit}
							>
								<Send size={16} aria-hidden="true" />
								{submitting ? 'Enviando...' : 'Enviar solicitud'}
							</button>
							<p className="public-summary-note">
								* Al enviar, estás solicitando una cotización/reserva sujeta a
								disponibilidad.
							</p>
						</div>
					</form>

					{/* RIGHT – services */}
					<div className="public-services-col">
						<div className="public-card public-services">
							<div className="public-card-head">
								<Layers size={18} aria-hidden="true" />
								<h2>Selección de Servicios</h2>
							</div>

							{(landing.sectors ?? []).map((sector) => {
								const items = servicesBySector[sector.id] ?? []
								if (!items.length) return null
								const open = openGroups[sector.id] ?? false
								const selectedCount = items.reduce(
									(c, s) =>
										form.service_ids.includes(String(s.id)) ? c + 1 : c,
									0,
								)
								return (
									<div className="public-service-group" key={sector.id}>
										<button
											type="button"
											className="public-service-group-toggle"
											aria-expanded={open}
											onClick={() => toggleGroup(sector.id)}
										>
											<span className="public-service-group-title">
												{sector.name}
											</span>
											{!open && selectedCount > 0 ? (
												<span className="public-service-group-count">
													{selectedCount}
												</span>
											) : null}
											<ChevronDown
												size={18}
												aria-hidden="true"
												className={cx(
													'public-service-group-chevron',
													open && 'public-service-group-chevron--open',
												)}
											/>
										</button>
										{open ? (
											<div className="public-service-grid">
												{items.map((service) => {
													const selected = form.service_ids.includes(
														String(service.id),
													)
													const showDescription =
														landing.display?.show_service_description !== false
													const showPrice =
														landing.display?.show_service_price === true
													const priceLabel = showPrice
														? formatPublicPrice(service.base_price)
														: ''
													const description =
														showDescription && service.notes
															? service.notes
															: ''
													const expandable =
														description.length > DESCRIPTION_TRUNCATE_THRESHOLD
													const expanded = expandedDescriptions.has(service.id)
													return (
														<div
															key={service.id}
															className="public-svc-card"
															data-selected={selected ? 'true' : 'false'}
														>
															{priceLabel ? (
																<span className="public-svc-price">
																	{priceLabel}
																</span>
															) : null}
															<span className="public-svc-icon">
																<PublicServiceIcon service={service} />
															</span>
															<strong className="public-svc-name">
																{service.name}
															</strong>
															{serviceDurationLabel(service) ? (
																<em className="public-svc-duration">
																	<Clock size={13} aria-hidden="true" />
																	{serviceDurationLabel(service)}
																</em>
															) : null}
															{description ? (
																<div className="public-service-desc">
																	<small
																		data-clamped={
																			expandable && !expanded ? 'true' : 'false'
																		}
																	>
																		{description}
																	</small>
																	{expandable ? (
																		<button
																			type="button"
																			className="public-service-desc-toggle"
																			aria-expanded={expanded}
																			onClick={() =>
																				toggleDescription(service.id)
																			}
																		>
																			{expanded ? 'Ver menos' : 'Ver mas'}
																		</button>
																	) : null}
																</div>
															) : null}
															<button
																type="button"
																className={
																	selected
																		? 'public-btn-svc-remove'
																		: 'public-btn-svc-add'
																}
																aria-pressed={selected}
																aria-label={`${selected ? 'Quitar' : 'Agregar'} ${service.name}`}
																onClick={() => toggleService(service.id)}
															>
																{selected ? (
																	<CheckCircle2
																		size={15}
																		aria-hidden="true"
																	/>
																) : null}
																{selected ? 'Quitar' : 'Agregar'}
															</button>
														</div>
													)
												})}
											</div>
										) : null}
									</div>
								)
							})}
						</div>
					</div>
				</div>
			</main>

			{/* ── Footer ─────────────────────────────────────────────── */}
			<footer className="public-footer">
				<div className="public-footer-inner">
					<div className="public-footer-brand">
						<strong>{business.name}</strong>
						<small>
							© {new Date().getFullYear()} {business.name}. Todos los derechos
							reservados.
						</small>
					</div>
					{contact.length > 0 ? (
						<div className="public-footer-sections">
							<div className="public-footer-section">
								<span className="public-footer-section-title">Contacto</span>
								{contact.map((item) => {
									const Icon = item.icon
									return item.href ? (
										<a
											key={item.label}
											href={item.href}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Icon size={14} aria-hidden="true" />
											{item.label}
										</a>
									) : (
										<span key={item.label}>
											<Icon size={14} aria-hidden="true" />
											{item.label}
										</span>
									)
								})}
							</div>
						</div>
					) : null}
				</div>
			</footer>
		</div>
	)
}
