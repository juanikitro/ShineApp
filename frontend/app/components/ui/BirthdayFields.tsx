import type { KeyboardEvent } from 'react'
import { CalendarDays } from 'lucide-react'

const birthdayDays = Array.from({ length: 31 }, (_, index) => String(index + 1))

const birthdayMonths = [
	{ value: '1', label: 'Enero' },
	{ value: '2', label: 'Febrero' },
	{ value: '3', label: 'Marzo' },
	{ value: '4', label: 'Abril' },
	{ value: '5', label: 'Mayo' },
	{ value: '6', label: 'Junio' },
	{ value: '7', label: 'Julio' },
	{ value: '8', label: 'Agosto' },
	{ value: '9', label: 'Septiembre' },
	{ value: '10', label: 'Octubre' },
	{ value: '11', label: 'Noviembre' },
	{ value: '12', label: 'Diciembre' },
]

type BirthdayFieldsProps = {
	day: string | number | null | undefined
	month: string | number | null | undefined
	onDayChange: (value: string) => void
	onMonthChange: (value: string) => void
	dayName?: string
	monthName?: string
	dayFocusKey?: string
	monthFocusKey?: string
	onDayKeyDown?: (event: KeyboardEvent<HTMLSelectElement>) => void
	onMonthKeyDown?: (event: KeyboardEvent<HTMLSelectElement>) => void
}

function fieldValue(value: string | number | null | undefined) {
	return value === null || value === undefined ? '' : String(value)
}

export function BirthdayFields({
	day,
	month,
	onDayChange,
	onMonthChange,
	dayName,
	monthName,
	dayFocusKey,
	monthFocusKey,
	onDayKeyDown,
	onMonthKeyDown,
}: BirthdayFieldsProps) {
	return (
		<fieldset className="birthday-fields">
			<legend>
				<CalendarDays size={14} aria-hidden="true" />
				Cumpleanos
			</legend>
			<div className="birthday-fields__grid">
				<label className="birthday-fields__control">
					<span>Dia</span>
					<select
						name={dayName}
						data-focus-key={dayFocusKey}
						value={fieldValue(day)}
						onChange={(event) => onDayChange(event.target.value)}
						onKeyDown={onDayKeyDown}
					>
						<option value="">Sin dia</option>
						{birthdayDays.map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</select>
				</label>
				<label className="birthday-fields__control">
					<span>Mes</span>
					<select
						name={monthName}
						data-focus-key={monthFocusKey}
						value={fieldValue(month)}
						onChange={(event) => onMonthChange(event.target.value)}
						onKeyDown={onMonthKeyDown}
					>
						<option value="">Sin mes</option>
						{birthdayMonths.map((monthOption) => (
							<option key={monthOption.value} value={monthOption.value}>
								{monthOption.label}
							</option>
						))}
					</select>
				</label>
			</div>
			<p>Opcional. Activa los avisos del dashboard cuando se cargan dia y mes.</p>
		</fieldset>
	)
}
