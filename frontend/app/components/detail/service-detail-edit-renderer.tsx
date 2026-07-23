import { type FormEvent, type ReactNode } from 'react'

import { ServiceMaterialLinesEditor } from '@/app/components/forms/ServiceMaterialLinesEditor'
import { type SelectOption } from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'
import { applyBasePriceToTypes, VEHICLE_TYPES } from '@/lib/service-pricing'
import { serviceTypeForSectorId } from '@/lib/service-sector'

import { ServiceDetailEditForm } from './ServiceDetailEditForm'

type ServiceDetailEditorProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	sectorOptions: SelectOption[]
	sectors: AnyRecord[]
	serviceMaterialLines: AnyRecord[]
	materials: AnyRecord[]
	materialOptions: SelectOption[]
	onAddMaterialLine: () => void
	onRemoveMaterialLine: (index: number) => void
	onUpdateMaterialLine: (index: number, changes: AnyRecord) => void
	renderActions: () => ReactNode
}

export function renderServiceDetailEditor({
	data,
	onSubmit,
	onPatch,
	sectorOptions,
	sectors,
	serviceMaterialLines,
	materials,
	materialOptions,
	onAddMaterialLine,
	onRemoveMaterialLine,
	onUpdateMaterialLine,
	renderActions,
}: ServiceDetailEditorProps): ReactNode {
	return (
		<ServiceDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			sectorOptions={sectorOptions}
			onSectorChange={(value) =>
				onPatch({
					sector: value ? Number(value) : null,
					service_type: value ? serviceTypeForSectorId(value, sectors) : 'wash',
				})
			}
			onBasePriceChange={(value) =>
				onPatch(applyBasePriceToTypes(data, value))
			}
			priceTypes={VEHICLE_TYPES}
			materialsEditor={
				<ServiceMaterialLinesEditor
					lines={serviceMaterialLines}
					materials={materials}
					materialOptions={materialOptions}
					onAdd={onAddMaterialLine}
					onRemove={onRemoveMaterialLine}
					onUpdate={onUpdateMaterialLine}
				/>
			}
			actions={renderActions()}
		/>
	)
}
