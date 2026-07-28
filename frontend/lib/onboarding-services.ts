import { type AnyRecord } from '@/lib/page-support'

export type StarterBusinessType = 'lavadero' | 'detailing' | 'lubricentro'

export type StarterServiceTemplate = {
	id: string
	name: string
	sectorKey: StarterBusinessType
	icon: string
	base_price: string
	estimated_duration_minutes: string
	notes: string
}

export type StarterServiceDraft = Omit<StarterServiceTemplate, 'id' | 'sectorKey'> & {
	templateId: string
	sector: string
	estimated_material_cost: string
}

export type StarterServicesPlan = {
	businessType: StarterBusinessType | null
	requiresBusinessType: boolean
	templates: StarterServiceTemplate[]
	existingTemplates: StarterServiceTemplate[]
	missingTemplates: StarterServiceTemplate[]
	blockedTemplates: StarterServiceTemplate[]
	drafts: StarterServiceDraft[]
}

export const starterServiceTemplates: StarterServiceTemplate[] = [
	{
		id: 'lavado-exterior',
		name: 'Lavado exterior express',
		sectorKey: 'lavadero',
		icon: '🧽',
		base_price: '9500.00',
		estimated_duration_minutes: '45',
		notes: 'Lavado exterior y secado con microfibra.',
	},
	{
		id: 'lavado-completo',
		name: 'Lavado completo',
		sectorKey: 'lavadero',
		icon: '🚿',
		base_price: '0.00',
		estimated_duration_minutes: '60',
		notes: 'Defini el precio antes de publicarlo.',
	},
	{
		id: 'lavado-premium',
		name: 'Lavado premium',
		sectorKey: 'lavadero',
		icon: '✨',
		base_price: '18000.00',
		estimated_duration_minutes: '90',
		notes: 'Exterior, interior, llantas y terminacion rapida.',
	},
	{
		id: 'detailing-interior',
		name: 'Detailing interior',
		sectorKey: 'detailing',
		icon: '✨',
		base_price: '52000.00',
		estimated_duration_minutes: '240',
		notes: 'Limpieza profunda de tapizados, plasticos y baul.',
	},
	{
		id: 'pulido-one-step',
		name: 'Pulido one step',
		sectorKey: 'detailing',
		icon: '🪞',
		base_price: '85000.00',
		estimated_duration_minutes: '360',
		notes: 'Pulido de un paso para recuperar brillo.',
	},
	{
		id: 'tratamiento-ceramico',
		name: 'Tratamiento cerámico',
		sectorKey: 'detailing',
		icon: '🛡️',
		base_price: '145000.00',
		estimated_duration_minutes: '480',
		notes: 'Descontaminado, correccion liviana y coating.',
	},
	{
		id: 'cambio-aceite-filtro',
		name: 'Cambio de aceite y filtro',
		sectorKey: 'lubricentro',
		icon: '🧰',
		base_price: '42000.00',
		estimated_duration_minutes: '75',
		notes: 'Servicio de lubricentro con control de fluidos basico.',
	},
	{
		id: 'cambio-aceite-sintetico',
		name: 'Cambio de aceite sintético',
		sectorKey: 'lubricentro',
		icon: '🛢️',
		base_price: '0.00',
		estimated_duration_minutes: '60',
		notes: 'Defini el precio antes de publicarlo.',
	},
	{
		id: 'revision-fluidos',
		name: 'Revisión de fluidos',
		sectorKey: 'lubricentro',
		icon: '🔧',
		base_price: '38000.00',
		estimated_duration_minutes: '60',
		notes: 'Chequeo de fluidos, luces, cubiertas y puntos visibles.',
	},
]

export function isStarterBusinessType(
	value: unknown,
): value is StarterBusinessType {
	return value === 'lavadero' || value === 'detailing' || value === 'lubricentro'
}

export function starterServicesForBusinessType(
	businessType: StarterBusinessType | null | undefined,
) {
	return businessType
		? starterServiceTemplates.filter(
				(template) => template.sectorKey === businessType,
			)
		: []
}

function normalizedName(value: unknown) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')
}

function activeSectorIdByKey(sectors: AnyRecord[]) {
	return sectors.reduce<Record<string, string>>((acc, sector) => {
		const key = String(sector.key ?? '').trim()
		if (key && sector.id != null && sector.is_active !== false) {
			acc[key] = String(sector.id)
		}
		return acc
	}, {})
}

export function buildStarterServicesPlan(input: {
	businessType?: unknown
	services?: AnyRecord[] | null
	sectors?: AnyRecord[] | null
}): StarterServicesPlan {
	const businessType = isStarterBusinessType(input.businessType)
		? input.businessType
		: null
	const templates = starterServicesForBusinessType(businessType)
	const services = input.services ?? []
	const sectorIds = activeSectorIdByKey(input.sectors ?? [])
	const existingNames = new Set(services.map((service) => normalizedName(service.name)))
	const existingTemplates = templates.filter((template) =>
		existingNames.has(normalizedName(template.name)),
	)
	const missingTemplates = templates.filter(
		(template) => !existingNames.has(normalizedName(template.name)),
	)
	const blockedTemplates = missingTemplates.filter(
		(template) => !sectorIds[template.sectorKey],
	)
	const drafts = missingTemplates
		.filter((template) => sectorIds[template.sectorKey])
		.map((template) => ({
			templateId: template.id,
			name: template.name,
			icon: template.icon,
			sector: sectorIds[template.sectorKey],
			base_price: template.base_price,
			estimated_duration_minutes: template.estimated_duration_minutes,
			estimated_material_cost: '',
			notes: template.notes,
		}))

	return {
		businessType,
		requiresBusinessType: businessType === null,
		templates,
		existingTemplates,
		missingTemplates,
		blockedTemplates,
		drafts,
	}
}
