'use client'

import { memo } from 'react'

import { Eye } from 'lucide-react'

import { RecordCard, RecordCardHeader } from '@/app/components/ui/RecordCard'
import { auditActorLabel, auditChangeRows, type AuditLogEntry } from '@/lib/audit-log'
import { formatDateTimeLabel, type AnyRecord } from '@/lib/page-support'

type AuditLogCardProps = {
	item: AnyRecord
	expanded: boolean
	currentUserId?: number | string | null
	onToggle: (id: string | null) => void
	onAuditActionLabel: (action: string) => string
	onAuditModuleLabel: (module: string) => string
}

function auditFieldLabel(field: string) {
	return field.replaceAll('_', ' ')
}

export const AuditLogCard = memo(function AuditLogCard({
	item,
	expanded,
	currentUserId,
	onToggle,
	onAuditActionLabel,
	onAuditModuleLabel,
}: AuditLogCardProps) {
	const itemId = String(item.id)
	const rows = auditChangeRows(item.changes ?? {})
	const actorLabel = auditActorLabel(item as AuditLogEntry, currentUserId)

	return (
		<RecordCard className="audit-log-card" key={item.id}>
			<RecordCardHeader
				title={
					<>
						{onAuditActionLabel(String(item.action ?? ''))} -{' '}
						{item.entity_label || item.entity_type || 'Registro'}
					</>
				}
				subtitle={
					<>
						{onAuditModuleLabel(String(item.module ?? ''))} -{' '}
						{String(item.entity_type ?? '')}
						{item.entity_id ? ` #${item.entity_id}` : ''}
					</>
				}
				actions={
					<button
						type="button"
						className="ghost"
						onClick={() => onToggle(expanded ? null : itemId)}
					>
						<Eye size={16} />
						{expanded ? 'Ocultar' : 'Detalle'}
					</button>
				}
			>
				<div className="record-sub">
					{formatDateTimeLabel(item.created_at)} - {actorLabel}
				</div>
			</RecordCardHeader>
			{expanded ? (
				<div className="audit-change-table">
					<div className="audit-change-row audit-change-row--head">
						<span>Campo</span>
						<span>Antes</span>
						<span>Despues</span>
					</div>
					{rows.length ? (
						rows.map((row) => (
							<div className="audit-change-row" key={row.field}>
								<span>{auditFieldLabel(row.field)}</span>
								<strong>{row.before}</strong>
								<strong>{row.after}</strong>
							</div>
						))
					) : (
						<div className="record-sub audit-empty-change">
							Accion registrada sin cambios campo por campo.
						</div>
					)}
				</div>
			) : null}
		</RecordCard>
	)
})
