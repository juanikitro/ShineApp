import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const logoLight = path.join(projectRoot, 'public', 'shineapp-logo.svg')
const logoOnBrand = path.join(projectRoot, 'public', 'shineapp-logo-dark.svg')
const outputDir = path.join(projectRoot, 'public', 'icons')

const BRAND_COLOR = { r: 2, g: 132, b: 199, alpha: 1 }

async function renderLogoBuffer(source, size) {
	return sharp(source, { density: 600 })
		.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.png()
		.toBuffer()
}

async function writeAnyIcon(size, filename) {
	const buffer = await renderLogoBuffer(logoLight, size)
	const target = path.join(outputDir, filename)
	await writeFile(target, buffer)
	return target
}

async function writeMaskableIcon(size, filename, { safeAreaRatio = 0.7, background = BRAND_COLOR } = {}) {
	const inner = Math.round(size * safeAreaRatio)
	const logo = await renderLogoBuffer(logoOnBrand, inner)
	const target = path.join(outputDir, filename)
	await sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background,
		},
	})
		.composite([{ input: logo, gravity: 'center' }])
		.png()
		.toFile(target)
	return target
}

async function writeAppleTouchIcon(size, filename) {
	const inner = Math.round(size * 0.78)
	const logo = await renderLogoBuffer(logoOnBrand, inner)
	const target = path.join(outputDir, filename)
	await sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background: BRAND_COLOR,
		},
	})
		.composite([{ input: logo, gravity: 'center' }])
		.png()
		.toFile(target)
	return target
}

async function main() {
	await mkdir(outputDir, { recursive: true })

	const generated = await Promise.all([
		writeAnyIcon(192, 'icon-192.png'),
		writeAnyIcon(512, 'icon-512.png'),
		writeMaskableIcon(192, 'icon-maskable-192.png'),
		writeMaskableIcon(512, 'icon-maskable-512.png'),
		writeAppleTouchIcon(180, 'apple-touch-icon.png'),
	])

	for (const target of generated) {
		console.log('generado:', path.relative(projectRoot, target))
	}
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
