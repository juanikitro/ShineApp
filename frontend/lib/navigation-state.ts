export type NavigationState = {
	section: string
	settingsSection: string
}

export type NavigationConfig = {
	sections: readonly string[]
	settingsSections: readonly string[]
	defaultSection: string
	defaultSettingsSection: string
}

const SECTION_PARAM = 'section'
const SETTINGS_PARAM = 'settings'

function normalizeSegment(value: string | null | undefined) {
	return String(value ?? '')
		.trim()
		.toLowerCase()
}

function matchingValue(values: readonly string[], candidate: string | null | undefined) {
	const normalized = normalizeSegment(candidate)
	if (!normalized) return null
	return values.find((value) => value.toLowerCase() === normalized) ?? null
}

function parseControlledHash(hash: string) {
	const normalized = normalizeSegment(hash).replace(/^#\/?/, '')
	if (!normalized) return {}
	const [section, settingsSection] = normalized.split(/[/?&:]+/).filter(Boolean)
	if (!section) return {}
	if (section === 'settings') {
		return { section, settingsSection }
	}
	return { section, settingsSection: settingsSection || undefined }
}

function controlledHashMatchesConfig(hash: string, config: NavigationConfig) {
	const parsed = parseControlledHash(hash)
	return Boolean(
		matchingValue(config.sections, parsed.section) ||
			matchingValue(config.settingsSections, parsed.settingsSection),
	)
}

function baseUrlFromHref(href: string) {
	return new URL(href || '/', 'http://shineapp.local')
}

export function readNavigationStateFromUrl(
	href: string,
	config: NavigationConfig,
): NavigationState {
	const url = baseUrlFromHref(href)
	const hashState = parseControlledHash(url.hash)
	const section =
		matchingValue(config.sections, url.searchParams.get(SECTION_PARAM)) ??
		matchingValue(config.sections, hashState.section) ??
		config.defaultSection
	const settingsSection =
		matchingValue(
			config.settingsSections,
			url.searchParams.get(SETTINGS_PARAM),
		) ??
		matchingValue(config.settingsSections, hashState.settingsSection) ??
		config.defaultSettingsSection
	return { section, settingsSection }
}

export function navigationUrlForState(
	href: string,
	state: NavigationState,
	config: NavigationConfig,
) {
	const url = baseUrlFromHref(href)
	const section = matchingValue(config.sections, state.section) ?? config.defaultSection
	const settingsSection =
		matchingValue(config.settingsSections, state.settingsSection) ??
		config.defaultSettingsSection

	if (section === config.defaultSection) {
		url.searchParams.delete(SECTION_PARAM)
		url.searchParams.delete(SETTINGS_PARAM)
	} else {
		url.searchParams.set(SECTION_PARAM, section)
		if (section === 'settings') {
			url.searchParams.set(SETTINGS_PARAM, settingsSection)
		} else {
			url.searchParams.delete(SETTINGS_PARAM)
		}
	}

	if (controlledHashMatchesConfig(url.hash, config)) {
		url.hash = ''
	}

	return `${url.pathname}${url.search}${url.hash}`
}
