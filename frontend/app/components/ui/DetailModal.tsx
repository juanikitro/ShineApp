import { ReactNode } from 'react'

import { ModalFrame } from './ModalFrame'

type AnyRecord = Record<string, any>

type DetailModalProps = {
	title: string
	data: AnyRecord
	onClose: () => void
	editing?: boolean
	editForm?: ReactNode
	motionPhase?: 'enter' | 'exit'
}

function formatDetailValue(value: any) {
	if (value === null || value === undefined || value === '') return 'Sin dato'
	if (typeof value === 'boolean') return value ? 'Si' : 'No'
	if (Array.isArray(value)) return `${value.length} items`
	if (typeof value === 'object') return JSON.stringify(value)
	return String(value)
}

export function DetailModal({
	title,
	data,
	onClose,
	editing = false,
	editForm,
}: DetailModalProps) {
	return (
		<ModalFrame title={title} onClose={onClose}>
			{editing && editForm ? (
				editForm
			) : (
				<dl className="detail-grid">
					{Object.entries(data)
						.filter(([key]) => !key.startsWith('_'))
						.map(([key, value]) => (
							<div className="detail-row" key={key}>
								<dt>{key.replaceAll('_', ' ')}</dt>
								<dd>{formatDetailValue(value)}</dd>
							</div>
						))}
				</dl>
			)}
		</ModalFrame>
	)
}
