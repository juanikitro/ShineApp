'use client'

import { type FormEvent } from 'react'

import { CalendarDays } from 'lucide-react'

import { Field } from '@/app/components/ui/Field'
import { type AnyRecord } from '@/lib/page-support'

type DailyCapacityFormProps = {
	submitLabel: string
	dailyCapacityForm: AnyRecord
	setDailyCapacityForm: (form: AnyRecord) => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function DailyCapacityForm({
	submitLabel,
	dailyCapacityForm,
	setDailyCapacityForm,
	onSubmit,
}: DailyCapacityFormProps) {
	const editing = Boolean(dailyCapacityForm.id)
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<div className="form-row">
				<Field label="Dia">
					<input
						required
						type="date"
						disabled={editing}
						value={dailyCapacityForm.day ?? ''}
						onChange={(event) =>
							setDailyCapacityForm({
								...dailyCapacityForm,
								day: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Turnos lavado">
					<input
						data-focus-key="daily-capacity.max_slots_wash"
						required
						type="number"
						min="0"
						placeholder="8"
						value={dailyCapacityForm.max_slots_wash ?? ''}
						onChange={(event) =>
							setDailyCapacityForm({
								...dailyCapacityForm,
								max_slots_wash: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Turnos detailing">
					<input
						data-focus-key="daily-capacity.max_slots_detailing"
						required
						type="number"
						min="0"
						placeholder="4"
						value={dailyCapacityForm.max_slots_detailing ?? ''}
						onChange={(event) =>
							setDailyCapacityForm({
								...dailyCapacityForm,
								max_slots_detailing: event.target.value,
							})
						}
					/>
				</Field>
			</div>
			<Field label="Notas">
				<textarea
					value={dailyCapacityForm.notes ?? ''}
					onChange={(event) =>
						setDailyCapacityForm({
							...dailyCapacityForm,
							notes: event.target.value,
						})
					}
				/>
			</Field>
			<button className="primary">
				<CalendarDays size={16} />
				{submitLabel}
			</button>
		</form>
	)
}
