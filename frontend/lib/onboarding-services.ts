import { type AnyRecord } from '@/lib/page-support'

export type StarterServiceTemplate = {
	id: string
	name: string
	sectorKey: 'lavadero' | 'detailing' | 'lubricentro'
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
		base_price: '12000.00',
		estimated_duration_minutes: '45',
		notes: 'Servicio inicial para empezar a tomar turnos de lavadero.',
	},
	{
		id: 'detailing-interior',
		name: 'Detailing interior',
		sectorKey: 'detailing',
		icon: '✨',
		base_price: '52000.00',
		estimated_duration_minutes: '180',
		notes: 'Servicio inicial para vender limpieza interior y recuperacion.',
	},
	{
		id: 'cambio-aceite',
		name: 'Cambio de aceite y filtro',
		sectorKey: 'lubricentro',
		icon: '🧰',
		base_price: '42000.00',
		estimated_duration_minutes: '75',
		notes: 'Servicio inicial para operar lubricentro sin cargar inventario avanzado.',
	},
]

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
	services?: AnyRecord[] | null
	sectors?: AnyRecord[] | null
}): StarterServicesPlan {
	const services = input.services ?? []
	const sectorIds = activeSectorIdByKey(input.sectors ?? [])
	const existingNames = new Set(services.map((service) => normalizedName(service.name)))
	const existingTemplates = starterServiceTemplates.filter((template) =>
		existingNames.has(normalizedName(template.name)),
	)
	const missingTemplates = starterServiceTemplates.filter(
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
		templates: starterServiceTemplates,
		existingTemplates,
		missingTemplates,
		blockedTemplates,
		drafts,
	}
}
