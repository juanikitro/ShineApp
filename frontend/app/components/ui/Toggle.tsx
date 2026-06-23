import { ReactNode } from 'react'

interface ToggleProps {
	checked: boolean
	onChange: (checked: boolean) => void
	children?: ReactNode
	name?: string
	disabled?: boolean
	className?: string
}

export function Toggle({ checked, onChange, children, name, disabled, className }: ToggleProps) {
	return (
		<label className={['toggle-label', className].filter(Boolean).join(' ')}>
			<span className="toggle-switch">
				<input
					type="checkbox"
					name={name}
					checked={checked}
					disabled={disabled}
					onChange={(e) => onChange(e.target.checked)}
				/>
				<span className="toggle-track">
					<span className="toggle-thumb" />
				</span>
			</span>
			{children != null ? <span className="toggle-text">{children}</span> : null}
		</label>
	)
}
