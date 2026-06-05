'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Plus } from 'lucide-react'

import { BirthdayFields } from '@/app/components/ui/BirthdayFields'
import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { type AnyRecord } from '@/lib/page-support'

type CustomerFormProps = {
	submitLabel: string
	customerForm: AnyRecord
	setCustomerForm: (form: AnyRecord) => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	submitting?: boolean
}

export function CustomerForm({
	submitLabel,
	customerForm,
	setCustomerForm,
	onSubmit,
	focusNextOnEnter,
	submitting = false,
}: CustomerFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					data-focus-key="customer.name"
					name="customer_name"
					autoComplete="name"
					required
					list="customer-name-options"
					value={customerForm.name}
					onChange={(event) =>
						setCustomerForm({
							...customerForm,
							name: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('customer.phone')}
				/>
			</Field>
			<Field label="Telefono">
				<input
					data-focus-key="customer.phone"
					name="customer_phone"
					autoComplete="tel"
					inputMode="tel"
					list="customer-phone-options"
					value={customerForm.phone}
					onChange={(event) =>
						setCustomerForm({
							...customerForm,
							phone: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('customer.email')}
				/>
			</Field>
			<Field label="Email">
				<input
					data-focus-key="customer.email"
					name="customer_email"
					type="email"
					autoComplete="email"
					list="customer-email-options"
					value={customerForm.email}
					onChange={(event) =>
						setCustomerForm({
							...customerForm,
							email: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('customer.tax_id')}
				/>
			</Field>
			<div className="form-row">
				<Field label="CUIT/DNI">
					<input
						data-focus-key="customer.tax_id"
						name="customer_tax_id"
						autoComplete="off"
						value={customerForm.tax_id}
						onChange={(event) =>
							setCustomerForm({
								...customerForm,
								tax_id: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('customer.billing_address')}
					/>
				</Field>
				<Field label="Domicilio fiscal">
					<input
						data-focus-key="customer.billing_address"
						name="customer_billing_address"
						autoComplete="street-address"
						value={customerForm.billing_address}
						onChange={(event) =>
							setCustomerForm({
								...customerForm,
								billing_address: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('customer.birthday_day')}
					/>
				</Field>
			</div>
			<BirthdayFields
				day={customerForm.birthday_day}
				month={customerForm.birthday_month}
				dayName="customer_birthday_day"
				monthName="customer_birthday_month"
				dayFocusKey="customer.birthday_day"
				monthFocusKey="customer.birthday_month"
				onDayChange={(value) =>
					setCustomerForm({
						...customerForm,
						birthday_day: value,
					})
				}
				onMonthChange={(value) =>
					setCustomerForm({
						...customerForm,
						birthday_month: value,
					})
				}
				onDayKeyDown={focusNextOnEnter('customer.birthday_month')}
				onMonthKeyDown={focusNextOnEnter('customer.notes')}
			/>
			<Field label="Notas">
				<textarea
					data-focus-key="customer.notes"
					name="customer_notes"
					autoComplete="off"
					value={customerForm.notes}
					onChange={(event) =>
						setCustomerForm({
							...customerForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Plus size={16} />}
				data-focus-key="customer.submit"
			>
				{submitLabel}
			</Button>
		</form>
	)
}
