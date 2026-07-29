'use client'

import { type FormEvent } from 'react'

import { Plus } from 'lucide-react'

import { BirthdayFields } from '@/app/components/ui/BirthdayFields'
import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { type AnyRecord } from '@/lib/page-support'

type QuickCustomerFormProps = {
	customerForm: AnyRecord
	setCustomerForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	submitting: boolean
}

export function QuickCustomerForm({
	customerForm,
	setCustomerForm,
	onSubmit,
	submitting,
}: QuickCustomerFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					name="quick_customer_name"
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
				/>
			</Field>
			<Field label="Telefono">
				<input
					name="quick_customer_phone"
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
				/>
			</Field>
			<Field label="Email">
				<input
					name="quick_customer_email"
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
				/>
			</Field>
			<div className="form-row">
				<Field label="CUIT/DNI">
					<input
						name="quick_customer_tax_id"
						autoComplete="off"
						value={customerForm.tax_id}
						onChange={(event) =>
							setCustomerForm({
								...customerForm,
								tax_id: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Domicilio fiscal">
					<input
						name="quick_customer_billing_address"
						autoComplete="street-address"
						value={customerForm.billing_address}
						onChange={(event) =>
							setCustomerForm({
								...customerForm,
								billing_address: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<BirthdayFields
				day={customerForm.birthday_day}
				month={customerForm.birthday_month}
				dayName="quick_customer_birthday_day"
				monthName="quick_customer_birthday_month"
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
			/>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Plus size={16} />}
			>
				Crear cliente
			</Button>
		</form>
	)
}
