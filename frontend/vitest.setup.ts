import '@testing-library/jest-dom/vitest'

import React, { forwardRef } from 'react'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { spawnSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Generate changelog.generated.json if it doesn't exist
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const changelogPath = path.join(__dirname, 'app', 'data', 'changelog.generated.json')

if (!existsSync(changelogPath)) {
	const checkDocsPath = path.join(__dirname, '../scripts/check_docs.py')
	const cmds = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python']

	for (const cmd of cmds) {
		const result = spawnSync(cmd, [checkDocsPath, '--write', '--skip-build'], {
			cwd: path.dirname(checkDocsPath)
		})
		if (result.status === 0) break
	}
}

afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})

Object.defineProperty(window, 'requestAnimationFrame', {
	configurable: true,
	value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0),
})

Object.defineProperty(window, 'cancelAnimationFrame', {
	configurable: true,
	value: (handle: number) => window.clearTimeout(handle),
})

Object.defineProperty(window, 'scrollTo', {
	configurable: true,
	value: vi.fn(),
})

Element.prototype.scrollIntoView = vi.fn()

vi.mock('next/dynamic', () => ({
	default: () => {
		return function DynamicEmojiPicker(props: any) {
			return React.createElement(
				'button',
				{
					type: 'button',
					'data-testid': 'emoji-picker',
					onClick: () =>
						props.onEmojiClick?.({
							emoji: '🧽',
							isCustom: false,
							unified: '1f9fd',
						}),
				},
				'Emoji picker',
			)
		}
	},
}))

function stripMotionProps(props: Record<string, any>) {
	const {
		animate,
		exit,
		initial,
		layout,
		variants,
		transition,
		whileHover,
		whileTap,
		...rest
	} = props
	return rest
}

function motionElement(tagName: string) {
	return forwardRef<HTMLElement, Record<string, any>>(function MotionElement(
		props,
		ref,
	) {
		return React.createElement(tagName, {
			...stripMotionProps(props),
			ref,
		})
	})
}

vi.mock('motion/react', () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
	LazyMotion: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
	MotionConfig: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
	domAnimation: {},
}))

vi.mock('motion/react-m', () => ({
	div: motionElement('div'),
	span: motionElement('span'),
}))
