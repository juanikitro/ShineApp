'use client'

import { type FormEvent, type RefObject } from 'react'

import { DashboardPeriodToolbar } from '@/app/components/dashboard/DashboardPeriodToolbar'
import { PageHeader } from '@/app/components/layout/PageHeader'
import { WorkspacePageActions } from '@/app/components/layout/WorkspacePageActions'
import {
	SegmentedControl,
	type SegmentedOption,
} from '@/app/components/ui/SegmentedControl'

type WorkspaceHeaderContentProps = {
	title: string
	activeView: string
	canViewEconomy: boolean
	showAgendaSectorControl: boolean
	agendaSectorOptions: ReadonlyArray<SegmentedOption<string>>
	agendaSectorValue: string
	onAgendaSectorChange: (value: string) => void
	period: { from: string; to: string }
	onDashboardPeriodSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPreviousMonth: () => void
	onNextMonth: () => void
	onFromChange: (from: string) => void
	onToChange: (to: string) => void
	dashboardView: 'summary' | 'analysis'
	onDashboardViewChange: (value: 'summary' | 'analysis') => void
	dashboardLoading: boolean
	mobileToggleRef: RefObject<HTMLButtonElement | null>
	sidebarNavId: string
	mobileOpen: boolean
	onToggleMobileMenu: () => void
	onCreateReservation: () => void
	onRefresh: () => void
	loading: boolean
}

export function WorkspaceHeaderContent({
	title,
	activeView,
	canViewEconomy,
	showAgendaSectorControl,
	agendaSectorOptions,
	agendaSectorValue,
	onAgendaSectorChange,
	period,
	onDashboardPeriodSubmit,
	onPreviousMonth,
	onNextMonth,
	onFromChange,
	onToChange,
	dashboardView,
	onDashboardViewChange,
	dashboardLoading,
	mobileToggleRef,
	sidebarNavId,
	mobileOpen,
	onToggleMobileMenu,
	onCreateReservation,
	onRefresh,
	loading,
}: WorkspaceHeaderContentProps) {
	return (
		<PageHeader
			title={title}
			titleAddon={
				activeView === 'agenda' && showAgendaSectorControl ? (
					<SegmentedControl
						ariaLabel="Sector de agenda"
						className="agenda-type-toggle"
						options={agendaSectorOptions}
						selectionMode="tabs"
						value={agendaSectorValue}
						onChange={onAgendaSectorChange}
					/>
				) : null
			}
			actions={
				<>
					{activeView === 'dashboard' && canViewEconomy ? (
						<DashboardPeriodToolbar
							period={period}
							dashboardView={dashboardView}
							onSubmit={onDashboardPeriodSubmit}
							onPreviousMonth={onPreviousMonth}
							onNextMonth={onNextMonth}
							onFromChange={onFromChange}
							onToChange={onToChange}
							onDashboardViewChange={onDashboardViewChange}
							loading={dashboardLoading}
						/>
					) : null}
					<WorkspacePageActions
						mobileToggleRef={mobileToggleRef}
						sidebarNavId={sidebarNavId}
						mobileOpen={mobileOpen}
						onToggleMobileMenu={onToggleMobileMenu}
						showCreateReservation={activeView === 'agenda'}
						onCreateReservation={onCreateReservation}
						refreshLabel={`Actualizar ${title.toLowerCase()}`}
						onRefresh={onRefresh}
						loading={loading}
					/>
				</>
			}
		/>
	)
}
