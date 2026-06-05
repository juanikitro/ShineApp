'use client'

import { type KeyboardEvent } from 'react'

import {
	DURATION_UNIT_OPTIONS,
	type DurationUnit,
	readDurationDraft,
	SERVICE_DURATION_KEYS,
	writeDurationDraft,
	type DurationFormKeys,
} from '@/lib/service-duration'

type DurationInputProps = {
	form: Record<string, any>
	// Patch parcial con las claves resueltas (minutesKey, unitKey).
	onPatch: (patch: Record<string, any>) => void
	keys?: DurationFormKeys
	label?: string
	required?: boolean
	focusKey?: string
	onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
}

export function DurationInput({
	form,
	onPatch,
	keys = SERVICE_DURATION_KEYS,
	label = 'Duracion estimada',
	required,
	focusKey,
	onKeyDown,
}: DurationInputProps) {
	const draft = readDurationDraft(form, keys)
	const unitFocusKey = focusKey ? `${focusKey}.unit` : undefined

	function emit(patch: { amount?: unknown; unit?: unknown }) {
		const next = writeDurationDraft(form, patch, keys)
		onPatch({
			[keys.minutesKey]: next[keys.minutesKey],
			[keys.unitKey]: next[keys.unitKey],
		})
	}

	return (
		<label className="duration-field">
			{label}
			<div className="duration-input">
				<input
					data-focus-key={focusKey}
					required={required}
					type="number"
					min="1"
					step="any"
					inputMode="decimal"
					value={draft.amount}
					onChange={(event) => emit({ amount: event.target.value })}
					onKeyDown={onKeyDown}
				/>
				<select
					data-focus-key={unitFocusKey}
					aria-label="Unidad de duracion"
					value={draft.unit}
					onChange={(event) =>
						emit({ unit: event.target.value as DurationUnit })
					}
				>
					{DURATION_UNIT_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
		</label>
	)
}
