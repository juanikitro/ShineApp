import assert from 'node:assert/strict'
import { afterEach, test, vi } from 'vitest'

import {
	initialNavigationStateFromBrowser,
	navigationUrlForState,
	readNavigationStateFromUrl,
	searchQueryFromBrowser,
} from './navigation-state'

const navigationConfig = {
	sections: ['dashboard', 'agenda', 'cash', 'debts', 'settings'],
	settingsSections: ['business', 'cash', 'users', 'history'],
	defaultSection: 'dashboard',
	defaultSettingsSection: 'business',
}

const initialBrowserUrl = window.location.href

afterEach(() => {
	vi.unstubAllGlobals()
	window.history.replaceState({}, '', initialBrowserUrl)
})

test('reads initial navigation and search state from the browser URL', () => {
	window.history.replaceState(
		{},
		'',
		'/?section=settings&settings=history&q=lavado',
	)

	assert.deepEqual(initialNavigationStateFromBrowser(navigationConfig), {
		section: 'settings',
		settingsSection: 'history',
	})
	assert.equal(searchQueryFromBrowser(), 'lavado')
})

test('keeps server defaults when browser globals are unavailable', () => {
	vi.stubGlobal('window', undefined)

	assert.deepEqual(initialNavigationStateFromBrowser(navigationConfig), {
		section: 'dashboard',
		settingsSection: 'business',
	})
	assert.equal(searchQueryFromBrowser(), '')
})

test('reads main section and settings subsection from URL query params', () => {
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:9000/?section=settings&settings=users',
			navigationConfig,
		),
		{ section: 'settings', settingsSection: 'users' },
	)
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:9000/?section=debts',
			navigationConfig,
		),
		{ section: 'debts', settingsSection: 'business' },
	)
})

test('ignores unknown URL values and keeps safe defaults', () => {
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:9000/?section=admin&settings=secrets',
			navigationConfig,
		),
		{ section: 'dashboard', settingsSection: 'business' },
	)
})

test('writes canonical query params without dropping unrelated params', () => {
	assert.equal(
		navigationUrlForState('http://localhost:9000/?foo=bar', {
			section: 'cash',
			settingsSection: 'business',
		}, navigationConfig),
		'/?foo=bar&section=cash',
	)
	assert.equal(
		navigationUrlForState('http://localhost:9000/?foo=bar&section=cash', {
			section: 'settings',
			settingsSection: 'history',
		}, navigationConfig),
		'/?foo=bar&section=settings&settings=history',
	)
})

test('falls back to controlled hash links when query params are absent', () => {
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:9000/#settings/cash',
			navigationConfig,
		),
		{ section: 'settings', settingsSection: 'cash' },
	)
})

test('canonical urls clear default sections and controlled legacy hashes', () => {
	assert.equal(
		navigationUrlForState('http://localhost:9000/?section=cash&settings=users#/agenda', {
			section: 'dashboard',
			settingsSection: 'users',
		}, navigationConfig),
		'/',
	)
	assert.equal(
		navigationUrlForState('http://localhost:9000/#external-anchor', {
			section: 'settings',
			settingsSection: 'unknown',
		}, navigationConfig),
		'/?section=settings&settings=business#external-anchor',
	)
})

test('reads case-insensitive hash variants and ignores empty hash values', () => {
	assert.deepEqual(
		readNavigationStateFromUrl(
			'http://localhost:9000/#/SETTINGS:History',
			navigationConfig,
		),
		{ section: 'settings', settingsSection: 'history' },
	)
	assert.deepEqual(
		readNavigationStateFromUrl('http://localhost:9000/#/', navigationConfig),
		{ section: 'dashboard', settingsSection: 'business' },
	)
	assert.equal(
		navigationUrlForState('http://localhost:9000/?settings=users', {
			section: 'unknown',
			settingsSection: 'users',
		}, navigationConfig),
		'/',
	)
})
