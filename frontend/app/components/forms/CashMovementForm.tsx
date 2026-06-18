'use client'

import { type FormEvent, type KeyboardEvent, useEffect, useState } from 'react'

import { ReceiptText } from 'lucide-react'

import { DuplicateWarning } from '@/app/components/DuplicateWarning'
import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { Toggle } from '@/app/components/ui/Toggle'
import { apiFetch } from '@/lib/api'
import {
	type AnyRecord,
	formatDateLabel,
	defaultCashCategory,
	DEFAULT_EXPENSE_CATEGORY,
	DEFAULT_INCOME_CATEGORY,
} from '@/lib/page-support'

type CashMovementFormProps = {
	submitLabel: string
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	movementForm: AnyRecord
	setMovementForm: (form: AnyRecord) => void
	incomeCategorySelectOptions: SelectOption[]
	expenseCategorySelectOptions: SelectOption[]
	movementSubcategorySelectOptions: SelectOption[]
	updateMovementCashCategory: (value: string) => void
	registerMovementSubcategory: (value: string) => void
	validCashSubcategoryForCategory: (
		movementType: string,
		category: string,
		subcategory: unknown,
	) => string
	focusField: (key: string) => void
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	submitting?: boolean
	fieldErrors?: Record<string, string>
}

export function CashMovementForm({
	submitLabel,
	onSubmit,
	movementForm,
	setMovementForm,
	incomeCategorySelectOptions,
	expenseCategorySelectOptions,
	movementSubcategorySelectOptions,
	updateMovementCashCategory,
	registerMovementSubcategory,
	validCashSubcategoryForCategory,
	focusField,
	focusNextOnEnter,
	submitting = false,
	fieldErrors,
}: CashMovementFormProps) {
	const [duplicates, setDuplicates] = useState<AnyRecord[]>([])
	const [dismissed, setDismissed] = useState(false)
	const [correctsClosure, setCorrectsClosure] = useState(
		Boolean(movementForm.adjusts_closed_day),
	)

	// Si el movimiento ya trae fecha de correccion (ej. edicion), activa el toggle
	useEffect(() => {
		if (movementForm.adjusts_closed_day) {
			setCorrectsClosure(true)
		}
	}, [movementForm.adjusts_closed_day])

	// Reset aviso cuando cambian los campos clave
	useEffect(() => {
		setDismissed(false)
	}, [movementForm.amount, movementForm.category, movementForm.movement_type, movementForm.occurred_at])

	// Chequea movimientos similares del mismo día
	useEffect(() => {
		if (dismissed) {
			setDuplicates([])
			return
		}
		const amount = String(movementForm.amount ?? '').trim()
		const category = String(movementForm.category ?? '').trim()
		const occurredAt = String(movementForm.occurred_at ?? '').trim()
		const dateStr = occurredAt.split('T')[0]
		if (!amount || Number(amount) <= 0 || !category || !dateStr) {
			setDuplicates([])
			return
		}
		const timer = setTimeout(async () => {
			try {
				const data = await apiFetch<{ results?: AnyRecord[] }>(
					`cash-movements/?date=${encodeURIComponent(dateStr)}`,
				)
				const results = data.results ?? []
				const numericAmount = Number(amount)
				const matches = results.filter(
					(m) =>
						m.movement_type === movementForm.movement_type &&
						m.category === category &&
						Math.abs(Number(m.amount) - numericAmount) < 0.001,
				)
				setDuplicates(matches.slice(0, 3))
			} catch {
				setDuplicates([])
			}
		}, 700)
		return () => clearTimeout(timer)
	}, [movementForm.amount, movementForm.category, movementForm.movement_type, movementForm.occurred_at, dismissed])

	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<SearchSelect
				label="Tipo"
				value={movementForm.movement_type}
				options={[
					{ value: 'expense', label: 'Egreso' },
					{ value: 'income', label: 'Ingreso' },
				]}
				focusKey="cash-movement.type"
				onChange={(value) => {
					const movementType = value || 'expense'
					const shouldResetCategory = [
						'',
						DEFAULT_EXPENSE_CATEGORY,
						DEFAULT_INCOME_CATEGORY,
					].includes(movementForm.category ?? '')
					const nextCategory = shouldResetCategory
						? defaultCashCategory(movementType)
						: movementForm.category
					setMovementForm({
						...movementForm,
						movement_type: movementType,
						category: nextCategory,
						subcategory: validCashSubcategoryForCategory(
							movementType,
							nextCategory,
							movementForm.subcategory,
						),
					})
					focusField('cash-movement.category')
				}}
			/>
			<div className="form-row">
				<SearchSelect
					label="Categoria"
					value={movementForm.category}
					options={
						movementForm.movement_type === 'income'
							? incomeCategorySelectOptions
							: expenseCategorySelectOptions
					}
					placeholder={
						movementForm.movement_type === 'income'
							? 'Categoria de ingreso'
							: 'Categoria de egreso'
					}
					focusKey="cash-movement.category"
					onChange={updateMovementCashCategory}
					onCreate={updateMovementCashCategory}
					createLabel={(value) => `Crear categoria "${value}"`}
				/>
				<SearchSelect
					label="Subcategoria"
					value={movementForm.subcategory ?? ''}
					options={movementSubcategorySelectOptions}
					placeholder={
						movementForm.category ? 'Subcategoria' : 'Elegir categoria'
					}
					disabled={!movementForm.category}
					focusKey="cash-movement.subcategory"
					onChange={(value) =>
						setMovementForm({
							...movementForm,
							subcategory: value,
						})
					}
					onCreate={registerMovementSubcategory}
					createLabel={(value) => `Crear subcategoria "${value}"`}
				/>
			</div>
			<div className="form-row">
				<Field label="Importe" error={fieldErrors?.['amount']}>
					<NumericInput
						data-focus-key="cash-movement.amount"
						required
						prefix="$"
						value={movementForm.amount}
						onChange={(raw) =>
							setMovementForm({
								...movementForm,
								amount: raw,
							})
						}
						onKeyDown={focusNextOnEnter('cash-movement.occurred_at')}
					/>
				</Field>
				<Field label="Fecha que impacta" error={fieldErrors?.['occurred_at']}>
					<input
						data-focus-key="cash-movement.occurred_at"
						required
						type="datetime-local"
						value={movementForm.occurred_at}
						onChange={(event) =>
							setMovementForm({
								...movementForm,
								occurred_at: event.target.value,
							})
						}
						onKeyDown={focusNextOnEnter('cash-movement.occurred_at')}
					/>
				</Field>
			</div>
			<Toggle
				checked={correctsClosure}
				onChange={(checked) => {
					setCorrectsClosure(checked)
					if (!checked) {
						setMovementForm({
							...movementForm,
							adjusts_closed_day: '',
						})
					}
				}}
			>
				Corrige cierre
			</Toggle>
			{correctsClosure ? (
				<Field
					label="Fecha correccion"
					error={fieldErrors?.['adjusts_closed_day']}
				>
					<input
						type="date"
						value={movementForm.adjusts_closed_day ?? ''}
						onChange={(event) =>
							setMovementForm({
								...movementForm,
								adjusts_closed_day: event.target.value,
								category: event.target.value
									? 'Ajustes'
									: movementForm.category,
								subcategory: event.target.value
									? 'Ajuste de cierre'
									: movementForm.subcategory,
							})
						}
					/>
				</Field>
			) : null}
			{movementForm.adjusts_closed_day ? (
				<div className="info-note">
					El ajuste impacta hoy y deja trazado que corrige el cierre de{' '}
					<strong>{formatDateLabel(movementForm.adjusts_closed_day)}</strong>.
				</div>
			) : null}
			<Field label="Detalle" error={fieldErrors?.['description']}>
				<textarea
					data-focus-key="cash-movement.description"
					value={movementForm.description}
					onChange={(event) =>
						setMovementForm({
							...movementForm,
							description: event.target.value,
						})
					}
				/>
			</Field>
			{!dismissed && duplicates.length > 0 && (
				<DuplicateWarning
					title="Ya existe un movimiento similar en ese día:"
					items={duplicates.map((m) => ({
						id: m.id as number,
						label: `${m.movement_type === 'income' ? 'Ingreso' : 'Egreso'} · ${m.category} · $${m.amount} · ${formatDateLabel(String(m.occurred_at ?? '').split('T')[0])}`,
					}))}
					onDismiss={() => setDismissed(true)}
				/>
			)}
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<ReceiptText size={16} />}
			>
				{submitLabel}
			</Button>
		</form>
	)
}
