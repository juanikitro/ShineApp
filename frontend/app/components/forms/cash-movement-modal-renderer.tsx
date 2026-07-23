import { type ComponentProps, type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

import { CashMovementForm } from './CashMovementForm'

type CashMovementModalRendererProps = {
	onClose: () => void
	formProps: ComponentProps<typeof CashMovementForm>
}

export function renderCashMovementModal({
	onClose,
	formProps,
}: CashMovementModalRendererProps): ReactNode {
	return (
		<Modal key="form-cash-movement" title="Movimiento manual" onClose={onClose}>
			<CashMovementForm {...formProps} />
		</Modal>
	)
}
