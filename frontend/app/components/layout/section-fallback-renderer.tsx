import { type ReactNode } from 'react'

import { Button } from '@/app/components/ui/Button'
import { ErrorState } from '@/app/components/ui/Empty'
import { SkeletonList } from '@/app/components/ui/Skeleton'
import { type ApiErrorNotice } from '@/lib/api-errors'

type SectionFallbackRendererProps = {
	showLoading: boolean
	loadingLabel: string
	errorNotice: ApiErrorNotice | null
	onReload: () => void
}

type SectionFallbackRendererConfig<TKey> = Omit<
	SectionFallbackRendererProps,
	'showLoading' | 'loadingLabel'
> & {
	isDataSetLoading: (key: TKey) => boolean
}

export function renderSectionFallback({
	showLoading,
	loadingLabel,
	errorNotice,
	onReload,
}: SectionFallbackRendererProps): ReactNode {
	return (
		<div className="grid">
			<section className="panel">
				{showLoading ? (
					<SkeletonList rows={6} label={loadingLabel} />
				) : (
					<ErrorState
						text={errorNotice?.title ?? 'No se pudieron cargar los datos'}
						hint={errorNotice?.description}
						action={
							<Button type="button" variant="ghost" onClick={onReload}>
								Actualizar
							</Button>
						}
					/>
				)}
			</section>
		</div>
	)
}

export function createSectionFallbackRenderer<TKey>({
	isDataSetLoading,
	errorNotice,
	onReload,
}: SectionFallbackRendererConfig<TKey>) {
	return (key: TKey, hasData: boolean, loadingLabel: string) =>
		renderSectionFallback({
			showLoading: isDataSetLoading(key) && !hasData,
			loadingLabel,
			errorNotice,
			onReload,
		})
}
