'use client'

import { Empty } from '@/app/components/ui/Empty'
import { Panel } from '@/app/components/ui/Panel'
import { type AnyRecord, formatDateTimeLabel, money } from '@/lib/page-support'

type CustomerPaymentHistoryPanelProps = {
	payments: AnyRecord[]
	paymentMethodLabels: Record<string, string>
}

export function CustomerPaymentHistoryPanel({
	payments,
	paymentMethodLabels,
}: CustomerPaymentHistoryPanelProps) {
	return (
		<Panel
			title="Historial de pagos"
			subtitle={`${payments.length} pagos registrados`}
		>
			<div className="records compact-records">
				{payments.length ? (
					payments.map((payment: AnyRecord) => (
						<div
							className="record compact"
							key={`customer-payment-${payment.id}`}
						>
							<div className="record-head">
								<div>
									<div className="record-title">
										{payment.service} - {payment.vehicle}
									</div>
									<div className="record-sub">
										{formatDateTimeLabel(payment.paid_at)} -{' '}
										{payment.payment_type === 'deposit' ? 'Sena' : 'Pago'} -{' '}
										{paymentMethodLabels[payment.method] ?? payment.method}
									</div>
									{payment.notes ? (
										<div className="record-sub">{payment.notes}</div>
									) : null}
								</div>
								<span className="status payment">{money(payment.amount)}</span>
							</div>
						</div>
					))
				) : (
					<Empty text="Este cliente todavia no tiene pagos." />
				)}
			</div>
		</Panel>
	)
}
