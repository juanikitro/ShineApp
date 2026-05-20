import assert from 'node:assert/strict'
import { afterEach, test, vi } from 'vitest'

import { loginInitialCredentials } from './page-support'

afterEach(() => {
	vi.unstubAllEnvs()
})

test('login initial credentials are blank by default', () => {
	assert.deepEqual(loginInitialCredentials(), {
		username: '',
		password: '',
	})
})

test('login demo mode prefills only the configured username', () => {
	vi.stubEnv('NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN', '1')
	vi.stubEnv('NEXT_PUBLIC_SHINEAPP_DEMO_USERNAME', 'demo-admin')

	assert.deepEqual(loginInitialCredentials(), {
		username: 'demo-admin',
		password: '',
	})
})
