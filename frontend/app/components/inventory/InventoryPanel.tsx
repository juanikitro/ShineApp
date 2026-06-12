'use client'

import { type ReactNode } from 'react'

import { Package } from 'lucide-react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Empty } from '@/app/components/ui/Empty'
import { type QuickAction } from '@/app/components/ui/QuickActionsMenu'
import { joinDisplayParts } from '@/lib/display-text'
import {
	money,
	numberValue,
	quantity,
	type AnyRecord,
} from '@/lib/page-support'

type MaterialUsageSummary = {
	count: number
	totalQuantity: number
	totalCost: number
}

type InventoryPanelProps = {
	inventorySummary: AnyRecord
	stockMovements: AnyRecord[]
	stockMovementTypeLabels: Record<string, string>
	suppliers: AnyRecord[]
	materials: AnyRecord[]
	materialOpenUnits: AnyRecord[]
	purchases: AnyRecord[]
	consumptions: AnyRecord[]
	availableQuickActions: (actions: QuickAction[]) => QuickAction[]
	detailRecordProps: (title: string, data: AnyRecord) => AnyRecord
	interactiveRecordProps: (onOpen: () => void) => AnyRecord
	materialConsumptionQuickActions: (item: AnyRecord) => QuickAction[]
	materialOpenUnitQuickActions: (item: AnyRecord) => QuickAction[]
	materialPurchaseQuickActions: (item: AnyRecord) => QuickAction[]
	materialQuickActions: (item: AnyRecord) => QuickAction[]
	materialStockValue: (material: AnyRecord) => number
	materialUnitValue: (material: AnyRecord) => number
	materialUsageSummary: (material: AnyRecord) => MaterialUsageSummary
	quickActionTargetProps: (title: string, actions: QuickAction[]) => AnyRecord
	recordClass: (
		kind: string,
		id: string | number,
		extraClass?: string,
	) => string
	renderQuickActionsTrigger: (
		label: string,
		actions: QuickAction[],
		ariaLabel?: string,
	) => ReactNode
	supplierListInsight: (supplier: AnyRecord) => AnyRecord
	supplierProfileSubtitle: (supplier: AnyRecord) => string
	supplierQuickActions: (item: AnyRecord) => QuickAction[]
	onDeleteMaterial: (item: AnyRecord) => void
	onFinishOpenUnit: (item: AnyRecord) => void
	onOpenMaterialDetail: (item: AnyRecord) => void
	onOpenMaterialForm: () => void
	onOpenStockMovementForm: () => void
	onOpenSupplierDashboard: (item: AnyRecord) => void
	onOpenSupplierForm: () => void
	onOpenUnitForMaterial: (item: AnyRecord) => void
}

export function InventoryPanel({
	inventorySummary,
	stockMovements,
	stockMovementTypeLabels,
	suppliers,
	materials,
	materialOpenUnits,
	purchases,
	consumptions,
	availableQuickActions,
	detailRecordProps,
	interactiveRecordProps,
	materialConsumptionQuickActions,
	materialOpenUnitQuickActions,
	materialPurchaseQuickActions,
	materialQuickActions,
	materialStockValue,
	materialUnitValue,
	materialUsageSummary,
	quickActionTargetProps,
	recordClass,
	renderQuickActionsTrigger,
	supplierListInsight,
	supplierProfileSubtitle,
	supplierQuickActions,
	onDeleteMaterial,
	onFinishOpenUnit,
	onOpenMaterialDetail,
	onOpenMaterialForm,
	onOpenStockMovementForm,
	onOpenSupplierDashboard,
	onOpenSupplierForm,
	onOpenUnitForMaterial,
}: InventoryPanelProps) {
	return (
		<div className="grid">
			<section className="panel">
				<div className="panel-head">
					<div className="record-actions">
						<button
							type="button"
							className="primary"
							onClick={onOpenStockMovementForm}
						>
							<Package size={16} />
							Nuevo movimiento
						</button>
						<button type="button" className="ghost" onClick={onOpenMaterialForm}>
							Nuevo material
						</button>
						<button type="button" className="ghost" onClick={onOpenSupplierForm}>
							Proveedor
						</button>
					</div>
				</div>
				<div className="inventory-metrics">
					<div className="material-kpi">
						<span>Stock valorizado</span>
						<strong>{money(inventorySummary.stockValue)}</strong>
					</div>
					<div className="material-kpi">
						<span>Usos registrados</span>
						<strong>{inventorySummary.usageCount}</strong>
					</div>
					<div className="material-kpi">
						<span>Costo imputado</span>
						<strong>{money(inventorySummary.consumedCost)}</strong>
					</div>
					<div className="material-kpi">
						<span>Unidades abiertas</span>
						<strong>{inventorySummary.openUnits}</strong>
					</div>
				</div>
				<div className="records">
					{stockMovements.slice(0, 8).map((item) => (
						<MotionFlashSurface
							className={recordClass('stock-movement', item.id)}
							key={`sm-${item.id}`}
						>
							<div className="record-head">
								<div>
									<div className="record-title">
										{stockMovementTypeLabels[item.movement_type] ??
											item.movement_type}{' '}
										- {money(item.total_amount)}
									</div>
									<div className="record-sub">
										{item.occurred_on} -{' '}
										{item.supplier_name ||
											item.customer_name ||
											item.reservation_label ||
											'Movimiento interno'}
									</div>
									<div className="record-sub">
										{(item.lines ?? []).length} producto
										{(item.lines ?? []).length === 1 ? '' : 's'}
										{item.movement_type === 'purchase'
											? item.products_received
												? ' - recibido'
												: ' - pendiente de recepcion'
											: ''}
									</div>
								</div>
							</div>
						</MotionFlashSurface>
					))}
					{stockMovements.length ? null : (
						<Empty text="Sin movimientos de stock." />
					)}
					{suppliers.slice(0, 5).map((item) => {
						const quickActions = supplierQuickActions(item)
						const insights = supplierListInsight(item)
						return (
							<MotionFlashSurface
								className={recordClass('supplier', item.id)}
								key={`supplier-${item.id}`}
								{...interactiveRecordProps(() => onOpenSupplierDashboard(item))}
								{...quickActionTargetProps(
									'Acciones de proveedor',
									quickActions,
								)}
							>
								<div className="record-head">
									<div>
										<div className="record-title">Proveedor - {item.name}</div>
										<div className="record-sub">
											{supplierProfileSubtitle(item) ||
												[item.contact_name, item.phone, item.email]
													.filter(Boolean)
													.join(' - ') ||
												'Sin datos de contacto'}
										</div>
										<div className="record-sub">
											Comprado {money(insights.total_purchased)} -{' '}
											{insights.purchase_count ?? 0} compras
										</div>
									</div>
									<div className="record-actions">
										{renderQuickActionsTrigger(
											'Acciones de proveedor',
											quickActions,
											'Acciones rapidas de proveedor',
										)}
									</div>
								</div>
							</MotionFlashSurface>
						)
					})}
					{suppliers.length ? null : (
						<Empty text="Sin proveedores cargados." />
					)}
					{materials.length ? (
						materials.map((item) => {
							const usage = materialUsageSummary(item)
							const quickActions = materialQuickActions(item)
							return (
								<MotionFlashSurface
									className={recordClass('material', item.id)}
									key={item.id}
									{...detailRecordProps('Material', item)}
									{...quickActionTargetProps(
										'Acciones de material',
										quickActions,
									)}
								>
									<div className="record-head">
										<div>
											<div className="record-title">{item.name}</div>
											<div className="record-sub">
												Stock {quantity(item.stock_quantity, item.unit)} -
												unidad {money(materialUnitValue(item))} - stock
												valorizado {money(materialStockValue(item))}
											</div>
											<div className="record-sub">
												{usage.count} usos -{' '}
												{quantity(usage.totalQuantity, item.unit)} consumidos -{' '}
												{money(usage.totalCost)} imputados
											</div>
											<div className="record-sub">
												{numberValue(item.open_units_active_count)} unidades
												abiertas - {numberValue(item.open_units_finished_count)}{' '}
												finalizadas - promedio{' '}
												{numberValue(
													item.average_jobs_per_finished_unit,
												).toLocaleString('es-AR', {
													maximumFractionDigits: 1,
												})}{' '}
												trabajos /{' '}
												{numberValue(
													item.average_days_per_finished_unit,
												).toLocaleString('es-AR', {
													maximumFractionDigits: 1,
												})}{' '}
												dias
											</div>
										</div>
										<div className="record-actions">
											<button
												type="button"
												className="ghost"
												onClick={() => onOpenUnitForMaterial(item)}
											>
												Abrir unidad
											</button>
											<button
												type="button"
												className="ghost"
												onClick={() => onOpenMaterialDetail(item)}
											>
												Editar
											</button>
											<button
												type="button"
												className="danger"
												onClick={() => onDeleteMaterial(item)}
											>
												Inactivar
											</button>
											{renderQuickActionsTrigger(
												'Acciones de material',
												quickActions,
												'Acciones rapidas de material',
											)}
										</div>
									</div>
								</MotionFlashSurface>
							)
						})
					) : (
						<Empty text="Sin materiales." />
					)}
					{materialOpenUnits.slice(0, 8).map((item) => {
						const material = materials.find(
							(materialItem) =>
								String(materialItem.id) === String(item.material),
						)
						const quickActions = materialOpenUnitQuickActions(item)
						return (
							<MotionFlashSurface
								className={recordClass('material-open-unit', item.id)}
								key={`ou-${item.id}`}
								{...detailRecordProps('Unidad abierta', item)}
								{...quickActionTargetProps('Acciones de unidad', quickActions)}
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											Unidad abierta - {item.material_name}
										</div>
										<div className="record-sub">
											{item.status === 'open' ? 'Abierta' : 'Finalizada'} desde{' '}
											{item.opened_at}
											{item.finished_at ? ` - cierre ${item.finished_at}` : ''}
										</div>
										<div className="record-sub">
											{item.consumptions_count ?? 0} usos -{' '}
											{item.work_orders_count ?? 0} trabajos
											{item.duration_days ? ` - ${item.duration_days} dias` : ''}{' '}
											- descuenta{' '}
											{quantity(
												item.stock_quantity_to_decrement,
												material?.unit,
											)}
										</div>
									</div>
									{item.status === 'open' ||
									availableQuickActions(quickActions).length ? (
										<div className="record-actions">
											{item.status === 'open' ? (
												<button
													className="primary"
													onClick={() => onFinishOpenUnit(item)}
												>
													Finalizar
												</button>
											) : null}
											{renderQuickActionsTrigger(
												'Acciones de unidad',
												quickActions,
												'Acciones rapidas de unidad',
											)}
										</div>
									) : null}
								</div>
							</MotionFlashSurface>
						)
					})}
					{materialOpenUnits.length ? null : (
						<Empty text="Sin unidades abiertas." />
					)}
					{purchases.slice(0, 5).map((item) => {
						const quickActions = materialPurchaseQuickActions(item)
						return (
							<MotionFlashSurface
								className={recordClass('material-purchase', item.id)}
								key={`p-${item.id}`}
								{...detailRecordProps('Compra de material', item)}
								{...quickActionTargetProps('Acciones de compra', quickActions)}
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{joinDisplayParts(['Compra', item.material_name])}
										</div>
										<div className="record-sub">
											{joinDisplayParts([
												item.quantity,
												money(item.total_cost),
												item.purchased_at,
											])}
										</div>
									</div>
									<div className="record-actions">
										{renderQuickActionsTrigger(
											'Acciones de compra',
											quickActions,
											'Acciones rapidas de compra',
										)}
									</div>
								</div>
							</MotionFlashSurface>
						)
					})}
					{purchases.length ? null : (
						<Empty text="Sin compras registradas." />
					)}
					{consumptions.slice(0, 5).map((item) => {
						const quickActions = materialConsumptionQuickActions(item)
						return (
							<MotionFlashSurface
								className={recordClass('material-consumption', item.id)}
								key={`c-${item.id}`}
								{...detailRecordProps('Consumo de material', item)}
								{...quickActionTargetProps('Acciones de consumo', quickActions)}
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{joinDisplayParts(['Consumo', item.material_name])}
										</div>
										<div className="record-sub">
											Trabajo asociado - {item.quantity} -{' '}
											{money(item.estimated_total_cost)}
										</div>
									</div>
									<div className="record-actions">
										{renderQuickActionsTrigger(
											'Acciones de consumo',
											quickActions,
											'Acciones rapidas de consumo',
										)}
									</div>
								</div>
							</MotionFlashSurface>
						)
					})}
				</div>
			</section>
		</div>
	)
}
