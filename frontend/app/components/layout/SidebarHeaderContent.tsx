'use client'

import {
	GlobalSearchInput,
	type GlobalSearchItem,
} from '@/app/components/search/GlobalSearchInput'

type SidebarHeaderContentProps = {
	showBusinessProfile: boolean
	businessName: string
	businessImageAlt: string
	businessLogoSrc: string | null
	businessSlug: string | null
	collapsed: boolean
	onOpenBusinessSettings: () => void
	onSubmitQuery: (query: string) => void
	onOpenResult: (groupType: string, item: GlobalSearchItem) => void
}

export function SidebarHeaderContent({
	showBusinessProfile,
	businessName,
	businessImageAlt,
	businessLogoSrc,
	businessSlug,
	collapsed,
	onOpenBusinessSettings,
	onSubmitQuery,
	onOpenResult,
}: SidebarHeaderContentProps) {
	return (
		<>
			{showBusinessProfile && businessLogoSrc ? (
				businessSlug ? (
					<a
						className="ghost sidebar-business-button"
						href={`/publica/${businessSlug}`}
						rel="noreferrer"
						target="_blank"
						aria-label={`Abrir turnera de ${businessName}`}
						title="Abrir turnera"
					>
						<img
							src={businessLogoSrc}
							alt={businessImageAlt}
							className="sidebar-business-logo"
						/>
					</a>
				) : (
					<button
						type="button"
						className="ghost sidebar-business-button"
						onClick={onOpenBusinessSettings}
						aria-label={`Abrir configuracion de ${businessName}`}
						title="Configuracion del negocio"
					>
						<img
							src={businessLogoSrc}
							alt={businessImageAlt}
							className="sidebar-business-logo"
						/>
					</button>
				)
			) : null}
			<GlobalSearchInput
				collapsed={collapsed}
				onSubmitQuery={onSubmitQuery}
				onOpenResult={onOpenResult}
			/>
		</>
	)
}
