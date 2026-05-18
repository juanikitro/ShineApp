'use client'

import dynamic from 'next/dynamic'
import {
	Categories,
	EmojiStyle,
	Theme,
	type CategoryConfig,
	type EmojiClickData,
} from 'emoji-picker-react'
import { ChevronDown, Smile, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import {
	normalizeServiceIcon,
	serviceIconCustomCategoryName,
	serviceIconCustomEmojis,
	serviceIconFromCustomEmojiId,
} from '@/lib/service-icon-options'
import { LoadingState } from './Empty'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
	loading: () => <LoadingState text="Cargando emojis..." />,
	ssr: false,
})

const emojiCategories: CategoryConfig[] = [
	{ category: Categories.SUGGESTED, name: 'Recientes' },
	{ category: Categories.CUSTOM, name: serviceIconCustomCategoryName },
	{ category: Categories.SMILEYS_PEOPLE, name: 'Caras y personas' },
	{ category: Categories.ANIMALS_NATURE, name: 'Naturaleza' },
	{ category: Categories.FOOD_DRINK, name: 'Comida' },
	{ category: Categories.TRAVEL_PLACES, name: 'Viajes' },
	{ category: Categories.ACTIVITIES, name: 'Actividades' },
	{ category: Categories.OBJECTS, name: 'Objetos' },
	{ category: Categories.SYMBOLS, name: 'Simbolos' },
	{ category: Categories.FLAGS, name: 'Banderas' },
]

type ServiceIconPickerProps = {
	label?: string
	value: string
	onChange: (value: string) => void
	focusKey?: string
}

export function ServiceIconPicker({
	label = 'Icono/emoji',
	value,
	onChange,
	focusKey,
}: ServiceIconPickerProps) {
	const id = useId()
	const rootRef = useRef<HTMLDivElement>(null)
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!open) return

		function handlePointerDown(event: PointerEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false)
			}
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpen(false)
		}

		document.addEventListener('pointerdown', handlePointerDown, true)
		document.addEventListener('keydown', handleEscape)
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, true)
			document.removeEventListener('keydown', handleEscape)
		}
	}, [open])

	function commitIcon(nextValue: string) {
		onChange(normalizeServiceIcon(nextValue))
	}

	function selectIcon(nextValue: string) {
		commitIcon(nextValue)
		setOpen(false)
	}

	return (
		<div
			className={`emoji-picker-field${open ? ' emoji-picker-field--open' : ''}`}
			ref={rootRef}
		>
			<span className="field-label" id={`${id}-label`}>
				{label}
			</span>
			<div className="emoji-picker-control">
				<button
					aria-expanded={open}
					aria-label={
						value
							? `Emoji seleccionado ${value}. Abrir selector de emojis`
							: 'Abrir selector de emojis'
					}
					className="emoji-picker-trigger"
					data-focus-key={focusKey}
					type="button"
					onClick={() => setOpen((current) => !current)}
				>
					<span className="emoji-picker-trigger-main">
						<span className="emoji-picker-trigger-value" aria-hidden="true">
							{value ? value : <Smile size={18} />}
						</span>
						<span className="emoji-picker-trigger-text">
							{value ? 'Cambiar emoji' : 'Elegir emoji'}
						</span>
					</span>
					<ChevronDown aria-hidden="true" size={14} />
				</button>
				{value ? (
					<button
						aria-label="Limpiar emoji"
						className="emoji-picker-clear"
						type="button"
						onClick={() => commitIcon('')}
					>
						<X size={16} />
					</button>
				) : null}
			</div>
			{open ? (
				<div className="service-emoji-picker" role="dialog" aria-label="Selector de emojis">
					<EmojiPicker
						autoFocusSearch={false}
						categories={emojiCategories}
						customEmojis={serviceIconCustomEmojis}
						emojiStyle={EmojiStyle.NATIVE}
						height={360}
						lazyLoadEmojis
						previewConfig={{ showPreview: false }}
						searchPlaceHolder="Buscar"
						theme={Theme.AUTO}
						width="100%"
						onEmojiClick={(emojiData: EmojiClickData) => {
							selectIcon(
								emojiData.isCustom
									? serviceIconFromCustomEmojiId(emojiData.unified) ||
											emojiData.emoji
									: emojiData.emoji,
							)
						}}
					/>
				</div>
			) : null}
		</div>
	)
}
