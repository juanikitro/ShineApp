import { cx } from '../utils'

type AgingBucket = { id?: string; label?: string; amount?: unknown }

type RiskLevel = 'fresh' | 'mid' | 'high'

// Mapea los buckets de antiguedad del backend a un nivel de riesgo de cobranza.
// Fresco (0-7) es neutro: es plata que igual te deben, no "ok". El color sube al envejecer.
const RISK_BY_BUCKET: Record<string, RiskLevel> = {
	'0_7': 'fresh',
	'8_15': 'mid',
	'16_30': 'mid',
	'31_plus': 'high',
}

const RISK_LABEL: Record<RiskLevel, string> = {
	fresh: 'al dia',
	mid: 'en riesgo',
	high: 'vencido',
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

	// Resumen textual equivalente al gráfico, para lectores de pantalla (1.1.1).
	const byRisk: Record<RiskLevel, number> = { fresh: 0, mid: 0, high: 0 }
	for (const bucket of buckets) {
		const risk = RISK_BY_BUCKET[String(bucket.id ?? '')] ?? 'mid'
		byRisk[risk] += amountOf(bucket.amount)
	}
	const summary = (['high', 'mid', 'fresh'] as RiskLevel[])
		.filter((risk) => byRisk[risk] > 0)
		.map((risk) => `${Math.round((byRisk[risk] / total) * 100)}% ${RISK_LABEL[risk]}`)
		.join(', ')

	return (
		<div
			className={cx('risk-meter', className)}
			role="img"
			aria-label={`Antiguedad de cobranzas: ${summary}`}
		>
			{buckets.map((bucket, index) => {
				const amount = amountOf(bucket.amount)
				if (amount <= 0) {
					return null
				}
				const risk = RISK_BY_BUCKET[String(bucket.id ?? '')] ?? 'mid'
				const pct = Math.round((amount / total) * 100)
				return (
					<span
						key={bucket.id ?? index}
						className={`risk-seg risk-seg--${risk}`}
						style={{ width: `${(amount / total) * 100}%` }}
						title={`${bucket.label ?? RISK_LABEL[risk]}: ${pct}%`}
					/>
				)
			})}
		</div>
	)
}
