'use client'

import { type FormEvent } from 'react'

import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { SegmentedControl } from '@/app/components/ui/SegmentedControl'

type DashboardPeriodToolbarProps = {
	period: { from: string; to: string }
	dashboardView: 'summary' | 'analysis'
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPreviousMonth: () => void
	onNextMonth: () => void
	onFromChange: (value: string) => void
	onToChange: (value: string) => void
	onDashboardViewChange: (value: 'summary' | 'analysis') => void
	loading: boolean
}

export function DashboardPeriodToolbar({
	period,
	dashboardView,
	onSubmit,
	onPreviousMonth,
	onNextMonth,
	onFromChange,
	onToChange,
	onDashboardViewChange,
	loading,
}: DashboardPeriodToolbarProps) {
	return (
		<form
			aria-label="Filtrar dashboard por periodo"
			className="toolbar dashboard-period-toolbar"
			onSubmit={onSubmit}
		>
			<div className="dashboard-period-view-field">
				<Field label="Vista">
					<SegmentedControl
						ariaLabel="Vista del dashboard"
						className="dashboard-view-toggle"
						options={[
							{ value: 'summary', label: 'Resumen' },
							{ value: 'analysis', label: 'Análisis' },
						]}
						value={dashboardView}
						onChange={onDashboardViewChange}
					/>
				</Field>
			</div>
			<Button
				type="button"
				variant="ghost"
				className="icon-button"
				onClick={onPreviousMonth}
				aria-label="Mes anterior"
				title="Mes anterior"
			>
				<ChevronLeft size={16} />
			</Button>
			<Field label="Desde">
				<input
					type="date"
					value={period.from}
					onChange={(event) => onFromChange(event.target.value)}
				/>
			</Field>
			<Field label="Hasta">
				<input
					type="date"
					value={period.to}
					onChange={(event) => onToChange(event.target.value)}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				className="dashboard-period-submit"
				loading={loading}
				leadingIcon={<Search size={16} />}
			>
				Ver periodo
			</Button>
			<Button
				type="button"
				variant="ghost"
				className="icon-button"
				onClick={onNextMonth}
				aria-label="Mes siguiente"
				title="Mes siguiente"
			>
				<ChevronRight size={16} />
			</Button>
			{loading ? (
				<span className="panel-stale-badge" role="status" aria-live="polite">
					Actualizando
				</span>
			) : null}
		</form>
	)
}
