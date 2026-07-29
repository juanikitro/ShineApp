'use client'

import { BirthdayBadge } from '@/app/components/customers/BirthdayAlertsPanel'
import {
	CustomerDashboardShell,
	type CustomerDashboardMetric,
	type CustomerDashboardProfileItem,
} from '@/app/components/customers/CustomerDashboardShell'
import { CustomerOperationalSnapshot } from '@/app/components/customers/CustomerOperationalSnapshot'
import { CustomerPaymentHistoryPanel } from '@/app/components/customers/CustomerPaymentHistoryPanel'
import { CustomerRankingPanel } from '@/app/components/customers/CustomerRankingPanel'
import { CustomerRecentQuotesPanel } from '@/app/components/customers/CustomerRecentQuotesPanel'
import { CustomerSalesHistoryPanel } from '@/app/components/customers/CustomerSalesHistoryPanel'
import { CustomerUpcomingReservationsPanel } from '@/app/components/customers/CustomerUpcomingReservationsPanel'
import { CustomerVehiclesPanel } from '@/app/components/customers/CustomerVehiclesPanel'
import { type AnyRecord, money } from '@/lib/page-support'

type CustomerDashboardViewProps = {
	dashboard: AnyRecord
	history: AnyRecord | null | undefined
	loading: boolean
	allVehicles: AnyRecord[]
	allReservations: AnyRecord[]
	allQuotes: AnyRecord[]
	allWorkOrders: AnyRecord[]
	useReservationTimes: boolean
	orderLabels: Record<string, string>
	reservationLabels: Record<string, string>
	quoteStatusLabels: Record<string, string>
	paymentMethodLabels: Record<string, string>
	onBack: () => void
	onEditCustomer: (customer: AnyRecord) => void
	onOpenVehicle: (vehicle: AnyRecord) => void
	onOpenReservation: (reservation: AnyRecord) => void
	onOpenQuote: (quote: AnyRecord) => void
	onOpenOrder: (order: AnyRecord) => void
}

export function CustomerDashboardView({
	dashboard,
	history,
	loading,
	allVehicles,
	allReservations,
	allQuotes,
	allWorkOrders,
	useReservationTimes,
	orderLabels,
	reservationLabels,
	quoteStatusLabels,
	paymentMethodLabels,
	onBack,
	onEditCustomer,
	onOpenVehicle,
	onOpenReservation,
	onOpenQuote,
	onOpenOrder,
}: CustomerDashboardViewProps) {
	const hasDashboardHistory = Boolean(history)
	const dashboardHistory = history ?? {}
	const customer = dashboardHistory.customer ?? dashboard
	const summary = dashboardHistory.summary ?? {}
	const customerVehicles = dashboardHistory.vehicles ?? []
	const servicesRanking = dashboardHistory.services ?? []
	const vehiclesRanking = dashboardHistory.vehicles_ranking ?? []
	const brandsRanking = dashboardHistory.brands_ranking ?? []
	const orders = dashboardHistory.work_orders ?? []
	const payments = dashboardHistory.payments_history ?? []
	const upcomingReservations = dashboardHistory.upcoming_reservations ?? []
	const recentQuotes = dashboardHistory.recent_quotes ?? []
	const profileItems: CustomerDashboardProfileItem[] = [
		{
			key: 'phone',
			label: 'Telefono',
			value: customer.phone || 'Sin telefono',
		},
		{ key: 'email', label: 'Email', value: customer.email || 'Sin email' },
		{
			key: 'birthday',
			label: 'Cumpleanos',
			value: customer.birthday_label || 'Sin cumpleanos',
		},
		{
			key: 'vehicles',
			label: 'Vehiculos',
			value: customerVehicles.length,
		},
	]
	const dashboardMetrics: CustomerDashboardMetric[] = [
		{
			key: 'sales',
			label: 'Ventas',
			value: money(summary.sales_total ?? summary.billed_total),
		},
		{ key: 'paid', label: 'Cobrado', value: money(summary.paid_total) },
		{
			key: 'balance',
			label: 'Saldo',
			value: money(summary.balance_due_total),
		},
		{
			key: 'materials',
			label: 'Materiales',
			value: money(summary.material_cost_total),
		},
		{ key: 'margin', label: 'Margen', value: money(summary.margin_total) },
		{
			key: 'orders',
			label: 'Trabajos',
			value: summary.work_orders_count ?? 0,
		},
	]
	return (
		<CustomerDashboardShell
			title={customer.name}
			subtitle="Historial, vehiculos, agenda, deuda y pagos disponibles"
			birthdayBadge={<BirthdayBadge customer={customer} />}
			profileItems={profileItems}
			metrics={dashboardMetrics}
			isLoading={loading}
			hasHistory={hasDashboardHistory}
			onBack={onBack}
			onEdit={() => onEditCustomer(customer)}
		>
			<CustomerOperationalSnapshot
				history={dashboardHistory}
				upcomingReservations={upcomingReservations}
				recentQuotes={recentQuotes}
				useReservationTimes={useReservationTimes}
			/>

			<div className="grid customer-dashboard-duo">
				<CustomerVehiclesPanel
					customerVehicles={customerVehicles}
					allVehicles={allVehicles}
					onOpenVehicle={onOpenVehicle}
				/>
				<CustomerUpcomingReservationsPanel
					reservationRows={upcomingReservations}
					reservations={allReservations}
					reservationLabels={reservationLabels}
					useReservationTimes={useReservationTimes}
					onOpenReservation={onOpenReservation}
				/>
			</div>

			<div className="grid three customer-dashboard-rankings">
				<CustomerRankingPanel
					title="Ranking de servicios"
					rows={servicesRanking}
					labelKey="name"
					emptyText="Sin servicios vendidos para este cliente."
				/>
				<CustomerRankingPanel
					title="Ranking de vehiculos"
					rows={vehiclesRanking}
					labelKey="label"
					emptyText="Sin vehiculos con trabajos."
				/>
				<CustomerRankingPanel
					title="Ranking de marcas"
					rows={brandsRanking}
					labelKey="name"
					emptyText="Sin marcas con trabajos."
				/>
			</div>

			<div className="grid customer-dashboard-duo">
				<CustomerRecentQuotesPanel
					quotesRows={recentQuotes}
					quotes={allQuotes}
					quoteStatusLabels={quoteStatusLabels}
					onOpenQuote={onOpenQuote}
				/>
				<CustomerSalesHistoryPanel
					orders={orders}
					workOrders={allWorkOrders}
					orderLabels={orderLabels}
					onOpenOrder={onOpenOrder}
				/>
			</div>

			<div className="grid">
				<CustomerPaymentHistoryPanel
					payments={payments}
					paymentMethodLabels={paymentMethodLabels}
				/>
			</div>
		</CustomerDashboardShell>
	)
}
