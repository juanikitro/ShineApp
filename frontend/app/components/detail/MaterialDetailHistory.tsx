'use client'

import { type ReactNode } from 'react'

import { type AnyRecord } from '@/lib/page-support'

type MaterialUsage = {
	count: ReactNode
	totalCost: unknown
	totalQuantity: unknown
	rows: AnyRecord[]
}

type MaterialDetailHistoryProps = {
	material: AnyRecord
	usage: MaterialUsage
	openUnits: AnyRecord[]
	unitValue: unknown
	stockValue: unknown
	formatMoney: (value: unknown) => ReactNode
	formatQuantity: (value: any, unit?: string) => ReactNode
	formatNumber: (value: any) => ReactNode
	onOpenUsage: (item: AnyRecord) => void
	onOpenOpenUnit: (item: AnyRecord) => void
}

export function MaterialDetailHistory({
	material,
	usage,
	openUnits,
	unitValue,
	stockValue,
	formatMoney,
	formatQuantity,
	formatNumber,
	onOpenUsage,
	onOpenOpenUnit,
}: MaterialDetailHistoryProps) {
	return (
		<>
			<div className="material-summary">
				<div className="material-kpi">
					<span>Valor por unidad</span>
					<strong>{formatMoney(unitValue)}</strong>
				</div>
				<div className="material-kpi">
					<span>Stock valorizado</span>
					<strong>{formatMoney(stockValue)}</strong>
				</div>
				<div className="material-kpi">
					<span>Usos</span>
					<strong>{usage.count}</strong>
				</div>
				<div className="material-kpi">
					<span>Costo usado</span>
					<strong>{formatMoney(usage.totalCost)}</strong>
				</div>
			</div>
			<section className="linked-records">
				<div className="linked-records-head">
					<strong>Usos del material</strong>
					<span>
						{formatQuantity(usage.totalQuantity, material.unit)} usados
					</span>
				</div>
				{usage.rows.length ? (
					usage.rows.map((item) => (
						<button
							type="button"
							className="linked-record"
							key={item.id}
							onClick={() => onOpenUsage(item)}
						>
							<span>
								Trabajo asociado -{' '}
								{item.work_order_label ?? item.consumed_at}
							</span>
							<strong>
								{formatQuantity(item.quantity, material.unit)} -{' '}
								{formatMoney(item.estimated_total_cost)}
							</strong>
							<small>{item.consumed_at}</small>
						</button>
					))
				) : (
					<div className="info-note">Sin usos registrados para este material.</div>
				)}
			</section>
			<section className="linked-records">
				<div className="linked-records-head">
					<strong>Unidades abiertas</strong>
					<span>{formatNumber(material.open_units_active_count)} activas</span>
				</div>
				{openUnits.length ? (
					openUnits.map((item) => (
						<button
							type="button"
							className="linked-record"
							key={item.id}
							onClick={() => onOpenOpenUnit(item)}
						>
							<span>
								{item.status === 'open' ? 'Abierta' : 'Finalizada'}{' '}
								- {item.opened_at}
							</span>
							<strong>
								{item.consumptions_count ?? 0} usos -{' '}
								{item.work_orders_count ?? 0} trabajos
							</strong>
							<small>
								{item.duration_days ? `${item.duration_days} dias` : 'En uso'}
							</small>
						</button>
					))
				) : (
					<div className="info-note">Sin unidades abiertas para este material.</div>
				)}
			</section>
		</>
	)
}
