import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	whatsappEventForWorkOrderStatus,
	whatsappEventLabels,
} from './whatsapp-events'

test('whatsappEventLabels conserva los textos de los eventos proactivos', () => {
	assert.deepEqual(whatsappEventLabels, {
		reservation_confirmed: 'turno confirmado',
		work_ready: 'trabajo listo para entregar',
		work_delivered: 'trabajo entregado',
	})
})

test('whatsappEventForWorkOrderStatus conserva los eventos de orden notificables', () => {
	assert.equal(whatsappEventForWorkOrderStatus('ready'), 'work_ready')
	assert.equal(whatsappEventForWorkOrderStatus('delivered'), 'work_delivered')
})

test('whatsappEventForWorkOrderStatus ignora estados no notificables', () => {
	assert.equal(whatsappEventForWorkOrderStatus('in_progress'), null)
	assert.equal(whatsappEventForWorkOrderStatus(null), null)
	assert.equal(whatsappEventForWorkOrderStatus(undefined), null)
})
