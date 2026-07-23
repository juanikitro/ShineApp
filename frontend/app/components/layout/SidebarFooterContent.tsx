'use client'

import NextImage from 'next/image'

import {
	ChevronsLeft,
	ChevronsRight,
	FileText,
	Maximize2,
	Minimize2,
	Moon,
	Sun,
	X,
} from 'lucide-react'

import { AppBrand } from '@/app/components/layout/AppBrand'
import { type AnyRecord, type ThemeMode } from '@/lib/page-support'
import {
	profileDisplayName,
	profileInitial,
	profileRoleLabel,
	profileTrialText,
} from '@/lib/profile-display'
import { cx } from '../utils'

type SidebarFooterContentProps = {
	themeMode: ThemeMode
	collapsed: boolean
	mobileOpen: boolean
	sidebarNavId: string
	onToggleTheme: () => void
	fullscreenActive: boolean
	fullscreenSupported: boolean
	onToggleFullscreen: () => void
	onToggleSidebar: () => void
	onOpenProfile: () => void
	currentUser: AnyRecord
	safeAvatarUrl: string | null
	avatarIsPdf: boolean
	safeAvatarPdfThumbnail: string | null
}

export function SidebarFooterContent({
	themeMode,
	collapsed,
	mobileOpen,
	sidebarNavId,
	onToggleTheme,
	fullscreenActive,
	fullscreenSupported,
	onToggleFullscreen,
	onToggleSidebar,
	onOpenProfile,
	currentUser,
	safeAvatarUrl,
	avatarIsPdf,
	safeAvatarPdfThumbnail,
}: SidebarFooterContentProps) {
	return (
		<div className="sidebar-footer-stack">
			<div className="sidebar-footer-row">
				<button
					aria-label={
						themeMode === 'dark'
							? 'Cambiar a modo claro'
							: 'Cambiar a modo oscuro'
					}
					aria-pressed={themeMode === 'dark'}
					className={cx(
						'theme-switch',
						collapsed && 'theme-switch--compact',
					)}
					onClick={onToggleTheme}
					title={
						themeMode === 'dark'
							? 'Cambiar a modo claro'
							: 'Cambiar a modo oscuro'
					}
					type="button"
				>
					{collapsed ? (
						<span className="theme-switch-icon" aria-hidden="true">
							{themeMode === 'dark' ? (
								<Moon
									className="theme-switch-symbol"
									size={16}
									strokeWidth={2}
								/>
							) : (
								<Sun
									className="theme-switch-symbol"
									size={16}
									strokeWidth={2}
								/>
							)}
						</span>
					) : (
						<span className="theme-switch-track" aria-hidden="true">
							<span className="theme-switch-thumb">
								{themeMode === 'dark' ? (
									<Moon
										className="theme-switch-symbol"
										size={16}
										strokeWidth={2}
									/>
								) : (
									<Sun
										className="theme-switch-symbol"
										size={16}
										strokeWidth={2}
									/>
								)}
							</span>
						</span>
					)}
				</button>
				<button
					type="button"
					className="ghost sidebar-icon-button"
					aria-label={
						fullscreenActive
							? 'Salir de pantalla completa'
							: 'Activar pantalla completa'
					}
					aria-pressed={fullscreenActive}
					title={
						fullscreenActive
							? 'Salir de pantalla completa'
							: 'Activar pantalla completa'
					}
					onClick={onToggleFullscreen}
					disabled={!fullscreenSupported}
				>
					{fullscreenActive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
				</button>
				<button
					type="button"
					className="ghost sidebar-collapse-toggle"
					aria-controls={sidebarNavId}
					aria-expanded={mobileOpen ? true : !collapsed}
					aria-label={
						mobileOpen
							? 'Cerrar menu lateral'
							: collapsed
								? 'Expandir sidebar'
								: 'Colapsar sidebar'
					}
					title={
						mobileOpen
							? 'Cerrar menu lateral'
							: collapsed
								? 'Expandir sidebar'
								: 'Colapsar sidebar'
					}
					onClick={onToggleSidebar}
				>
					{mobileOpen ? (
						<X size={16} />
					) : collapsed ? (
						<ChevronsRight size={16} />
					) : (
						<ChevronsLeft size={16} />
					)}
				</button>
			</div>
			<button
				className="ghost sidebar-profile-button"
				onClick={onOpenProfile}
				type="button"
				aria-label={`Abrir perfil de ${profileDisplayName(currentUser)}`}
			>
				<span className="sidebar-profile-avatar" aria-hidden="true">
					{safeAvatarUrl && !avatarIsPdf ? (
						<NextImage
							src={safeAvatarUrl}
							alt=""
							width={42}
							height={42}
							loading="lazy"
							unoptimized
						/>
					) : safeAvatarPdfThumbnail ? (
						<NextImage
							src={safeAvatarPdfThumbnail}
							alt=""
							width={42}
							height={42}
							loading="lazy"
							unoptimized
						/>
					) : currentUser.avatar_url ? (
						<FileText size={18} />
					) : (
						<span>{profileInitial(currentUser)}</span>
					)}
				</span>
				{!collapsed ? (
					<span className="sidebar-profile-copy">
						<strong>{profileDisplayName(currentUser)}</strong>
						<span>{profileRoleLabel(currentUser)}</span>
						{profileTrialText(currentUser) ? (
							<span>{profileTrialText(currentUser)}</span>
						) : null}
					</span>
				) : null}
			</button>
			<AppBrand
				className="sidebar-brand"
				collapsed={collapsed}
				themeMode={themeMode}
				titleAs="span"
			/>
		</div>
	)
}
