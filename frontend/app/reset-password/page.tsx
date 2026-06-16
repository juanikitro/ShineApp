'use client'

import { type FormEvent, useState, useEffect } from 'react'
import { AppBrand } from '@/app/components/layout/AppBrand'
import { Field } from '@/app/components/ui/Field'
import { publicApiFetch } from '@/lib/api'
import { type ApiErrorNotice, formatApiError } from '@/lib/api-errors'

type ResetPasswordMode = 'form' | 'success' | 'invalid'

function FormErrorNotice({ notice }: { notice: ApiErrorNotice }) {
	return (
		<div className="alert-notice" role="alert">
			<strong className="alert-title">{notice.title}</strong>
			{notice.description ? <p>{notice.description}</p> : null}
			{notice.fields.length ? (
				<ul className="alert-fields">
					{notice.fields.map((field, index) => (
						<li key={`${field.path}-${index}`}>
							<strong>{field.label}</strong>
							<span>{field.message}</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}

export default function ResetPasswordPage() {
	const [token, setToken] = useState<string | null>(null)
	const [newPassword, setNewPassword] = useState('')
	const [mode, setMode] = useState<ResetPasswordMode>('form')
	const [loading, setLoading] = useState(false)
	const [errorNotice, setErrorNotice] = useState<ApiErrorNotice | null>(null)

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		const t = params.get('token')
		if (!t) {
			setMode('invalid')
		} else {
			setToken(t)
			// Saca el token de la URL para que no quede en el historial ni se
			// filtre por Referer hacia recursos de terceros.
			window.history.replaceState(null, '', window.location.pathname)
		}
	}, [])

	async function handleSubmit(event: FormEvent) {
		event.preventDefault()
		if (!token) return
		setLoading(true)
		setErrorNotice(null)
		try {
			await publicApiFetch('/auth/password-reset/confirm/', {
				method: 'POST',
				body: JSON.stringify({ token, new_password: newPassword }),
			})
			setMode('success')
		} catch (err: any) {
			setErrorNotice(
				formatApiError(err, {
					fallbackTitle: 'No se pudo actualizar la contraseña',
					fallbackDescription: 'El link puede ser invalido o estar vencido.',
				}),
			)
		} finally {
			setLoading(false)
		}
	}

	return (
		<main className="login-screen">
			{mode === 'invalid' ? (
				<div className="login-card">
					<AppBrand
						className="login-brand"
						subtitle="Recuperar acceso"
						titleAs="h1"
					/>
					<p>El link de recuperacion es invalido o ya no esta disponible.</p>
					<div className="login-actions">
						<a href="/" className="primary" style={{ textAlign: 'center' }}>
							Volver al login
						</a>
					</div>
				</div>
			) : mode === 'success' ? (
				<div className="login-card">
					<AppBrand
						className="login-brand"
						subtitle="Recuperar acceso"
						titleAs="h1"
					/>
					<p>Tu contraseña fue actualizada correctamente. Ya podes ingresar con tu nueva clave.</p>
					<div className="login-actions">
						<a href="/" className="primary" style={{ textAlign: 'center' }}>
							Ir al login
						</a>
					</div>
				</div>
			) : (
				<form className="login-card" onSubmit={handleSubmit}>
					<AppBrand
						className="login-brand"
						subtitle="Crear nueva contraseña"
						titleAs="h1"
					/>
					{errorNotice ? <FormErrorNotice notice={errorNotice} /> : null}
					<div className="form-grid">
						<Field label="Nueva contraseña">
							<input
								type="password"
								name="new_password"
								autoComplete="new-password"
								required
								minLength={8}
								value={newPassword}
								onChange={(event) => setNewPassword(event.target.value)}
							/>
						</Field>
						<div className="login-actions">
							<button type="submit" className="primary" disabled={loading || !token}>
								Guardar contraseña
							</button>
							<a href="/" className="ghost" style={{ textAlign: 'center' }}>
								Cancelar
							</a>
						</div>
					</div>
				</form>
			)}
		</main>
	)
}
