import { type ComponentProps, type FormEvent, type ReactNode } from 'react'

import { type SelectOption } from '@/app/components/ui/SearchSelect'
import {
	materialStockValue,
	materialUnitValue,
} from '@/lib/inventory-display'
import {
	type AnyRecord,
	calculatedUnitCost,
	money,
	numberValue,
	quantity,
} from '@/lib/page-support'

import { MaterialConsumptionDetailEditForm } from './MaterialConsumptionDetailEditForm'
import { MaterialDetailEditForm } from './MaterialDetailEditForm'
import { MaterialDetailHistory } from './MaterialDetailHistory'
import { MaterialPurchaseDetailEditForm } from './MaterialPurchaseDetailEditForm'

type MaterialPurchaseDetailEditorProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	materialOptions: SelectOption[]
	renderActions: () => ReactNode
}

export function renderMaterialPurchaseDetailEditor({
	data,
	onSubmit,
	onPatch,
	materialOptions,
	renderActions,
}: MaterialPurchaseDetailEditorProps): ReactNode {
	return (
		<MaterialPurchaseDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			materialOptions={materialOptions}
			unitCost={money(calculatedUnitCost(data.quantity, data.total_cost))}
			actions={renderActions()}
		/>
	)
}

type MaterialConsumptionDetailEditorProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	workOrderOptions: SelectOption[]
	materialOptions: SelectOption[]
	renderActions: () => ReactNode
}

export function renderMaterialConsumptionDetailEditor({
	data,
	onSubmit,
	onPatch,
	workOrderOptions,
	materialOptions,
	renderActions,
}: MaterialConsumptionDetailEditorProps): ReactNode {
	return (
		<MaterialConsumptionDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			workOrderOptions={workOrderOptions}
			materialOptions={materialOptions}
			openUnitConsumption={Boolean(data.open_unit)}
			actions={renderActions()}
		/>
	)
}

type MaterialDetailEditorProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	sectorOptions: SelectOption[]
	materialUsageSummary: (
		material: AnyRecord,
	) => ComponentProps<typeof MaterialDetailHistory>['usage']
	materialOpenUnitRows: (material: AnyRecord) => AnyRecord[]
	onOpenDetail: (title: string, data: AnyRecord) => void
	renderActions: () => ReactNode
}

export function renderMaterialDetailEditor({
	data,
	onSubmit,
	onPatch,
	sectorOptions,
	materialUsageSummary,
	materialOpenUnitRows,
	onOpenDetail,
	renderActions,
}: MaterialDetailEditorProps): ReactNode {
	const usage = materialUsageSummary(data)
	const openUnits = materialOpenUnitRows(data)
	const unitValue = materialUnitValue(data)

	return (
		<MaterialDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			sectorOptions={sectorOptions}
			history={
				<MaterialDetailHistory
					material={data}
					usage={usage}
					openUnits={openUnits}
					unitValue={unitValue}
					stockValue={materialStockValue(data)}
					formatMoney={money}
					formatQuantity={quantity}
					formatNumber={numberValue}
					onOpenUsage={(item) =>
						onOpenDetail('Consumo de material', item)
					}
					onOpenOpenUnit={(item) => onOpenDetail('Unidad abierta', item)}
				/>
			}
			actions={renderActions()}
		/>
	)
}
