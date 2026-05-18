import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function loadAuditLogModule() {
	const sourcePath = resolve('lib/audit-log.ts')
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
	auditActorLabel,
	auditChangeRows,
	auditLogListOrEmpty,
	auditLogQueryString,
	auditValueText,
} = loadAuditLogModule()

test('labels current user as Vos without hiding the username', () => {
	assert.equal(
		auditActorLabel({ actor: 7, actor_username: 'admin' }, 7),
		'admin (Vos)',
	)
	assert.equal(
		auditActorLabel({ actor: 8, actor_username: 'empleado' }, 7),
		'empleado',
	)
	assert.equal(auditActorLabel({ actor: null, actor_username: '' }, 7), 'Sistema')
})

test('normalizes changed fields into display rows', () => {
	assert.deepEqual(
		auditChangeRows({
			phone: { before: '1111', after: '2222' },
			name: { before: null, after: 'Ana' },
		}),
		[
			{ field: 'name', before: 'Sin valor', after: 'Ana' },
			{ field: 'phone', before: '1111', after: '2222' },
		],
	)
})

test('formats scalar and structured audit values safely', () => {
	assert.equal(auditValueText(null), 'Sin valor')
	assert.equal(auditValueText(''), 'Sin valor')
	assert.equal(auditValueText('[redacted]'), '[redacted]')
	assert.equal(auditValueText({ id: 1, label: 'Cliente' }), '{"id":1,"label":"Cliente"}')
})

test('builds stable audit log query strings from active filters', () => {
	assert.equal(
		auditLogQueryString({
			actor: 'empleado',
			module: 'customers',
			action: 'create',
			from: '2026-05-01',
			to: '2026-05-11',
			q: 'Ana',
		}),
		'?actor=empleado&module=customers&action=create&from=2026-05-01&to=2026-05-11&q=Ana',
	)
	assert.equal(auditLogQueryString({ actor: '', module: 'customers' }), '?module=customers')
})

test('treats missing audit endpoint as an empty optional history', async () => {
	const result = await auditLogListOrEmpty(
		async () => {
			const error = new Error('not found')
			error.status = 404
			throw error
		},
		{},
	)

	assert.deepEqual(result, [])
})

test('rethrows non-404 audit loading errors', async () => {
	await assert.rejects(
		() =>
			auditLogListOrEmpty(async () => {
				const error = new Error('server error')
				error.status = 500
				throw error
			}, {}),
		/server error/,
	)
})
