'use client'

import { CustomerListPanel } from '@/app/components/customers/CustomerListPanel'
import { SkeletonList } from '@/app/components/ui/Skeleton'

type CustomersWorkspaceProps = Parameters<typeof CustomerListPanel>[0] & {
	showLoadingSkeleton: boolean
}

export function CustomersWorkspace({
	showLoadingSkeleton,
	...customerListProps
}: CustomersWorkspaceProps) {
	if (showLoadingSkeleton) {
		return (
			<div className="grid">
				<section className="panel">
					<SkeletonList rows={8} columns={3} label="Cargando clientes" />
				</section>
			</div>
		)
	}

	return (
		<div className="grid">
			<CustomerListPanel {...customerListProps} />
		</div>
	)
}
