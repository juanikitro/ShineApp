'use client'

// global-error reemplaza el root layout cuando el error ocurre en el layout
// mismo, por eso debe renderizar <html> y <body> y no depende de globals.css.
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<html lang="es">
			<body
				style={{
					fontFamily: 'system-ui, -apple-system, sans-serif',
					display: 'grid',
					placeItems: 'center',
					minHeight: '100vh',
					margin: 0,
					padding: '24px',
					background: '#F1F5F9',
					color: '#0F172A',
				}}
			>
				<div style={{ maxWidth: 420, textAlign: 'center' }}>
					<h1 style={{ fontSize: 22, marginBottom: 8 }}>Algo salio mal</h1>
					<p style={{ color: '#475569', marginBottom: 20 }}>
						Ocurrio un error inesperado. Actualiza la pagina o reintenta.
					</p>
					<button
						type="button"
						onClick={() => reset()}
						style={{
							minHeight: 44,
							padding: '0 16px',
							border: 'none',
							borderRadius: 4,
							background: '#0F62FE',
							color: '#ffffff',
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						Reintentar
					</button>
				</div>
			</body>
		</html>
	)
}
