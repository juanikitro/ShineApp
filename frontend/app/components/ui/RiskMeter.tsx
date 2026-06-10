import { cx } from '../utils'

type AgingBucket = { id?: string; label?: string; amount?: unknown }

// Mapea los buckets de antiguedad del backend a un nivel de riesgo de cobranza.
// Fresco (0-7) es neutro: es plata que igual te deben, no "ok". El color sube al envejecer.
const RISK_BY_BUCKET: Record<string, 'fresh' | 'mid' | 'high'> = {
	'0_7': 'fresh',
	'8_15': 'mid',
	'16_30': 'mid',
	'31_plus': 'high',
}

function amountOf(value: unknown) {
	const n = Number(value ?? 0)
	return Number.isFinite(n) ? Math.max(n, 0) : 0
}

export function RiskMeter({
	buckets,
	className,
}: {
	buckets: AgingBucket[]
	className?: string
}) {
	const total = buckets.reduce((sum, bucket) => sum + amountOf(bucket.amount), 0)
	if (total <= 0) {
		return null
	}
	return (
		<div className={cx('risk-meter', className)} aria-hidden="true">
			{buckets.map((bucket, index) => {
				const amount = amountOf(bucket.amount)
				if (amount <= 0) {
					return null
				}
				const risk = RISK_BY_BUCKET[String(bucket.id ?? '')] ?? 'mid'
				return (
					<span
						key={bucket.id ?? index}
						className={`risk-seg risk-seg--${risk}`}
						style={{ width: `${(amount / total) * 100}%` }}
					/>
				)
			})}
		</div>
	)
}
