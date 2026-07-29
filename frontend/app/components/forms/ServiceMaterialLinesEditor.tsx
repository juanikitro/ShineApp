'use client'

import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { type AnyRecord } from '@/lib/page-support'

type ServiceMaterialLinesEditorProps = {
	lines: AnyRecord[]
	materials: AnyRecord[]
	materialOptions: SelectOption[]
	onAdd: () => void
	onRemove: (index: number) => void
	onUpdate: (index: number, changes: AnyRecord) => void
}

export function ServiceMaterialLinesEditor({
	lines,
	materials,
	materialOptions,
	onAdd,
	onRemove,
	onUpdate,
}: ServiceMaterialLinesEditorProps) {
	return (
		<>
			<div className="form-section-label">Materiales por servicio</div>
			<div className="info-note">
				Al cerrar un trabajo con este servicio, los materiales se descuentan
				automáticamente del stock.
			</div>
			<div className="stock-lines">
				{lines.map((line: AnyRecord, index: number) => {
					const mat = materials.find(
						(m) => String(m.id) === String(line.material),
					)
					return (
						<div className="quote-line stock-line" key={index}>
							<SearchSelect
								label="Material"
								value={line.material}
								options={materialOptions}
								onChange={(value) => onUpdate(index, { material: value })}
							/>
							<Field label={`Cantidad${mat?.unit ? ` (${mat.unit})` : ''}`}>
								<input
									type="number"
									min="0.001"
									step="0.001"
									value={line.quantity}
									onChange={(event) =>
										onUpdate(index, { quantity: event.target.value })
									}
								/>
							</Field>
							<Button
								type="button"
								variant="ghost"
								onClick={() => onRemove(index)}
							>
								<Trash2 size={16} />
							</Button>
						</div>
					)
				})}
			</div>
			<Button type="button" variant="ghost" onClick={onAdd}>
				<Plus size={16} />
				Agregar material
			</Button>
		</>
	)
}
