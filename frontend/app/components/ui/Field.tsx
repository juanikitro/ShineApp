import { ReactNode } from 'react'

type FieldProps = {
	label: string
	children: ReactNode
}

export function Field({ label, children }: FieldProps) {
	return (
		<label>
			{label}
			{children}
		</label>
	)
}
