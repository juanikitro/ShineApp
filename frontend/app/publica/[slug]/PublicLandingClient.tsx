'use client'

import {
	CalendarDays,
	CheckCircle2,
	Clock,
	FileText,
	Mail,
	MapPin,
	Phone,
	Send,
	Wrench,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { publicApiFetch } from '@/lib/api'
import { formatApiError } from '@/lib/api-errors'
import { joinDisplayParts } from '@/lib/display-text'

type PublicRequestType = 'booking' | 'quote'

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
	request_type: PublicRequestType
	customer_name: string
	customer_phone: string
	customer_email: string
	vehicle_license_plate: string
	vehicle_brand: string
	vehicle_model: string
	preferred_day: string
	preferred_time: string
	message: string
	website: string
	service_ids: string[]
}

const blankForm: PublicRequestForm = {
	request_type: 'booking',
	customer_name: '',
	customer_phone: '',
	customer_email: '',
	vehicle_license_plate: '',
	vehicle_brand: '',
	vehicle_model: '',
	preferred_day: '',
	preferred_time: '',
	message: '',
	website: '',
	service_ids: [],
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

export function PublicLandingClient({ slug }: { slug: string }) {
	const [landing, setLanding] = useState<PublicLandingPayload | null>(null)
	const [form, setForm] = useState<PublicRequestForm>(blankForm)
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	useEffect(() => {
		let mounted = true
		async function loadLanding() {
			setLoading(true)
			setError(null)
			try {
				const payload = await publicApiFetch<PublicLandingPayload>(
					`/public/landing/${encodeURIComponent(slug)}/`,
				)
				if (!mounted) return
				setLanding(payload)
				setForm((current) => ({
					...current,
					request_type: payload.actions.booking_requests ? 'booking' : 'quote',
				}))
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

	const requestTypeOptions = useMemo(() => {
		if (!landing) return []
		return [
			landing.actions.booking_requests
				? { value: 'booking' as const, label: 'Turno', icon: CalendarDays }
				: null,
			landing.actions.quote_requests
				? { value: 'quote' as const, label: 'Cotizacion', icon: FileText }
				: null,
		].filter(Boolean) as Array<{
			value: PublicRequestType
			label: string
			icon: typeof CalendarDays
		}>
	}, [landing])

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
		setSubmitting(true)
		setError(null)
		setSuccess(false)
		try {
			await publicApiFetch(`/public/landing/${encodeURIComponent(slug)}/requests/`, {
				method: 'POST',
				body: JSON.stringify({
					...form,
					service_ids: form.service_ids.map(Number),
				}),
			})
			setSuccess(true)
			setForm({
				...blankForm,
				request_type: requestTypeOptions[0]?.value ?? 'booking',
			})
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
					<div className="public-brand">
						<div className="public-brand-mark">
							{business.logo_url ? (
								<img src={business.logo_url} alt="" />
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
											{service.icon || 'S'}
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
					<div className="public-section-head">
						<Send size={18} />
						<h2>Solicitud</h2>
					</div>
					{requestTypeOptions.length > 1 ? (
						<div className="public-request-type" role="tablist" aria-label="Tipo de solicitud">
							{requestTypeOptions.map((option) => {
								const Icon = option.icon
								return (
									<button
										key={option.value}
										type="button"
										data-selected={form.request_type === option.value ? 'true' : 'false'}
										onClick={() => patchForm({ request_type: option.value })}
									>
										<Icon size={16} />
										{option.label}
									</button>
								)
							})}
						</div>
					) : null}
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
							value={form.customer_name}
							onChange={(event) => patchForm({ customer_name: event.target.value })}
						/>
					</label>
					<div className="public-form-row">
						<label>
							Celular
							<input
								inputMode="tel"
								value={form.customer_phone}
								onChange={(event) => patchForm({ customer_phone: event.target.value })}
							/>
						</label>
						<label>
							Email
							<input
								type="email"
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
					<label>
						Modelo
						<input
							value={form.vehicle_model}
							onChange={(event) => patchForm({ vehicle_model: event.target.value })}
						/>
					</label>
					{form.request_type === 'booking' ? (
						<div className="public-form-row">
							<label>
								Fecha preferida
								<input
									required
									type="date"
									value={form.preferred_day}
									onChange={(event) => patchForm({ preferred_day: event.target.value })}
								/>
							</label>
							<label>
								Hora preferida
								<input
									type="time"
									value={form.preferred_time}
									onChange={(event) => patchForm({ preferred_time: event.target.value })}
								/>
							</label>
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
						disabled={submitting || form.service_ids.length === 0}
					>
						<Send size={16} />
						{submitting ? 'Enviando...' : 'Enviar solicitud'}
					</button>
				</form>
			</section>
		</main>
	)
}
