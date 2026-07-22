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
import * as Popover from '@radix-ui/react-popover'
import { useId, useState } from 'react'

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
	const [open, setOpen] = useState(false)

	function commitIcon(nextValue: string) {
		onChange(normalizeServiceIcon(nextValue))
	}

	function selectIcon(nextValue: string) {
		commitIcon(nextValue)
		setOpen(false)
	}

	return (
		<div className="emoji-picker-field">
			<span className="field-label" id={`${id}-label`}>
				{label}
			</span>
			<Popover.Root modal={false} open={open} onOpenChange={setOpen}>
				<div className="emoji-picker-control">
					<Popover.Trigger asChild>
						<button
							aria-expanded={open}
							aria-haspopup="dialog"
							aria-label={
								value
									? `Emoji seleccionado ${value}. Abrir selector de emojis`
									: 'Abrir selector de emojis'
							}
							className="emoji-picker-trigger"
							data-focus-key={focusKey}
							type="button"
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
					</Popover.Trigger>
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
				<Popover.Portal>
					<Popover.Content
						align="start"
						aria-label="Selector de emojis"
						aria-modal="false"
						className="service-emoji-picker"
						collisionPadding={24}
						role="dialog"
						side="bottom"
						sideOffset={8}
					>
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
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
		</div>
	)
}
