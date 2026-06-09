'use client'

import {
	Armchair,
	CheckCircle2,
	ChevronDown,
	Clock,
	FileText,
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
import { isPdfAssetSource, renderPdfPreviewDataUrl, safeImageAssetSource } from '@/lib/pdf-preview'
import {
	type AvailabilityBucket,
	type AvailabilityOccupied,
	buildTimeSlots,
	todayIsoDate,
} from '@/lib/scheduling-availability'
import { formatDurationLabel } from '@/lib/service-duration'
import { VEHICLE_TYPE_OPTIONS } from '@/lib/service-pricing'

type PublicAvailabilityPayload = {
	date: string
	allow_overlapping: boolean
	wash: AvailabilityBucket
	detailing: AvailabilityBucket
	occupied: AvailabilityOccupied[]
}

type PublicService = {
	id: number
	name: string
	icon?: string
	service_type?: string
	estimated_duration_minutes?: number | null
	notes?: string
	base_price?: string | number | null
}

type ServiceGroupKey = 'wash' | 'combo' | 'detailing'

const serviceGroupOrder: ServiceGroupKey[] = ['wash', 'combo', 'detailing']

// A partir de cuantos caracteres una descripcion se trunca con "Ver mas".
const DESCRIPTION_TRUNCATE_THRESHOLD = 120

const serviceGroupLabels: Record<ServiceGroupKey, string> = {
	wash: 'Lavadero',
	combo: 'Combos',
	detailing: 'Detailing',
}

function groupKeyForService(service: PublicService): ServiceGroupKey {
	const type = String(service.service_type ?? '').toLowerCase()
	if (type === 'wash' || type === 'combo' || type === 'detailing') return type
	return 'wash'
}

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
		return <Icon aria-hidden="true" size={22} strokeWidth={1.9} />
	}
	const fallback = service.name.trim().charAt(0).toUpperCase() || 'S'
	return <span aria-hidden="true">{fallback}</span>
}

function usePdfPreview(source: string | null, enabled: boolean, maxWidth: number) {
	const [thumbnail, setThumbnail] = useState<string | null>(null)
	const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
		'idle',
	)

	useEffect(() => {
		if (!enabled || !source) {
			setThumbnail(null)
			setStatus('idle')
			return
		}

		const abortController = new AbortController()
		setThumbnail(null)
		setStatus('loading')

		renderPdfPreviewDataUrl(source, {
			maxWidth,
			signal: abortController.signal,
		})
			.then((nextThumbnail) => {
				if (abortController.signal.aborted) return
				setThumbnail(nextThumbnail)
				setStatus('ready')
			})
			.catch(() => {
				if (abortController.signal.aborted) return
				setThumbnail(null)
				setStatus('error')
			})

		return () => {
			abortController.abort()
		}
	}, [enabled, maxWidth, source])

	return { thumbnail, status }
}

export function PublicLandingClient({ slug }: { slug: string }) {
	const [landing, setLanding] = useState<PublicLandingPayload | null>(null)
	const [form, setForm] = useState<PublicRequestForm>(blankForm)
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [errorNotice, setErrorNotice] = useState<ApiErrorNotice | null>(null)
	const [success, setSuccess] = useState(false)
	const [logoLoadFailed, setLogoLoadFailed] = useState(false)
	const [openGroups, setOpenGroups] = useState<Record<ServiceGroupKey, boolean>>(
		{ wash: false, combo: false, detailing: false },
	)
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

	const logoSource = landing?.business.logo_url ?? null
	const logoIsPdf = isPdfAssetSource(logoSource)
	const { thumbnail: logoPdfThumbnail, status: logoPdfStatus } = usePdfPreview(
		logoSource,
		logoIsPdf,
		960,
	)
	const businessImageSource = logoIsPdf ? logoPdfThumbnail : safeImageAssetSource(logoSource)
	const canShowBusinessImage = Boolean(businessImageSource && !logoLoadFailed)

	useEffect(() => {
		setLogoLoadFailed(false)
	}, [logoPdfThumbnail, logoSource])

	const servicesByGroup = useMemo(() => {
		const groups: Record<ServiceGroupKey, PublicService[]> = {
			wash: [],
			combo: [],
			detailing: [],
		}
		if (!landing) return groups
		for (const service of landing.services) {
			groups[groupKeyForService(service)].push(service)
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

	const selectedBuckets = useMemo(() => {
		const result = { wash: 0, detailing: 0 }
		if (!landing) return result
		const byId = new Map<number, PublicService>()
		for (const service of landing.services) byId.set(service.id, service)
		for (const idString of form.service_ids) {
			const id = Number(idString)
			if (!Number.isFinite(id)) continue
			const service = byId.get(id)
			if (!service) continue
			const type = String(service.service_type ?? '').toLowerCase()
			if (type === 'detailing') result.detailing += 1
			else result.wash += 1
		}
		return result
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
		if (!availability) return null
		const issues: string[] = []
		if (
			selectedBuckets.wash > 0 &&
			availability.wash.available_slots < selectedBuckets.wash
		) {
			issues.push(
				`No hay cupo de lavado disponible (${availability.wash.used_slots}/${availability.wash.max_slots}).`,
			)
		}
		if (
			selectedBuckets.detailing > 0 &&
			availability.detailing.available_slots < selectedBuckets.detailing
		) {
			issues.push(
				`No hay cupo de detailing disponible (${availability.detailing.used_slots}/${availability.detailing.max_slots}).`,
			)
		}
		if (
			!issues.length &&
			selectedBuckets.wash === 0 &&
			selectedBuckets.detailing === 0 &&
			availability.wash.available_slots === 0 &&
			availability.detailing.available_slots === 0
		) {
			issues.push('Este dia ya no tiene cupo de lavado ni de detailing.')
		}
		return issues.length ? issues.join(' ') : null
	}, [availability, selectedBuckets])
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

	function toggleGroup(group: ServiceGroupKey) {
		setOpenGroups((current) => ({ ...current, [group]: !current[group] }))
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
		<main className="public-landing">
			<section className="public-landing-shell">
				<div className="public-business">
					{business.logo_url ? (
						<div
							className="public-business-media"
							data-empty={canShowBusinessImage ? 'false' : 'true'}
						>
							{canShowBusinessImage ? (
								<img
									src={businessImageSource ?? ''}
									alt={`Imagen de ${business.name}`}
									onError={() => setLogoLoadFailed(true)}
								/>
							) : (
								<div className="public-business-media-placeholder">
									<FileText size={34} />
									<span>
										{logoIsPdf && logoPdfStatus === 'loading'
											? 'Preparando imagen...'
											: 'No se pudo mostrar la imagen del negocio.'}
									</span>
								</div>
							)}
						</div>
					) : null}
					<div className="public-brand">
						<div className="public-brand-mark">
							<span>{business.name.slice(0, 1).toUpperCase()}</span>
						</div>
						<div>
							<span className="public-kicker">ShineApp</span>
							<h1>{business.name}</h1>
						</div>
					</div>
					{business.intro ? (
						<p className="public-intro">{business.intro}</p>
					) : null}
					{contact.length ? (
						<div className="public-contact">
							{contact.map((item) => {
								const Icon = item.icon
								return item.href ? (
									<a
										key={item.label}
										className="public-contact-link"
										href={item.href}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Icon size={16} />
										{item.label}
									</a>
								) : (
									<span key={item.label}>
										<Icon size={16} />
										{item.label}
									</span>
								)
							})}
						</div>
					) : null}
					<div className="public-services">
						<div className="public-section-head">
							<Wrench size={18} />
							<h2>Servicios</h2>
						</div>
						{serviceGroupOrder.map((group) => {
							const items = servicesByGroup[group]
							if (!items.length) return null
							const open = openGroups[group]
							const selectedCount = items.reduce(
								(count, service) =>
									form.service_ids.includes(String(service.id))
										? count + 1
										: count,
								0,
							)
							return (
								<div className="public-service-group" key={group}>
									<button
										type="button"
										className="public-service-group-toggle"
										aria-expanded={open}
										onClick={() => toggleGroup(group)}
									>
										<span className="public-service-group-title">
											{serviceGroupLabels[group]}
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
										<div className="public-service-list">
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
													showDescription && service.notes ? service.notes : ''
												const expandable =
													description.length > DESCRIPTION_TRUNCATE_THRESHOLD
												const expanded = expandedDescriptions.has(service.id)
												return (
													<div
														key={service.id}
														className="public-service-card"
														data-selected={selected ? 'true' : 'false'}
													>
														<button
															type="button"
															className="public-service-card-select"
															aria-pressed={selected}
															onClick={() => toggleService(service.id)}
														>
															<span className="public-service-icon">
																<PublicServiceIcon service={service} />
															</span>
															<span className="public-service-card-body">
																<strong>{service.name}</strong>
																{serviceDurationLabel(service) ? (
																	<em>
																		<Clock size={13} />
																		{serviceDurationLabel(service)}
																	</em>
																) : null}
																{priceLabel ? (
																	<span className="public-service-price">
																		{priceLabel}
																	</span>
																) : null}
															</span>
															{selected ? <CheckCircle2 size={18} /> : null}
														</button>
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
																		onClick={() => toggleDescription(service.id)}
																	>
																		{expanded ? 'Ver menos' : 'Ver mas'}
																	</button>
																) : null}
															</div>
														) : null}
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

				<form className="public-request-form" onSubmit={submitRequest}>
					<div>
						<div className="public-section-head">
							<Send size={18} />
							<h2>Solicitud</h2>
						</div>
						<p className="public-form-note">
							Nombre, un servicio y al menos un celular o email. Sin fecha se
							solicita una cotizacion; con fecha se solicita una reserva.
						</p>
					</div>
					{savedData && !success && (
						<div className="public-recall-banner">
							<RotateCcw size={15} />
							<span>Tenemos tus datos del turno anterior guardados.</span>
							<div className="public-recall-banner-actions">
								<button type="button" onClick={applySavedData}>
									Usar mis datos
								</button>
								<button type="button" onClick={dismissSavedData}>
									Descartar
								</button>
							</div>
						</div>
					)}
					<input
						className="public-honeypot"
						tabIndex={-1}
						autoComplete="off"
						value={form.website}
						onChange={(event) => patchForm({ website: event.target.value })}
					/>
					<label>
						Nombre
						<input
							required
							autoComplete="name"
							value={form.customer_name}
							onChange={(event) => patchForm({ customer_name: event.target.value })}
						/>
					</label>
					<div className="public-form-row">
						<label>
							Celular
							<input
								inputMode="tel"
								autoComplete="tel"
								value={form.customer_phone}
								onChange={(event) => patchForm({ customer_phone: event.target.value })}
							/>
						</label>
						<label>
							Email
							<input
								type="email"
								autoComplete="email"
								value={form.customer_email}
								onChange={(event) => patchForm({ customer_email: event.target.value })}
							/>
						</label>
					</div>
					{recallFeedback && !recallOpen ? (
						recallFeedback.tone === 'ok' ? (
							<div className="public-form-success">
								<CheckCircle2 size={16} />
								{recallFeedback.text}
							</div>
						) : (
							<PublicFormErrorNotice notice={recallFeedback.notice} />
						)
					) : null}
					{!recallOpen ? (
						<button
							type="button"
							className="public-recall-trigger"
							onClick={() => { setRecallOpen(true); setRecallFeedback(null) }}
						>
							¿Ya sos cliente? Recuperar mis datos
						</button>
					) : (
						<div className="public-recall-lookup">
							<label>
								Telefono o email para buscar
								<div className="public-recall-lookup-row">
									<input
										autoFocus
										value={recallIdentifier}
										placeholder="1164321234 o usuario@email.com"
										onChange={(e) => setRecallIdentifier(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') { e.preventDefault(); recallCustomer() }
										}}
									/>
									<button type="button" disabled={recalling} onClick={recallCustomer}>
										{recalling ? 'Buscando...' : 'Buscar'}
									</button>
								</div>
							</label>
							{recallFeedback ? (
								recallFeedback.tone === 'ok' ? (
									<div className="public-form-success">
										<CheckCircle2 size={16} />
										{recallFeedback.text}
									</div>
								) : (
									<PublicFormErrorNotice notice={recallFeedback.notice} />
								)
							) : null}
							<button
								type="button"
								className="public-recall-trigger"
								onClick={() => { setRecallOpen(false); setRecallIdentifier(''); setRecallFeedback(null) }}
							>
								Cancelar
							</button>
						</div>
					)}
					<div className="public-form-row">
						<label>
							Patente
							<input
								value={form.vehicle_license_plate}
								onChange={(event) =>
									patchForm({ vehicle_license_plate: event.target.value })
								}
							/>
						</label>
						<label>
							Vehiculo
							<input
								value={form.vehicle_brand}
								onChange={(event) => patchForm({ vehicle_brand: event.target.value })}
								placeholder="Marca"
							/>
						</label>
					</div>
					<div className="public-form-row">
						<label>
							Modelo
							<input
								value={form.vehicle_model}
								onChange={(event) => patchForm({ vehicle_model: event.target.value })}
							/>
						</label>
						<label>
							Tipo de vehiculo
							<select
								value={form.vehicle_type}
								onChange={(event) => patchForm({ vehicle_type: event.target.value })}
							>
								{VEHICLE_TYPE_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
					</div>
					<div className="public-form-row">
						<label>
							Fecha preferida
							<input
								type="date"
								min={today}
								value={form.preferred_day}
								onChange={(event) =>
									patchForm({
										preferred_day: event.target.value,
										preferred_time: event.target.value ? form.preferred_time : '',
									})
								}
							/>
						</label>
						<label>
							Hora preferida
							<select
								disabled={!form.preferred_day || isPastPreferredDay}
								value={form.preferred_time}
								onChange={(event) => patchForm({ preferred_time: event.target.value })}
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
							La fecha elegida ya paso. Selecciona una fecha igual o posterior
							a hoy.
						</div>
					) : null}
					{availabilityLoading && !isPastPreferredDay ? (
						<div className="public-form-note">Verificando disponibilidad...</div>
					) : null}
					{!availabilityLoading && availability && !isPastPreferredDay ? (
						<div
							className={
								capacityWarning ? 'public-form-error' : 'public-form-note'
							}
						>
							{capacityWarning ?? (
								<>
									Cupo lavado: {availability.wash.used_slots}/
									{availability.wash.max_slots} · Cupo detailing:{' '}
									{availability.detailing.used_slots}/
									{availability.detailing.max_slots}
								</>
							)}
						</div>
					) : null}
					<label>
						Mensaje
						<textarea
							rows={4}
							value={form.message}
							onChange={(event) => patchForm({ message: event.target.value })}
						/>
					</label>
					{errorNotice ? (
						<PublicFormErrorNotice notice={errorNotice} />
					) : null}
					{success ? (
						<div className="public-form-success">
							<CheckCircle2 size={18} />
							Solicitud enviada.
						</div>
					) : null}
					<button
						type="submit"
						className="primary"
						disabled={submitting || blockSubmit}
					>
						<Send size={16} />
						{submitting ? 'Enviando...' : 'Enviar solicitud'}
					</button>
				</form>
			</section>
		</main>
	)
}
