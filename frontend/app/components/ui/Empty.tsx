import { ReactNode } from 'react'

type EmptyProps = {
	text: string
	hint?: string
	action?: ReactNode
}

type StateNoticeProps = {
	title: string
	hint?: string
	tone?: 'empty' | 'loading' | 'error'
	action?: ReactNode
}

export function StateNotice({
	title,
	hint,
	tone = 'empty',
	action,
}: StateNoticeProps) {
	const isLoading = tone === 'loading'
	const isError = tone === 'error'
	return (
		<div
			className={`state-notice state-notice--${tone} ${
				isError ? 'error-state' : 'empty'
			}`}
			role={isError ? 'alert' : isLoading ? 'status' : undefined}
			aria-live={isError ? 'assertive' : isLoading ? 'polite' : undefined}
		>
			{isLoading ? <span className="state-notice-spinner" aria-hidden="true" /> : null}
			<div className="state-notice-copy">
				<strong className="empty-title">{title}</strong>
				{hint ? <p className="empty-hint">{hint}</p> : null}
			</div>
			{action ? <div className="state-notice-action">{action}</div> : null}
		</div>
	)
}

export function Empty({ text, hint, action }: EmptyProps) {
	return <StateNotice title={text} hint={hint} action={action} />
}

export function LoadingState({
	text = 'Cargando...',
	hint,
}: {
	text?: string
	hint?: string
}) {
	return <StateNotice title={text} hint={hint} tone="loading" />
}

export function ErrorState({
	text,
	hint,
	action,
}: {
	text: string
	hint?: string
	action?: ReactNode
}) {
	return (
		<StateNotice title={text} hint={hint} tone="error" action={action} />
	)
}
