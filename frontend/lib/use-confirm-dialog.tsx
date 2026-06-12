'use client'

import {
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { createPortal } from 'react-dom'

import { Button } from '@/app/components/ui/Button'
import {
	modalBackdropVariants,
	modalPanelVariants,
} from '@/lib/motion-spec'

type ConfirmTone = 'default' | 'danger'

export type ConfirmOptions = {
	title?: string
	message: ReactNode
	confirmLabel?: string
	cancelLabel?: string
	tone?: ConfirmTone
	onConfirm?: () => Promise<unknown> | unknown
}

type ConfirmState = ConfirmOptions & {
	resolve: (value: boolean) => void
}

export type ConfirmDialogApi = {
	requestConfirm: (options: ConfirmOptions) => Promise<boolean>
	ConfirmDialog: () => ReactNode
}

export function useConfirmDialog(): ConfirmDialogApi {
	const [pending, setPending] = useState<ConfirmState | null>(null)
	const [running, setRunning] = useState(false)
	const titleId = useId()
	const mountedRef = useRef(true)

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
		}
	}, [])

	const requestConfirm = useCallback((options: ConfirmOptions) => {
		return new Promise<boolean>((resolve) => {
			setPending({ ...options, resolve })
		})
	}, [])

	const cancel = useCallback(() => {
		setPending((current) => {
			if (!current) return current
			current.resolve(false)
			return null
		})
	}, [])

	const confirm = useCallback(async () => {
		const current = pending
		if (!current) return
		if (current.onConfirm) {
			try {
				setRunning(true)
				await current.onConfirm()
			} catch (err) {
				if (mountedRef.current) setRunning(false)
				throw err
			}
			if (mountedRef.current) setRunning(false)
		}
		current.resolve(true)
		setPending(null)
	}, [pending])

	useEffect(() => {
		if (!pending) return
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape' && !running) {
				event.preventDefault()
				cancel()
			}
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [pending, running, cancel])

	function onBackdropMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget && !running) {
			cancel()
		}
	}

	const ConfirmDialog = useCallback(() => {
		if (typeof document === 'undefined') return null
		return createPortal(
			<AnimatePresence initial={false}>
				{pending ? (
					<m.div
						className="modal-backdrop confirm-dialog-backdrop"
						role="presentation"
						variants={modalBackdropVariants}
						initial="initial"
						animate="animate"
						exit="exit"
						onMouseDown={onBackdropMouseDown}
					>
						<m.div
							className="modal-panel confirm-dialog-panel"
							role="alertdialog"
							aria-modal="true"
							aria-labelledby={pending.title ? titleId : undefined}
							variants={modalPanelVariants}
							initial="initial"
							animate="animate"
							exit="exit"
						>
							<div className="confirm-dialog-content">
								{pending.title ? (
									<h2 id={titleId} className="confirm-dialog-title">
										{pending.title}
									</h2>
								) : null}
								<div className="confirm-dialog-message">{pending.message}</div>
							</div>
							<div className="confirm-dialog-actions">
								<Button
									variant="ghost"
									onClick={cancel}
									disabled={running}
								>
									{pending.cancelLabel ?? 'Cancelar'}
								</Button>
								<Button
									variant={pending.tone === 'danger' ? 'danger' : 'primary'}
									onClick={() => {
										void confirm()
									}}
									loading={running}
									autoFocus
								>
									{pending.confirmLabel ?? 'Confirmar'}
								</Button>
							</div>
						</m.div>
					</m.div>
				) : null}
			</AnimatePresence>,
			document.body,
		)
	}, [pending, running, titleId, cancel, confirm])

	return { requestConfirm, ConfirmDialog }
}
