import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'destructive' | 'subtle'
type Size = 'sm' | 'md'

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	variant?: Variant
	size?: Size
	loading?: boolean
	type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
	leadingIcon?: ReactNode
	trailingIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		variant = 'primary',
		size = 'md',
		loading = false,
		disabled,
		type = 'button',
		className,
		children,
		leadingIcon,
		trailingIcon,
		...rest
	},
	ref,
) {
	const isDisabled = Boolean(disabled) || loading
	const classes = [variant, size === 'sm' ? 'button-sm' : null, loading ? 'is-loading' : null, className]
		.filter((value): value is string => Boolean(value))
		.join(' ')
	return (
		<button
			ref={ref}
			type={type}
			className={classes}
			disabled={isDisabled}
			aria-busy={loading || undefined}
			aria-disabled={isDisabled || undefined}
			{...rest}
		>
			{loading ? <span className="button-spinner" aria-hidden="true" /> : leadingIcon}
			<span className="button-label">{children}</span>
			{!loading ? trailingIcon : null}
		</button>
	)
})
