import { ReactNode } from 'react'

type FieldProps = {
	label: string
	children: ReactNode
	error?: string
}

export function Field({ label, children, error }: FieldProps) {
	return (
		<label className={error ? 'field--error' : undefined}>
			{label}
			{children}
			{error ? (
				<span className="field-error" role="alert">
					{error}
				</span>
			) : null}
		</label>
	)
}
