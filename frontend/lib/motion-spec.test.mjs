import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadMotionSpecModule() {
	const sourcePath = resolve('lib/motion-spec.ts')
	const source = readFileSync(sourcePath, 'utf8')
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
	}).outputText
	const module = { exports: {} }
	const loader = new Function('exports', 'module', compiled)
	loader(module.exports, module)
	return module.exports
}

const {
	agendaBoardVariants,
	agendaSlideMotionFromOffset,
	agendaSlidePresenceMode,
	agendaSlideWindowsOverlap,
} =
	loadMotionSpecModule()

test('slides a full agenda range without fading the board out', () => {
	const slideMotion = agendaSlideMotionFromOffset(5, 5)
	const initial = agendaBoardVariants.initial(slideMotion)
	const animate = agendaBoardVariants.animate(slideMotion)
	const exit = agendaBoardVariants.exit(slideMotion)

	assert.equal(slideMotion.scope, 'range')
	assert.equal(slideMotion.direction, 'forward')
	assert.equal(slideMotion.distancePercent, 100)
	assert.equal(slideMotion.offsetDays, 5)
	assert.equal(agendaSlidePresenceMode(slideMotion), 'sync')
	assert.equal(agendaSlideWindowsOverlap(slideMotion, 5), false)
	assert.equal(initial.opacity, 1)
	assert.equal(initial.x, '100%')
	assert.equal(exit.opacity, 1)
	assert.equal(exit.x, '-100%')
	assert.equal(exit.transition.duration, animate.transition.duration)
})

test('slides a full agenda range backward in the opposite direction', () => {
	const slideMotion = agendaSlideMotionFromOffset(-5, 5)
	const initial = agendaBoardVariants.initial(slideMotion)
	const exit = agendaBoardVariants.exit(slideMotion)

	assert.equal(slideMotion.scope, 'range')
	assert.equal(slideMotion.direction, 'backward')
	assert.equal(slideMotion.distancePercent, 100)
	assert.equal(slideMotion.offsetDays, -5)
	assert.equal(agendaSlidePresenceMode(slideMotion), 'sync')
	assert.equal(agendaSlideWindowsOverlap(slideMotion, 5), false)
	assert.equal(initial.opacity, 1)
	assert.equal(initial.x, '-100%')
	assert.equal(exit.opacity, 1)
	assert.equal(exit.x, '100%')
})

test('uses sync presence while marking overlapping agenda windows', () => {
	const oneDayMotion = agendaSlideMotionFromOffset(1, 5)
	const fourDayMotion = agendaSlideMotionFromOffset(-4, 5)

	assert.equal(oneDayMotion.scope, 'day')
	assert.equal(oneDayMotion.distancePercent, 20)
	assert.equal(agendaSlidePresenceMode(oneDayMotion), 'sync')
	assert.equal(agendaSlideWindowsOverlap(oneDayMotion, 5), true)
	assert.equal(fourDayMotion.scope, 'day')
	assert.equal(fourDayMotion.distancePercent, 80)
	assert.equal(agendaSlidePresenceMode(fourDayMotion), 'sync')
	assert.equal(agendaSlideWindowsOverlap(fourDayMotion, 5), true)
})
