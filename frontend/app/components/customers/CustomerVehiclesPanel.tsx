'use client'

import { Empty } from '@/app/components/ui/Empty'
import { Panel } from '@/app/components/ui/Panel'
import { joinDisplayParts } from '@/lib/display-text'
import { type AnyRecord } from '@/lib/page-support'

type CustomerVehiclesPanelProps = {
	customerVehicles: AnyRecord[]
	allVehicles: AnyRecord[]
	onOpenVehicle: (vehicle: AnyRecord) => void
}

export function CustomerVehiclesPanel({
	customerVehicles,
	allVehicles,
	onOpenVehicle,
}: CustomerVehiclesPanelProps) {
	return (
		<Panel
			title="Vehiculos del cliente"
			subtitle={`${customerVehicles.length} ${
				customerVehicles.length === 1
					? 'vehiculo vinculado'
					: 'vehiculos vinculados'
			}`}
		>
			<div className="records compact-records">
				{customerVehicles.length ? (
					customerVehicles.map((vehicle: AnyRecord) => {
						const detailVehicle =
							allVehicles.find(
								(item) => String(item.id) === String(vehicle.id),
							) ?? vehicle
						const title =
							vehicle.label ||
							vehicle.license_plate ||
							joinDisplayParts([vehicle.brand, vehicle.model]) ||
							'Vehiculo sin identificar'
						return (
							<button
								className="record compact"
								key={`customer-vehicle-${vehicle.id ?? title}`}
								onClick={() => onOpenVehicle(detailVehicle)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">{title}</div>
										<div className="record-sub">
											{joinDisplayParts([
												vehicle.brand,
												vehicle.model,
												vehicle.color,
											]) || 'Sin detalle tecnico'}
										</div>
									</div>
									<div className="record-actions">
										<span className="status draft">
											{vehicle.license_plate || 'Sin patente'}
										</span>
									</div>
								</div>
							</button>
						)
					})
				) : (
					<Empty text="Este cliente todavia no tiene vehiculos." />
				)}
			</div>
		</Panel>
	)
}
