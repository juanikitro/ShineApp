import assert from 'node:assert/strict'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, test } from 'vitest'

import { CustomerVehiclesPanel } from './CustomerVehiclesPanel'

afterEach(cleanup)

test('CustomerVehiclesPanel preserves vehicle text and opens the complete record', () => {
	const row = {
		id: 7,
		license_plate: 'AA123BB',
		brand: 'Ford',
		model: 'Fiesta',
		color: 'Rojo',
	}
	const fullRecord = { ...row, notes: 'Registro completo' }
	const opened = [] as unknown[]
	render(
		<CustomerVehiclesPanel
			customerVehicles={[row]}
			allVehicles={[fullRecord]}
			onOpenVehicle={(vehicle) => opened.push(vehicle)}
		/>,
	)

	fireEvent.click(screen.getByRole('button', { name: /AA123BB/ }))

	assert.ok(screen.getByText('1 vehiculo vinculado'))
	assert.ok(screen.getByText('Ford - Fiesta - Rojo'))
	assert.deepEqual(opened, [fullRecord])
})

test('CustomerVehiclesPanel preserves the empty state', () => {
	render(
		<CustomerVehiclesPanel
			customerVehicles={[]}
			allVehicles={[]}
			onOpenVehicle={() => {}}
		/>,
	)

	assert.ok(screen.getByText('Este cliente todavia no tiene vehiculos.'))
})
