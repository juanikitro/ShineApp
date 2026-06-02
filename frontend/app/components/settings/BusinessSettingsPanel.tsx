'use client'

import {
	type ChangeEvent,
	type FormEvent,
	type RefObject,
} from 'react'

import { Building2, FileText } from 'lucide-react'

import { Field } from '@/app/components/ui/Field'
import { cx } from '@/app/components/utils'
import { joinDisplayParts } from '@/lib/display-text'
import {
	type AnyRecord,
	businessVatConditionOptions,
} from '@/lib/page-support'

type BusinessSettingsPanelProps = {
	businessForm: AnyRecord
	businessLogoFile: File | null
	businessLogoInputKey: number
	businessLogoInputRef: RefObject<HTMLInputElement | null>
	businessLogoIsPdf: boolean
	businessLogoPdfStatus: string
	businessLogoPreview: string | null
	businessProfile?: AnyRecord | null
	businessSlug: string
	safeBusinessLogoPdfThumbnail: string | null
	safeBusinessLogoPreview: string | null
	onBusinessLogoChange: (event: ChangeEvent<HTMLInputElement>) => void
	onOpenBusinessLogoPicker: () => void
	onPatchBusinessForm: (patch: AnyRecord) => void
	onSaveBusinessProfile: (event: FormEvent) => void
}

export function BusinessSettingsPanel({
	businessForm,
	businessLogoFile,
	businessLogoInputKey,
	businessLogoInputRef,
	businessLogoIsPdf,
	businessLogoPdfStatus,
	businessLogoPreview,
	businessProfile,
	businessSlug,
	safeBusinessLogoPdfThumbnail,
	safeBusinessLogoPreview,
	onBusinessLogoChange,
	onOpenBusinessLogoPicker,
	onPatchBusinessForm,
	onSaveBusinessProfile,
}: BusinessSettingsPanelProps) {
	const publicLandingUrl = businessSlug
		? `${typeof window !== 'undefined' ? window.location.origin : ''}/publica/${businessSlug}`
		: ''
	const publicLandingEnabled = businessForm.public_landing_enabled !== false
	const bookingRequestsEnabled =
		businessForm.allow_public_booking_requests !== false
	const quoteRequestsEnabled =
		businessForm.allow_public_quote_requests !== false

	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Configuracion comercial</span>
					<h2>Negocio</h2>
					<p>
						Nombre comercial, logo y datos de contacto que identifican la
						operacion.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-primary-actions">
						<button
							type="submit"
							className="primary"
							form="settings-business-form"
						>
							<Building2 size={16} />
							Guardar datos
						</button>
					</div>
					<div className="settings-secondary-actions">
						<button
							type="button"
							className="ghost"
							onClick={onOpenBusinessLogoPicker}
						>
							<FileText size={16} />
							{businessLogoPreview ? 'Cambiar logo' : 'Cargar logo'}
						</button>
					</div>
				</div>
			</div>
			<div className="business-profile-card">
				<button
					type="button"
					className="business-profile-preview image-upload-trigger"
					onClick={onOpenBusinessLogoPicker}
					aria-label={
						businessLogoPreview
							? 'Cambiar logo del negocio'
							: 'Cargar logo del negocio'
					}
				>
					{safeBusinessLogoPreview && !businessLogoIsPdf ? (
						<img
							src={encodeURI(safeBusinessLogoPreview)}
							alt={`Logo de ${businessForm.name || 'tu negocio'}`}
						/>
					) : safeBusinessLogoPdfThumbnail ? (
						<img
							src={encodeURI(safeBusinessLogoPdfThumbnail)}
							alt={`Preview del PDF de ${businessForm.name || 'tu negocio'}`}
						/>
					) : businessLogoPreview ? (
						<div className="file-preview-placeholder">
							<FileText size={48} />
							<span>
								{businessLogoPdfStatus === 'loading'
									? 'Generando preview del PDF...'
									: 'No se pudo generar el preview del PDF'}
							</span>
						</div>
					) : (
						<div className="business-profile-placeholder">
							<Building2 size={28} />
							<span>Sin imagen cargada</span>
						</div>
					)}
				</button>
				<input
					ref={businessLogoInputRef}
					key={`business-logo-${businessLogoInputKey}`}
					className="visually-hidden-input"
					type="file"
					aria-label="Archivo de logo del negocio"
					accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.pdf"
					onChange={onBusinessLogoChange}
					tabIndex={-1}
				/>
				<div className="business-profile-details">
					<div className="settings-status-row">
						<span
							className={cx(
								'status',
								publicLandingEnabled ? 'paid' : 'warning',
							)}
						>
							{publicLandingEnabled ? 'Landing activa' : 'Landing pausada'}
						</span>
						<span
							className={cx(
								'status',
								bookingRequestsEnabled ? 'paid' : 'draft',
							)}
						>
							Turnos {bookingRequestsEnabled ? 'abiertos' : 'cerrados'}
						</span>
						<span
							className={cx(
								'status',
								quoteRequestsEnabled ? 'paid' : 'draft',
							)}
						>
							Cotizaciones {quoteRequestsEnabled ? 'abiertas' : 'cerradas'}
						</span>
					</div>
					<strong>{businessForm.name || 'Negocio sin nombre'}</strong>
					<p>
						{businessForm.contact_email || businessForm.contact_phone
							? joinDisplayParts([
									businessForm.contact_email,
									businessForm.contact_phone,
								])
							: 'Completa mail o celular para que la landing publica tenga un contacto claro.'}
					</p>
					<div className="record-sub business-profile-note">
						{businessLogoFile
							? `Nuevo archivo listo para guardar: ${businessLogoFile.name}`
							: businessProfile?.logo_url
								? 'Hace click en el archivo para reemplazar el logo actual.'
								: 'Hace click en la imagen para cargar un logo. Acepta JPG, PNG, WEBP, SVG o PDF.'}
					</div>
				</div>
			</div>
			<form
				className="form-grid"
				id="settings-business-form"
				onSubmit={onSaveBusinessProfile}
			>
				<Field label="Nombre">
					<input
						name="business_name"
						autoComplete="organization"
						required
						value={businessForm.name}
						onChange={(event) =>
							onPatchBusinessForm({
								name: event.target.value,
							})
						}
					/>
				</Field>
				<div className="form-row">
					<Field label="CUIT">
						<input
							name="business_cuit"
							autoComplete="off"
							inputMode="numeric"
							placeholder="20304050607"
							value={businessForm.cuit}
							onChange={(event) =>
								onPatchBusinessForm({
									cuit: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Condicion frente a IVA">
						<select
							value={businessForm.vat_condition}
							name="business_vat_condition"
							onChange={(event) =>
								onPatchBusinessForm({
									vat_condition: event.target.value,
								})
							}
						>
							<option value="">Seleccionar</option>
							{businessVatConditionOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</Field>
				</div>
				<div className="form-row">
					<Field label="Celular de contacto">
						<input
							inputMode="tel"
							name="business_contact_phone"
							autoComplete="tel"
							value={businessForm.contact_phone}
							onChange={(event) =>
								onPatchBusinessForm({
									contact_phone: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Mail de contacto">
						<input
							type="email"
							name="business_contact_email"
							autoComplete="email"
							value={businessForm.contact_email}
							onChange={(event) =>
								onPatchBusinessForm({
									contact_email: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				<Field label="Direccion comercial">
					<input
						value={businessForm.address}
						name="business_address"
						autoComplete="street-address"
						onChange={(event) =>
							onPatchBusinessForm({
								address: event.target.value,
							})
						}
					/>
				</Field>
				<div className="landing-config">
					<Field label="URL publica">
						<input
							readOnly
							name="business_public_url"
							value={publicLandingUrl}
							placeholder="Disponible al iniciar sesion con negocio"
						/>
					</Field>
					<label>
						<input
							type="checkbox"
							name="business_public_landing_enabled"
							checked={businessForm.public_landing_enabled !== false}
							onChange={(event) =>
								onPatchBusinessForm({
									public_landing_enabled: event.target.checked,
								})
							}
						/>
						Landing publica activa
					</label>
					<div className="form-row">
						<label>
							<input
								type="checkbox"
								name="business_allow_public_booking_requests"
								checked={
									businessForm.allow_public_booking_requests !== false
								}
								onChange={(event) =>
									onPatchBusinessForm({
										allow_public_booking_requests: event.target.checked,
									})
								}
							/>
							Recibir pedidos de turno
						</label>
						<label>
							<input
								type="checkbox"
								name="business_allow_public_quote_requests"
								checked={businessForm.allow_public_quote_requests !== false}
								onChange={(event) =>
									onPatchBusinessForm({
										allow_public_quote_requests: event.target.checked,
									})
								}
							/>
							Recibir pedidos de cotizacion
						</label>
					</div>
					<Field label="Texto corto para la landing">
						<textarea
							maxLength={240}
							name="business_public_landing_intro"
							autoComplete="off"
							rows={3}
							value={businessForm.public_landing_intro}
							onChange={(event) =>
								onPatchBusinessForm({
									public_landing_intro: event.target.value,
								})
							}
						/>
					</Field>
					<div className="form-row">
						<Field label="Apertura">
							<input
								type="time"
								name="business_opening_time"
								value={businessForm.opening_time ?? ''}
								onChange={(event) =>
									onPatchBusinessForm({
										opening_time: event.target.value || null,
									})
								}
							/>
						</Field>
						<Field label="Cierre">
							<input
								type="time"
								name="business_closing_time"
								value={businessForm.closing_time ?? ''}
								onChange={(event) =>
									onPatchBusinessForm({
										closing_time: event.target.value || null,
									})
								}
							/>
						</Field>
					</div>
				</div>
			</form>
		</section>
	)
}
