'use client'

import { type FormEvent, type ReactNode } from 'react'

import { Package } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'

type WorkOrderMaterialConsumptionFormProps = {
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	info: ReactNode
	fields: ReactNode
	submitting: boolean
}

export function WorkOrderMaterialConsumptionForm({
	onSubmit,
	info,
	fields,
	submitting,
}: WorkOrderMaterialConsumptionFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<div className="info-note">{info}</div>
			{fields}
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Package size={16} />}
			>
				Registrar consumo
			</Button>
		</form>
	)
}
