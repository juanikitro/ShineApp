'use client'

import { useEffect } from 'react'

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		// Deja rastro en consola para diagnostico; no exponemos internos al usuario.
		console.error(error)
	}, [error])

	return (
		<div className="login-screen">
			<div className="login-card" role="alert">
				<h1>Algo salio mal</h1>
				<p>
					Ocurrio un error inesperado al mostrar esta pantalla. Podes
					reintentar; si el problema sigue, actualiza la pagina o volve a
					iniciar sesion.
				</p>
				<div className="login-actions">
					<button type="button" className="primary" onClick={() => reset()}>
						Reintentar
					</button>
				</div>
			</div>
		</div>
	)
}
