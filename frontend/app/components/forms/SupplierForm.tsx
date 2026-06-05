'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Building2 } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { type AnyRecord } from '@/lib/page-support'

type SupplierFormProps = {
	submitLabel: string
	supplierForm: AnyRecord
	setSupplierForm: (form: AnyRecord) => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	focusNextOnEnter: (
		key: string,
	) => (event: KeyboardEvent<HTMLElement>) => void
	submitting?: boolean
}

export function SupplierForm({
	submitLabel,
	supplierForm,
	setSupplierForm,
	onSubmit,
	focusNextOnEnter,
	submitting = false,
}: SupplierFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					data-focus-key="supplier.name"
					required
					list="supplier-name-options"
					value={supplierForm.name}
					onChange={(event) =>
						setSupplierForm({
							...supplierForm,
							name: event.target.value,
						})
					}
				/>
			</Field>
			<Field label="Razon social">
				<input
					list="supplier-legal-name-options"
					value={supplierForm.legal_name}
					onChange={(event) =>
						setSupplierForm({
							...supplierForm,
							legal_name: event.target.value,
						})
					}
				/>
			</Field>
			<div className="form-row">
				<Field label="Rubro">
					<input
						list="supplier-category-options"
						value={supplierForm.category}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								category: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Condicion fiscal">
					<input
						list="supplier-tax-condition-options"
						value={supplierForm.tax_condition}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								tax_condition: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<div className="form-row">
				<Field label="Contacto">
					<input
						value={supplierForm.contact_name}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								contact_name: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Telefono">
					<input
						value={supplierForm.phone}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								phone: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<div className="form-row">
				<Field label="Email">
					<input
						type="email"
						value={supplierForm.email}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								email: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="CUIT / tax id">
					<input
						value={supplierForm.tax_id}
						onChange={(event) =>
							setSupplierForm({
								...supplierForm,
								tax_id: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<Field label="Website">
				<input
					type="url"
					value={supplierForm.website}
					onChange={(event) =>
						setSupplierForm({
							...supplierForm,
							website: event.target.value,
						})
					}
				/>
			</Field>
			<Field label="Direccion">
				<input
					value={supplierForm.address}
					onChange={(event) =>
						setSupplierForm({
							...supplierForm,
							address: event.target.value,
						})
					}
				/>
			</Field>
			<Field label="Notas">
				<textarea
					value={supplierForm.notes}
					onChange={(event) =>
						setSupplierForm({
							...supplierForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Building2 size={16} />}
			>
				{submitLabel}
			</Button>
		</form>
	)
}
