'use client'

import { type HTMLAttributes, type ReactNode } from 'react'

import { Button } from '@/app/components/ui/Button'
import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { type AnyRecord } from '@/lib/page-support'

type VehicleListCardProps = {
	item: AnyRecord
	recordClassName: string
	detailProps: Pick<
		HTMLAttributes<HTMLDivElement>,
		'role' | 'tabIndex' | 'onClick' | 'onKeyDown'
	>
	quickActionProps: Pick<HTMLAttributes<HTMLDivElement>, 'onContextMenu'>
	quickActionsTrigger: ReactNode
	title: string
	description: string
	onEdit: () => void
	onDeactivate: () => void
}

export function VehicleListCard({
	item,
	recordClassName,
	detailProps,
	quickActionProps,
	quickActionsTrigger,
	title,
	description,
	onEdit,
	onDeactivate,
}: VehicleListCardProps) {
	return (
		<MotionFlashSurface
			className={recordClassName}
			{...detailProps}
			{...quickActionProps}
		>
			{quickActionsTrigger}
			<div className="record-head">
				<div>
					<div className="record-title">{title}</div>
					<div className="record-sub">{description}</div>
				</div>
				<div className="record-actions">
					<Button variant="ghost" onClick={onEdit}>
						Editar
					</Button>
					<Button variant="danger" onClick={onDeactivate}>
						Baja
					</Button>
				</div>
			</div>
		</MotionFlashSurface>
	)
}
