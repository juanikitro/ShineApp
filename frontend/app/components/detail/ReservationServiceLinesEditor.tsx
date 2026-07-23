'use client'

import { Plus } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type ReservationServiceLinesEditorProps = {
	items: AnyRecord[]
	serviceOptions: SelectOption[]
	formatMoney: (value: unknown) => string
	onAdd: () => void
	onSelectService: (index: number, value: string) => void
	onUpdate: (index: number, patch: AnyRecord) => void
	onRemove: (index: number) => void
}

export function ReservationServiceLinesEditor({
	items,
	serviceOptions,
	formatMoney,
	onAdd,
	onSelectService,
	onUpdate,
	onRemove,
}: ReservationServiceLinesEditorProps) {
	return (
		<div className="quote-lines">
			<div className="quote-lines-head">
				<h3>Servicios</h3>
				<Button type="button" variant="ghost" onClick={onAdd}>
					<Plus size={16} />
					Agregar servicio
				</Button>
			</div>
			{items.map((item: AnyRecord, index: number) => {
				const lineTotal =
					Number(item.quantity || 0) * Number(item.unit_price || 0)
				return (
					<div className="quote-line" key={index}>
						<SearchSelect
							label="Servicio"
							value={String(item.service ?? '')}
							options={serviceOptions}
							focusKey={`detail.reservation.service.${index}`}
							onChange={(value) => onSelectService(index, value)}
						/>
						<div className="quote-line-grid">
							<Field label="Cantidad">
								<input
									type="number"
									min="1"
									value={item.quantity ?? '1'}
									onChange={(event) =>
										onUpdate(index, { quantity: event.target.value })
									}
								/>
							</Field>
							<Field label="Precio">
								<input
									type="number"
									min="0"
									value={item.unit_price ?? ''}
									onChange={(event) =>
										onUpdate(index, { unit_price: event.target.value })
									}
								/>
							</Field>
							<div className="line-total">
								<span>Total</span>
								<strong>{formatMoney(lineTotal)}</strong>
							</div>
						</div>
						{items.length > 1 ? (
							<Button
								type="button"
								variant="danger"
								onClick={() => onRemove(index)}
							>
								Quitar
							</Button>
						) : null}
					</div>
				)
			})}
		</div>
	)
}
