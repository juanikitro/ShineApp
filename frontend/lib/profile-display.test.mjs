import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	blankProfileForm,
	profileDisplayName,
	profileInitial,
	profileRoleLabel,
	profileLastLoginText,
	profileJoinedText,
	profileActiveText,
	profileTrialText,
} from './profile-display'

// blankProfileForm
test('blankProfileForm returns defaults when user is null', () => {
	const form = blankProfileForm(null)
	assert.equal(form.email, '')
	assert.equal(form.phone_country_code, '+54')
	assert.equal(form.phone_number, '')
	assert.equal(form.subscription_type, 'trial')
})

test('blankProfileForm extracts values from user', () => {
	const user = {
		email: 'test@example.com',
		phone_country_code: '+1',
		phone_number: '555-1234',
		subscription_type: 'premium',
	}
	const form = blankProfileForm(user)
	assert.equal(form.email, 'test@example.com')
	assert.equal(form.phone_country_code, '+1')
	assert.equal(form.phone_number, '555-1234')
	assert.equal(form.subscription_type, 'premium')
})

// profileDisplayName
test('profileDisplayName returns username when present', () => {
	assert.equal(profileDisplayName({ username: 'juan' }), 'juan')
})

test('profileDisplayName returns Mi perfil when user is null', () => {
	assert.equal(profileDisplayName(null), 'Mi perfil')
	assert.equal(profileDisplayName(undefined), 'Mi perfil')
	assert.equal(profileDisplayName({}), 'Mi perfil')
})

// profileInitial
test('profileInitial returns first letter uppercase', () => {
	assert.equal(profileInitial({ username: 'juan' }), 'J')
	assert.equal(profileInitial({ username: 'ana' }), 'A')
})

test('profileInitial returns first letter of Mi perfil fallback when no username', () => {
	assert.equal(profileInitial(null), 'M')
	assert.equal(profileInitial({}), 'M')
})

// profileRoleLabel
test('profileRoleLabel returns mapped label for known roles', () => {
	assert.equal(profileRoleLabel({ role: 'empleador' }), 'Empleador')
	assert.equal(profileRoleLabel({ role: 'empleado' }), 'Empleado')
})

test('profileRoleLabel returns Usuario as fallback', () => {
	assert.equal(profileRoleLabel({ role: 'otro' }), 'Usuario')
	assert.equal(profileRoleLabel(null), 'Usuario')
})

// profileLastLoginText
test('profileLastLoginText returns formatted date when last_login present', () => {
	const text = profileLastLoginText({ last_login: '2025-01-15T10:30:00Z' })
	assert.ok(text.length > 0)
	assert.notEqual(text, 'Sin inicio previo')
})

test('profileLastLoginText returns fallback when no last_login', () => {
	assert.equal(profileLastLoginText(null), 'Sin inicio previo')
	assert.equal(profileLastLoginText({}), 'Sin inicio previo')
})

// profileJoinedText
test('profileJoinedText returns formatted date when date_joined present', () => {
	const text = profileJoinedText({ date_joined: '2024-06-01T00:00:00Z' })
	assert.ok(text.length > 0)
	assert.notEqual(text, 'Sin fecha de alta')
})

test('profileJoinedText returns fallback when no date_joined', () => {
	assert.equal(profileJoinedText(null), 'Sin fecha de alta')
	assert.equal(profileJoinedText({}), 'Sin fecha de alta')
})

// profileActiveText
test('profileActiveText returns Inactivo when is_active is false', () => {
	assert.equal(profileActiveText({ is_active: false }), 'Inactivo')
})

test('profileActiveText returns Activo when is_active is true or missing', () => {
	assert.equal(profileActiveText({ is_active: true }), 'Activo')
	assert.equal(profileActiveText({}), 'Activo')
	assert.equal(profileActiveText(null), 'Activo')
})

// profileTrialText
test('profileTrialText returns Prueba vencida when trial_expired', () => {
	assert.equal(profileTrialText({ trial_expired: true }), 'Prueba vencida')
})

test('profileTrialText returns active trial message when trial_ends_at present', () => {
	const text = profileTrialText({ trial_ends_at: '2025-12-31' })
	assert.ok(text.includes('Prueba activa hasta'))
})

test('profileTrialText returns null when no trial info', () => {
	assert.equal(profileTrialText(null), null)
	assert.equal(profileTrialText({}), null)
})
