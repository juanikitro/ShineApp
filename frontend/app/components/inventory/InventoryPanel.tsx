'use client'

import { type ReactNode, useMemo, useState } from 'react'

import { Package, Search } from 'lucide-react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Empty } from '@/app/components/ui/Empty'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import { type QuickAction } from '@/app/components/ui/QuickActionsMenu'
import { Button } from '@/app/components/ui/Button'
import {
	SegmentedControl,
	type SegmentedOption,
} from '@/app/components/ui/SegmentedControl'
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

type ServiceUsageBucket = {
	key: string
	materialName: string
	materialUnit: string
	unitCost: number
	serviceName: string
	unitsCount: number
	totalJobs: number
	totalQuantity: number
}

type InventoryPanelProps = {
	inventorySummary: AnyRecord
	loading?: boolean
	sectors?: AnyRecord[]
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
	onOpenHistoricalUsage: () => void
}

export function InventoryPanel({
	inventorySummary,
	loading = false,
	sectors = [],
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
	onOpenHistoricalUsage,
}: InventoryPanelProps) {
	const [selectedSectorKey, setSelectedSectorKey] = useState<string>('all')
	const [materialSearch, setMaterialSearch] = useState('')

	const activeSectors = useMemo(
		() => sectors.filter((s) => s.is_active !== false),
		[sectors],
	)

	const sectorTabOptions = useMemo<SegmentedOption<string>[]>(
		() => [
			{ value: 'all', label: 'Todos' },
			...activeSectors.map((s) => ({
				value: String(s.id),
				label: String(s.name ?? ''),
			})),
			{ value: 'none', label: 'Sin sector' },
		],
		[activeSectors],
	)

	const filteredMaterials = useMemo(() => {
		let result = materials
		if (selectedSectorKey === 'none') result = result.filter((m) => !m.sector)
		else if (selectedSectorKey !== 'all')
			result = result.filter((m) => String(m.sector) === selectedSectorKey)
		if (materialSearch.trim()) {
			const q = materialSearch.toLowerCase()
			result = result.filter((m) =>
				String(m.name ?? '').toLowerCase().includes(q),
			)
		}
		return result
	}, [materials, selectedSectorKey, materialSearch])

	// Map id -> material memoizado para el lookup O(1) de unidades abiertas
	// (antes .find() por unidad sobre todo el dataset de materiales).
	const materialsById = useMemo(() => {
		const map = new Map<string, AnyRecord>()
		for (const item of materials) map.set(String(item.id), item)
		return map
	}, [materials])

	// Consumo estimado por servicio, derivado de las unidades historicas
	// (is_historical) finalizadas: producto total / trabajos cubiertos.
	const serviceUsageRows = useMemo(() => {
		const grouped = new Map<string, ServiceUsageBucket>()
		for (const unit of materialOpenUnits) {
			if (!unit.is_historical || unit.status !== 'finished' || !unit.service) continue
			const key = `${unit.material}:${unit.service}`
			let bucket = grouped.get(key)
			if (!bucket) {
				const material = materialsById.get(String(unit.material))
				bucket = {
					key,
					materialName: unit.material_name ?? material?.name ?? 'Material',
					materialUnit: material?.unit ?? '',
					unitCost: material ? numberValue(material.estimated_unit_cost) : 0,
					serviceName: unit.service_name ?? 'Servicio',
					unitsCount: 0,
					totalJobs: 0,
					totalQuantity: 0,
				}
				grouped.set(key, bucket)
			}
			bucket.unitsCount += 1
			bucket.totalJobs += numberValue(unit.work_orders_count)
			bucket.totalQuantity += numberValue(unit.stock_quantity_to_decrement)
		}
		return Array.from(grouped.values())
			.map((bucket) => ({
				...bucket,
				consumptionPerService:
					bucket.totalJobs > 0 ? bucket.totalQuantity / bucket.totalJobs : 0,
			}))
			.sort(
				(a, b) =>
					String(a.serviceName).localeCompare(String(b.serviceName)) ||
					String(a.materialName).localeCompare(String(b.materialName)),
			)
	}, [materialOpenUnits, materialsById])

	return (
		<div className="grid">
			<section className="panel">
				<div className="panel-head">
					<div className="record-actions">
						<Button
							type="button"
							variant="primary"
							onClick={onOpenStockMovementForm}
						>
							<Package size={16} />
							Nuevo movimiento
						</Button>
						<Button type="button" variant="ghost" onClick={onOpenMaterialForm}>
							Nuevo material
						</Button>
						<Button type="button" variant="ghost" onClick={onOpenSupplierForm}>
							Proveedor
						</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={onOpenHistoricalUsage}
						>
							Consumo historico
						</Button>
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
					{loading && !materials.length && !stockMovements.length ? (
						<SkeletonList rows={6} columns={4} label="Cargando inventario" />
					) : null}

					{/* Materiales */}
					<div className="inventory-section-head">
						<span>Materiales</span>
						<label className="inventory-search">
							<Search size={13} aria-hidden />
							<input
								type="search"
								placeholder="Buscar material…"
								value={materialSearch}
								onChange={(e) => setMaterialSearch(e.target.value)}
							/>
						</label>
					</div>
					{activeSectors.length > 0 && (
						<SegmentedControl
							ariaLabel="Filtrar materiales por sector"
							className="inventory-sector-filter"
							options={sectorTabOptions}
							selectionMode="tabs"
							value={selectedSectorKey}
							onChange={setSelectedSectorKey}
						/>
					)}
					{filteredMaterials.length ? (
						filteredMaterials.map((item) => {
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
												Stock {quantity(item.stock_quantity, item.unit)} · {money(materialUnitValue(item))}/u · valorizado {money(materialStockValue(item))}
											</div>
											<div className="record-sub">
												{usage.count} usos · {quantity(usage.totalQuantity, item.unit)} consumidos · {money(usage.totalCost)} imputados
												{numberValue(item.open_units_active_count) > 0
													? ` · ${numberValue(item.open_units_active_count)} u. abiertas`
													: ''}
											</div>
										</div>
										<div className="record-actions">
											<Button
												type="button"
												variant="ghost"
												onClick={() => onOpenUnitForMaterial(item)}
											>
												Abrir unidad
											</Button>
											<Button
												type="button"
												variant="ghost"
												onClick={() => onOpenMaterialDetail(item)}
											>
												Editar
											</Button>
											<Button
												type="button"
												variant="danger"
												onClick={() => onDeleteMaterial(item)}
											>
												Inactivar
											</Button>
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

					{/* Unidades abiertas */}
					<div className="inventory-section-head">
						<span>Unidades abiertas</span>
					</div>
					{materialOpenUnits.slice(0, 8).map((item) => {
						const material = materialsById.get(String(item.material))
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
											{item.material_name}
										</div>
										<div className="record-sub">
											{item.status === 'open' ? 'Abierta' : 'Finalizada'} desde{' '}
											{item.opened_at}
											{item.finished_at ? ` · cierre ${item.finished_at}` : ''}
										</div>
										<div className="record-sub">
											{item.consumptions_count ?? 0} usos · {item.work_orders_count ?? 0} trabajos
											{item.duration_days ? ` · ${item.duration_days} días` : ''} · descuenta{' '}
											{quantity(item.stock_quantity_to_decrement, material?.unit)}
										</div>
									</div>
									{item.status === 'open' ||
									availableQuickActions(quickActions).length ? (
										<div className="record-actions">
											{item.status === 'open' ? (
												<Button
													type="button"
													variant="primary"
													onClick={() => onFinishOpenUnit(item)}
												>
													Finalizar
												</Button>
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
					{!materialOpenUnits.length && (
						<Empty text="Sin unidades abiertas." />
					)}

					{/* Consumo por servicio (solo si hay datos históricos) */}
					{serviceUsageRows.length > 0 && (
						<>
							<div className="inventory-section-head">
								<span>Consumo por servicio</span>
							</div>
							{serviceUsageRows.map((row) => (
								<MotionFlashSurface className="record" key={`su-${row.key}`}>
									<div className="record-head">
										<div>
											<div className="record-title">{row.serviceName}</div>
											<div className="record-sub">
												{row.materialName}: ~
												{row.consumptionPerService.toLocaleString('es-AR', {
													maximumFractionDigits: 3,
												})}{' '}
												{row.materialUnit} por servicio
												{row.unitCost > 0
													? ` · ${money(row.consumptionPerService * row.unitCost)}`
													: ''}
											</div>
											<div className="record-sub">
												{row.totalJobs} servicios en {row.unitsCount} unidad
												{row.unitsCount === 1 ? '' : 'es'} histórica
												{row.unitsCount === 1 ? '' : 's'}
											</div>
										</div>
									</div>
								</MotionFlashSurface>
							))}
						</>
					)}

					{/* Movimientos de stock */}
					<div className="inventory-section-head">
						<span>Movimientos recientes</span>
					</div>
					{stockMovements.slice(0, 8).map((item) => (
						<MotionFlashSurface
							className={recordClass('stock-movement', item.id)}
							key={`sm-${item.id}`}
							{...detailRecordProps('Movimiento de stock', item)}
						>
							<div className="record-head">
								<div>
									<div className="record-title">
										{stockMovementTypeLabels[item.movement_type] ??
											item.movement_type}{' '}
										· {money(item.total_amount)}
									</div>
									<div className="record-sub">
										{item.occurred_on} ·{' '}
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
												? ' · recibido'
												: ' · pendiente de recepción'
											: ''}
									</div>
								</div>
							</div>
						</MotionFlashSurface>
					))}
					{!stockMovements.length && (
						<Empty text="Sin movimientos de stock." />
					)}

					{/* Compras */}
					<div className="inventory-section-head">
						<span>Compras recientes</span>
					</div>
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
					{!purchases.length && (
						<Empty text="Sin compras registradas." />
					)}

					{/* Consumos */}
					{consumptions.length > 0 && (
						<>
							<div className="inventory-section-head">
								<span>Consumos</span>
							</div>
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
													Trabajo asociado · {item.quantity} · {money(item.estimated_total_cost)}
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
						</>
					)}
				</div>
			</section>
		</div>
	)
}
