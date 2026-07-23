'use client'

import { MoreHorizontal } from 'lucide-react'
import { type MouseEvent } from 'react'

import { availableQuickActions } from '@/lib/quick-actions'

import { type QuickAction } from './QuickActionsMenu'

type QuickActionsTriggerProps = {
	title: string
	actions: QuickAction[]
	ariaLabel?: string
	onOpen: (
		event: MouseEvent<HTMLButtonElement>,
		title: string,
		actions: QuickAction[],
	) => void
}

export function QuickActionsTrigger({
	title,
	actions,
	ariaLabel = 'Abrir acciones rapidas',
	onOpen,
}: QuickActionsTriggerProps) {
	if (!availableQuickActions(actions).length) return null

	return (
		<button
			type="button"
			className="ghost icon-button quick-actions-trigger"
			aria-label={ariaLabel}
			title={ariaLabel}
			onClick={(event) => onOpen(event, title, actions)}
		>
			<MoreHorizontal size={16} />
		</button>
	)
}
