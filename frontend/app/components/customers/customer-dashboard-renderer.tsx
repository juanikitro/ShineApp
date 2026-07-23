import { type ReactNode } from 'react'

import { type AnyRecord } from '@/lib/page-support'

import { CustomerDashboardView } from './CustomerDashboardView'

type CustomerDashboardRendererProps = {
	dashboard: AnyRecord | null
	canViewEconomy: boolean
	history: AnyRecord | null | undefined
	loading: boolean
	vehicles: AnyRecord[]
	reservations: AnyRecord[]
	quotes: AnyRecord[]
	workOrders: AnyRecord[]
	useReservationTimes: boolean
	orderLabels: Record<string, string>
	reservationLabels: Record<string, string>
	quoteStatusLabels: Record<string, string>
	paymentMethodLabels: Record<string, string>
	onBack: () => void
	onOpenDetail: (
		title: string,
		data: AnyRecord,
		options?: { startEditing?: boolean },
	) => void
}

export function renderCustomerDashboard({
	dashboard,
	canViewEconomy,
	history,
	loading,
	vehicles,
	reservations,
	quotes,
	workOrders,
	useReservationTimes,
	orderLabels,
	reservationLabels,
	quoteStatusLabels,
	paymentMethodLabels,
	onBack,
	onOpenDetail,
}: CustomerDashboardRendererProps): ReactNode {
	if (!dashboard || !canViewEconomy) return null
	return (
		<CustomerDashboardView
			dashboard={dashboard}
			history={history}
			loading={loading}
			allVehicles={vehicles}
			allReservations={reservations}
			allQuotes={quotes}
			allWorkOrders={workOrders}
			useReservationTimes={useReservationTimes}
			orderLabels={orderLabels}
			reservationLabels={reservationLabels}
			quoteStatusLabels={quoteStatusLabels}
			paymentMethodLabels={paymentMethodLabels}
			onBack={onBack}
			onEditCustomer={(customer) =>
				onOpenDetail('Cliente', customer, { startEditing: true })
			}
			onOpenVehicle={(vehicle) => onOpenDetail('Vehiculo', vehicle)}
			onOpenReservation={(reservation) =>
				onOpenDetail('Reserva', reservation)
			}
			onOpenQuote={(quote) => onOpenDetail('Cotizacion', quote)}
			onOpenOrder={(order) => onOpenDetail('Orden de trabajo', order)}
		/>
	)
}
