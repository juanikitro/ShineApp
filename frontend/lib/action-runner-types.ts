import { type ActionMessage } from './page-support'

export type UndoAction<T> = {
	label?: ActionMessage<T>
	description?: ActionMessage<T>
	execute: (result: T) => Promise<void>
	successTitle?: ActionMessage<T>
	successDescription?: ActionMessage<T>
}

export type RunActionOptions<T> = {
	flashTarget?: string | null | ((result: T) => string | null | undefined)
	successTitle?: ActionMessage<T>
	successDescription?: ActionMessage<T>
	undo?: UndoAction<T>
	key?: string
}

export type PendingUndoAction = {
	id: number
	toastId: number | null
	expiresAt: number
	busy: boolean
	execute: () => Promise<void>
	successTitle: string
	successDescription?: string
}
