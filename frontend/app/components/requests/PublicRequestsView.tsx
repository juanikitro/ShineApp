'use client'

import { PublicRequestCard } from '@/app/components/requests/PublicRequestCard'
import { CollapsibleSection } from '@/app/components/ui/CollapsibleSection'
import { Empty } from '@/app/components/ui/Empty'
import { Panel } from '@/app/components/ui/Panel'
import { type AnyRecord } from '@/lib/page-support'
import { type PublicRequestSelection } from '@/lib/public-request-selection'

type PublicRequestsViewProps = {
	pendingRequests: AnyRecord[]
	managedRequests: AnyRecord[]
	pendingCount: number
	selectionFor: (item: AnyRecord) => PublicRequestSelection
	onPatchSelection: (
		item: AnyRecord,
		patch: PublicRequestSelection,
	) => void
	onConvert: (item: AnyRecord) => void
	onArchive: (item: AnyRecord) => void
	recordClass: (kind: string, id: string | number, extraClass?: string) => string
}

export function PublicRequestsView({
	pendingRequests,
	managedRequests,
	pendingCount,
	selectionFor,
	onPatchSelection,
	onConvert,
	onArchive,
	recordClass,
}: PublicRequestsViewProps) {
	return (
		<div className="grid">
			<Panel
				title="Solicitudes pendientes"
				subtitle={`${pendingCount} pendientes`}
			>
				<div className="records">
					{pendingRequests.length ? (
						pendingRequests.map((item) => (
							<PublicRequestCard
								key={item.id}
								item={item}
								selection={selectionFor(item)}
								onPatchSelection={(patch) => onPatchSelection(item, patch)}
								onConvert={() => onConvert(item)}
								onArchive={() => onArchive(item)}
								recordClass={recordClass}
							/>
						))
					) : (
						<Empty
							text="Sin solicitudes pendientes"
							hint="Las solicitudes publicas nuevas van a aparecer aca."
						/>
					)}
					{managedRequests.length ? (
						<CollapsibleSection
							title="Gestionadas"
							count={managedRequests.length}
							defaultOpen={pendingRequests.length === 0}
						>
							{managedRequests.map((item) => (
								<PublicRequestCard
									key={item.id}
									item={item}
									selection={selectionFor(item)}
									onPatchSelection={(patch) => onPatchSelection(item, patch)}
									onConvert={() => onConvert(item)}
									onArchive={() => onArchive(item)}
									recordClass={recordClass}
								/>
							))}
						</CollapsibleSection>
					) : null}
				</div>
			</Panel>
		</div>
	)
}
