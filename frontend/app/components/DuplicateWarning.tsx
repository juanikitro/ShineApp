'use client'

import { AlertTriangle, X } from 'lucide-react'

type DuplicateItem = {
	id: number
	label: string
}

type Props = {
	title: string
	items: DuplicateItem[]
	onDismiss: () => void
}

export function DuplicateWarning({ title, items, onDismiss }: Props) {
	return (
		<div className="warn-note">
			<div className="warn-note__header">
				<AlertTriangle size={14} aria-hidden="true" />
				<span>{title}</span>
				<button
					type="button"
					className="warn-note__close"
					onClick={onDismiss}
					aria-label="Ignorar aviso de duplicado"
				>
					<X size={14} />
				</button>
			</div>
			<ul className="warn-note__list">
				{items.map((item) => (
					<li key={item.id}>{item.label}</li>
				))}
			</ul>
			<button
				type="button"
				className="warn-note__dismiss"
				onClick={onDismiss}
			>
				Ignorar y continuar
			</button>
		</div>
	)
}
