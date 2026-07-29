'use client'

import { type ReactNode } from 'react'

import { type AnyRecord } from '@/lib/page-support'

type QuoteDetailSummaryProps = {
	quote: AnyRecord
	code: ReactNode
	statusLabel: ReactNode
	hasReservation: boolean
	groupLines: AnyRecord[]
	formatMoney: (value: unknown) => ReactNode
	formatDateLabel: (value: string) => ReactNode
	tentativeTimeLabel: (value: unknown) => ReactNode
	serviceDisplayName: (service: AnyRecord) => ReactNode
}

export function QuoteDetailSummary({
	quote,
	code,
	statusLabel,
	hasReservation,
	groupLines,
	formatMoney,
	formatDateLabel,
	tentativeTimeLabel,
	serviceDisplayName,
}: QuoteDetailSummaryProps) {
	return (
		<div className="quote-detail-summary">
			<div>
				<strong>Cotizacion {code}</strong>
				<span>
					{quote.customer_name} - {statusLabel}
				</span>
			</div>
			<div className="record-sub">
				{quote.is_group
					? `${groupLines.length} autos`
					: quote.vehicle_label || 'Sin vehiculo'}{' '}
				- {formatMoney(quote.total)}
			</div>
			<div className="quote-detail-meta">
				<span>
					Validez:{' '}
					{quote.valid_until ? formatDateLabel(quote.valid_until) : 'Sin fecha'}
				</span>
				<span>Reserva vinculada: {hasReservation ? 'Si' : 'No'}</span>
				{quote.sent_at ? (
					<span>Enviada: {formatDateLabel(quote.sent_at)}</span>
				) : null}
			</div>
			{quote.is_group ? (
				<div className="record-sub">
					Agenda por auto en la cotizacion grupal.
				</div>
			) : quote.reservation_day ? (
				<div className="record-sub">
					Reserva tentativa: {quote.reservation_day}
					{tentativeTimeLabel(quote.reservation_start_time)}
				</div>
			) : (
				<div className="record-sub">Cotizacion libre sin fecha.</div>
			)}
			{quote.is_group && groupLines.length ? (
				<div className="quote-item-summary">
					{groupLines.map((line: AnyRecord, lineIndex: number) => (
						<div
							className="quote-item-summary-row"
							key={line.id ?? `${quote.id}-group-${lineIndex}`}
						>
							<strong>
								Auto {lineIndex + 1}:{' '}
								{line.vehicle_label ||
									line.vehicle_snapshot_label ||
									'Vehiculo nuevo'}
							</strong>
							<span>
								{line.reservation_day
									? `Fecha ${line.reservation_day}${tentativeTimeLabel(line.reservation_start_time)}`
									: 'Sin fecha'}
								{' - '}
								{formatMoney(line.subtotal)}
							</span>
							{line.items?.map((quoteItem: AnyRecord) => (
								<span
									key={
										quoteItem.id ?? `${lineIndex}-${quoteItem.service}`
									}
								>
									{serviceDisplayName({
										service_icon: quoteItem.service_icon,
										service_name:
											quoteItem.service_name ?? quoteItem.description,
									})}
									: {quoteItem.quantity} x {formatMoney(quoteItem.unit_price)}
								</span>
							))}
						</div>
					))}
				</div>
			) : quote.items?.length ? (
				<div className="quote-item-summary">
					{quote.items.map((quoteItem: AnyRecord) => (
						<div
							className="quote-item-summary-row"
							key={quoteItem.id ?? `${quote.id}-${quoteItem.service}`}
						>
							<strong>
								{serviceDisplayName({
									service_icon: quoteItem.service_icon,
									service_name:
										quoteItem.service_name ?? quoteItem.description,
								})}
							</strong>
							<span>
								{quoteItem.quantity} x {formatMoney(quoteItem.unit_price)} ={' '}
								{formatMoney(quoteItem.line_total)}
							</span>
							{quoteItem.service_notes ? (
								<span>{quoteItem.service_notes}</span>
							) : null}
						</div>
					))}
				</div>
			) : null}
		</div>
	)
}
