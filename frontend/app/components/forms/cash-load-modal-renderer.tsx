import { type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'
import {
	SegmentedControl,
	type SegmentedOption,
} from '@/app/components/ui/SegmentedControl'

export type CashLoadTab = 'cash-movement' | 'payment' | 'debt-payment'

export const cashLoadTabOptions: ReadonlyArray<SegmentedOption<CashLoadTab>> = [
	{ value: 'cash-movement', label: 'Movimiento normal' },
	{ value: 'debt-payment', label: 'Pagar deuda' },
	{ value: 'payment', label: 'Cobrar trabajo' },
]

type CashLoadModalRendererProps = {
	cashLoadTab: CashLoadTab
	cashLoadTabOptions: ReadonlyArray<SegmentedOption<CashLoadTab>>
	onTabChange: (tab: CashLoadTab) => void
	onClose: () => void
	renderCashMovementForm: () => ReactNode
	renderPaymentForm: () => ReactNode
	renderDebtPaymentForm: () => ReactNode
}

export function renderCashLoadModal({
	cashLoadTab,
	cashLoadTabOptions,
	onTabChange,
	onClose,
	renderCashMovementForm,
	renderPaymentForm,
	renderDebtPaymentForm,
}: CashLoadModalRendererProps): ReactNode {
	return (
		<Modal key="form-cash-load" title="Cargar movimiento" onClose={onClose}>
			<div className="cash-load-modal">
				<SegmentedControl
					ariaLabel="Tipo de movimiento"
					className="cash-load-toggle"
					selectionMode="tabs"
					options={cashLoadTabOptions}
					value={cashLoadTab}
					onChange={onTabChange}
				/>
				{cashLoadTab === 'cash-movement' ? (
					renderCashMovementForm()
				) : null}
				{cashLoadTab === 'payment' ? (
					renderPaymentForm()
				) : null}
				{cashLoadTab === 'debt-payment' ? (
					renderDebtPaymentForm()
				) : null}
			</div>
		</Modal>
	)
}
