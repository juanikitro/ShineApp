import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

import { StockMovementForm } from './StockMovementForm'

type StockMovementModalRendererProps = {
	onClose: () => void
	formProps: ComponentProps<typeof StockMovementForm>
}

export function renderStockMovementModal({
	onClose,
	formProps,
}: StockMovementModalRendererProps): ReactNode {
	return (
		<Modal
			key="form-stock-movement"
			title="Crear movimiento de stock"
			onClose={onClose}
		>
			<StockMovementForm {...formProps} />
		</Modal>
	)
}
