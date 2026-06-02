'use client'

import { CheckCircle2, Trash2 } from 'lucide-react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Field } from '@/app/components/ui/Field'
import {
	RecordCard,
	RecordCardHeader,
} from '@/app/components/ui/RecordCard'
import { StatusPill } from '@/app/components/ui/StatusPill'
import { joinDisplayParts } from '@/lib/display-text'
import {
	type AnyRecord,
	formatDateLabel,
	formatDateTimeLabel,
} from '@/lib/page-support'

const publicRequestTypeLabels: Record<string, string> = {
	booking: 'Turno',
	quote: 'Cotizacion',
}

const publicRequestStatusLabels: Record<string, string> = {
	pending: 'Pendiente',
	converted: 'Convertida',
	archived: 'Archivada',
}

function publicRequestServicesText(item: AnyRecord) {
	const names = (item.items ?? [])
		.map((line: AnyRecord) => line.service_name || line.description)
		.filter(Boolean)
	return names.length ? names.join(', ') : 'Sin servicios'
}

function publicRequestVehicleText(item: AnyRecord) {
	return (
		joinDisplayParts([
			item.vehicle_license_plate,
			item.vehicle_brand,
			item.vehicle_model,
			item.vehicle_color,
			item.vehicle_type_label,
		]) || 'Sin vehiculo informado'
	)
}

function publicRequestContactText(item: AnyRecord) {
	return joinDisplayParts([item.customer_phone, item.customer_email])
}

type PublicRequestCardProps = {
	item: AnyRecord
	selection: { customer?: string; vehicle?: string }
	onPatchSelection: (patch: { customer?: string; vehicle?: string }) => void
	onConvert: () => void
	onArchive: () => void
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
}

export function PublicRequestCard({
	item,
	selection,
	onPatchSelection,
	onConvert,
	onArchive,
	recordClass,
}: PublicRequestCardProps) {
	const customerSuggestions = item.suggestions?.customers ?? []
	const vehicleSuggestions = item.suggestions?.vehicles ?? []
	const isPending = item.status === 'pending'

	return (
		<MotionFlashSurface className={recordClass('public-request', item.id)}>
			<RecordCard>
				<RecordCardHeader
					title={item.customer_name}
					subtitle={
						<>
							{publicRequestTypeLabels[item.request_type] ?? item.request_type}{' '}
							- {publicRequestServicesText(item)}
						</>
					}
					actions={
						<StatusPill
							value={String(item.status ?? '')}
							labels={publicRequestStatusLabels}
						/>
					}
				>
					<div className="record-sub">
						{publicRequestContactText(item) || 'Sin contacto'} -{' '}
						{publicRequestVehicleText(item)}
					</div>
					{item.preferred_day ? (
						<div className="record-sub">
							Preferencia: {formatDateLabel(item.preferred_day)}
							{item.preferred_time ? ` ${item.preferred_time.slice(0, 5)}` : ''}
						</div>
					) : null}
				</RecordCardHeader>
				{item.message ? <p className="record-sub">{item.message}</p> : null}
				{isPending ? (
					<div className="public-request-resolution">
						<div className="public-request-resolution-note">
							<strong>Resolver solicitud</strong>
							<span>
								{customerSuggestions.length || vehicleSuggestions.length
									? 'Revisa coincidencias sugeridas antes de convertir o archivar.'
									: 'Al convertir se crean cliente y vehiculo nuevos si no elegis existentes.'}
							</span>
						</div>
						<Field label="Cliente">
							<select
								value={selection.customer ?? ''}
								onChange={(event) =>
									onPatchSelection({ customer: event.target.value })
								}
							>
								<option value="">Crear nuevo cliente</option>
								{customerSuggestions.map((customer: AnyRecord) => (
									<option key={customer.id} value={customer.id}>
										{joinDisplayParts([
											customer.label ?? customer.name,
											customer.phone,
											customer.email,
										])}
									</option>
								))}
							</select>
						</Field>
						<Field label="Vehiculo">
							<select
								value={selection.vehicle ?? ''}
								onChange={(event) =>
									onPatchSelection({ vehicle: event.target.value })
								}
							>
								<option value="">Crear nuevo vehiculo</option>
								{vehicleSuggestions.map((vehicle: AnyRecord) => (
									<option key={vehicle.id} value={vehicle.id}>
										{joinDisplayParts([vehicle.label, vehicle.customer_name])}
									</option>
								))}
							</select>
						</Field>
						<div className="record-actions">
							<button
								type="button"
								className="primary"
								onClick={onConvert}
							>
								<CheckCircle2 size={16} />
								Convertir solicitud
							</button>
							<button
								type="button"
								className="ghost"
								onClick={onArchive}
							>
								<Trash2 size={16} />
								Archivar
							</button>
						</div>
					</div>
				) : (
					<div className="record-sub">
						{item.converted_reservation
							? `Reserva #${item.converted_reservation}`
							: item.converted_quote
								? `Cotizacion #${item.converted_quote}`
								: item.archived_at
									? `Archivada ${formatDateTimeLabel(item.archived_at)}`
									: 'Gestionada'}
					</div>
				)}
			</RecordCard>
		</MotionFlashSurface>
	)
}
