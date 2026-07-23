'use client'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { Empty } from '@/app/components/ui/Empty'
import { Panel } from '@/app/components/ui/Panel'
import { cx } from '@/app/components/utils'
import { birthdayText, type AnyRecord } from '@/lib/page-support'

type BirthdayBadgeProps = {
	customer: AnyRecord
}

export function BirthdayBadge({ customer }: BirthdayBadgeProps) {
	if (!customer?.birthday_label) return null
	return (
		<span
			className={cx(
				'birthday-badge',
				customer.has_birthday_alert ? 'birthday-badge--alert' : '',
			)}
		>
			{birthdayText(customer)}
		</span>
	)
}

type BirthdayAlertsPanelProps = {
	alerts: AnyRecord[]
	alertDays: number | string
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
	detailRecordProps: (kind: string, data: AnyRecord) => Record<string, unknown>
}

export function BirthdayAlertsPanel({
	alerts,
	alertDays,
	recordClass,
	detailRecordProps,
}: BirthdayAlertsPanelProps) {
	return (
		<Panel>
			<div className="panel-head">
				<h2>Cumpleanos proximos</h2>
				<span className="panel-kicker">{alertDays} dias</span>
			</div>
			<div className="records compact-records">
				{alerts.length ? (
					alerts.map((customer: AnyRecord) => (
						<MotionFlashSurface
							className={recordClass('customer', customer.id)}
							key={`birthday-${customer.id}`}
							{...detailRecordProps('Cliente', customer)}
						>
							<div className="record-head">
								<div>
									<div className="record-title">{customer.name}</div>
									<div className="record-sub">
										{customer.phone || 'Sin telefono'}
									</div>
									<BirthdayBadge customer={customer} />
								</div>
							</div>
						</MotionFlashSurface>
					))
				) : (
					<Empty
						text="Sin cumpleanos en los proximos dias."
						hint="La alerta vuelve a aparecer aca cuando un cliente entre en la ventana configurada."
					/>
				)}
			</div>
		</Panel>
	)
}
