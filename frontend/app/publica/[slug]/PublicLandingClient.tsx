'use client'

import {
	Armchair,
	CheckCircle2,
	Clock,
	FileText,
	Layers,
	Mail,
	MapPin,
	Phone,
	RotateCcw,
	Send,
	ShieldCheck,
	Sparkles,
	Wrench,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { publicApiFetch } from '@/lib/api'
import { formatApiError } from '@/lib/api-errors'
import { joinDisplayParts } from '@/lib/display-text'
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
}

type ServiceGroupKey = 'wash' | 'combo' | 'detailing'

const serviceGroupOrder: ServiceGroupKey[] = ['wash', 'combo', 'detailing']

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
		intro?: string
		opening_time?: string | null
		closing_time?: string | null
	}
	actions: {
		booking_requests: boolean
		quote_requests: boolean
	}
	services: PublicService[]
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

function errorMessage(error: unknown) {
	const notice = formatApiError(error, {
		fallbackTitle: 'No se pudo completar la solicitud',
		fallbackDescription: 'Revisa los datos ingresados e intenta nuevamente.',
	})
	return joinDisplayParts([notice.title, notice.description])
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
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [logoLoadFailed, setLogoLoadFailed] = useState(false)

	const [savedData, setSavedData] = useState<SavedClientData | null>(null)
	const [recallOpen, setRecallOpen] = useState(false)
	const [recallIdentifier, setRecallIdentifier] = useState('')
	const [recalling, setRecalling] = useState(false)
	const [recallFeedback, setRecallFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
	const [availability, setAvailability] = useState<PublicAvailabilityPayload | null>(null)
	const [availabilityLoading, setAvailabilityLoading] = useState(false)
	const today = todayIsoDate()

	useEffect(() => {
		let mounted = true
		async function loadLanding() {
			setLoading(true)
			setError(null)
			try {
				const payload = await publicApiFetch<PublicLandingPayload>(
					`/public/landing/${encodeURIComponent(slug)}/`,
					{ cache: 'default' },
				)
				if (!mounted) return
				setLanding(payload)
			} catch (err) {
				if (!mounted) return
				setError(errorMessage(err))
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
				setRecallFeedback({ type: 'ok', text: 'Datos autocompletados.' })
			} else {
				setRecallFeedback({ type: 'err', text: 'No encontramos un cliente con ese dato.' })
			}
		} catch (err) {
			setRecallFeedback({ type: 'err', text: errorMessage(err) })
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
			setError('Ingresa tu nombre.')
			setSuccess(false)
			return
		}
		if (!hasContact) {
			setError('Deja un celular o un email de contacto.')
			setSuccess(false)
			return
		}
		if (!form.service_ids.length) {
			setError('Selecciona al menos un servicio.')
			setSuccess(false)
			return
		}
		const requestType = form.preferred_day ? 'booking' : 'quote'
		if (requestType === 'booking' && !landing.actions.booking_requests) {
			setError('El negocio no acepta solicitudes de reserva.')
			setSuccess(false)
			return
		}
		if (requestType === 'quote' && !landing.actions.quote_requests) {
			setError('Carga una fecha para solicitar una reserva.')
			setSuccess(false)
			return
		}
		if (isPastPreferredDay) {
			setError('La fecha elegida ya paso. Selecciona una fecha igual o posterior a hoy.')
			setSuccess(false)
			return
		}
		if (capacityWarning) {
			setError(capacityWarning)
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
					setError(
						overnight
							? 'El horario solicitado esta fuera del horario de atencion.'
							: time < opening
								? 'El horario solicitado es antes del horario de apertura.'
								: 'El horario solicitado es despues del horario de cierre.',
					)
					setSuccess(false)
					return
				}
			} else if (opening && time < opening) {
				setError('El horario solicitado es antes del horario de apertura.')
				setSuccess(false)
				return
			} else if (closing && time > closing) {
				setError('El horario solicitado es despues del horario de cierre.')
				setSuccess(false)
				return
			}
		}
		setSubmitting(true)
		setError(null)
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
			setError(errorMessage(err))
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
		return (
			<main className="public-landing">
				<div className="public-state public-state--error">
					{error ?? 'La pagina publica no esta disponible.'}
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

	const contact = [
		business.contact_phone
			? { icon: Phone, label: business.contact_phone }
			: null,
		business.contact_email ? { icon: Mail, label: business.contact_email } : null,
		business.address ? { icon: MapPin, label: business.address } : null,
		hoursLabel ? { icon: Clock, label: hoursLabel } : null,
	].filter(Boolean) as Array<{ icon: typeof Phone; label: string }>

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
							{canShowBusinessImage ? (
								<img
									src={businessImageSource ?? ''}
									alt=""
									onError={() => setLogoLoadFailed(true)}
								/>
							) : (
								<span>{business.name.slice(0, 1).toUpperCase()}</span>
							)}
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
								return (
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
							return (
								<div className="public-service-group" key={group}>
									<h3 className="public-service-group-title">
										{serviceGroupLabels[group]}
									</h3>
									<div className="public-service-list">
										{items.map((service) => {
											const selected = form.service_ids.includes(
												String(service.id),
											)
											return (
												<button
													key={service.id}
													type="button"
													className="public-service-card"
													data-selected={selected ? 'true' : 'false'}
													onClick={() => toggleService(service.id)}
												>
													<span className="public-service-icon">
														<PublicServiceIcon service={service} />
													</span>
													<span>
														<strong>{service.name}</strong>
														{service.notes ? (
															<small>{service.notes}</small>
														) : null}
														{serviceDurationLabel(service) ? (
															<em>
																<Clock size={13} />
																{serviceDurationLabel(service)}
															</em>
														) : null}
													</span>
													{selected ? <CheckCircle2 size={18} /> : null}
												</button>
											)
										})}
									</div>
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
					{recallFeedback && !recallOpen && (
						<div className={recallFeedback.type === 'ok' ? 'public-form-success' : 'public-form-error'}>
							{recallFeedback.type === 'ok' && <CheckCircle2 size={16} />}
							{recallFeedback.text}
						</div>
					)}
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
							{recallFeedback && (
								<div className={recallFeedback.type === 'ok' ? 'public-form-success' : 'public-form-error'}>
									{recallFeedback.type === 'ok' && <CheckCircle2 size={16} />}
									{recallFeedback.text}
								</div>
							)}
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
								min={isOvernightHours ? undefined : (landing.business.opening_time ?? undefined)}
								max={isOvernightHours ? undefined : (landing.business.closing_time ?? undefined)}
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
					{error ? <div className="public-form-error">{error}</div> : null}
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
