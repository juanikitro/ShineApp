'use client'

import { type RefObject } from 'react'

import { Menu, Plus, RefreshCw, X } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'

type WorkspacePageActionsProps = {
	mobileToggleRef: RefObject<HTMLButtonElement | null>
	sidebarNavId: string
	mobileOpen: boolean
	onToggleMobileMenu: () => void
	showCreateReservation: boolean
	onCreateReservation: () => void
	refreshLabel: string
	onRefresh: () => void
	loading: boolean
}

export function WorkspacePageActions({
	mobileToggleRef,
	sidebarNavId,
	mobileOpen,
	onToggleMobileMenu,
	showCreateReservation,
	onCreateReservation,
	refreshLabel,
	onRefresh,
	loading,
}: WorkspacePageActionsProps) {
	return (
		<div className="record-actions">
			<button
				ref={mobileToggleRef}
				type="button"
				className="ghost shell-mobile-toggle"
				aria-controls={sidebarNavId}
				aria-expanded={mobileOpen}
				aria-label={
					mobileOpen ? 'Cerrar menu lateral' : 'Abrir menu lateral'
				}
				title={mobileOpen ? 'Cerrar menu lateral' : 'Abrir menu lateral'}
				onClick={onToggleMobileMenu}
			>
				{mobileOpen ? <X size={16} /> : <Menu size={16} />}
				Menu
			</button>
			{showCreateReservation ? (
				<Button
					type="button"
					variant="primary"
					aria-label="Crear reserva para el dia seleccionado"
					title="Crear reserva para el dia seleccionado"
					onClick={onCreateReservation}
				>
					<Plus size={16} />
					Crear
				</Button>
			) : null}
			<Button
				type="button"
				variant="ghost"
				aria-label={refreshLabel}
				title={refreshLabel}
				onClick={onRefresh}
				disabled={loading}
			>
				<RefreshCw size={16} />
				Actualizar
			</Button>
		</div>
	)
}
