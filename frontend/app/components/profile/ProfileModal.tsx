'use client'

import { type FormEvent } from 'react'

import { LogOut } from 'lucide-react'

import { type AnyRecord } from '@/lib/page-support'

const profilePhoneCountryOptions = [
	{ value: '+54', label: '🇦🇷 +54' },
	{ value: '+598', label: '🇺🇾 +598' },
	{ value: '+56', label: '🇨🇱 +56' },
	{ value: '+55', label: '🇧🇷 +55' },
	{ value: '+595', label: '🇵🇾 +595' },
	{ value: '+591', label: '🇧🇴 +591' },
	{ value: '+51', label: '🇵🇪 +51' },
	{ value: '+57', label: '🇨🇴 +57' },
	{ value: '+52', label: '🇲🇽 +52' },
]

const subscriptionTypeOptions = [
	{ value: 'trial', label: 'Prueba' },
	{ value: 'premium', label: 'Premium' },
]

type ProfileModalProps = {
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	currentUser: AnyRecord
	profileForm: AnyRecord
	setProfileForm: (form: AnyRecord) => void
	canViewEconomy: boolean
	onLogout: () => void
	roleLabel: string
	activeText: string
	trialText: string | null
	joinedText: string
	lastLoginText: string
}

export function ProfileModal({
	onSubmit,
	currentUser,
	profileForm,
	setProfileForm,
	canViewEconomy,
	onLogout,
	roleLabel,
	activeText,
	trialText,
	joinedText,
	lastLoginText,
}: ProfileModalProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<div className="detail-grid profile-detail-grid">
				<div className="detail-row">
					<span>ID</span>
					<strong>{currentUser.id}</strong>
				</div>
				<div className="detail-row">
					<span>Usuario</span>
					<strong>{currentUser.username}</strong>
				</div>
				<label className="detail-row" htmlFor="profile-email">
					<span>Email</span>
					<div className="profile-detail-control">
						<input
							id="profile-email"
							name="profile_email"
							className="profile-detail-input"
							type="email"
							autoComplete="email"
							value={profileForm.email}
							onChange={(event) =>
								setProfileForm({
									...profileForm,
									email: event.target.value,
								})
							}
						/>
					</div>
				</label>
				<div className="detail-row">
					<span>Rol</span>
					<strong>{roleLabel}</strong>
				</div>
				<div className="detail-row">
					<span>Estado</span>
					<strong>{activeText}</strong>
				</div>
				{trialText ? (
					<div className="detail-row">
						<span>Prueba</span>
						<strong>{trialText}</strong>
					</div>
				) : null}
				<div className="detail-row">
					<span>Alta</span>
					<strong>{joinedText}</strong>
				</div>
				<div className="detail-row">
					<span>Acceso</span>
					<strong>{lastLoginText}</strong>
				</div>
				<label className="detail-row" htmlFor="profile-subscription-type">
					<span>Plan interno</span>
					<div className="profile-detail-control">
						<select
							id="profile-subscription-type"
							name="profile_subscription_type"
							className="profile-detail-input"
							value={profileForm.subscription_type}
							onChange={(event) =>
								setProfileForm({
									...profileForm,
									subscription_type: event.target.value,
								})
							}
							disabled={!canViewEconomy}
						>
							{subscriptionTypeOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
				</label>
				<div className="detail-row">
					<span id="profile-phone-label">Celular</span>
					<div className="profile-detail-control">
						<div className="profile-phone-composite">
							<select
								name="profile_phone_country_code"
								className="profile-country-select"
								aria-label="Codigo de pais"
								value={profileForm.phone_country_code}
								onChange={(event) =>
									setProfileForm({
										...profileForm,
										phone_country_code: event.target.value,
									})
								}
							>
								{profilePhoneCountryOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<input
								name="profile_phone_number"
								className="profile-phone-input"
								type="tel"
								inputMode="tel"
								autoComplete="tel-national"
								aria-labelledby="profile-phone-label"
								placeholder="2345 45-5007"
								value={profileForm.phone_number}
								onChange={(event) =>
									setProfileForm({
										...profileForm,
										phone_number: event.target.value,
									})
								}
							/>
						</div>
					</div>
				</div>
			</div>
			{!canViewEconomy ? (
				<div className="record-sub">
					Solo el empleador puede cambiar esta referencia interna.
				</div>
			) : (
				<div className="record-sub">
					Referencia interna de demo; no cobra ni cambia billing real.
				</div>
			)}
			<div className="modal-actions split">
				<button type="button" className="danger" onClick={onLogout}>
					<LogOut size={16} />
					Salir
				</button>
				<button type="submit" className="primary">
					Guardar perfil
				</button>
			</div>
		</form>
	)
}
