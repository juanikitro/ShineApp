'use client'

import { type ReactNode } from 'react'

import { Trash2 } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'

type DetailEditActionsProps = {
	canDelete: boolean
	onDelete: () => void
	disabled: boolean
	beforeSubmit?: ReactNode
}

export function DetailEditActions({
	canDelete,
	onDelete,
	disabled,
	beforeSubmit,
}: DetailEditActionsProps) {
	return (
		<div className="modal-actions split">
			{canDelete ? (
				<Button type="button" variant="danger" onClick={onDelete}>
					<Trash2 size={16} />
					Eliminar
				</Button>
			) : (
				<span />
			)}
			<div className="modal-actions detail-save-actions">
				{beforeSubmit}
				<Button type="submit" variant="primary" disabled={disabled}>
					Editar
				</Button>
			</div>
		</div>
	)
}
