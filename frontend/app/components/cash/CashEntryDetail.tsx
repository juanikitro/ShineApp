'use client'

import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { cx } from '@/app/components/utils'
import {
	cashCounterpartyKindLabel,
	cashEntryClassificationLabel,
	cashEntryCounterparty,
	cashEntryPaymentMethod,
	cashEntryReferenceLabel,
	cashSourceKindLabel,
} from '@/lib/cash-entry'
import { type AnyRecord, formatDateTimeLabel, money } from '@/lib/page-support'

type DetailRow = { label: string; value: string }

// Detalle legible de un movimiento de caja. Reutiliza los helpers de
// `lib/cash-entry` para presentar monto, contraparte, metodo, referencia y
// origen, en lugar del volcado crudo de campos del modal generico.
export function CashEntryDetail({ entry }: { entry: AnyRecord }) {
	const isIncome = entry.movement_type === 'income'
	const counterparty = cashEntryCounterparty(entry)
	const reference = cashEntryReferenceLabel(entry)
	const classification = cashEntryClassificationLabel(entry)
	const paymentMethod = cashEntryPaymentMethod(entry)
	const sourceLabel = entry.source_label || cashSourceKindLabel(entry.source_kind)
	const formattedAmount = entry.signed_amount ?? `${isIncome ? '+' : '-'}${money(entry.amount)}`
	const muted = entry.cashflow_effect === false
	const description = String(entry.description ?? '').trim()

	const rows: DetailRow[] = [
		{ label: 'Clasificacion', value: classification },
		counterparty.label
			? {
					label: cashCounterpartyKindLabel(counterparty.kind) || 'Contraparte',
					value: counterparty.label,
				}
			: null,
		{
			label: 'Fecha',
			value: entry.occurred_at ? formatDateTimeLabel(entry.occurred_at) : 'Sin fecha',
		},
		paymentMethod ? { label: 'Metodo de pago', value: paymentMethod } : null,
		reference ? { label: 'Referencia', value: reference } : null,
		{ label: 'Origen', value: sourceLabel },
		description ? { label: 'Detalle', value: description } : null,
		entry.created_by_username
			? { label: 'Registrado por', value: String(entry.created_by_username) }
			: null,
	].filter(Boolean) as DetailRow[]

	return (
		<div className="cash-detail">
			<div
				className={cx(
					'cash-detail__hero',
					isIncome ? 'cash-detail__hero--income' : 'cash-detail__hero--expense',
				)}
			>
				<span className="cash-detail__direction" aria-hidden="true">
					{isIncome ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
				</span>
				<div className="cash-detail__hero-main">
					<span className="cash-detail__kind">{isIncome ? 'Ingreso' : 'Egreso'}</span>
					<span className="cash-detail__amount">{formattedAmount}</span>
				</div>
				{muted ? <span className="cash-detail__chip">Solo resultado</span> : null}
			</div>
			<dl className="detail-grid">
				{rows.map((row) => (
					<div className="detail-row" key={row.label}>
						<dt>{row.label}</dt>
						<dd>{row.value}</dd>
					</div>
				))}
			</dl>
		</div>
	)
}
