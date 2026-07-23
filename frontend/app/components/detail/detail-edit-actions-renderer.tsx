import { type ReactNode } from 'react'

import { detailEndpoint } from '@/lib/detail-paths'
import { type AnyRecord } from '@/lib/page-support'

import { DetailEditActions } from './DetailEditActions'

type DetailState = {
	kind: string
	data: AnyRecord
}

type DetailEditActionsRendererProps = {
	detail: DetailState | null
	onDelete: () => void
	disabled: boolean
	beforeSubmit?: ReactNode
}

type DetailEditActionsRendererConfig = Omit<
	DetailEditActionsRendererProps,
	'beforeSubmit'
>

export function renderDetailEditActions({
	detail,
	onDelete,
	disabled,
	beforeSubmit,
}: DetailEditActionsRendererProps): ReactNode {
	if (!detail) return null
	const canDelete = Boolean(
		detail.data.id && detailEndpoint(detail.kind, detail.data.id),
	)
	return (
		<DetailEditActions
			canDelete={canDelete}
			onDelete={onDelete}
			disabled={disabled}
			beforeSubmit={beforeSubmit}
		/>
	)
}

export function createDetailEditActionsRenderer(
	config: DetailEditActionsRendererConfig,
) {
	return (beforeSubmit?: ReactNode) =>
		renderDetailEditActions({ ...config, beforeSubmit })
}
