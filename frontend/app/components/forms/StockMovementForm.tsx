'use client'

import { type FormEvent } from 'react'

import { Package, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import {
	type AnyRecord,
	money,
	DEFAULT_PAYMENT_METHOD,
} from '@/lib/page-support'

type StockMovementFormProps = {
	submitLabel: string
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	stockMovementForm: AnyRecord
	setStockMovementForm: (form: AnyRecord) => void
	stockMovementDocumentFile: File | null
	setStockMovementDocumentFile: (file: File | null) => void
	stockMovementTypeOptions: SelectOption[]
	stockDocumentTypeOptions: SelectOption[]
	customerOptions: SelectOption[]
	supplierOptions: SelectOption[]
	reservationOptions: SelectOption[]
	materialOptions: SelectOption[]
	stockPaymentMethodOptions: SelectOption[]
	materials: AnyRecord[]
	stockMovementLines: AnyRecord[]
	selectedDay: string
	stockMovementRequiresSupplier: boolean
	stockMovementRequiresCustomer: boolean
	stockMovementRequiresReservation: boolean
	stockMovementTotal: number
	blankStockMovementForm: (day: string) => AnyRecord
	updateStockMovementLine: (index: number, changes: AnyRecord) => void
	addStockMovementLine: () => void
	removeStockMovementLine: (index: number) => void
	openQuickCreate: (kind: string, target: string) => void
	createSupplierFromName: (name: string, target: string) => Promise<void>
	flashClass: (key: string | null) => string
	fieldFlashKey: (target: string) => string
	submitting?: boolean
	fieldErrors?: Record<string, string>
}

export function StockMovementForm({
	submitLabel,
	onSubmit,
	stockMovementForm,
	setStockMovementForm,
	setStockMovementDocumentFile,
	stockMovementTypeOptions,
	stockDocumentTypeOptions,
	customerOptions,
	supplierOptions,
	reservationOptions,
	materialOptions,
	stockPaymentMethodOptions,
	materials,
	stockMovementLines,
	selectedDay,
	stockMovementRequiresSupplier,
	stockMovementRequiresCustomer,
	stockMovementRequiresReservation,
	stockMovementTotal,
	blankStockMovementForm,
	updateStockMovementLine,
	addStockMovementLine,
	removeStockMovementLine,
	openQuickCreate,
	createSupplierFromName,
	flashClass,
	fieldFlashKey,
	submitting = false,
	fieldErrors,
}: StockMovementFormProps) {
	return (
		<form className="form-grid stock-movement-form" onSubmit={onSubmit}>
			<div className="form-row">
				<SearchSelect
					label="Tipo de movimiento"
					value={stockMovementForm.movement_type}
					options={stockMovementTypeOptions}
					focusKey="stock-movement.type"
					onChange={(value) =>
						setStockMovementForm({
							...blankStockMovementForm(selectedDay),
							movement_type: value || 'purchase',
						})
					}
				/>
				<Field label="Fecha" error={fieldErrors?.['occurred_on']}>
					<input
						type="date"
						value={stockMovementForm.occurred_on}
						onChange={(event) =>
							setStockMovementForm({
								...stockMovementForm,
								occurred_on: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			{stockMovementRequiresSupplier ? (
				<div className="form-row">
					<SearchSelect
						label="Proveedor"
						value={stockMovementForm.supplier}
						options={supplierOptions}
						placeholder="Sin proveedor"
						focusKey="stock-movement.supplier"
						className={flashClass(fieldFlashKey('stock-movement.supplier'))}
						onAdd={() =>
							openQuickCreate('supplier', 'stock-movement.supplier')
						}
						addLabel="Nuevo proveedor"
						onCreate={(value) =>
							void createSupplierFromName(value, 'stock-movement.supplier')
						}
						createLabel={(value) => `Crear proveedor "${value}"`}
						onChange={(value) =>
							setStockMovementForm({
								...stockMovementForm,
								supplier: value,
							})
						}
					/>
					<SearchSelect
						label="Tipo de comprobante"
						value={stockMovementForm.document_type}
						options={stockDocumentTypeOptions}
						onChange={(value) =>
							setStockMovementForm({
								...stockMovementForm,
								document_type: value,
							})
						}
					/>
				</div>
			) : null}
			{stockMovementRequiresCustomer ? (
				<SearchSelect
					label="Cliente"
					value={stockMovementForm.customer}
					options={customerOptions}
					onChange={(value) =>
						setStockMovementForm({
							...stockMovementForm,
							customer: value,
						})
					}
				/>
			) : null}
			{stockMovementRequiresReservation ? (
				<SearchSelect
					label="Reserva"
					value={stockMovementForm.reservation}
					options={reservationOptions}
					onChange={(value) =>
						setStockMovementForm({
							...stockMovementForm,
							reservation: value,
						})
					}
				/>
			) : null}
			{stockMovementRequiresSupplier ? (
				<div className="form-row">
					<Field label="Numero de comprobante" error={fieldErrors?.['document_number']}>
						<input
							value={stockMovementForm.document_number}
							onChange={(event) =>
								setStockMovementForm({
									...stockMovementForm,
									document_number: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Adjunto">
						<input
							type="file"
							accept="image/*,.pdf"
							onChange={(event) =>
								setStockMovementDocumentFile(
									event.target.files?.[0] ?? null,
								)
							}
						/>
					</Field>
				</div>
			) : null}
			<div className="stock-lines">
				{stockMovementLines.map((line: AnyRecord, index: number) => {
					const selectedMaterial = materials.find(
						(item) => String(item.id) === String(line.material),
					)
					return (
						<div className="quote-line stock-line" key={index}>
							<SearchSelect
								label="Producto"
								value={line.material}
								options={materialOptions}
								onChange={(value) => {
									const nextMaterial = materials.find(
										(item) => String(item.id) === String(value),
									)
									updateStockMovementLine(index, {
										material: value,
										unit_price:
											stockMovementForm.movement_type === 'consumption'
												? nextMaterial?.estimated_unit_cost ?? ''
												: line.unit_price,
									})
								}}
							/>
							<Field label="Cantidad">
								<input
									required
									type="number"
									min="0"
									value={line.quantity}
									onChange={(event) =>
										updateStockMovementLine(index, {
											quantity: event.target.value,
										})
									}
								/>
							</Field>
							<Field
								label={
									stockMovementForm.movement_type === 'consumption'
										? 'Costo ref.'
										: 'Precio unitario'
								}
							>
								<input
									type="number"
									min="0"
									value={line.unit_price}
									placeholder={
										stockMovementForm.movement_type === 'consumption'
											? String(selectedMaterial?.estimated_unit_cost ?? '0')
											: ''
									}
									onChange={(event) =>
										updateStockMovementLine(index, {
											unit_price: event.target.value,
										})
									}
								/>
							</Field>
							<button
								type="button"
								className="ghost"
								onClick={() => removeStockMovementLine(index)}
							>
								<Trash2 size={16} />
							</button>
						</div>
					)
				})}
			</div>
			<button type="button" className="ghost" onClick={addStockMovementLine}>
				<Plus size={16} />
				Agregar producto
			</button>
			<div className="material-summary">
				<div className="material-kpi">
					<span>Productos</span>
					<strong>{stockMovementLines.length}</strong>
				</div>
				<div className="material-kpi">
					<span>Total</span>
					<strong>{money(stockMovementTotal)}</strong>
				</div>
			</div>
			{stockMovementForm.movement_type === 'purchase' ? (
				<div className="form-row">
					<label>
						<input
							type="checkbox"
							checked={stockMovementForm.products_received}
							onChange={(event) =>
								setStockMovementForm({
									...stockMovementForm,
									products_received: event.target.checked,
								})
							}
						/>
						Productos recibidos
					</label>
					<label>
						<input
							type="checkbox"
							checked={stockMovementForm.affects_cash}
							onChange={(event) =>
								setStockMovementForm({
									...stockMovementForm,
									affects_cash: event.target.checked,
								})
							}
						/>
						Impacta en caja
					</label>
				</div>
			) : null}
			{stockMovementForm.movement_type === 'sale' ? (
				<SearchSelect
					label="Metodo de cobro"
					value={stockMovementForm.payment_method}
					options={stockPaymentMethodOptions}
					onChange={(value) =>
						setStockMovementForm({
							...stockMovementForm,
							payment_method: value || DEFAULT_PAYMENT_METHOD,
						})
					}
				/>
			) : null}
			<Field label="Notas" error={fieldErrors?.['notes']}>
				<textarea
					value={stockMovementForm.notes}
					onChange={(event) =>
						setStockMovementForm({
							...stockMovementForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Package size={16} />}
			>
				{submitLabel}
			</Button>
		</form>
	)
}
