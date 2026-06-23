import {
	ButtonHTMLAttributes,
	forwardRef,
	MouseEvent as ReactMouseEvent,
	ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

export type ButtonProps = Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	'type' | 'onClick'
> & {
	variant?: Variant
	size?: Size
	loading?: boolean
	type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
	leadingIcon?: ReactNode
	trailingIcon?: ReactNode
	onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
	onClickAsync?: (
		event: ReactMouseEvent<HTMLButtonElement>,
	) => Promise<unknown> | unknown
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
		onClick,
		onClickAsync,
		...rest
	},
	ref,
) {
	const [internalLoading, setInternalLoading] = useState(false)
	const mountedRef = useRef(true)
	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
		}
	}, [])

	const handleClick = useCallback(
		(event: ReactMouseEvent<HTMLButtonElement>) => {
			if (internalLoading) return
			if (onClickAsync) {
				event.persist?.()
				let result: unknown
				try {
					setInternalLoading(true)
					result = onClickAsync(event)
				} catch (err) {
					if (mountedRef.current) setInternalLoading(false)
					throw err
				}
				if (result && typeof (result as Promise<unknown>).then === 'function') {
					Promise.resolve(result as Promise<unknown>)
						.finally(() => {
							if (mountedRef.current) setInternalLoading(false)
						})
						.catch(() => {
							// El manejo de errores queda en manos del onClickAsync; aca solo
							// liberamos el lock sin propagar unhandled rejections al runtime.
						})
				} else {
					setInternalLoading(false)
				}
				return
			}
			onClick?.(event)
		},
		[internalLoading, onClick, onClickAsync],
	)

	const isLoading = Boolean(loading) || internalLoading
	const isDisabled = Boolean(disabled) || isLoading
	const classes = [
		variant,
		size === 'sm' ? 'button-sm' : null,
		isLoading ? 'is-loading' : null,
		className,
	]
		.filter((value): value is string => Boolean(value))
		.join(' ')
	return (
		<button
			ref={ref}
			type={type}
			className={classes}
			disabled={isDisabled}
			aria-busy={isLoading || undefined}
			aria-disabled={isDisabled || undefined}
			onClick={handleClick}
			{...rest}
		>
			{isLoading ? <span className="button-spinner" aria-hidden="true" /> : leadingIcon}
			<span className="button-label">{children}</span>
			{!isLoading ? trailingIcon : null}
		</button>
	)
})
