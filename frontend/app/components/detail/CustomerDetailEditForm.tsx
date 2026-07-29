'use client'

import { type FormEvent, type KeyboardEvent, type ReactNode } from 'react'

import { BirthdayBadge } from '@/app/components/customers/BirthdayAlertsPanel'
import { CustomerHistoryPanel } from '@/app/components/customers/CustomerHistoryPanel'
import { BirthdayFields } from '@/app/components/ui/BirthdayFields'
import { Field } from '@/app/components/ui/Field'
import { type AnyRecord } from '@/lib/page-support'

type CustomerDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	canViewEconomy: boolean
	customerHistoryLoading: boolean
	customerHistory: AnyRecord | null | undefined
	orderLabels: Record<string, string>
	onOpenOrder: (order: AnyRecord) => void
	actions?: ReactNode
}

export function CustomerDetailEditForm({
	data,
	onSubmit,
	onPatch,
	focusNextOnEnter,
	canViewEconomy,
	customerHistoryLoading,
	customerHistory,
	orderLabels,
	onOpenOrder,
	actions,
}: CustomerDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					data-focus-key="detail.customer.name"
					required
					value={data.name ?? ''}
					onChange={(event) => onPatch({ name: event.target.value })}
					onKeyDown={focusNextOnEnter('detail.customer.phone')}
				/>
			</Field>
			<Field label="Telefono">
				<input
					data-focus-key="detail.customer.phone"
					type="tel"
					inputMode="tel"
					autoComplete="tel"
					value={data.phone ?? ''}
					onChange={(event) => onPatch({ phone: event.target.value })}
					onKeyDown={focusNextOnEnter('detail.customer.email')}
				/>
			</Field>
			<Field label="Email">
				<input
					data-focus-key="detail.customer.email"
					type="email"
					autoComplete="email"
					value={data.email ?? ''}
					onChange={(event) => onPatch({ email: event.target.value })}
					onKeyDown={focusNextOnEnter('detail.customer.birthday_day')}
				/>
			</Field>
			<BirthdayFields
				day={data.birthday_day}
				month={data.birthday_month}
				dayFocusKey="detail.customer.birthday_day"
				monthFocusKey="detail.customer.birthday_month"
				onDayChange={(value) => onPatch({ birthday_day: value })}
				onMonthChange={(value) => onPatch({ birthday_month: value })}
				onDayKeyDown={focusNextOnEnter('detail.customer.birthday_month')}
				onMonthKeyDown={focusNextOnEnter('detail.customer.notes')}
			/>
			{data.birthday_label ? <BirthdayBadge customer={data} /> : null}
			<Field label="Notas">
				<textarea
					data-focus-key="detail.customer.notes"
					value={data.notes ?? ''}
					onChange={(event) => onPatch({ notes: event.target.value })}
				/>
			</Field>
			{canViewEconomy ? (
				<CustomerHistoryPanel
					loading={customerHistoryLoading}
					history={customerHistory}
					orderLabels={orderLabels}
					onOpenOrder={onOpenOrder}
				/>
			) : null}
			{actions}
		</form>
	)
}
