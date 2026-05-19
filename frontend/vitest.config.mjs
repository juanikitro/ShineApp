import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': new URL('.', import.meta.url).pathname,
		},
	},
	test: {
		environment: 'jsdom',
		globals: false,
		include: [
			'lib/**/*.test.mjs',
			'app/components/**/*.test.{ts,tsx}',
		],
		setupFiles: ['./vitest.setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'text-summary'],
			reportsDirectory: './coverage',
			include: [
				'lib/**/*.{ts,tsx}',
				'app/components/layout/**/*.{ts,tsx}',
				'app/components/motion/**/*.{ts,tsx}',
				'app/components/ui/**/*.{ts,tsx}',
				'app/components/utils.ts',
			],
			exclude: [
				'**/*.test.*',
				'**/*.d.ts',
				'lib/page-support.tsx',
			],
			thresholds: {
				lines: 90,
				functions: 90,
				branches: 90,
				statements: 90,
			},
		},
	},
})
