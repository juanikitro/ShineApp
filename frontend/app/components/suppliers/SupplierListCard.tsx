'use client'

import { type HTMLAttributes, type ReactNode } from 'react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Button } from '@/app/components/ui/Button'
import { RecordCardHeader } from '@/app/components/ui/RecordCard'
import { type AnyRecord } from '@/lib/page-support'

type SupplierListCardProps = {
	supplier: AnyRecord
	insights: AnyRecord
	recordClassName: string
	quickActionProps: Pick<HTMLAttributes<HTMLDivElement>, 'onContextMenu'>
	subtitle: string
	canOpenDashboard: boolean
	onOpenDashboard: () => void
	onNewPurchase: () => void
	onEdit: () => void
	onDeactivate: () => void
	quickActionsTrigger: ReactNode
	money: (value: unknown) => string
	formatDateLabel: (value: unknown) => string
}

export function SupplierListCard({
	supplier,
	insights,
	recordClassName,
	quickActionProps,
	subtitle,
	canOpenDashboard,
	onOpenDashboard,
	onNewPurchase,
	onEdit,
	onDeactivate,
	quickActionsTrigger,
	money,
	formatDateLabel,
}: SupplierListCardProps) {
	return (
		<MotionFlashSurface className={recordClassName} {...quickActionProps}>
			<RecordCardHeader
				title={supplier.name}
				subtitle={subtitle}
				primaryAction={
					canOpenDashboard
						? {
								ariaLabel: `Abrir proveedor ${supplier.name}`,
								onClick: onOpenDashboard,
							}
						: undefined
				}
				actions={
					<>
						<Button type="button" variant="primary" onClick={onNewPurchase}>
							Nueva compra
						</Button>
						<Button type="button" variant="ghost" onClick={onEdit}>
							Editar
						</Button>
						<Button type="button" variant="danger" onClick={onDeactivate}>
							Inactivar
						</Button>
						{quickActionsTrigger}
					</>
				}
			>
				<div className="record-sub">
					Comprado {money(insights.total_purchased)} -{' '}
					{insights.purchase_count ?? 0} compras
					{insights.last_purchase_on
						? ` - ultima ${formatDateLabel(insights.last_purchase_on)}`
						: ''}
					{insights.materials_count
						? ` - ${insights.materials_count} materiales`
						: ''}
				</div>
				<div className="record-sub">
					{supplier.is_active === false ? 'Inactivo' : 'Activo'}
					{insights.pending_reception_count
						? ` - ${insights.pending_reception_count} compras pendientes de recepcion`
						: ' - sin recepcion pendiente'}
				</div>
			</RecordCardHeader>
		</MotionFlashSurface>
	)
}
