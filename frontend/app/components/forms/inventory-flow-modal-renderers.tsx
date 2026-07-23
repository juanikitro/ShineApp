import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

import { HistoricalMaterialUsageForm } from './HistoricalMaterialUsageForm'
import { MaterialConsumptionForm } from './MaterialConsumptionForm'
import { MaterialOpenUnitForm } from './MaterialOpenUnitForm'
import { MaterialPurchaseForm } from './MaterialPurchaseForm'

type MaterialPurchaseModalProps = {
	onClose: () => void
	formProps: ComponentProps<typeof MaterialPurchaseForm>
}

export function renderMaterialPurchaseModal({
	onClose,
	formProps,
}: MaterialPurchaseModalProps): ReactNode {
	return (
		<Modal key="form-material-purchase" title="Registrar compra" onClose={onClose}>
			<MaterialPurchaseForm {...formProps} />
		</Modal>
	)
}

type MaterialOpenUnitModalProps = {
	onClose: () => void
	formProps: ComponentProps<typeof MaterialOpenUnitForm>
}

export function renderMaterialOpenUnitModal({
	onClose,
	formProps,
}: MaterialOpenUnitModalProps): ReactNode {
	return (
		<Modal key="form-material-open-unit" title="Abrir unidad" onClose={onClose}>
			<MaterialOpenUnitForm {...formProps} />
		</Modal>
	)
}

type HistoricalMaterialUsageModalProps = {
	onClose: () => void
	formProps: ComponentProps<typeof HistoricalMaterialUsageForm>
}

export function renderHistoricalMaterialUsageModal({
	onClose,
	formProps,
}: HistoricalMaterialUsageModalProps): ReactNode {
	return (
		<Modal
			key="form-material-historical-usage"
			title="Registrar consumo historico"
			onClose={onClose}
		>
			<HistoricalMaterialUsageForm {...formProps} />
		</Modal>
	)
}

type MaterialConsumptionModalProps = {
	onClose: () => void
	onSubmit: ComponentProps<typeof MaterialConsumptionForm>['onSubmit']
	renderFields: () => ReactNode
	submitLabel: string
	submitting: boolean
}

export function renderMaterialConsumptionModal({
	onClose,
	onSubmit,
	renderFields,
	submitLabel,
	submitting,
}: MaterialConsumptionModalProps): ReactNode {
	return (
		<Modal
			key="form-material-consumption"
			title="Registrar consumo"
			onClose={onClose}
		>
			<MaterialConsumptionForm
				onSubmit={onSubmit}
				fields={renderFields()}
				submitLabel={submitLabel}
				submitting={submitting}
			/>
		</Modal>
	)
}
