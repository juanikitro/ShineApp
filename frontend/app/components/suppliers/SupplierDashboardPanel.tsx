'use client'

import { ChevronLeft, FileText, Package, ReceiptText } from 'lucide-react'

import { Empty, LoadingState } from '@/app/components/ui/Empty'
import { MetricCard } from '@/app/components/ui/MetricCard'
import { Panel } from '@/app/components/ui/Panel'
import {
	type AnyRecord,
	debtStatusLabels,
	formatDateLabel,
	formatDateTimeLabel,
	money,
	quantity,
} from '@/lib/page-support'

export function supplierProfileSubtitle(supplier: AnyRecord) {
	return [supplier.legal_name, supplier.category, supplier.tax_condition]
		.filter(Boolean)
		.join(' - ')
}

type SupplierDashboardPanelProps = {
	supplier: AnyRecord
	history: AnyRecord | null
	loading: boolean
	onBack: () => void
	onNewPurchase: (supplier: AnyRecord) => void
	onNewDebt: (supplier: AnyRecord) => void
	onOpenDetail: (title: string, data: AnyRecord) => void
}

export function SupplierDashboardPanel({
	supplier: initialSupplier,
	history,
	loading,
	onBack,
	onNewPurchase,
	onNewDebt,
	onOpenDetail,
}: SupplierDashboardPanelProps) {
	const hasDashboardHistory = Boolean(history)
	const actualHistory = history ?? {}
	const supplier = actualHistory.supplier ?? initialSupplier
	const summary = actualHistory.summary ?? {}
	const purchases: AnyRecord[] = actualHistory.purchases ?? []
	const pendingReceipts: AnyRecord[] = actualHistory.pending_receipts ?? []
	const materials: AnyRecord[] = actualHistory.materials ?? []
	const documents: AnyRecord[] = actualHistory.documents ?? []
	const cashMovements: AnyRecord[] = actualHistory.cash_movements ?? []
	const debts: AnyRecord[] = actualHistory.debts ?? []

	function renderMaterials(rows: AnyRecord[]) {
		return (
			<Panel
				title="Productos frecuentes"
				subtitle="Materiales comprados, volumen y precios recientes"
			>
				<div className="customer-ranking-list">
					{rows.length ? (
						rows.slice(0, 8).map((item: AnyRecord, index: number) => (
							<div
								className="customer-ranking-row"
								key={`supplier-material-${item.material ?? item.material_name}`}
							>
								<div className="customer-ranking-main">
									<div className="customer-ranking-title">
										<span className="customer-ranking-position">
											#{index + 1}
										</span>
										<strong>{item.material_name || 'Material sin nombre'}</strong>
									</div>
									<span>
										{item.purchase_count ?? 0}{' '}
										{item.purchase_count === 1 ? 'compra' : 'compras'}
									</span>
								</div>
								<div className="customer-ranking-values">
									<span>
										Cantidad{' '}
										<strong>
											{quantity(item.total_quantity, item.material_unit)}
										</strong>
									</span>
									<span>
										Comprado <strong>{money(item.total_purchased)}</strong>
									</span>
									<span>
										Ultimo precio{' '}
										<strong>{money(item.last_unit_price)}</strong>
									</span>
								</div>
								<div className="record-sub">
									{(item.recent_unit_prices ?? []).length
										? (item.recent_unit_prices ?? [])
												.slice(0, 3)
												.map(
													(price: AnyRecord) =>
														`${formatDateLabel(price.occurred_on)}: ${money(price.unit_price)}`,
												)
												.join(' - ')
										: 'Sin precios unitarios recientes.'}
								</div>
							</div>
						))
					) : (
						<Empty text="Este proveedor todavia no tiene materiales comprados." />
					)}
				</div>
			</Panel>
		)
	}

	function renderPurchases(rows: AnyRecord[]) {
		return (
			<Panel title="Historial de compras" subtitle={`${rows.length} movimientos`}>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 10).map((item: AnyRecord) => (
							<button
								className="record compact"
								key={`supplier-purchase-${item.id}`}
								onClick={() => onOpenDetail('Movimiento de stock', item)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{formatDateLabel(item.occurred_on)} -{' '}
											{money(item.total_amount)}
										</div>
										<div className="record-sub">
											{(item.lines ?? []).length} producto
											{(item.lines ?? []).length === 1 ? '' : 's'} -{' '}
											{item.products_received
												? 'recibido'
												: 'pendiente de recepcion'}
										</div>
										{item.document_number || item.document_type_label ? (
											<div className="record-sub">
												{item.document_type_label || 'Comprobante'}{' '}
												{item.document_number || ''}
											</div>
										) : null}
									</div>
									<div className="record-actions">
										<span className="status">
											{item.payment_method_label || item.payment_method}
										</span>
									</div>
								</div>
							</button>
						))
					) : (
						<Empty text="Este proveedor no tiene compras registradas." />
					)}
				</div>
			</Panel>
		)
	}

	function renderPendingReceipts(rows: AnyRecord[]) {
		return (
			<Panel
				title="Recepcion pendiente"
				subtitle={`${rows.length} compras sin ingreso de stock`}
			>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 6).map((item: AnyRecord) => (
							<button
								className="record compact"
								key={`supplier-pending-${item.id}`}
								onClick={() => onOpenDetail('Movimiento de stock', item)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{formatDateLabel(item.occurred_on)} -{' '}
											{money(item.total_amount)}
										</div>
										<div className="record-sub">
											{(item.lines ?? [])
												.map((line: AnyRecord) => line.material_name)
												.filter(Boolean)
												.slice(0, 4)
												.join(' - ') || 'Sin detalle de materiales'}
										</div>
									</div>
									<span className="status warning">Pendiente</span>
								</div>
							</button>
						))
					) : (
						<Empty text="No hay compras pendientes de recepcion." />
					)}
				</div>
			</Panel>
		)
	}

	function renderDocuments(rows: AnyRecord[]) {
		return (
			<Panel title="Comprobantes" subtitle={`${rows.length} asociados`}>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 8).map((item: AnyRecord) => (
							<div className="record compact" key={`supplier-document-${item.id}`}>
								<div className="record-head">
									<div>
										<div className="record-title">
											{item.document_type_label || 'Comprobante'}{' '}
											{item.document_number || `#${item.id}`}
										</div>
										<div className="record-sub">
											{formatDateLabel(item.occurred_on)} -{' '}
											{money(item.total_amount)}
										</div>
									</div>
									<div className="record-actions">
										{item.document_file_url ? (
											<a
												className="ghost inline-link-button"
												href={item.document_file_url}
												rel="noreferrer"
												target="_blank"
											>
												<FileText size={16} />
												Abrir
											</a>
										) : null}
									</div>
								</div>
							</div>
						))
					) : (
						<Empty text="Sin comprobantes asociados." />
					)}
				</div>
			</Panel>
		)
	}

	function renderCashMovements(rows: AnyRecord[]) {
		return (
			<Panel title="Caja asociada" subtitle={`${rows.length} egresos por compras`}>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 8).map((item: AnyRecord) => (
							<button
								className="record compact"
								key={`supplier-cash-${item.id}`}
								onClick={() => onOpenDetail('Movimiento de caja', item)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											{item.description || item.category}
										</div>
										<div className="record-sub">
											{formatDateTimeLabel(item.occurred_at)} -{' '}
											{item.category || 'Sin categoria'}
											{item.subcategory ? ` - ${item.subcategory}` : ''}
										</div>
									</div>
									<span className="status expense">{money(item.amount)}</span>
								</div>
							</button>
						))
					) : (
						<Empty text="Este proveedor no genero egresos de caja." />
					)}
				</div>
			</Panel>
		)
	}

	function renderDebts(rows: AnyRecord[]) {
		return (
			<Panel title="Deudas vinculadas" subtitle={`${rows.length} registros`}>
				<div className="records compact-records">
					{rows.length ? (
						rows.slice(0, 8).map((item: AnyRecord) => (
							<button
								className="record compact"
								key={`supplier-debt-${item.id}`}
								onClick={() => onOpenDetail('Deuda', item)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">{item.concept}</div>
										<div className="record-sub">
											{formatDateLabel(item.origin_date)} - original{' '}
											{money(item.principal_amount)} - saldo{' '}
											{money(item.balance_due)}
										</div>
									</div>
									<span className={`status ${item.status}`}>
										{debtStatusLabels[item.status] ?? item.status}
									</span>
								</div>
							</button>
						))
					) : (
						<Empty text="Sin deudas vinculadas a este proveedor." />
					)}
				</div>
			</Panel>
		)
	}

	return (
		<div className="grid customer-dashboard supplier-dashboard">
			<Panel>
				<div className="customer-dashboard-head supplier-dashboard-head">
					<button
						type="button"
						className="ghost"
						onClick={onBack}
					>
						<ChevronLeft size={16} />
						Proveedores
					</button>
					<div>
						<h2>{supplier.name}</h2>
						<p>{supplierProfileSubtitle(supplier) || 'Dashboard operativo del proveedor'}</p>
					</div>
					<div className="record-actions">
						<button
							type="button"
							className="primary"
							onClick={() => onNewPurchase(supplier)}
						>
							<Package size={16} />
							Nueva compra
						</button>
						<button
							type="button"
							className="ghost"
							onClick={() => onNewDebt(supplier)}
						>
							<ReceiptText size={16} />
							Nueva deuda
						</button>
						<button
							type="button"
							className="ghost"
							onClick={() => onOpenDetail('Proveedor', supplier)}
						>
							Editar proveedor
						</button>
					</div>
				</div>
				<div className="customer-dashboard-profile supplier-dashboard-profile">
					<div>
						<span>Contacto</span>
						<strong>{supplier.contact_name || 'Sin contacto'}</strong>
					</div>
					<div>
						<span>Telefono</span>
						<strong>{supplier.phone || 'Sin telefono'}</strong>
					</div>
					<div>
						<span>Email</span>
						<strong>{supplier.email || 'Sin email'}</strong>
					</div>
					<div>
						<span>CUIT</span>
						<strong>{supplier.tax_id || 'Sin CUIT'}</strong>
					</div>
					<div>
						<span>Website</span>
						<strong>{supplier.website || 'Sin web'}</strong>
					</div>
					<div>
						<span>Estado</span>
						<strong>{supplier.is_active === false ? 'Inactivo' : 'Activo'}</strong>
					</div>
				</div>
			</Panel>

			{loading ? (
				<LoadingState text="Cargando dashboard del proveedor..." />
			) : null}

			{!loading && !hasDashboardHistory ? (
				<div className="info-note">
					No se pudo cargar el historial operativo del proveedor. El listado
					sigue disponible para evitar datos incompletos.
				</div>
			) : null}

			{hasDashboardHistory ? (
				<>
					<div className="customer-dashboard-metrics supplier-dashboard-metrics">
						<MetricCard
							label="Comprado"
							value={money(summary.total_purchased)}
						/>
						<MetricCard
							label="Compras"
							value={summary.purchase_count ?? 0}
						/>
						<MetricCard
							label="Ultima compra"
							value={
								summary.last_purchase_on
									? formatDateLabel(summary.last_purchase_on)
									: 'Sin compras'
							}
						/>
						<MetricCard
							label="Pendiente recepcion"
							value={summary.pending_reception_count ?? 0}
						/>
						<MetricCard
							label="Egresos caja"
							value={money(summary.cash_expense_total)}
						/>
						<MetricCard
							label="Deuda vinculada"
							value={money(summary.debt_balance_due_total)}
						/>
					</div>

					<Panel title="Perfil operativo" subtitle="Datos fiscales, contacto y notas internas">
						<div className="customer-dashboard-insights">
							<div className="customer-dashboard-card">
								<span>Razon social</span>
								<strong>{supplier.legal_name || supplier.name}</strong>
								<small>{supplier.tax_condition || 'Sin condicion fiscal'}</small>
							</div>
							<div className="customer-dashboard-card">
								<span>Rubro</span>
								<strong>{supplier.category || 'Sin rubro'}</strong>
								<small>{supplier.address || 'Sin direccion fiscal'}</small>
							</div>
							<div className="customer-dashboard-card">
								<span>Notas internas</span>
								<strong>{supplier.notes || 'Sin notas'}</strong>
								<small>
									{summary.materials_count ?? 0} materiales comprados
								</small>
							</div>
						</div>
					</Panel>

					<div className="grid two">
						{renderMaterials(materials)}
						{renderPendingReceipts(pendingReceipts)}
					</div>

					<div className="grid two">
						{renderPurchases(purchases)}
						{renderDocuments(documents)}
					</div>

					<div className="grid two">
						{renderCashMovements(cashMovements)}
						{renderDebts(debts)}
					</div>
				</>
			) : null}
		</div>
	)
}
