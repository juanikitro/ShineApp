export type ServiceIconSuggestion = {
	emoji: string
	label: string
}

export type ServiceIconCustomEmoji = {
	id: string
	names: string[]
	imgUrl: string
}

export const serviceIconCustomCategoryName = 'Lavadero & detailing'

export const serviceIconSuggestions: ServiceIconSuggestion[] = [
	{ emoji: '🧽', label: 'Esponja' },
	{ emoji: '🚿', label: 'Enjuague' },
	{ emoji: '🫧', label: 'Espuma' },
	{ emoji: '🧼', label: 'Jabon' },
	{ emoji: '✨', label: 'Brillo' },
	{ emoji: '💎', label: 'Premium' },
	{ emoji: '🛞', label: 'Neumaticos' },
	{ emoji: '🧴', label: 'Producto' },
	{ emoji: '🪣', label: 'Balde' },
	{ emoji: '🧹', label: 'Limpieza' },
	{ emoji: '⭐', label: 'Destacado' },
	{ emoji: '🛡️', label: 'Proteccion' },
	{ emoji: '🚗', label: 'Auto' },
	{ emoji: '🧊', label: 'Cristales' },
	{ emoji: '🧯', label: 'Interior' },
	{ emoji: '🧤', label: 'Guantes' },
	{ emoji: '🔧', label: 'Correccion' },
	{ emoji: '🧰', label: 'Taller' },
	{ emoji: '🪥', label: 'Detalle fino' },
	{ emoji: '💦', label: 'Agua' },
]

function escapeSvgText(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
}

function serviceEmojiSvgDataUrl(emoji: string) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="42">${escapeSvgText(emoji)}</text></svg>`
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function serviceIconCustomEmojiId(index: number) {
	return `shine-service-${index}`
}

export const serviceIconCustomEmojis: ServiceIconCustomEmoji[] =
	serviceIconSuggestions.map((option, index) => ({
		id: serviceIconCustomEmojiId(index),
		names: [
			option.label,
			option.emoji,
			serviceIconCustomCategoryName,
			'lavadero',
			'detailing',
		],
		imgUrl: serviceEmojiSvgDataUrl(option.emoji),
	}))

const serviceIconCustomEmojiById: Record<string, string> = Object.fromEntries(
	serviceIconCustomEmojis.map((customEmoji, index) => [
		customEmoji.id,
		serviceIconSuggestions[index]?.emoji ?? '',
	]),
)

export function serviceIconFromCustomEmojiId(id: string) {
	return serviceIconCustomEmojiById[id.toLowerCase()] ?? ''
}

export function normalizeServiceIcon(value: string) {
	return value.trim().slice(0, 24)
}
