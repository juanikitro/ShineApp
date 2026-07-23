import {
	Building2,
	CalendarDays,
	CreditCard,
	FileText,
	Globe,
	History,
	MessageCircle,
	Sparkles,
	Trash2,
	Users,
} from 'lucide-react'

import { type SegmentedOption } from '@/app/components/ui/SegmentedControl'

export type SettingsSection =
	| 'business'
	| 'turnera'
	| 'quotes'
	| 'cash'
	| 'agenda'
	| 'users'
	| 'whatsapp'
	| 'history'
	| 'trash'
	| 'novedades'

type SettingsSectionOption = SegmentedOption<SettingsSection> & {
	label: string
}

export const settingsSectionOptions: ReadonlyArray<
	SettingsSectionOption
> = [
	{ value: 'business', label: 'Negocio', icon: Building2 },
	{ value: 'turnera', label: 'Turnera', icon: Globe },
	{ value: 'quotes', label: 'Cotizaciones', icon: FileText },
	{ value: 'cash', label: 'Caja', icon: CreditCard },
	{ value: 'agenda', label: 'Agenda', icon: CalendarDays },
	{ value: 'users', label: 'Usuarios', icon: Users },
	{ value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
	{ value: 'history', label: 'Historial', icon: History },
	{ value: 'trash', label: 'Papelera', icon: Trash2 },
	{ value: 'novedades', label: 'Novedades', icon: Sparkles },
]
