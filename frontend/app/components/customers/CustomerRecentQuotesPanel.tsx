'use client'

import { StatusPill } from '@/app/components/ui/StatusPill'
import { Empty } from '@/app/components/ui/Empty'
import { Panel } from '@/app/components/ui/Panel'
import { quoteCode } from '@/lib/quote-display'
import { type AnyRecord, formatDateLabel, money } from '@/lib/page-support'

type CustomerRecentQuotesPanelProps = {
	quotesRows: AnyRecord[]
	quotes: AnyRecord[]
	quoteStatusLabels: Record<string, string>
	onOpenQuote: (quote: AnyRecord) => void
}

export function CustomerRecentQuotesPanel({
	quotesRows,
	quotes,
	quoteStatusLabels,
	onOpenQuote,
}: CustomerRecentQuotesPanelProps) {
	return (
		<Panel
			title="Cotizaciones recientes"
			subtitle={`${quotesRows.length} cotizaciones registradas`}
		>
			<div className="records compact-records">
				{quotesRows.length ? (
					quotesRows.map((quote: AnyRecord) => {
						const code = quoteCode(quote)
						const detailQuote =
							quotes.find((item) => String(item.id) === String(quote.id)) ?? quote
						return (
							<button
								className="record compact"
								key={`customer-quote-${quote.id}`}
								onClick={() => onOpenQuote(detailQuote)}
								type="button"
							>
								<div className="record-head">
									<div>
										<div className="record-title">
											Cotizacion {code} - {quote.vehicle || 'Sin vehiculo'}
										</div>
										<div className="record-sub">
											{formatDateLabel(quote.quote_date)} - {quote.services}
										</div>
									</div>
									<div className="record-actions">
										<StatusPill
											value={quote.status}
											labels={quoteStatusLabels}
										/>
										<span className="status payment">{money(quote.total)}</span>
									</div>
								</div>
							</button>
						)
					})
				) : (
					<Empty text="Este cliente todavia no tiene cotizaciones." />
				)}
			</div>
		</Panel>
	)
}
