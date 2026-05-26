import {
	type AnyRecord,
	formatDateLabel,
	formatDateTimeLabel,
} from '@/lib/page-support'

const userRoleLabels: Record<string, string> = {
	empleador: 'Empleador',
	empleado: 'Empleado',
}

export function blankProfileForm(user?: AnyRecord | null) {
	return {
		email: String(user?.email ?? ''),
		phone_country_code: String(user?.phone_country_code ?? '+54'),
		phone_number: String(user?.phone_number ?? ''),
		subscription_type: String(user?.subscription_type ?? 'trial'),
	}
}

export function profileDisplayName(user?: AnyRecord | null) {
	return String(user?.username ?? 'Mi perfil')
}

export function profileInitial(user?: AnyRecord | null) {
	const name = profileDisplayName(user).trim()
	return name ? name.charAt(0).toUpperCase() : '?'
}

export function profileRoleLabel(user?: AnyRecord | null) {
	return userRoleLabels[String(user?.role ?? '')] ?? 'Usuario'
}

export function profileLastLoginText(user?: AnyRecord | null) {
	return user?.last_login
		? formatDateTimeLabel(user.last_login)
		: 'Sin inicio previo'
}

export function profileJoinedText(user?: AnyRecord | null) {
	return user?.date_joined
		? formatDateTimeLabel(user.date_joined)
		: 'Sin fecha de alta'
}

export function profileActiveText(user?: AnyRecord | null) {
	return user?.is_active === false ? 'Inactivo' : 'Activo'
}

export function profileTrialText(user?: AnyRecord | null) {
	if (user?.trial_expired) return 'Prueba vencida'
	if (user?.trial_ends_at) {
		return `Prueba activa hasta ${formatDateLabel(user.trial_ends_at)}`
	}
	return null
}
