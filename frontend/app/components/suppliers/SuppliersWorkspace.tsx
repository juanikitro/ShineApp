'use client'

import { type ReactNode } from 'react'

import { Building2, Package } from 'lucide-react'

import { SupplierListCard } from '@/app/components/suppliers/SupplierListCard'
import { Button } from '@/app/components/ui/Button'
import { Empty } from '@/app/components/ui/Empty'
import { type QuickAction } from '@/app/components/ui/QuickActionsMenu'
import { supplierProfileSubtitle } from '@/app/components/suppliers/SupplierDashboardPanel'
import { supplierListInsight } from '@/lib/inventory-display'
import { type AnyRecord } from '@/lib/page-support'

type SuppliersWorkspaceProps = {
	suppliers: AnyRecord[]
	search: string
	onSearchChange: (value: string) => void
	onCreateSupplier: () => void
	onCreatePurchase: () => void
	canViewEconomy: boolean
	getRecordClassName: (item: AnyRecord) => string
	quickActionTargetProps: (
		title: string,
		actions: QuickAction[],
	) => Parameters<typeof SupplierListCard>[0]['quickActionProps']
	supplierQuickActions: (item: AnyRecord) => QuickAction[]
	renderQuickActionsTrigger: (
		title: string,
		actions: QuickAction[],
		ariaLabel?: string,
	) => ReactNode
	onOpenDashboard: (item: AnyRecord) => void
	onNewPurchaseForSupplier: (item: AnyRecord) => void
	onEdit: (item: AnyRecord) => void
	onDeactivate: (item: AnyRecord) => void
	money: (value: unknown) => string
	formatDateLabel: (value: unknown) => string
}

export function SuppliersWorkspace({
	suppliers,
	search,
	onSearchChange,
	onCreateSupplier,
	onCreatePurchase,
	canViewEconomy,
	getRecordClassName,
	quickActionTargetProps,
	supplierQuickActions,
	renderQuickActionsTrigger,
	onOpenDashboard,
	onNewPurchaseForSupplier,
	onEdit,
	onDeactivate,
	money,
	formatDateLabel,
}: SuppliersWorkspaceProps) {
	return (
		<div className="grid">
			<section className="panel">
				<div className="panel-head">
					<div>
						<h2>Proveedores</h2>
						<p>Compras, materiales, comprobantes, caja y deuda vinculada.</p>
					</div>
					<div className="record-actions">
						<Button type="button" variant="primary" onClick={onCreateSupplier}>
							<Building2 size={16} />
							Nuevo proveedor
						</Button>
						<Button type="button" variant="ghost" onClick={onCreatePurchase}>
							<Package size={16} />
							Nueva compra
						</Button>
					</div>
				</div>
				<div className="toolbar toolbar-spaced">
					<input
						placeholder="Buscar por proveedor, razon social, rubro, contacto o CUIT"
						value={search}
						onChange={(event) => onSearchChange(event.target.value)}
					/>
				</div>
				<div className="records">
					{suppliers.length ? (
						suppliers.map((item) => {
							const insights = supplierListInsight(item)
							const quickActions = supplierQuickActions(item)
							return (
								<SupplierListCard
									key={`supplier-page-${item.id}`}
									supplier={item}
									insights={insights}
									recordClassName={getRecordClassName(item)}
									quickActionProps={quickActionTargetProps(
										'Acciones de proveedor',
										quickActions,
									)}
									subtitle={
										supplierProfileSubtitle(item) ||
										[item.contact_name, item.phone, item.email]
											.filter(Boolean)
											.join(' - ') ||
										'Sin datos de contacto'
									}
									canOpenDashboard={canViewEconomy}
									onOpenDashboard={() => onOpenDashboard(item)}
									onNewPurchase={() => onNewPurchaseForSupplier(item)}
									onEdit={() => onEdit(item)}
									onDeactivate={() => onDeactivate(item)}
									quickActionsTrigger={renderQuickActionsTrigger(
										'Acciones de proveedor',
										quickActions,
										'Acciones rapidas de proveedor',
									)}
									money={money}
									formatDateLabel={formatDateLabel}
								/>
							)
						})
					) : (
						<Empty
							text={
								search.trim()
									? 'No hay proveedores para esta busqueda.'
									: 'Sin proveedores.'
							}
							hint={
								search.trim()
									? 'Proba con otro nombre, contacto o CUIT.'
									: 'Crea el primer proveedor para registrar compras.'
							}
						/>
					)}
				</div>
			</section>
		</div>
	)
}
