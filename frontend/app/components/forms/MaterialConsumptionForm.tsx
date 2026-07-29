'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Button } from '@/app/components/ui/Button'

type MaterialConsumptionFormProps = {
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	fields: ReactNode
	submitLabel: string
	submitting: boolean
}

export function MaterialConsumptionForm({
	onSubmit,
	fields,
	submitLabel,
	submitting,
}: MaterialConsumptionFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			{fields}
			<Button type="submit" variant="primary" loading={submitting}>
				{submitLabel}
			</Button>
		</form>
	)
}
