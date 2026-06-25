import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ComponentProps } from 'react'
import { afterEach, test, vi } from 'vitest'

import { ProfileModal } from './ProfileModal'

afterEach(cleanup)

function buildProps(
	overrides: Partial<ComponentProps<typeof ProfileModal>> = {},
): ComponentProps<typeof ProfileModal> {
	return {
		onSubmit: (event) => event.preventDefault(),
		currentUser: {
			id: 7,
			username: 'juan',
		},
		profileForm: {
			username: 'juan',
			email: 'juan@example.com',
			phone_country_code: '+54',
			phone_number: '11 5555-1111',
			subscription_type: 'trial',
		},
		setProfileForm: () => {},
		canViewEconomy: true,
		onLogout: () => {},
		roleLabel: 'Empleador',
		activeText: 'Activo',
		trialText: 'Prueba activa hasta 30/06/2026',
		joinedText: '24/06/2026 10:00',
		lastLoginText: '24/06/2026 10:05',
		avatarInputRef: createRef<HTMLInputElement>(),
		avatarInputKey: 0,
		avatarPreview: null,
		avatarPdfThumbnail: null,
		avatarIsPdf: false,
		avatarInitial: 'J',
		hasStoredAvatar: true,
		onAvatarChange: () => {},
		onOpenAvatarPicker: () => {},
		submitting: false,
		...overrides,
	}
}

test('ProfileModal precarga username, email y celular en el formulario', () => {
	render(<ProfileModal {...buildProps()} />)

	assert.equal(
		(screen.getByLabelText('Usuario') as HTMLInputElement).value,
		'juan',
	)
	assert.equal(
		(screen.getByLabelText('Email') as HTMLInputElement).value,
		'juan@example.com',
	)
	assert.equal(
		(screen.getByLabelText('Codigo de pais') as HTMLSelectElement).value,
		'+54',
	)
	assert.equal(
		(screen.getByLabelText('Celular') as HTMLInputElement).value,
		'11 5555-1111',
	)
})

test('ProfileModal permite editar username/email y abrir el selector de avatar', async () => {
	const user = userEvent.setup()
	const setProfileForm = vi.fn()
	const onOpenAvatarPicker = vi.fn()
	const profileForm = {
		username: 'juan',
		email: 'juan@example.com',
		phone_country_code: '+54',
		phone_number: '11 5555-1111',
		subscription_type: 'trial',
	}

	render(
		<ProfileModal
			{...buildProps({
				profileForm,
				setProfileForm,
				onOpenAvatarPicker,
			})}
		/>,
	)

	await user.type(screen.getByLabelText('Usuario'), 'x')
	assert.deepEqual(setProfileForm.mock.calls.at(-1)?.[0], {
		...profileForm,
		username: 'juanx',
	})

	await user.type(screen.getByLabelText('Email'), 'a')
	assert.deepEqual(setProfileForm.mock.calls.at(-1)?.[0], {
		...profileForm,
		email: 'juan@example.coma',
	})

	await user.click(screen.getByRole('button', { name: 'Cambiar foto de perfil' }))
	assert.equal(onOpenAvatarPicker.mock.calls.length, 1)
})
