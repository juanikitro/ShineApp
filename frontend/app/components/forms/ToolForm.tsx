'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Hammer } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { toolTotalValue } from '@/lib/inventory-display'
import { money, type AnyRecord } from '@/lib/page-support'

type ToolFormProps = {
	submitLabel: string
	toolForm: AnyRecord
	setToolForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	toolStatusOptions: SelectOption[]
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	focusField: (key: string) => void
	submitting?: boolean
}

export function ToolForm({
	submitLabel,
	toolForm,
	setToolForm,
	onSubmit,
	toolStatusOptions,
	focusNextOnEnter,
	focusField,
	submitting = false,
}: ToolFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Nombre">
				<input
					data-focus-key="tool.name"
					required
					list="tool-name-options"
					value={toolForm.name}
					onChange={(event) =>
						setToolForm({
							...toolForm,
							name: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('tool.quantity')}
				/>
			</Field>
			<div className="form-row">
				<Field label="Cantidad">
					<input
						data-focus-key="tool.quantity"
						required
						type="number"
						min="0"
						step="1"
						value={toolForm.quantity}
						onChange={(event) =>
							setToolForm({
								...toolForm,
								quantity: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('tool.status', true)}
					/>
				</Field>
				<SearchSelect
					label="Estado"
					value={toolForm.status}
					options={toolStatusOptions}
					focusKey="tool.status"
					onChange={(value) => {
						setToolForm({
							...toolForm,
							status: value || 'in_use',
						})
						focusField('tool.unit_value')
					}}
				/>
			</div>
			<div className="form-row">
				<Field label="Valor unitario">
					<input
						data-focus-key="tool.unit_value"
						type="number"
						min="0"
						value={toolForm.unit_value}
						onChange={(event) =>
							setToolForm({
								...toolForm,
								unit_value: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('tool.purchased_at')}
					/>
				</Field>
				<Field label="Fecha compra">
					<input
						data-focus-key="tool.purchased_at"
						type="date"
						value={toolForm.purchased_at}
						onChange={(event) =>
							setToolForm({
								...toolForm,
								purchased_at: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('tool.notes')}
					/>
				</Field>
			</div>
			<div className="info-note">
				Valor total estimado: <strong>{money(toolTotalValue(toolForm))}</strong>
			</div>
			<Field label="Notas">
				<textarea
					data-focus-key="tool.notes"
					value={toolForm.notes}
					onChange={(event) =>
						setToolForm({
							...toolForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Hammer size={16} />}
			>
				{submitLabel}
			</Button>
		</form>
	)
}
