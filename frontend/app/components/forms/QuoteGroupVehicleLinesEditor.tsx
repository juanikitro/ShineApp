'use client'

import { type KeyboardEvent } from 'react'

import { Plus, Trash2 } from 'lucide-react'

import { Field } from '@/app/components/ui/Field'
import { NumericInput } from '@/app/components/ui/NumericInput'
import {
	SearchSelect,
	type SelectOption,
} from '@/app/components/ui/SearchSelect'
import { SegmentedControl } from '@/app/components/ui/SegmentedControl'
import { type AnyRecord, money } from '@/lib/page-support'
import {
	MAX_GROUP_VEHICLE_LINES,
	blankGroupVehicleItem,
	blankGroupVehicleLine,
	groupLineVehicleType,
	groupVehicleLineTotal,
	repriceGroupVehicleLine,
} from '@/lib/quote-groups'
import {
	VEHICLE_TYPE_OPTIONS,
	servicePriceForVehicleType,
} from '@/lib/service-pricing'

type VehicleMode = 'existing' | 'new'

type QuoteGroupVehicleLinesEditorProps = {
	lines: AnyRecord[]
	onChange: (lines: AnyRecord[]) => void
	vehicleOptions: SelectOption[]
	serviceOptions: SelectOption[]
	vehicles: AnyRecord[]
	services: AnyRecord[]
	canViewEconomy: boolean
	useReservationTimes: boolean
	showReservationFields?: boolean
	title?: string
	fieldPrefix: string
	openQuickCreate: (kind: string, target: string) => void
	serviceNotesForLine?: (item: AnyRecord) => string
	focusNextOnEnter?: (
		key: string,
		openCombo?: boolean,
	) => (event: KeyboardEvent<HTMLElement>) => void
	flashClass?: (key: string | null) => string
	fieldFlashKey?: (target: string) => string
	fieldErrors?: Record<string, string>
}

function normalizedLines(lines: AnyRecord[]) {
	return lines.length ? lines : [blankGroupVehicleLine()]
}

export function QuoteGroupVehicleLinesEditor({
	lines,
	onChange,
	vehicleOptions,
	serviceOptions,
	vehicles,
	services,
	canViewEconomy,
	useReservationTimes,
	showReservationFields = true,
	title = 'Autos del grupo',
	fieldPrefix,
	openQuickCreate,
	serviceNotesForLine,
	focusNextOnEnter,
	flashClass = () => '',
	fieldFlashKey = (target: string) => target,
	fieldErrors,
}: QuoteGroupVehicleLinesEditorProps) {
	const safeLines = normalizedLines(lines)
	const canAddVehicle = safeLines.length < MAX_GROUP_VEHICLE_LINES

	function updateLines(nextLines: AnyRecord[]) {
		onChange(normalizedLines(nextLines))
	}

	function updateLine(index: number, patch: AnyRecord) {
		updateLines(
			safeLines.map((line, lineIndex) =>
				lineIndex === index ? { ...line, ...patch } : line,
			),
		)
	}

	function updateLineWithRepricing(index: number, patch: AnyRecord) {
		updateLines(
			safeLines.map((line, lineIndex) => {
				if (lineIndex !== index) return line
				return repriceGroupVehicleLine(
					{ ...line, ...patch },
					vehicles,
					services,
				)
			}),
		)
	}

	function updateItem(lineIndex: number, itemIndex: number, patch: AnyRecord) {
		const line = safeLines[lineIndex] ?? blankGroupVehicleLine()
		const items = [...(line.items ?? [])]
		items[itemIndex] = { ...items[itemIndex], ...patch }
		updateLine(lineIndex, { items })
	}

	function selectService(lineIndex: number, itemIndex: number, serviceId: string) {
		const line = safeLines[lineIndex] ?? blankGroupVehicleLine()
		const service = services.find((item) => String(item.id) === serviceId)
		updateItem(lineIndex, itemIndex, {
			service: serviceId,
			unit_price: servicePriceForVehicleType(
				service,
				groupLineVehicleType(line, vehicles),
			),
		})
	}

	function addItem(lineIndex: number) {
		const line = safeLines[lineIndex] ?? blankGroupVehicleLine()
		updateLine(lineIndex, {
			items: [...(line.items ?? []), blankGroupVehicleItem()],
		})
	}

	function removeItem(lineIndex: number, itemIndex: number) {
		const line = safeLines[lineIndex] ?? blankGroupVehicleLine()
		const items = (line.items ?? []).filter(
			(_: AnyRecord, index: number) => index !== itemIndex,
		)
		updateLine(lineIndex, {
			items: items.length ? items : [blankGroupVehicleItem()],
		})
	}

	function addVehicleLine() {
		if (!canAddVehicle) return
		updateLines([...safeLines, blankGroupVehicleLine()])
	}

	function removeVehicleLine(index: number) {
		updateLines(
			safeLines.filter((_: AnyRecord, lineIndex: number) => lineIndex !== index),
		)
	}

	function setVehicleMode(index: number, mode: VehicleMode) {
		const nextLine =
			mode === 'new'
				? {
						...safeLines[index],
						use_new_vehicle: true,
						vehicle: '',
					}
				: {
						...safeLines[index],
						use_new_vehicle: false,
					}
		updateLineWithRepricing(index, nextLine)
	}

	return (
		<div className="quote-lines group-vehicle-lines">
			<div className="quote-lines-head group-vehicle-lines-head">
				<div>
					<h3>{title}</h3>
					<span>
						{safeLines.length}/{MAX_GROUP_VEHICLE_LINES} autos
					</span>
				</div>
				<button
					type="button"
					className="ghost"
					disabled={!canAddVehicle}
					onClick={addVehicleLine}
				>
					<Plus size={16} />
					Agregar auto
				</button>
			</div>
			{fieldErrors?.vehicle_lines ? (
				<div className="form-notice form-notice--warn">
					{fieldErrors.vehicle_lines}
				</div>
			) : null}
			{safeLines.map((line, lineIndex) => {
				const mode: VehicleMode = line.use_new_vehicle ? 'new' : 'existing'
				const lineItems = line.items?.length
					? line.items
					: [blankGroupVehicleItem()]
				const lineTotal = groupVehicleLineTotal(line)
				const linePrefix = `${fieldPrefix}.vehicle_lines.${lineIndex}`

				return (
					<div className="quote-line group-vehicle-line" key={lineIndex}>
						<div className="group-vehicle-line-head">
							<div>
								<strong>Auto {lineIndex + 1}</strong>
								<span>{money(lineTotal)}</span>
							</div>
							{safeLines.length > 1 ? (
								<button
									type="button"
									className="danger button-sm"
									onClick={() => removeVehicleLine(lineIndex)}
								>
									<Trash2 size={15} />
									Quitar
								</button>
							) : null}
						</div>
						<SegmentedControl<VehicleMode>
							ariaLabel={`Modo de carga del auto ${lineIndex + 1}`}
							options={[
								{ value: 'existing', label: 'Existente' },
								{ value: 'new', label: 'Nuevo' },
							]}
							value={mode}
							onChange={(value) => setVehicleMode(lineIndex, value)}
						/>
						{mode === 'existing' ? (
							<SearchSelect
								label="Vehiculo"
								value={String(line.vehicle ?? '')}
								options={vehicleOptions}
								placeholder="Seleccionar vehiculo"
								focusKey={`${linePrefix}.vehicle`}
								className={flashClass(
									fieldFlashKey(`${linePrefix}.vehicle`),
								)}
								onAdd={() =>
									openQuickCreate('vehicle', `${linePrefix}.vehicle`)
								}
								onChange={(value) =>
									updateLineWithRepricing(lineIndex, {
										vehicle: value,
									})
								}
							/>
						) : (
							<div className="form-row group-new-vehicle-fields">
								<Field label="Patente">
									<input
										value={line.new_vehicle?.license_plate ?? ''}
										onChange={(event) =>
											updateLine(lineIndex, {
												new_vehicle: {
													...(line.new_vehicle ?? {}),
													license_plate: event.target.value,
												},
											})
										}
									/>
								</Field>
								<Field label="Tipo">
									<select
										value={line.new_vehicle?.vehicle_type ?? 'auto'}
										onChange={(event) =>
											updateLineWithRepricing(lineIndex, {
												new_vehicle: {
													...(line.new_vehicle ?? {}),
													vehicle_type: event.target.value,
												},
											})
										}
									>
										{VEHICLE_TYPE_OPTIONS.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</Field>
								<Field label="Marca">
									<input
										value={line.new_vehicle?.brand ?? ''}
										onChange={(event) =>
											updateLine(lineIndex, {
												new_vehicle: {
													...(line.new_vehicle ?? {}),
													brand: event.target.value,
												},
											})
										}
									/>
								</Field>
								<Field label="Modelo">
									<input
										value={line.new_vehicle?.model ?? ''}
										onChange={(event) =>
											updateLine(lineIndex, {
												new_vehicle: {
													...(line.new_vehicle ?? {}),
													model: event.target.value,
												},
											})
										}
									/>
								</Field>
								<Field label="Color">
									<input
										value={line.new_vehicle?.color ?? ''}
										onChange={(event) =>
											updateLine(lineIndex, {
												new_vehicle: {
													...(line.new_vehicle ?? {}),
													color: event.target.value,
												},
											})
										}
									/>
								</Field>
							</div>
						)}
						{showReservationFields ? (
							<div className="form-row">
								<Field label="Fecha">
									<input
										type="date"
										value={line.reservation_day ?? ''}
										onChange={(event) =>
											updateLine(lineIndex, {
												reservation_day: event.target.value,
											})
										}
									/>
								</Field>
								<Field label="Egreso">
									<input
										type="date"
										min={line.reservation_day || undefined}
										value={line.reservation_exit_day ?? ''}
										onChange={(event) =>
											updateLine(lineIndex, {
												reservation_exit_day: event.target.value,
											})
										}
									/>
								</Field>
								{useReservationTimes ? (
									<>
										<Field label="Hora">
											<input
												type="time"
												value={line.reservation_start_time ?? ''}
												onChange={(event) =>
													updateLine(lineIndex, {
														reservation_start_time:
															event.target.value,
													})
												}
											/>
										</Field>
										<Field label="Salida">
											<input
												type="time"
												value={line.reservation_exit_time ?? ''}
												onChange={(event) =>
													updateLine(lineIndex, {
														reservation_exit_time:
															event.target.value,
													})
												}
											/>
										</Field>
									</>
								) : null}
							</div>
						) : null}
						<div className="group-service-lines">
							<div className="quote-lines-head">
								<h4>Servicios</h4>
								<button
									type="button"
									className="ghost"
									onClick={() => addItem(lineIndex)}
								>
									<Plus size={16} />
									Agregar servicio
								</button>
							</div>
							{lineItems.map((item: AnyRecord, itemIndex: number) => {
								const nextLine = lineItems[itemIndex + 1]
								const itemTotal =
									Number(item.quantity || 0) *
									Number(item.unit_price || 0)
								return (
									<div
										className="group-service-line"
										key={`${lineIndex}-${itemIndex}`}
									>
										<SearchSelect
											label="Servicio"
											value={String(item.service ?? '')}
											options={serviceOptions}
											focusKey={`${linePrefix}.service.${itemIndex}`}
											className={flashClass(
												fieldFlashKey(
													`${linePrefix}.service.${itemIndex}`,
												),
											)}
											onAdd={
												canViewEconomy
													? () =>
															openQuickCreate(
																'service',
																`${linePrefix}.service.${itemIndex}`,
															)
													: undefined
											}
											onChange={(value) =>
												selectService(lineIndex, itemIndex, value)
											}
										/>
										{serviceNotesForLine?.(item) ? (
											<div className="service-notes">
												{serviceNotesForLine(item)}
											</div>
										) : null}
										<div className="quote-line-grid">
											<Field label="Cantidad">
												<input
													type="number"
													min="1"
													value={item.quantity ?? '1'}
													onChange={(event) =>
														updateItem(lineIndex, itemIndex, {
															quantity: event.target.value,
														})
													}
													onKeyDown={focusNextOnEnter?.(
														`${linePrefix}.item.${itemIndex}.price`,
													)}
												/>
											</Field>
											<Field label="Precio">
												<NumericInput
													prefix="$"
													value={item.unit_price ?? ''}
													onChange={(raw) =>
														updateItem(lineIndex, itemIndex, {
															unit_price: raw,
														})
													}
													onKeyDown={focusNextOnEnter?.(
														nextLine
															? `${linePrefix}.service.${itemIndex + 1}`
															: `${linePrefix}.notes`,
														Boolean(nextLine),
													)}
												/>
											</Field>
											<div className="line-total">
												<span>Total</span>
												<strong>{money(itemTotal)}</strong>
											</div>
										</div>
										{lineItems.length > 1 ? (
											<button
												type="button"
												className="danger"
												onClick={() =>
													removeItem(lineIndex, itemIndex)
												}
											>
												Quitar servicio
											</button>
										) : null}
									</div>
								)
							})}
						</div>
						<Field label="Notas del auto">
							<textarea
								value={line.notes ?? ''}
								onChange={(event) =>
									updateLine(lineIndex, { notes: event.target.value })
								}
							/>
						</Field>
					</div>
				)
			})}
		</div>
	)
}
