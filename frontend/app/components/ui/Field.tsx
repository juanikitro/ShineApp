import {
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useId,
} from 'react'

import { cx } from '../utils'

type FieldProps = {
	label: ReactNode
	children: ReactNode
	error?: string
	hint?: string
	required?: boolean
}

function mergeTokens(...values: Array<string | undefined | null | false>) {
	const merged = values.filter(Boolean).join(' ').trim()
	return merged.length ? merged : undefined
}

export function Field({ label, children, error, hint, required }: FieldProps) {
	const uid = useId()
	const errorId = `${uid}-error`
	const hintId = `${uid}-hint`

	// Cuando el hijo es un control único (input/select/textarea o un wrapper que
	// reenvía props) le inyectamos el cableado ARIA. El <label> sigue envolviendo
	// el control (asociación implícita), pero el error vive FUERA del label para
	// no contaminar el nombre accesible del campo.
	const single = isValidElement(children)
		? (children as ReactElement<Record<string, unknown>>)
		: null
	const childRequired = Boolean(
		single?.props.required || single?.props['aria-required'],
	)
	const showRequired = Boolean(required) || childRequired

	const describedBy = mergeTokens(
		single?.props['aria-describedby'] as string | undefined,
		hint ? hintId : undefined,
		error ? errorId : undefined,
	)

	const control = single
		? cloneElement(single, {
				'aria-invalid': error
					? true
					: ((single.props['aria-invalid'] as unknown) ?? undefined),
				'aria-describedby': describedBy,
				'aria-required': showRequired || undefined,
				required: (single.props.required as boolean | undefined) ?? required,
			})
		: children

	return (
		<div className={cx('field', error && 'field--error')}>
			<label className="field-control">
				<span
					className={cx(
						'field-label-text',
						showRequired && 'field-label-text--required',
					)}
				>
					{label}
				</span>
				{control}
			</label>
			{hint ? (
				<span className="field-hint" id={hintId}>
					{hint}
				</span>
			) : null}
			{error ? (
				<span className="field-error" id={errorId} role="alert">
					{error}
				</span>
			) : null}
		</div>
	)
}
