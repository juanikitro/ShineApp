'use client'

import {
	CalendarDays,
	CheckCircle2,
	Circle,
	CreditCard,
	Globe2,
	MessageCircle,
	Settings2,
	Sparkles,
	Wrench,
	X,
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
import { type StarterServicesPlan } from '@/lib/onboarding-services'
import { type AnyRecord, type Section } from '@/lib/page-support'
import { useConfirmDialog } from '@/lib/use-confirm-dialog'

type DemoReadinessPanelProps = {
	firstChargeableWorkOrder?: AnyRecord | null
	readiness: DemoReadiness
	starterServicesLoading?: boolean
	starterServicesPlan?: StarterServicesPlan
	onCreateFirstReservation?: () => void
	onDismissStep: (stepId: DemoReadinessStepId) => Promise<unknown> | unknown
	onOpenSection: (section: Section) => void
	onOpenSettingsSection: (section: DemoReadinessSettingsSection) => void
	onOpenFirstPayment?: (workOrder: AnyRecord) => void
	onCreateStarterServices?: () => Promise<unknown> | unknown
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
	firstChargeableWorkOrder = null,
	readiness,
	starterServicesLoading = false,
	starterServicesPlan,
	onCreateFirstReservation,
	onDismissStep,
	onCreateStarterServices,
	onOpenFirstPayment,
	onOpenSection,
	onOpenSettingsSection,
}: DemoReadinessPanelProps) {
	const { requestConfirm, ConfirmDialog } = useConfirmDialog()

	async function dismissStep(step: DemoReadinessStep) {
		const confirmed = await requestConfirm({
			title: 'Quitar paso de alta guiada',
			message:
				'Este paso dejara de contar en el progreso y no se podra recuperar. ¿Continuar?',
			confirmLabel: 'Quitar paso',
			tone: 'danger',
		})
		if (!confirmed) return
		return onDismissStep(step.id)
	}

	if (!readiness.steps.length) return null

	function openStep(step: DemoReadinessStep) {
		if (step.target.kind === 'settings') {
			onOpenSettingsSection(step.target.section)
			return
		}
		onOpenSection(step.target.section)
	}

	function actionLabelForStep(step: DemoReadinessStep) {
		if (!firstOperationActive) return step.actionLabel
		if (!step.done && step.id === 'agenda' && onCreateFirstReservation) {
			return 'Crear primer turno'
		}
		if (!step.done && step.id === 'cash-dashboard') {
			if (firstChargeableWorkOrder && onOpenFirstPayment) {
				return 'Cobrar primer trabajo'
			}
			if (onCreateFirstReservation) return 'Crear turno primero'
		}
		return step.actionLabel
	}

	function runStepAction(step: DemoReadinessStep) {
		if (
			firstOperationActive &&
			!step.done &&
			step.id === 'agenda' &&
			onCreateFirstReservation
		) {
			onCreateFirstReservation()
			return
		}
		if (firstOperationActive && !step.done && step.id === 'cash-dashboard') {
			if (firstChargeableWorkOrder && onOpenFirstPayment) {
				onOpenFirstPayment(firstChargeableWorkOrder)
				return
			}
			if (onCreateFirstReservation) {
				onCreateFirstReservation()
				return
			}
		}
		openStep(step)
	}

	const primaryStep =
		readiness.firstPendingStep ??
		readiness.steps.find((step) => step.id === 'agenda') ??
		readiness.steps[0]
	const PrimaryIcon =
		primaryStep?.id === 'cash-dashboard' && !firstChargeableWorkOrder
			? CalendarDays
			: primaryStep
				? stepIcons[primaryStep.id]
				: CalendarDays
	const servicesStep = readiness.steps.find((step) => step.id === 'services')
	const agendaStep = readiness.steps.find((step) => step.id === 'agenda')
	const cashStep = readiness.steps.find((step) => step.id === 'cash-dashboard')
	const firstOperationActive =
		primaryStep?.id === 'agenda' ||
		primaryStep?.id === 'cash-dashboard' ||
		Boolean(agendaStep?.done && cashStep && !cashStep.done)
	const showFirstOperationGuide = Boolean(
		firstOperationActive &&
			((agendaStep && !agendaStep.done) || (cashStep && !cashStep.done)),
	)
	const showCashOperationAction = Boolean(
		cashStep && (cashStep.done || agendaStep?.done || !agendaStep),
	)
	const starterServicesAvailable = Boolean(
		servicesStep &&
			!servicesStep.done &&
			starterServicesPlan?.drafts.length &&
			onCreateStarterServices,
	)
	const title = readiness.mode === 'onboarding' ? 'Alta guiada' : 'Salida comercial'
	const subtitle =
		readiness.mode === 'onboarding'
			? 'Completa la base del negocio real sin depender de datos demo.'
			: 'Gestion para negocios vehiculares: demo con datos y alta real guiada paso a paso.'
	const meterLabel = readiness.ready ? 'Demo vendible' : 'Alta en progreso'
	const primaryLabel =
		starterServicesAvailable && primaryStep?.id === 'services'
			? 'Crear servicios base'
			: readiness.ready
				? 'Ver agenda'
				: primaryStep
					? actionLabelForStep(primaryStep)
					: undefined
	const handlePrimaryAction = () => {
		if (starterServicesAvailable && primaryStep?.id === 'services') {
			return onCreateStarterServices?.()
		}
		if (primaryStep) runStepAction(primaryStep)
	}

	function stepListActionLabel(step: DemoReadinessStep) {
		if (
			showFirstOperationGuide &&
			(step.id === 'agenda' || step.id === 'cash-dashboard')
		) {
			return step.id === 'agenda' ? 'Ver agenda' : 'Ver caja'
		}
		return step.done ? step.actionLabel : actionLabelForStep(step)
	}

	function runStepListAction(step: DemoReadinessStep) {
		if (
			showFirstOperationGuide &&
			(step.id === 'agenda' || step.id === 'cash-dashboard')
		) {
			openStep(step)
			return
		}
		runStepAction(step)
	}

	return (
		<Panel
			className="demo-readiness-panel"
			title={title}
			subtitle={subtitle}
			actions={
				primaryStep && !showFirstOperationGuide ? (
					<Button
						type="button"
						variant="primary"
						size="sm"
						leadingIcon={<PrimaryIcon size={16} />}
						loading={starterServicesAvailable && starterServicesLoading}
						onClickAsync={handlePrimaryAction}
					>
						{primaryLabel}
					</Button>
				) : null
			}
		>
			<div className="demo-readiness-summary">
				<div className="demo-readiness-meter">
					<div className="demo-readiness-meter-copy">
						<span>{meterLabel}</span>
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
				<div className="demo-readiness-next">
					<span>Siguiente paso</span>
					<strong>{readiness.nextStepHint}</strong>
					<p>{readiness.channelHint}</p>
				</div>
			</div>
			{servicesStep && !servicesStep.done && starterServicesPlan ? (
				<div className="demo-readiness-starter">
					<div className="demo-readiness-starter-copy">
						<span className="demo-readiness-starter-icon" aria-hidden="true">
							<Sparkles size={16} />
						</span>
						<div>
							<strong>Servicios base sugeridos</strong>
							<p>
								Crea una base inicial para lavadero, detailing y lubricentro.
								Despues podes editar precios, duracion y detalle.
							</p>
						</div>
					</div>
					<div className="demo-readiness-starter-services">
						{starterServicesPlan.templates.map((template) => {
							const existing = starterServicesPlan.existingTemplates.some(
								(item) => item.id === template.id,
							)
							const blocked = starterServicesPlan.blockedTemplates.some(
								(item) => item.id === template.id,
							)
							return (
								<span
									key={template.id}
									className={cx(
										'demo-readiness-starter-chip',
										existing && 'demo-readiness-starter-chip--done',
										blocked && 'demo-readiness-starter-chip--blocked',
									)}
								>
									<span aria-hidden="true">{template.icon}</span>
									{template.name}
									<small>
										{existing ? 'Listo' : blocked ? 'Sin sector' : 'Crear'}
									</small>
								</span>
							)
						})}
					</div>
					<Button
						type="button"
						variant={starterServicesPlan.drafts.length ? 'primary' : 'ghost'}
						size="sm"
						leadingIcon={<Wrench size={16} />}
						loading={starterServicesLoading}
						onClickAsync={
							starterServicesPlan.drafts.length
								? onCreateStarterServices
								: () => openStep(servicesStep)
						}
					>
						{starterServicesPlan.drafts.length
							? `Crear ${starterServicesPlan.drafts.length} servicios base`
							: 'Revisar servicios'}
					</Button>
				</div>
			) : null}
			{showFirstOperationGuide ? (
				<div className="demo-readiness-operation">
					<div className="demo-readiness-operation-copy">
						<span className="demo-readiness-starter-icon" aria-hidden="true">
							<CalendarDays size={16} />
						</span>
						<div>
							<strong>Primer recorrido operativo</strong>
							<p>
								Carga un turno y despues cobra ese trabajo para que Agenda, Caja
								y Dashboard queden conectados desde el primer uso.
							</p>
						</div>
					</div>
					<div className="demo-readiness-operation-actions">
						{agendaStep ? (
							<Button
								type="button"
								variant={agendaStep.done ? 'ghost' : 'primary'}
								size="sm"
								leadingIcon={<CalendarDays size={16} />}
								onClick={() => runStepAction(agendaStep)}
							>
								{agendaStep.done ? 'Ver agenda' : actionLabelForStep(agendaStep)}
							</Button>
						) : null}
						{showCashOperationAction && cashStep ? (
							<Button
								type="button"
								variant={cashStep.done ? 'ghost' : 'primary'}
								size="sm"
								leadingIcon={<CreditCard size={16} />}
								onClick={() => runStepAction(cashStep)}
							>
								{cashStep.done ? 'Ver caja' : actionLabelForStep(cashStep)}
							</Button>
						) : null}
					</div>
				</div>
			) : null}
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
								className="demo-readiness-step-action"
								onClick={() => runStepListAction(step)}
							>
								{stepListActionLabel(step)}
							</Button>
							<Button
								type="button"
								variant="ghost"
								className="icon-button demo-readiness-step-dismiss"
								aria-label={`Descartar ${step.title} de alta guiada`}
								title="Quitar paso definitivamente"
								onClickAsync={() => dismissStep(step)}
							>
								<X size={16} />
							</Button>
						</div>
					)
				})}
			</div>
			<ConfirmDialog />
		</Panel>
	)
}
