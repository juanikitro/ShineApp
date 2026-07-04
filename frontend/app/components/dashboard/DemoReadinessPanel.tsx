'use client'

import {
	CalendarDays,
	CheckCircle2,
	Circle,
	CreditCard,
	Globe2,
	MessageCircle,
	Settings2,
	Wrench,
	type LucideIcon,
} from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Panel } from '@/app/components/ui/Panel'
import { cx } from '@/app/components/utils'
import {
	type DemoReadiness,
	type DemoReadinessSettingsSection,
	type DemoReadinessStep,
	type DemoReadinessStepId,
} from '@/lib/demo-readiness'
import { type Section } from '@/lib/page-support'

type DemoReadinessPanelProps = {
	readiness: DemoReadiness
	onOpenSection: (section: Section) => void
	onOpenSettingsSection: (section: DemoReadinessSettingsSection) => void
}

const stepIcons: Record<DemoReadinessStepId, LucideIcon> = {
	business: Settings2,
	services: Wrench,
	turnera: Globe2,
	whatsapp: MessageCircle,
	agenda: CalendarDays,
	'cash-dashboard': CreditCard,
}

function stepProgressText(readiness: DemoReadiness) {
	return `${readiness.completedCount}/${readiness.totalCount} listo`
}

export function DemoReadinessPanel({
	readiness,
	onOpenSection,
	onOpenSettingsSection,
}: DemoReadinessPanelProps) {
	function openStep(step: DemoReadinessStep) {
		if (step.target.kind === 'settings') {
			onOpenSettingsSection(step.target.section)
			return
		}
		onOpenSection(step.target.section)
	}

	const primaryStep =
		readiness.firstPendingStep ??
		readiness.steps.find((step) => step.id === 'agenda') ??
		readiness.steps[0]
	const PrimaryIcon = primaryStep ? stepIcons[primaryStep.id] : CalendarDays

	return (
		<Panel
			className="demo-readiness-panel"
			title="Salida comercial"
			subtitle="Gestion para negocios vehiculares: demo con datos y alta real guiada paso a paso."
			actions={
				primaryStep ? (
					<Button
						type="button"
						variant="primary"
						size="sm"
						leadingIcon={<PrimaryIcon size={16} />}
						onClick={() => openStep(primaryStep)}
					>
						{readiness.ready ? 'Ver agenda' : primaryStep.actionLabel}
					</Button>
				) : null
			}
		>
			<div className="demo-readiness-summary">
				<div className="demo-readiness-meter">
					<div className="demo-readiness-meter-copy">
						<span>{readiness.ready ? 'Demo vendible' : 'Preparacion'}</span>
						<strong>{stepProgressText(readiness)}</strong>
					</div>
					<div
						className="demo-readiness-progress"
						role="progressbar"
						aria-label="Preparacion de demo comercial"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={readiness.percent}
					>
						<span style={{ width: `${readiness.percent}%` }} />
					</div>
				</div>
				<p>{readiness.channelHint}</p>
			</div>
			<div className="demo-readiness-steps">
				{readiness.steps.map((step) => {
					const StepIcon = stepIcons[step.id]
					return (
						<div
							key={step.id}
							className={cx(
								'demo-readiness-step',
								step.done && 'demo-readiness-step--done',
							)}
						>
							<span className="demo-readiness-step-icon" aria-hidden="true">
								<StepIcon size={16} />
							</span>
							<div className="demo-readiness-step-copy">
								<strong>{step.title}</strong>
								<span>{step.description}</span>
							</div>
							<span className="demo-readiness-step-status">
								{step.done ? (
									<CheckCircle2 size={15} aria-hidden="true" />
								) : (
									<Circle size={15} aria-hidden="true" />
								)}
								{step.done ? 'Listo' : 'Pendiente'}
							</span>
							<Button
								type="button"
								variant={step.done ? 'ghost' : 'primary'}
								size="sm"
								onClick={() => openStep(step)}
							>
								{step.actionLabel}
							</Button>
						</div>
					)
				})}
			</div>
		</Panel>
	)
}
