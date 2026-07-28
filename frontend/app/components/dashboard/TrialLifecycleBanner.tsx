'use client'

import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'

import { Panel } from '@/app/components/ui/Panel'
import { cx } from '@/app/components/utils'
import {
	buildTrialContinuationMessage,
	buildTrialLifecycleState,
	type TrialLifecycleTone,
} from '@/lib/trial-lifecycle'
import { type AnyRecord } from '@/lib/page-support'

type TrialLifecycleBannerProps = {
	currentUser?: AnyRecord | null
}

const TRIAL_CONTINUITY_WHATSAPP_URL = 'https://wa.me/2345455007'

const toneIcons = {
	active: CheckCircle2,
	warning: AlertTriangle,
	expired: AlertTriangle,
} satisfies Record<TrialLifecycleTone, typeof CheckCircle2>

export function TrialLifecycleBanner({ currentUser }: TrialLifecycleBannerProps) {
	const state = buildTrialLifecycleState(currentUser)
	if (!state) return null

	const ToneIcon = toneIcons[state.tone]
	const continuationMessage = buildTrialContinuationMessage(currentUser, state)
	const continuationUrl = `${TRIAL_CONTINUITY_WHATSAPP_URL}?text=${encodeURIComponent(continuationMessage)}`

	return (
		<Panel
			className={cx('trial-lifecycle-panel', `trial-lifecycle-panel--${state.tone}`)}
			aria-label="Estado de prueba"
		>
			<div className="trial-lifecycle-main">
				<span className="trial-lifecycle-icon" aria-hidden="true">
					<ToneIcon size={18} />
				</span>
				<div className="trial-lifecycle-copy">
					<span className="trial-lifecycle-badge">{state.badge}</span>
					<strong>{state.title}</strong>
					<p>{state.detail}</p>
					{state.endsAtLabel ? <small>Fecha de vencimiento: {state.endsAtLabel}</small> : null}
				</div>
			</div>
			<div className="trial-lifecycle-side">
				{state.remainingPercent !== null ? (
					<div
						className="trial-lifecycle-meter"
						role="progressbar"
						aria-label="Dias restantes de prueba"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={state.remainingPercent}
					>
						<span style={{ width: `${state.remainingPercent}%` }} />
					</div>
				) : null}
				<div className="trial-lifecycle-actions">
					<a
						className="trial-lifecycle-upgrade"
						href={continuationUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						<ExternalLink size={16} aria-hidden="true" />
						Contratar ShineApp
					</a>
				</div>
			</div>
		</Panel>
	)
}
