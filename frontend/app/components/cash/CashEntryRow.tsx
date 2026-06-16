'use client'

import { type MouseEvent, type ReactNode } from 'react'

import {
	ArrowDownRight,
	ArrowUpRight,
	Building2,
	Hash,
	UserRound,
	Wallet,
} from 'lucide-react'

import { MotionFlashSurface } from '@/app/components/motion/MotionFlashSurface'
import { cx } from '@/app/components/utils'
import {
	type CashCounterparty,
	cashCounterpartyKindLabel,
	cashEntryClassificationLabel,
	cashEntryOccurredTime,
	cashEntryPaymentMethod,
	cashEntryReferenceLabel,
	cashEntryCounterparty,
	cashSourceKindLabel,
} from '@/lib/cash-entry'
import { type AnyRecord, money } from '@/lib/page-support'

type CashEntryRowProps = {
	entry: AnyRecord
	className?: string
	onClick: () => void
	onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void
	quickActionsTrigger?: ReactNode
}

function counterpartyIcon(counterparty: CashCounterparty) {
	if (counterparty.kind === 'customer') return <UserRound size={13} aria-hidden="true" />
	if (counterparty.kind === 'supplier') return <Building2 size={13} aria-hidden="true" />
	if (counterparty.kind === 'creditor') return <Wallet size={13} aria-hidden="true" />
	return null
}

function directionVerb(counterparty: CashCounterparty, isIncome: boolean) {
	if (counterparty.direction === 'from') return 'De'
	if (counterparty.direction === 'to') return 'Para'
	return isIncome ? 'De' : 'Para'
}

export function CashEntryRow({
	entry,
	className,
	onClick,
	onContextMenu,
	quickActionsTrigger,
}: CashEntryRowProps) {
	const isIncome = entry.movement_type === 'income'
	const counterparty = cashEntryCounterparty(entry)
	const reference = cashEntryReferenceLabel(entry)
	const classification = cashEntryClassificationLabel(entry)
	const time = cashEntryOccurredTime(entry)
	const paymentMethod = cashEntryPaymentMethod(entry)
	const sourceLabel =
		entry.source_label || cashSourceKindLabel(entry.source_kind)
	const formattedAmount =
		entry.signed_amount ?? `${isIncome ? '+' : '-'}${money(entry.amount)}`
	const muted = entry.cashflow_effect === false
	const counterpartyVerb = directionVerb(counterparty, isIncome)
	const description = String(entry.description ?? '').trim()
	const detailText = description && description !== reference ? description : ''

	return (
		<MotionFlashSurface
			className={cx(
				'cash-entry-row',
				isIncome ? 'cash-entry-row--income' : 'cash-entry-row--expense',
				muted && 'cash-entry-row--muted',
				className,
			)}
			onContextMenu={onContextMenu}
		>
			<button
				type="button"
				className="cash-entry-row__open"
				onClick={onClick}
				aria-label={`Ver detalle del movimiento: ${classification}, ${formattedAmount}`}
			/>
			<span className="cash-entry-row__direction" aria-hidden="true">
				{isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
			</span>
			<div className="cash-entry-row__main">
				<div className="cash-entry-row__top">
					<span className="cash-entry-row__time">{time || 'Sin hora'}</span>
					<span
						className={cx(
							'cash-entry-row__source',
							`cash-entry-row__source--${entry.source_kind ?? 'manual'}`,
						)}
					>
						{sourceLabel}
					</span>
					{counterparty.label ? (
						<span
							className={cx(
								'cash-entry-row__counterparty',
								`cash-entry-row__counterparty--${counterparty.kind || 'none'}`,
							)}
							title={`${cashCounterpartyKindLabel(counterparty.kind) || counterpartyVerb}: ${counterparty.label}`}
						>
							{counterpartyIcon(counterparty)}
							<span className="cash-entry-row__counterparty-prefix">
								{cashCounterpartyKindLabel(counterparty.kind) || counterpartyVerb}
							</span>
							<span className="cash-entry-row__counterparty-name">
								{counterparty.label}
							</span>
						</span>
					) : null}
					{muted ? (
						<span className="cash-entry-row__chip cash-entry-row__chip--muted">
							Solo resultado
						</span>
					) : null}
				</div>
				<div className="cash-entry-row__meta">
					<span className="cash-entry-row__classification" title={classification}>
						{classification}
					</span>
					{reference ? (
						<span className="cash-entry-row__reference" title={reference}>
							<Hash size={12} aria-hidden="true" />
							{reference}
						</span>
					) : null}
					{paymentMethod ? (
						<span className="cash-entry-row__method">{paymentMethod}</span>
					) : null}
					{detailText ? (
						<span className="cash-entry-row__detail" title={detailText}>
							{detailText}
						</span>
					) : null}
				</div>
			</div>
			<div
				className={cx(
					'cash-entry-row__amount',
					isIncome
						? 'cash-entry-row__amount--income'
						: 'cash-entry-row__amount--expense',
				)}
			>
				{formattedAmount}
			</div>
			{quickActionsTrigger ? (
				<div
					className="cash-entry-row__actions"
					onClick={(event) => event.stopPropagation()}
				>
					{quickActionsTrigger}
				</div>
			) : null}
		</MotionFlashSurface>
	)
}
