'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Field } from '@/app/components/ui/Field'
import { Toggle } from '@/app/components/ui/Toggle'
import { type AnyRecord } from '@/lib/page-support'

type SupplierDetailEditFormProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	actions?: ReactNode
}

export function SupplierDetailEditForm({
	data,
	onSubmit,
	onPatch,
	actions,
}: SupplierDetailEditFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre visible">
				<input
					required
					list="supplier-name-options"
					value={data.name ?? ''}
					onChange={(event) => onPatch({ name: event.target.value })}
				/>
			</Field>
			<Field label="Razon social">
				<input
					list="supplier-legal-name-options"
					value={data.legal_name ?? ''}
					onChange={(event) => onPatch({ legal_name: event.target.value })}
				/>
			</Field>
			<div className="form-row">
				<Field label="Rubro">
					<input
						list="supplier-category-options"
						value={data.category ?? ''}
						onChange={(event) => onPatch({ category: event.target.value })}
					/>
				</Field>
				<Field label="Condicion fiscal">
					<input
						list="supplier-tax-condition-options"
						value={data.tax_condition ?? ''}
						onChange={(event) =>
							onPatch({ tax_condition: event.target.value })
						}
					/>
				</Field>
			</div>
			<div className="form-row">
				<Field label="Contacto principal">
					<input
						value={data.contact_name ?? ''}
						onChange={(event) =>
							onPatch({ contact_name: event.target.value })
						}
					/>
				</Field>
				<Field label="Telefono">
					<input
						type="tel"
						inputMode="tel"
						autoComplete="tel"
						value={data.phone ?? ''}
						onChange={(event) => onPatch({ phone: event.target.value })}
					/>
				</Field>
			</div>
			<div className="form-row">
				<Field label="Email">
					<input
						type="email"
						autoComplete="email"
						value={data.email ?? ''}
						onChange={(event) => onPatch({ email: event.target.value })}
					/>
				</Field>
				<Field label="CUIT / tax id">
					<input
						value={data.tax_id ?? ''}
						onChange={(event) => onPatch({ tax_id: event.target.value })}
					/>
				</Field>
			</div>
			<Field label="Website">
				<input
					type="url"
					value={data.website ?? ''}
					onChange={(event) => onPatch({ website: event.target.value })}
				/>
			</Field>
			<Field label="Direccion">
				<input
					value={data.address ?? ''}
					onChange={(event) => onPatch({ address: event.target.value })}
				/>
			</Field>
			<Toggle
				checked={data.is_active !== false}
				onChange={(checked) => onPatch({ is_active: checked })}
			>
				Proveedor activo
			</Toggle>
			<Field label="Notas internas">
				<textarea
					value={data.notes ?? ''}
					onChange={(event) => onPatch({ notes: event.target.value })}
				/>
			</Field>
			{actions}
		</form>
	)
}
