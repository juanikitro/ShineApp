import { useEffect, useState } from 'react'
import { apiFetch, clearStoredToken, getStoredToken } from './api'

export type CurrentUser = {
	id: number
	username: string
	email: string
	role: string
	can_view_economy: boolean
	business: { id: number; name: string; slug: string; is_active: boolean }
	avatar_url: string | null
}

type AuthState =
	| { status: 'loading' }
	| { status: 'unauthenticated' }
	| { status: 'authenticated'; user: CurrentUser }

export function useCurrentUser(): AuthState {
	const [state, setState] = useState<AuthState>({ status: 'loading' })

	useEffect(() => {
		const token = getStoredToken()
		if (!token) {
			setState({ status: 'unauthenticated' })
			return
		}

		let cancelled = false
		apiFetch<CurrentUser>('/auth/me/')
			.then((user) => {
				if (!cancelled) setState({ status: 'authenticated', user })
			})
			.catch(() => {
				clearStoredToken()
				if (!cancelled) setState({ status: 'unauthenticated' })
			})

		return () => {
			cancelled = true
		}
	}, [])

	return state
}
