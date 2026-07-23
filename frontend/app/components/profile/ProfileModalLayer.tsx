import { type ReactNode } from 'react'

import { ModalFrame as Modal } from '@/app/components/ui/ModalFrame'

type ProfileModalLayerProps = {
	hasCurrentUser: boolean
	onClose: () => void
	renderProfile: () => ReactNode
}

export function renderProfileModal({
	hasCurrentUser,
	onClose,
	renderProfile,
}: ProfileModalLayerProps): ReactNode {
	return (
		<Modal key="profile-modal" title="Mi perfil" onClose={onClose}>
			{hasCurrentUser ? renderProfile() : null}
		</Modal>
	)
}
