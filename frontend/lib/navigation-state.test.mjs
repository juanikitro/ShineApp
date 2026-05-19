import assert from 'node:assert/strict'
import { test } from 'vitest'

import { navigationUrlForState, readNavigationStateFromUrl } from './navigation-state'

const navigationConfig = {
	sections: ['dashboard', 'agenda', 'cash', 'debts', 'settings'],
	settingsSections: ['business', 'cash', 'users', 'history'],
	defaultSection: 'dashboard',
	defaultSettingsSection: 'business',
}

test('reads main section and settings subsection from URL query params', () => {
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:3000/?section=settings&settings=users',
			navigationConfig,
		),
		{ section: 'settings', settingsSection: 'users' },
	)
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:3000/?section=debts',
			navigationConfig,
		),
		{ section: 'debts', settingsSection: 'business' },
	)
})

test('ignores unknown URL values and keeps safe defaults', () => {
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:3000/?section=admin&settings=secrets',
			navigationConfig,
		),
		{ section: 'dashboard', settingsSection: 'business' },
	)
})

test('writes canonical query params without dropping unrelated params', () => {
	assert.equal(
		navigationUrlForState('http://localhost:3000/?foo=bar', {
			section: 'cash',
			settingsSection: 'business',
		}, navigationConfig),
		'/?foo=bar&section=cash',
	)
	assert.equal(
		navigationUrlForState('http://localhost:3000/?foo=bar&section=cash', {
			section: 'settings',
			settingsSection: 'history',
		}, navigationConfig),
		'/?foo=bar&section=settings&settings=history',
	)
})

test('falls back to controlled hash links when query params are absent', () => {
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:3000/#settings/cash',
			navigationConfig,
		),
		{ section: 'settings', settingsSection: 'cash' },
	)
})

test('canonical urls clear default sections and controlled legacy hashes', () => {
	assert.equal(
		navigationUrlForState('http://localhost:3000/?section=cash&settings=users#/agenda', {
			section: 'dashboard',
			settingsSection: 'users',
		}, navigationConfig),
		'/',
	)
	assert.equal(
		navigationUrlForState('http://localhost:3000/#external-anchor', {
			section: 'settings',
			settingsSection: 'unknown',
		}, navigationConfig),
		'/?section=settings&settings=business#external-anchor',
	)
})

test('reads case-insensitive hash variants and ignores empty hash values', () => {
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:3000/#/SETTINGS:History',
			navigationConfig,
		),
		{ section: 'settings', settingsSection: 'history' },
	)
	assert.deepEqual(
		readNavigationStateFromUrl('http://localhost:3000/#/', navigationConfig),
		{ section: 'dashboard', settingsSection: 'business' },
	)
	assert.equal(
		navigationUrlForState('http://localhost:3000/?settings=users', {
			section: 'unknown',
			settingsSection: 'users',
		}, navigationConfig),
		'/',
	)
})
