import assert from 'node:assert/strict'
import { test } from 'vitest'

import {
	quoteFormWithAddedItem,
	quoteFormWithPatchedItem,
	quoteFormWithRemovedItem,
	reservationFormWithAddedItem,
	reservationFormWithPatchedItem,
	reservationFormWithRemovedItem,
} from './quote-reservation-line-items'

test('quote line item helpers preserve immutable patch, append and last-item fallback', () => {
	const form = {
		customer: '1',
		items: [{ service: '1', quantity: '1' }],
	}
	const blankItem = () => ({ service: '', quantity: '' })

	const patched = quoteFormWithPatchedItem(form, 0, { quantity: 0 })
	assert.deepEqual(patched, {
		customer: '1',
		items: [{ service: '1', quantity: 0 }],
	})
	assert.deepEqual(form, {
		customer: '1',
		items: [{ service: '1', quantity: '1' }],
	})
	assert.deepEqual(quoteFormWithAddedItem(form, blankItem).items, [
		{ service: '1', quantity: '1' },
		{ service: '', quantity: '' },
	])
	assert.deepEqual(quoteFormWithRemovedItem(form, 0, blankItem).items, [
		{ service: '', quantity: '' },
	])
	assert.deepEqual(
		quoteFormWithPatchedItem({ items: null }, 0, { service: '2' }).items,
		[{ service: '2' }],
	)
	assert.deepEqual(quoteFormWithAddedItem({}, blankItem).items, [
		{ service: '', quantity: '' },
	])
})

test('quote line item removal keeps remaining lines and falls back for empty inputs', () => {
	const blankItem = () => ({ service: '', quantity: '' })

	assert.deepEqual(
		quoteFormWithRemovedItem(
			{ items: [{ service: '1' }, { service: '2' }] },
			0,
			blankItem,
		).items,
		[{ service: '2' }],
	)
	assert.deepEqual(quoteFormWithRemovedItem({}, 0, blankItem).items, [
		{ service: '', quantity: '' },
	])
	assert.deepEqual(
		quoteFormWithRemovedItem(
			{ items: [{ service: '1' }] },
			7,
			blankItem,
		).items,
		[{ service: '1' }],
	)
})

test('reservation line item patch mirrors the first service without treating undefined as a change', () => {
	const form = {
		service: '1',
		items: [{ service: '1', quantity: '1' }, { service: '2' }],
	}

	assert.deepEqual(
		reservationFormWithPatchedItem(form, 0, { service: '3' }),
		{
			service: '3',
			items: [{ service: '3', quantity: '1' }, { service: '2' }],
		},
	)
	assert.equal(
		reservationFormWithPatchedItem(form, 0, { service: undefined }).service,
		'1',
	)
	assert.equal(
		reservationFormWithPatchedItem(form, 1, { service: '4' }).service,
		'1',
	)
})

test('reservation line item add and removal preserve its primary-service fallback', () => {
	const blankItem = () => ({ service: '', quantity: '' })
	const form = { service: '1', items: [{ service: '1' }] }

	assert.deepEqual(reservationFormWithAddedItem(form, blankItem).items, [
		{ service: '1' },
		{ service: '', quantity: '' },
	])
	assert.deepEqual(reservationFormWithAddedItem({}, blankItem).items, [
		{ service: '', quantity: '' },
	])
	assert.deepEqual(reservationFormWithRemovedItem(form, 0, blankItem), {
		service: '',
		items: [{ service: '', quantity: '' }],
	})
	assert.deepEqual(reservationFormWithRemovedItem({}, 0, () => ({})), {
		service: '',
		items: [{}],
	})
	assert.deepEqual(
		reservationFormWithRemovedItem(
			{ service: '1', items: [{ service: '1' }, { service: '2' }] },
			0,
			blankItem,
		),
		{
			service: '2',
			items: [{ service: '2' }],
		},
	)
})
