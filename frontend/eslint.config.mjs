import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
	...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
	{
		// Baseline del refactor de mantenibilidad (2026-06): las reglas que
		// frenan el crecimiento del god component y del `any` arrancan como
		// warning y se endurecen a error en el Track H.
		// Ver docs/plans/2026-06-12-refactor-mantenibilidad.md
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'max-lines': [
				'warn',
				{ max: 500, skipBlankLines: true, skipComments: true },
			],
		},
	},
	{
		ignores: [
			'.next/**',
			'coverage/**',
			'node_modules/**',
			'app/data/**',
			'next-env.d.ts',
		],
	},
]

export default eslintConfig
