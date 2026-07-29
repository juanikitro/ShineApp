import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	fields: null as Record<string, any> | null,
}))

vi.mock('./MaterialConsumptionFields', () => ({
	MaterialConsumptionFields: (props: Record<string, any>) => {
		capturedProps.fields = props
		return (
			<>
				<span>Campos de consumo</span>
				<button type="button" onClick={props.onOpenMaterial}>
					Abrir material
				</button>
			</>
		)
	},
}))

import {
	createMaterialConsumptionFieldsRenderer,
	renderMaterialConsumptionFields,
} from './material-consumption-fields-renderer'

afterEach(cleanup)

test('material consumption fields renderer preserves flash targets and quick-material creation', () => {
	const flashClass = vi.fn((target: string | null) => `flash:${target}`)
	const fieldFlashKey = vi.fn((target: string) => `key:${target}`)
	const onOpenQuickCreate = vi.fn()
	const consumptionForm = { mode: 'direct', material: '' }
	const onChangeMode = vi.fn()

	render(
		renderMaterialConsumptionFields({
			consumptionForm,
			setConsumptionForm: () => {},
			showWorkOrder: false,
			workOrderOptions: [],
			materialOptions: [],
			openMaterialUnitOptions: [],
			selectedConsumptionMaterial: null,
			selectedOpenUnit: null,
			materials: [],
			onChangeMode,
			flashClass,
			fieldFlashKey,
			onOpenQuickCreate,
		}),
	)

	assert.ok(screen.getByText('Campos de consumo'))
	assert.equal(capturedProps.fields?.consumptionForm, consumptionForm)
	assert.equal(capturedProps.fields?.showWorkOrder, false)
	assert.equal(capturedProps.fields?.onChangeMode, onChangeMode)
	assert.equal(
		capturedProps.fields?.materialClassName,
		'flash:key:consumption.material',
	)
	assert.equal(
		capturedProps.fields?.openUnitClassName,
		'flash:key:consumption.open_unit',
	)
	assert.deepEqual(fieldFlashKey.mock.calls, [
		['consumption.material'],
		['consumption.open_unit'],
	])
	assert.deepEqual(flashClass.mock.calls, [
		['key:consumption.material'],
		['key:consumption.open_unit'],
	])

	fireEvent.click(screen.getByRole('button', { name: 'Abrir material' }))
	assert.deepEqual(onOpenQuickCreate.mock.calls, [
		['material', 'consumption.material'],
	])
})

test('createMaterialConsumptionFieldsRenderer keeps shared fields bound to the show-work-order callback', () => {
	const renderFields = createMaterialConsumptionFieldsRenderer({
		consumptionForm: { mode: 'direct' },
		setConsumptionForm: () => {},
		workOrderOptions: [],
		materialOptions: [],
		openMaterialUnitOptions: [],
		selectedConsumptionMaterial: null,
		selectedOpenUnit: null,
		materials: [],
		onChangeMode: () => {},
		flashClass: () => '',
		fieldFlashKey: (target: string) => target,
		onOpenQuickCreate: () => {},
	})

	render(renderFields(false))

	assert.equal(capturedProps.fields?.showWorkOrder, false)
})
