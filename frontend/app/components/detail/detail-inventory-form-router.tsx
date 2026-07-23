import { type ReactNode } from 'react'

import { toolTotalValue } from '@/lib/inventory-display'
import { type AnyRecord, money, numberValue } from '@/lib/page-support'

import { renderToolDetailEditForm } from './basic-detail-edit-form-renderers'
import {
	renderMaterialConsumptionDetailEditor,
	renderMaterialPurchaseDetailEditor,
} from './inventory-detail-edit-form-renderers'

type DetailState = {
	kind: string
	data: AnyRecord
	editData: AnyRecord
}

type ToolDetailEditFormProps = Parameters<typeof renderToolDetailEditForm>[0]
type MaterialPurchaseDetailEditorProps = Parameters<
	typeof renderMaterialPurchaseDetailEditor
>[0]
type MaterialConsumptionDetailEditorProps = Parameters<
	typeof renderMaterialConsumptionDetailEditor
>[0]

type InventoryDetailFormRouterProps = {
	detail: DetailState
	onSubmit: ToolDetailEditFormProps['onSubmit']
	onPatch: ToolDetailEditFormProps['onPatch']
	toolStatusOptions: ToolDetailEditFormProps['statusOptions']
	toolStatusLabels: Record<string, string>
	materialOptions: MaterialPurchaseDetailEditorProps['materialOptions']
	workOrderOptions: MaterialConsumptionDetailEditorProps['workOrderOptions']
	renderActions: MaterialPurchaseDetailEditorProps['renderActions']
}

export function renderInventoryDetailFormRouter({
	detail,
	onSubmit,
	onPatch,
	toolStatusOptions,
	toolStatusLabels,
	materialOptions,
	workOrderOptions,
	renderActions,
}: InventoryDetailFormRouterProps): ReactNode | undefined {
	const data = detail.editData

	if (detail.kind === 'tool') {
		return renderToolDetailEditForm({
			data,
			onSubmit,
			onPatch,
			statusOptions: toolStatusOptions,
			statusLabel: toolStatusLabels[data.status] ?? data.status,
			quantityLabel: numberValue(data.quantity),
			unitValueLabel: money(data.unit_value),
			totalValueLabel: money(toolTotalValue(data)),
			actions: renderActions(),
		})
	}

	if (detail.kind === 'material-purchase') {
		return renderMaterialPurchaseDetailEditor({
			data,
			onSubmit,
			onPatch,
			materialOptions,
			renderActions,
		})
	}

	if (detail.kind === 'material-consumption') {
		return renderMaterialConsumptionDetailEditor({
			data,
			onSubmit,
			onPatch,
			workOrderOptions,
			materialOptions,
			renderActions,
		})
	}

	return undefined
}
