'use client'

import { type FormEvent, useMemo } from 'react'

import { Eye, EyeOff, Globe } from 'lucide-react'

import { Field } from '@/app/components/ui/Field'
import { type AnyRecord } from '@/lib/page-support'

type TurneraSettingsPanelProps = {
	businessForm: AnyRecord
	businessSlug: string
	services: AnyRecord[]
	onPatchBusinessForm: (patch: AnyRecord) => void
	onSaveBusinessProfile: (event: FormEvent) => void
}

type ServiceGroupKey = 'wash' | 'combo' | 'detailing'

const serviceGroupOrder: ServiceGroupKey[] = ['wash', 'combo', 'detailing']

const serviceGroupLabels: Record<ServiceGroupKey, string> = {
	wash: 'Lavadero',
	combo: 'Combos',
	detailing: 'Detailing',
}

function isPositiveInt(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function normalizeHiddenIds(value: unknown): number[] {
	if (!Array.isArray(value)) return []
	const seen = new Set<number>()
	const out: number[] = []
	for (const raw of value) {
		const next = Number(raw)
		if (isPositiveInt(next) && !seen.has(next)) {
			seen.add(next)
			out.push(next)
		}
	}
	return out
}

export function TurneraSettingsPanel({
	businessForm,
	businessSlug,
	services,
	onPatchBusinessForm,
	onSaveBusinessProfile,
}: TurneraSettingsPanelProps) {
	const publicLandingUrl = businessSlug
		? `${typeof window !== 'undefined' ? window.location.origin : ''}/publica/${businessSlug}`
		: ''

	const hiddenIds = useMemo(
		() => normalizeHiddenIds(businessForm.public_hidden_service_ids),
		[businessForm.public_hidden_service_ids],
	)
	const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds])

	const groupedServices = useMemo(() => {
		const groups: Record<ServiceGroupKey, AnyRecord[]> = {
			wash: [],
			combo: [],
			detailing: [],
		}
		for (const service of services) {
			if (service.is_active === false) continue
			const type = String(service.service_type ?? '')
			if (type === 'wash' || type === 'combo' || type === 'detailing') {
				groups[type].push(service)
			}
		}
		for (const key of serviceGroupOrder) {
			groups[key].sort((a, b) =>
				String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', {
					sensitivity: 'base',
				}),
			)
		}
		return groups
	}, [services])

	function setHiddenIds(next: number[]) {
		onPatchBusinessForm({ public_hidden_service_ids: next })
	}

	function toggleService(serviceId: number) {
		if (!isPositiveInt(serviceId)) return
		if (hiddenSet.has(serviceId)) {
			setHiddenIds(hiddenIds.filter((id) => id !== serviceId))
		} else {
			setHiddenIds([...hiddenIds, serviceId])
		}
	}

	function setGroupVisibility(group: ServiceGroupKey, visible: boolean) {
		const groupIds = groupedServices[group]
			.map((service) => Number(service.id))
			.filter(isPositiveInt)
		if (visible) {
			const groupIdSet = new Set(groupIds)
			setHiddenIds(hiddenIds.filter((id) => !groupIdSet.has(id)))
		} else {
			const merged = new Set([...hiddenIds, ...groupIds])
			setHiddenIds(Array.from(merged))
		}
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Pagina publica</span>
					<h2>Turnera</h2>
					<p>
						Configura la landing publica del negocio: link, tipo de pedidos,
						horarios y servicios visibles.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-primary-actions">
						<button
							type="submit"
							className="primary"
							form="settings-turnera-form"
						>
							<Globe size={16} />
							Guardar turnera
						</button>
					</div>
				</div>
			</div>
			<form
				className="form-grid"
				id="settings-turnera-form"
				onSubmit={onSaveBusinessProfile}
			>
				<div className="landing-config">
					<Field label="URL publica">
						<input
							readOnly
							name="business_public_url"
							value={publicLandingUrl}
							placeholder="Disponible al iniciar sesion con negocio"
						/>
					</Field>
					<label>
						<input
							type="checkbox"
							name="business_public_landing_enabled"
							checked={businessForm.public_landing_enabled !== false}
							onChange={(event) =>
								onPatchBusinessForm({
									public_landing_enabled: event.target.checked,
								})
							}
						/>
						Landing publica activa
					</label>
					<div className="form-row">
						<label>
							<input
								type="checkbox"
								name="business_allow_public_booking_requests"
								checked={
									businessForm.allow_public_booking_requests !== false
								}
								onChange={(event) =>
									onPatchBusinessForm({
										allow_public_booking_requests: event.target.checked,
									})
								}
							/>
							Recibir pedidos de turno
						</label>
						<label>
							<input
								type="checkbox"
								name="business_allow_public_quote_requests"
								checked={businessForm.allow_public_quote_requests !== false}
								onChange={(event) =>
									onPatchBusinessForm({
										allow_public_quote_requests: event.target.checked,
									})
								}
							/>
							Recibir pedidos de cotizacion
						</label>
					</div>
					<div className="form-row">
						<label>
							<input
								type="checkbox"
								name="business_public_show_service_description"
								checked={
									businessForm.public_show_service_description !== false
								}
								onChange={(event) =>
									onPatchBusinessForm({
										public_show_service_description: event.target.checked,
									})
								}
							/>
							Mostrar descripcion del servicio
						</label>
						<label>
							<input
								type="checkbox"
								name="business_public_show_service_price"
								checked={businessForm.public_show_service_price === true}
								onChange={(event) =>
									onPatchBusinessForm({
										public_show_service_price: event.target.checked,
									})
								}
							/>
							Mostrar precio del servicio
						</label>
					</div>
					<Field label="Texto corto para la landing">
						<textarea
							maxLength={240}
							name="business_public_landing_intro"
							autoComplete="off"
							rows={3}
							value={businessForm.public_landing_intro}
							onChange={(event) =>
								onPatchBusinessForm({
									public_landing_intro: event.target.value,
								})
							}
						/>
					</Field>
					<div className="form-row">
						<Field label="Apertura">
							<input
								type="time"
								name="business_opening_time"
								value={businessForm.opening_time ?? ''}
								onChange={(event) =>
									onPatchBusinessForm({
										opening_time: event.target.value || null,
									})
								}
							/>
						</Field>
						<Field label="Cierre">
							<input
								type="time"
								name="business_closing_time"
								value={businessForm.closing_time ?? ''}
								onChange={(event) =>
									onPatchBusinessForm({
										closing_time: event.target.value || null,
									})
								}
							/>
						</Field>
					</div>
					<label>
						<input
							type="checkbox"
							name="business_allow_overlapping_reservations"
							checked={
								businessForm.allow_overlapping_reservations === true
							}
							onChange={(event) =>
								onPatchBusinessForm({
									allow_overlapping_reservations: event.target.checked,
								})
							}
						/>
						Solapar turnos
					</label>
				</div>
				<div className="turnera-services">
					<div className="turnera-services-head">
						<div>
							<h3>Servicios visibles en la landing</h3>
							<p>
								Por defecto se muestran todos. Desactiva los que no quieras
								ofrecer publicamente.
							</p>
						</div>
					</div>
					{serviceGroupOrder.map((group) => {
						const items = groupedServices[group]
						if (!items.length) return null
						const hiddenInGroup = items.filter((service) =>
							hiddenSet.has(Number(service.id)),
						).length
						const allHidden = hiddenInGroup === items.length
						return (
							<div className="turnera-services-group" key={group}>
								<div className="turnera-services-group-head">
									<h4>{serviceGroupLabels[group]}</h4>
									<button
										type="button"
										className="ghost"
										onClick={() => setGroupVisibility(group, allHidden)}
									>
										{allHidden ? (
											<>
												<Eye size={14} />
												Mostrar todos
											</>
										) : (
											<>
												<EyeOff size={14} />
												Ocultar todos
											</>
										)}
									</button>
								</div>
								<ul className="turnera-services-list">
									{items.map((service) => {
										const id = Number(service.id)
										const checked = isPositiveInt(id) && !hiddenSet.has(id)
										return (
											<li key={service.id}>
												<label>
													<input
														type="checkbox"
														checked={checked}
														onChange={() => toggleService(id)}
													/>
													<span>{String(service.name ?? '')}</span>
												</label>
											</li>
										)
									})}
								</ul>
							</div>
						)
					})}
					{serviceGroupOrder.every(
						(group) => groupedServices[group].length === 0,
					) ? (
						<p className="turnera-services-empty">
							Aun no hay servicios cargados. Crea servicios en la seccion
							correspondiente para poder elegir cuales mostrar.
						</p>
					) : null}
				</div>
			</form>
		</section>
	)
}
