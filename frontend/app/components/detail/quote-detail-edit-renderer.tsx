import { type FormEvent, type KeyboardEvent, type ReactNode } from 'react'

import { FileText } from 'lucide-react'

import { QuoteGroupVehicleLinesEditor } from '@/app/components/forms/QuoteGroupVehicleLinesEditor'
import { Button } from '@/app/components/ui/Button'
import { type SelectOption } from '@/app/components/ui/SearchSelect'
import { type AnyRecord, formatDateLabel, money } from '@/lib/page-support'
import { quoteDetailViewModel } from '@/lib/quote-detail-view-model'
import { quoteLaneStatus } from '@/lib/quote-display'
import { serviceDisplayName } from '@/lib/service-display'

import { QuoteDetailEditForm } from './QuoteDetailEditForm'
import { QuoteDetailSummary } from './QuoteDetailSummary'

type QuoteDetailEditorProps = {
	data: AnyRecord
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	onPatch: (patch: AnyRecord) => void
	quoteStatusLabels: Record<string, string>
	vehicles: AnyRecord[]
	vehicleOptions: SelectOption[]
	serviceOptions: SelectOption[]
	services: AnyRecord[]
	canViewEconomy: boolean
	useReservationTimes: boolean
	openQuickCreate: (kind: string, target: string) => void
	serviceNotesForLine: (item: AnyRecord) => string
	focusNextOnEnter: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	flashClass: (target: string | null) => string
	fieldFlashKey: (target: string) => string
	quoteTentativeTimeLabel: (value: unknown) => ReactNode
	onDownloadQuotePdf: (quote: AnyRecord) => void
	onDownloadQuotePdfAndMarkSent: (quote: AnyRecord) => void
	renderActions: () => ReactNode
}

export function renderQuoteDetailEditor({
	data,
	onSubmit,
	onPatch,
	quoteStatusLabels,
	vehicles,
	vehicleOptions,
	serviceOptions,
	services,
	canViewEconomy,
	useReservationTimes,
	openQuickCreate,
	serviceNotesForLine,
	focusNextOnEnter,
	flashClass,
	fieldFlashKey,
	quoteTentativeTimeLabel,
	onDownloadQuotePdf,
	onDownloadQuotePdfAndMarkSent,
	renderActions,
}: QuoteDetailEditorProps): ReactNode {
	const {
		code,
		quoteStatusLabel,
		hasReservation,
		groupLines,
		groupCanEdit,
		groupVehicleOptions,
	} = quoteDetailViewModel(
		data,
		quoteStatusLabels,
		vehicles,
		vehicleOptions,
	)

	return (
		<QuoteDetailEditForm
			data={data}
			onSubmit={onSubmit}
			onPatch={onPatch}
			statusOptions={[
				{ value: 'draft', label: 'Sin enviar' },
				{ value: 'sent', label: 'Enviado' },
				{ value: 'accepted', label: 'Aceptada' },
				{ value: 'rejected', label: 'Rechazada' },
			]}
			summary={
				<QuoteDetailSummary
					quote={data}
					code={code}
					statusLabel={quoteStatusLabel}
					hasReservation={hasReservation}
					groupLines={groupLines}
					formatMoney={money}
					formatDateLabel={formatDateLabel}
					tentativeTimeLabel={quoteTentativeTimeLabel}
					serviceDisplayName={serviceDisplayName}
				/>
			}
			groupEditor={
				data.is_group ? (
					groupCanEdit ? (
						<QuoteGroupVehicleLinesEditor
							title="Autos del grupo"
							lines={groupLines}
							onChange={(vehicleLines) =>
								onPatch({ vehicle_lines: vehicleLines })
							}
							vehicleOptions={groupVehicleOptions}
							serviceOptions={serviceOptions}
							vehicles={vehicles}
							services={services}
							canViewEconomy={canViewEconomy}
							useReservationTimes={useReservationTimes}
							fieldPrefix="detail.quote"
							openQuickCreate={openQuickCreate}
							serviceNotesForLine={serviceNotesForLine}
							focusNextOnEnter={focusNextOnEnter}
							flashClass={flashClass}
							fieldFlashKey={fieldFlashKey}
						/>
					) : (
						<div className="info-note">
							Las reservas hijas se editan individualmente desde la agenda.
						</div>
					)
				) : null
			}
			subtotalLabel={money(data.subtotal)}
			discountLabel={money(data.discount_amount)}
			taxableLabel={money(data.taxable_amount)}
			taxLabel={money(data.tax_amount)}
			totalLabel={money(data.total)}
			downloadActions={
				<div className="modal-actions">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onDownloadQuotePdf(data)}
					>
						<FileText size={16} />
						Bajar PDF
					</Button>
					{quoteLaneStatus(data) === 'draft' ? (
						<Button
							type="button"
							variant="primary"
							onClick={() => onDownloadQuotePdfAndMarkSent(data)}
						>
							<FileText size={16} />
							Bajar y marcar enviado
						</Button>
					) : null}
				</div>
			}
			actions={renderActions()}
		/>
	)
}
