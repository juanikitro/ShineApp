import { ReactNode } from 'react'

import {
	Boxes,
	Building2,
	Cake,
	Calendar,
	CircleCheck,
	Clock,
	Droplets,
	FileText,
	Info,
	type LucideIcon,
	Mail,
	Package,
	Palette,
	Pencil,
	Phone,
	StickyNote,
	Tag,
	User,
	Wallet,
	Wrench,
} from 'lucide-react'

import { CashEntryDetail } from '@/app/components/cash/CashEntryDetail'
import { cx } from '@/app/components/utils'
import { buildDetailFields } from '@/lib/detail-format'

import { ModalFrame } from './ModalFrame'

type AnyRecord = Record<string, any>

// Icono por campo para que el detalle generico deje de verse como una tabla
// cruda y siga la estetica de la app. Las claves desconocidas caen al icono
// neutro `Info`.
const detailFieldIcons: Record<string, LucideIcon> = {
	name: User,
	full_name: User,
	customer_name: User,
	counterparty_label: User,
	created_by_username: User,
	supplier_name: Building2,
	creditor_name: Building2,
	phone: Phone,
	email: Mail,
	birthday_label: Cake,
	vehicle_label: Tag,
	license_plate: Tag,
	brand: Tag,
	model: Tag,
	vehicle_type: Tag,
	color: Palette,
	service_name: Droplets,
	material_name: Boxes,
	tool_name: Wrench,
	items: Package,
	material_overrides: Package,
	quantity: Package,
	unit: Package,
	unit_label: Package,
	stock: Package,
	min_stock: Package,
	status: CircleCheck,
	day: Calendar,
	exit_day: Calendar,
	entry_day: Calendar,
	date: Calendar,
	due_date: Calendar,
	occurred_at: Calendar,
	scheduled_at: Calendar,
	valid_until: Calendar,
	paid_at: Calendar,
	sent_at: Calendar,
	reservation_day: Calendar,
	created_at: Clock,
	updated_at: Clock,
	estimated_duration_minutes: Clock,
	start_time: Clock,
	amount: Wallet,
	total: Wallet,
	total_amount: Wallet,
	subtotal: Wallet,
	base_price: Wallet,
	unit_price: Wallet,
	unit_cost: Wallet,
	balance_due: Wallet,
	payment_method: Wallet,
	category: Tag,
	subcategory: Tag,
	notes: StickyNote,
	description: FileText,
	concept: FileText,
	reference_label: FileText,
	source_label: FileText,
}

function detailFieldIcon(key: string): LucideIcon {
	return detailFieldIcons[key] ?? Info
}

type DetailModalProps = {
	title: string
	data: AnyRecord
	onClose: () => void
	kind?: string
	editing?: boolean
	editable?: boolean
	onEdit?: () => void
	editForm?: ReactNode
	motionPhase?: 'enter' | 'exit'
}

function DetailBody({ kind, data }: { kind?: string; data: AnyRecord }) {
	if (kind === 'cash-movement') {
		return <CashEntryDetail entry={data} />
	}
	const fields = buildDetailFields(data)
	if (!fields.length) {
		return <p className="detail-empty">Sin datos para mostrar.</p>
	}
	return (
		<dl className="detail-fields">
			{fields.map((field) => {
				const Icon = detailFieldIcon(field.key)
				return (
					<div className="detail-field" key={field.key}>
						<span className="detail-field__icon" aria-hidden="true">
							<Icon size={17} />
						</span>
						<dt>{field.label}</dt>
						<dd>
							{field.status !== undefined ? (
								<span className={cx('status', field.status)}>{field.value}</span>
							) : (
								field.value
							)}
						</dd>
					</div>
				)
			})}
		</dl>
	)
}

export function DetailModal({
	title,
	data,
	onClose,
	kind,
	editing = false,
	editable = false,
	onEdit,
	editForm,
}: DetailModalProps) {
	if (editing && editForm) {
		return (
			<ModalFrame title={title} onClose={onClose}>
				{editForm}
			</ModalFrame>
		)
	}

	return (
		<ModalFrame title={title} onClose={onClose}>
			<div className="detail-view">
				<DetailBody kind={kind} data={data} />
				{editable && onEdit ? (
					<div className="detail-view__actions">
						<button type="button" className="primary" onClick={onEdit}>
							<Pencil size={16} />
							Editar
						</button>
					</div>
				) : null}
			</div>
		</ModalFrame>
	)
}
