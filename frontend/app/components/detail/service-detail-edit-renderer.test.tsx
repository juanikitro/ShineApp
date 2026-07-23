import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, test, vi } from 'vitest'

const capturedProps = vi.hoisted(() => ({
	form: null as Record<string, any> | null,
	materialsEditor: null as Record<string, any> | null,
}))

vi.mock('./ServiceDetailEditForm', () => ({
	ServiceDetailEditForm: (props: Record<string, any>) => {
		capturedProps.form = props
		return (
			<>
				<span>Editor de servicio</span>
				{props.materialsEditor}
			</>
		)
	},
}))

vi.mock('@/app/components/forms/ServiceMaterialLinesEditor', () => ({
	ServiceMaterialLinesEditor: (props: Record<string, any>) => {
		capturedProps.materialsEditor = props
		return <span>Lineas de material</span>
	},
}))

import { renderServiceDetailEditor } from './service-detail-edit-renderer'

afterEach(cleanup)

test('service detail renderer preserves pricing, sector and material-line callbacks', () => {
	const data = { base_price: '100', price_auto: '100', price_moto: '' }
	const onPatch = vi.fn()
	const onAddMaterialLine = vi.fn()
	const onRemoveMaterialLine = vi.fn()
	const onUpdateMaterialLine = vi.fn()
	const renderActions = vi.fn(() => <button type="submit">Guardar</button>)
	const serviceMaterialLines = [{ material: '1', quantity: '2' }]
	const materials = [{ id: 1, name: 'Shampoo' }]
	const materialOptions = [{ value: '1', label: 'Shampoo' }]

	render(
		renderServiceDetailEditor({
			data,
			onSubmit: () => {},
			onPatch,
			sectorOptions: [{ value: '2', label: 'Detailing' }],
			sectors: [{ id: 2, key: 'detailing' }],
			serviceMaterialLines,
			materials,
			materialOptions,
			onAddMaterialLine,
			onRemoveMaterialLine,
			onUpdateMaterialLine,
			renderActions,
		}),
	)

	assert.ok(screen.getByText('Editor de servicio'))
	assert.ok(screen.getByText('Lineas de material'))
	assert.equal(renderActions.mock.calls.length, 1)
	assert.equal(capturedProps.materialsEditor?.lines, serviceMaterialLines)
	assert.equal(capturedProps.materialsEditor?.materials, materials)
	assert.equal(capturedProps.materialsEditor?.materialOptions, materialOptions)
	assert.equal(capturedProps.materialsEditor?.onAdd, onAddMaterialLine)
	assert.equal(capturedProps.materialsEditor?.onRemove, onRemoveMaterialLine)
	assert.equal(capturedProps.materialsEditor?.onUpdate, onUpdateMaterialLine)
	capturedProps.form?.onSectorChange('2')
	capturedProps.form?.onSectorChange('')
	capturedProps.form?.onBasePriceChange('250')

	assert.deepEqual(onPatch.mock.calls, [
		[{ sector: 2, service_type: 'detailing' }],
		[{ sector: null, service_type: 'wash' }],
		[
			{
				base_price: '250',
				price_auto: '250',
				price_moto: '250',
				price_camioneta: '250',
				price_combi: '250',
				price_camion: '250',
			},
		],
	])
})
