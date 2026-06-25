'use client'

import { type ChangeEvent, type FormEvent, type RefObject } from 'react'

import { Camera, FileText, LogOut } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
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
	avatarInputRef: RefObject<HTMLInputElement | null>
	avatarInputKey: number
	avatarPreview: string | null
	avatarPdfThumbnail: string | null
	avatarIsPdf: boolean
	avatarInitial: string
	hasStoredAvatar: boolean
	onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
	onOpenAvatarPicker: () => void
	submitting?: boolean
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
	avatarInputRef,
	avatarInputKey,
	avatarPreview,
	avatarPdfThumbnail,
	avatarIsPdf,
	avatarInitial,
	hasStoredAvatar,
	onAvatarChange,
	onOpenAvatarPicker,
	submitting = false,
}: ProfileModalProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<div className="profile-avatar-block">
				<button
					type="button"
					className="profile-avatar-preview"
					onClick={onOpenAvatarPicker}
					aria-label={
						hasStoredAvatar
							? 'Cambiar foto de perfil'
							: 'Agregar foto de perfil'
					}
				>
					{avatarPreview && !avatarIsPdf ? (
						<img src={avatarPreview} alt="" />
					) : avatarPdfThumbnail ? (
						<img src={avatarPdfThumbnail} alt="" />
					) : avatarIsPdf ? (
						<FileText size={28} aria-hidden="true" />
					) : (
						<span className="profile-avatar-initial">{avatarInitial}</span>
					)}
					<span className="profile-avatar-overlay" aria-hidden="true">
						<Camera size={15} />
					</span>
				</button>
				<input
					ref={avatarInputRef}
					key={`profile-avatar-${avatarInputKey}`}
					className="visually-hidden-input"
					type="file"
					aria-label="Archivo de foto de perfil"
					accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.pdf"
					onChange={onAvatarChange}
					tabIndex={-1}
				/>
				<span className="profile-avatar-hint">
					Toca la foto para {hasStoredAvatar ? 'cambiarla' : 'agregarla'}
				</span>
			</div>
			<div className="detail-grid profile-detail-grid">
				<div className="detail-row">
					<span>ID</span>
					<strong>{currentUser.id}</strong>
				</div>
				<label className="detail-row" htmlFor="profile-username">
					<span>Usuario</span>
					<div className="profile-detail-control">
						<input
							id="profile-username"
							name="profile_username"
							className="profile-detail-input"
							type="text"
							autoComplete="username"
							value={profileForm.username}
							onChange={(event) =>
								setProfileForm({
									...profileForm,
									username: event.target.value,
								})
							}
						/>
					</div>
				</label>
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
				<div className="detail-row">
					<span>Plan interno</span>
					{/* Solo lectura: el plan lo gestiona facturacion/admin del lado servidor,
					    no es auto-asignable desde el perfil. */}
					<strong>
						{subscriptionTypeOptions.find(
							(option) => option.value === profileForm.subscription_type,
						)?.label ?? profileForm.subscription_type}
					</strong>
				</div>
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
				<Button type="button" variant="danger" onClick={onLogout}>
					<LogOut size={16} />
					Salir
				</Button>
				<Button type="submit" variant="primary" loading={submitting}>
					Guardar perfil
				</Button>
			</div>
		</form>
	)
}
