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
	Send,
	ShieldCheck,
	Sparkles,
	Wrench,
} from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'

import { publicApiFetch } from '@/lib/api'
import { formatApiError } from '@/lib/api-errors'
import { joinDisplayParts } from '@/lib/display-text'
import { isPdfAssetSource, renderPdfPreviewDataUrl } from '@/lib/pdf-preview'
import { VEHICLE_TYPE_OPTIONS } from '@/lib/service-pricing'

type PublicService = {
	id: number
	name: string
	icon?: string
	service_type?: string
	estimated_duration_minutes?: number | null
	notes?: string
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
	if (!service.estimated_duration_minutes) return null
	if (service.estimated_duration_minutes < 60) {
		return `${service.estimated_duration_minutes} min`
	}
	const hours = Math.floor(service.estimated_duration_minutes / 60)
	const minutes = service.estimated_duration_minutes % 60
	return minutes ? `${hours} h ${minutes} min` : `${hours} h`
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

	const logoSource = landing?.business.logo_url ?? null
	const logoIsPdf = isPdfAssetSource(logoSource)
	const { thumbnail: logoPdfThumbnail, status: logoPdfStatus } = usePdfPreview(
		logoSource,
		logoIsPdf,
		960,
	)
	const businessImageSource = logoIsPdf ? logoPdfThumbnail : logoSource
	const canShowBusinessImage = Boolean(businessImageSource && !logoLoadFailed)

	useEffect(() => {
		setLogoLoadFailed(false)
	}, [logoPdfThumbnail, logoSource])

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
	const contact = [
		business.contact_phone
			? { icon: Phone, label: business.contact_phone }
			: null,
		business.contact_email ? { icon: Mail, label: business.contact_email } : null,
		business.address ? { icon: MapPin, label: business.address } : null,
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
						<div className="public-service-list">
							{landing.services.map((service) => {
								const selected = form.service_ids.includes(String(service.id))
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
											{service.notes ? <small>{service.notes}</small> : null}
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
							<input
								type="time"
								disabled={!form.preferred_day}
								value={form.preferred_time}
								onChange={(event) => patchForm({ preferred_time: event.target.value })}
							/>
						</label>
					</div>
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
						disabled={submitting}
					>
						<Send size={16} />
						{submitting ? 'Enviando...' : 'Enviar solicitud'}
					</button>
				</form>
			</section>
		</main>
	)
}
