'use client'

import { type ReactNode } from 'react'

import { Hammer } from 'lucide-react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Empty } from '@/app/components/ui/Empty'
import { type QuickAction } from '@/app/components/ui/QuickActionsMenu'
import {
	money,
	type AnyRecord,
} from '@/lib/page-support'

type ToolsPanelProps = {
	filteredTools: AnyRecord[]
	search: string
	toolStatusLabels: Record<string, string>
	toolSummary: AnyRecord
	detailRecordProps: (title: string, data: AnyRecord) => AnyRecord
	quickActionTargetProps: (title: string, actions: QuickAction[]) => AnyRecord
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	renderQuickActionsTrigger: (
		label: string,
		actions: QuickAction[],
		ariaLabel?: string,
	) => ReactNode
	toolQuickActions: (tool: AnyRecord) => QuickAction[]
	toolTotalValue: (tool: AnyRecord) => number
	onDeleteTool: (tool: AnyRecord) => void
	onOpenToolDetail: (tool: AnyRecord) => void
	onOpenToolForm: () => void
	onSearchChange: (value: string) => void
}

export function ToolsPanel({
	filteredTools,
	search,
	toolStatusLabels,
	toolSummary,
	detailRecordProps,
	quickActionTargetProps,
	recordClass,
	renderQuickActionsTrigger,
	toolQuickActions,
	toolTotalValue,
	onDeleteTool,
	onOpenToolDetail,
	onOpenToolForm,
	onSearchChange,
}: ToolsPanelProps) {
	return (
		<div className="grid">
			<section className="panel">
				<div className="panel-head">
					<button type="button" className="primary" onClick={onOpenToolForm}>
						<Hammer size={16} />
						Nueva herramienta
					</button>
				</div>
				<div className="inventory-metrics">
					<div className="material-kpi">
						<span>Herramientas</span>
						<strong>{toolSummary.records}</strong>
					</div>
					<div className="material-kpi">
						<span>Unidades</span>
						<strong>{toolSummary.quantity}</strong>
					</div>
					<div className="material-kpi">
						<span>Valor total</span>
						<strong>{money(toolSummary.value)}</strong>
					</div>
				</div>
				<div className="toolbar toolbar-spaced">
					<input
						placeholder="Buscar por nombre, estado o notas"
						value={search}
						onChange={(event) => onSearchChange(event.target.value)}
					/>
				</div>
				<div className="records">
					{filteredTools.length ? (
						filteredTools.map((item) => {
							const quickActions = toolQuickActions(item)
							return (
								<MotionFlashSurface
									className={recordClass('tool', item.id)}
									key={item.id}
									{...detailRecordProps('Herramienta', item)}
									{...quickActionTargetProps(
										'Acciones de herramienta',
										quickActions,
									)}
								>
									<div className="record-head">
										<div>
											<div className="record-title">{item.name}</div>
											<div className="record-sub">
												{toolStatusLabels[item.status] ?? item.status} -{' '}
												{item.quantity} unidades - {money(item.unit_value)} c/u
												- valor {money(toolTotalValue(item))}
											</div>
											<div className="record-sub">
												{item.purchased_at
													? `Compra ${item.purchased_at}`
													: 'Sin fecha de compra'}
												{item.notes ? ` - ${item.notes}` : ''}
											</div>
										</div>
										<div className="record-actions">
											<button
												type="button"
												className="ghost"
												onClick={() => onOpenToolDetail(item)}
											>
												Editar
											</button>
											<button
												className="danger"
												type="button"
												onClick={() => onDeleteTool(item)}
											>
												Inactivar
											</button>
											{renderQuickActionsTrigger(
												'Acciones de herramienta',
												quickActions,
												'Acciones rapidas de herramienta',
											)}
										</div>
									</div>
								</MotionFlashSurface>
							)
						})
					) : (
						<Empty text="Sin herramientas." />
					)}
				</div>
			</section>
		</div>
	)
}
