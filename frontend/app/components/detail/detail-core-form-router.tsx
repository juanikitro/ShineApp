import { type FormEvent, type KeyboardEvent, type ReactNode } from 'react'

import { type SelectOption } from '@/app/components/ui/SearchSelect'
import { selectOptionsFromValues } from '@/lib/display-text'
import { type AnyRecord } from '@/lib/page-support'
import {
	vehicleBrandOptions,
	vehicleModelOptionsForBrand,
} from '@/lib/vehicle-options'

import {
	renderCustomerDetailEditForm,
	renderSupplierDetailEditForm,
	renderVehicleDetailEditForm,
} from './basic-detail-edit-form-renderers'
import { renderMaterialDetailEditor } from './inventory-detail-edit-form-renderers'
import { renderServiceDetailEditor } from './service-detail-edit-renderer'

type DetailState = {
	kind: string
	data: AnyRecord
	editData: AnyRecord
}

type CoreDetailFormRouterProps = {
	detail: DetailState
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	canViewEconomy: boolean
	customerHistoryLoading: boolean
	customerHistory: AnyRecord | null | undefined
	orderLabels: Record<string, string>
	onOpenDetail: Parameters<
		typeof renderMaterialDetailEditor
	>[0]['onOpenDetail']
	vehicleOptions: SelectOption[]
	vehicles: AnyRecord[]
	customerOptions: SelectOption[]
	vehicleBrandValues: string[]
	onUpdateVehicleBrand: Parameters<
		typeof renderVehicleDetailEditForm
	>[0]['onUpdateBrand']
	focusField: Parameters<typeof renderVehicleDetailEditForm>[0]['focusField']
	sectorOptions: SelectOption[]
	sectors: AnyRecord[]
	serviceMaterialLines: AnyRecord[]
	materials: AnyRecord[]
	materialOptions: SelectOption[]
	onAddMaterialLine: Parameters<
		typeof renderServiceDetailEditor
	>[0]['onAddMaterialLine']
	onRemoveMaterialLine: Parameters<
		typeof renderServiceDetailEditor
	>[0]['onRemoveMaterialLine']
	onUpdateMaterialLine: Parameters<
		typeof renderServiceDetailEditor
	>[0]['onUpdateMaterialLine']
	materialUsageSummary: Parameters<
		typeof renderMaterialDetailEditor
	>[0]['materialUsageSummary']
	materialOpenUnitRows: Parameters<
		typeof renderMaterialDetailEditor
	>[0]['materialOpenUnitRows']
	renderActions: () => ReactNode
}

export function renderCoreDetailFormRouter({
	detail,
	onSubmit,
	onPatch,
	focusNextOnEnter,
	canViewEconomy,
	customerHistoryLoading,
	customerHistory,
	orderLabels,
	onOpenDetail,
	vehicleOptions,
	vehicles,
	customerOptions,
	vehicleBrandValues,
	onUpdateVehicleBrand,
	focusField,
	sectorOptions,
	sectors,
	serviceMaterialLines,
	materials,
	materialOptions,
	onAddMaterialLine,
	onRemoveMaterialLine,
	onUpdateMaterialLine,
	materialUsageSummary,
	materialOpenUnitRows,
	renderActions,
}: CoreDetailFormRouterProps): ReactNode | undefined {
	const data = detail.editData

	if (detail.kind === 'customer') {
		return renderCustomerDetailEditForm({
			data,
			onSubmit,
			onPatch,
			focusNextOnEnter,
			canViewEconomy,
			customerHistoryLoading,
			customerHistory,
			orderLabels,
			onOpenOrder: (order) => onOpenDetail('Orden de trabajo', order),
			actions: renderActions(),
		})
	}

	if (detail.kind === 'vehicle') {
		const detailVehicleBrandOptions = selectOptionsFromValues(
			vehicleBrandOptions(vehicleBrandValues),
			data.brand,
		)
		const detailVehicleModelOptions = selectOptionsFromValues(
			vehicleModelOptionsForBrand(data.brand, vehicles, [data.model]),
			data.model,
		)

		return renderVehicleDetailEditForm({
			data,
			onSubmit,
			onPatch,
			customerOptions,
			brandOptions: detailVehicleBrandOptions,
			modelOptions: detailVehicleModelOptions,
			onUpdateBrand: onUpdateVehicleBrand,
			focusField,
			focusNextOnEnter,
			actions: renderActions(),
		})
	}

	if (detail.kind === 'service') {
		return renderServiceDetailEditor({
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
		})
	}

	if (detail.kind === 'material') {
		return renderMaterialDetailEditor({
			data,
			onSubmit,
			onPatch,
			sectorOptions,
			materialUsageSummary,
			materialOpenUnitRows,
			onOpenDetail,
			renderActions,
		})
	}

	if (detail.kind === 'supplier') {
		return renderSupplierDetailEditForm({
			data,
			onSubmit,
			onPatch,
			actions: renderActions(),
		})
	}

	return undefined
}
