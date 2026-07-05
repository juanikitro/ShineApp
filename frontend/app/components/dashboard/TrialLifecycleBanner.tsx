'use client'

import { useState } from 'react'

import { AlertTriangle, CheckCircle2, Copy, ExternalLink } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Panel } from '@/app/components/ui/Panel'
import { cx } from '@/app/components/utils'
import {
	buildTrialContinuationMessage,
	buildTrialLifecycleState,
	trialUpgradeUrl,
	type TrialLifecycleTone,
} from '@/lib/trial-lifecycle'
import { type AnyRecord } from '@/lib/page-support'

type TrialLifecycleBannerProps = {
	currentUser?: AnyRecord | null
	onOpenUpgrade?: (url: string) => void
}

const toneIcons = {
	active: CheckCircle2,
	warning: AlertTriangle,
	expired: AlertTriangle,
} satisfies Record<TrialLifecycleTone, typeof CheckCircle2>

export function TrialLifecycleBanner({ currentUser, onOpenUpgrade }: TrialLifecycleBannerProps) {
	const state = buildTrialLifecycleState(currentUser)
	const [copied, setCopied] = useState(false)
	if (!state) return null

	const upgradeUrl = trialUpgradeUrl()
	const ToneIcon = toneIcons[state.tone]
	const copyMessage = buildTrialContinuationMessage(currentUser, state)

	async function copyContinuationMessage() {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(copyMessage)
		}
		setCopied(true)
		window.setTimeout(() => setCopied(false), 2200)
	}

	function openUpgrade() {
		if (!upgradeUrl) return
		if (onOpenUpgrade) {
			onOpenUpgrade(upgradeUrl)
			return
		}
		window.open(upgradeUrl, '_blank', 'noopener,noreferrer')
	}

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
					{upgradeUrl ? (
						<Button
							type="button"
							variant={state.tone === 'active' ? 'ghost' : 'primary'}
							size="sm"
							leadingIcon={<ExternalLink size={16} />}
							onClick={openUpgrade}
						>
							Coordinar continuidad
						</Button>
					) : null}
					<Button
						type="button"
						variant={upgradeUrl ? 'ghost' : 'primary'}
						size="sm"
						leadingIcon={<Copy size={16} />}
						onClickAsync={copyContinuationMessage}
					>
						{copied ? 'Mensaje copiado' : 'Copiar pedido'}
					</Button>
				</div>
			</div>
		</Panel>
	)
}
