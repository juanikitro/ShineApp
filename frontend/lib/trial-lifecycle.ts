import { safeHttpUrl } from '@/lib/contact-links'
import { type AnyRecord, formatDateLabel, numberValue } from '@/lib/page-support'

export type TrialLifecycleTone = 'active' | 'warning' | 'expired'

export type TrialLifecycleState = {
	tone: TrialLifecycleTone
	badge: string
	title: string
	detail: string
	endsAtLabel: string | null
	daysRemaining: number | null
	remainingPercent: number | null
}

const DEFAULT_TRIAL_DAYS = 14
const TRIAL_ENDING_SOON_DAYS = 3

function finiteDays(value: unknown) {
	if (value === null || value === undefined || value === '') return null
	const days = numberValue(value)
	return Number.isFinite(days) ? Math.ceil(days) : null
}

function daysUntil(value: unknown, now: Date) {
	if (!value) return null
	const raw = String(value)
	const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59` : raw
	const date = new Date(normalized)
	if (Number.isNaN(date.getTime())) return null
	return Math.ceil((date.getTime() - now.getTime()) / 86_400_000)
}

function trialDaysRemaining(user: AnyRecord, now: Date) {
	return finiteDays(user.trial_days_remaining) ?? daysUntil(user.trial_ends_at, now)
}

function trialEndsAtLabel(user: AnyRecord) {
	return user.trial_ends_at ? formatDateLabel(user.trial_ends_at) : null
}

function remainingPercent(daysRemaining: number | null) {
	if (daysRemaining === null) return null
	const bounded = Math.max(0, Math.min(DEFAULT_TRIAL_DAYS, daysRemaining))
	return Math.round((bounded / DEFAULT_TRIAL_DAYS) * 100)
}

export function trialUpgradeUrl() {
	return safeHttpUrl(process.env.NEXT_PUBLIC_TRIAL_UPGRADE_URL)
}

export function buildTrialLifecycleState(
	user?: AnyRecord | null,
	now = new Date(),
): TrialLifecycleState | null {
	if (!user) return null
	if (String(user.subscription_type ?? '') === 'premium') return null
	const hasTrialShape =
		String(user.subscription_type ?? '') === 'trial' ||
		Boolean(user.trial_ends_at) ||
		user.trial_days_remaining !== undefined ||
		user.trial_expired !== undefined
	if (!hasTrialShape) return null

	const daysRemaining = trialDaysRemaining(user, now)
	const endsAtLabel = trialEndsAtLabel(user)
	const expired = user.trial_expired === true || (daysRemaining !== null && daysRemaining < 0)
	const pct = remainingPercent(daysRemaining)

	if (expired) {
		return {
			tone: 'expired',
			badge: 'Prueba vencida',
			title: 'Prueba vencida',
			detail:
				'El negocio sigue operable mientras no actives bloqueo por suscripcion, pero necesita continuidad comercial manual.',
			endsAtLabel,
			daysRemaining,
			remainingPercent: pct,
		}
	}

	if (daysRemaining !== null && daysRemaining <= TRIAL_ENDING_SOON_DAYS) {
		const title =
			daysRemaining <= 0
				? 'La prueba vence hoy'
				: `La prueba vence en ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`
		return {
			tone: 'warning',
			badge: 'Por vencer',
			title,
			detail:
				'Coordina continuidad antes de seguir cargando operacion real: agenda, caja y dashboard ya quedan vinculados al negocio.',
			endsAtLabel,
			daysRemaining,
			remainingPercent: pct,
		}
	}

	return {
		tone: 'active',
		badge: 'Prueba activa',
		title:
			daysRemaining === null
				? 'Prueba activa'
				: `Quedan ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'} de prueba`,
		detail:
			'Usa este periodo para completar alta guiada, cargar el primer turno y validar caja con datos reales del negocio.',
		endsAtLabel,
		daysRemaining,
		remainingPercent: pct,
	}
}

export function buildTrialContinuationMessage(
	user: AnyRecord | null | undefined,
	state: TrialLifecycleState,
) {
	const businessName = String(user?.business?.name ?? '').trim() || 'mi negocio'
	const username = String(user?.username ?? '').trim()
	const email = String(user?.email ?? '').trim()
	const contact = [username, email].filter(Boolean).join(' / ')
	const endsAt = state.endsAtLabel ? ` Vence: ${state.endsAtLabel}.` : ''
	const account = contact ? ` Usuario: ${contact}.` : ''
	return `Hola, quiero coordinar la continuidad de ShineApp para ${businessName}. Estado: ${state.badge}.${endsAt}${account}`
}
