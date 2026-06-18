import { ReactNode } from 'react'

import { Pencil } from 'lucide-react'

import { CashEntryDetail } from '@/app/components/cash/CashEntryDetail'
import { buildDetailFields } from '@/lib/detail-format'

import { ModalFrame } from './ModalFrame'

type AnyRecord = Record<string, any>

type DetailModalProps = {
	title: string
	data: AnyRecord
	onClose: () => void
	kind?: string
	editing?: boolean
	editable?: boolean
	onEdit?: () => void
	editForm?: ReactNode
	motionPhase?: 'enter' | 'exit'
}

function DetailBody({ kind, data }: { kind?: string; data: AnyRecord }) {
	if (kind === 'cash-movement') {
		return <CashEntryDetail entry={data} />
	}
	const fields = buildDetailFields(data)
	if (!fields.length) {
		return <p className="detail-empty">Sin datos para mostrar.</p>
	}
	return (
		<dl className="detail-grid">
			{fields.map((field) => (
				<div className="detail-row" key={field.key}>
					<dt>{field.label}</dt>
					<dd>{field.value}</dd>
				</div>
			))}
		</dl>
	)
}

export function DetailModal({
	title,
	data,
	onClose,
	kind,
	editing = false,
	editable = false,
	onEdit,
	editForm,
}: DetailModalProps) {
	if (editing && editForm) {
		return (
			<ModalFrame title={title} onClose={onClose}>
				{editForm}
			</ModalFrame>
		)
	}

	return (
		<ModalFrame title={title} onClose={onClose}>
			<div className="detail-view">
				<DetailBody kind={kind} data={data} />
				{editable && onEdit ? (
					<div className="detail-view__actions">
						<button type="button" className="primary" onClick={onEdit}>
							<Pencil size={16} />
							Editar
						</button>
					</div>
				) : null}
			</div>
		</ModalFrame>
	)
}
