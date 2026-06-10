'use client'

import {
	type ChangeEvent,
	type FormEvent,
	type RefObject,
	useEffect,
	useMemo,
	useState,
} from 'react'

import {
	ArrowLeft,
	CalendarDays,
	ChevronDown,
	FileText,
	KeyRound,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
} from 'lucide-react'

import changelogData from '@/app/data/changelog.generated.json'

import { BusinessSettingsPanel } from '@/app/components/settings/BusinessSettingsPanel'
import { TurneraSettingsPanel } from '@/app/components/settings/TurneraSettingsPanel'
import { AuditLogCard } from '@/app/components/ui/AuditLogCard'
import { Empty, LoadingState } from '@/app/components/ui/Empty'
import { Field } from '@/app/components/ui/Field'
import { MetricCard } from '@/app/components/ui/MetricCard'
import {
	RecordCard,
	RecordCardHeader,
} from '@/app/components/ui/RecordCard'
import {
	SegmentedControl,
	type SegmentedOption,
} from '@/app/components/ui/SegmentedControl'
import {
	DataList,
	formatDateTimeLabel,
	type AnyRecord,
} from '@/lib/page-support'
import {
	type AuditLogFilters,
} from '@/lib/audit-log'

export type SettingsSection =
	| 'business'
	| 'turnera'
	| 'quotes'
	| 'cash'
	| 'agenda'
	| 'users'
	| 'history'
	| 'novedades'

type CashClassificationPair = AnyRecord & {
	movement_type: string
	category: string
	subcategory: string
}

type SettingsWorkspaceProps = {
	settingsSectionOptions: ReadonlyArray<SegmentedOption<SettingsSection>>
	settingsSection: SettingsSection
	settingsSectionLabel: string
	businessForm: AnyRecord
	businessLogoFile: File | null
	businessLogoInputKey: number
	businessLogoInputRef: RefObject<HTMLInputElement | null>
	businessLogoIsPdf: boolean
	businessLogoPdfStatus: string
	businessLogoPreview: string | null
	businessProfile?: AnyRecord | null
	businessSlug: string
	safeBusinessLogoPdfThumbnail: string | null
	safeBusinessLogoPreview: string | null
	cashClassificationPairs: CashClassificationPair[]
	expenseClassificationPairs: AnyRecord[]
	incomeClassificationPairs: AnyRecord[]
	sectors: AnyRecord[]
	services: AnyRecord[]
	useReservationTimes: boolean
	showStayDaysInAgenda: boolean
	reservationUsePending: boolean
	reservationUseInProgress: boolean
	reservationUseReady: boolean
	reservationUseCanceled: boolean
	employees: AnyRecord[]
	selectedEmployee: AnyRecord | null
	employeeAuditLogs: AnyRecord[]
	employeeAuditLogsLoading: boolean
	employeeAuditLogsError: string | null
	activeEmployeeCount: number
	inactiveEmployeeCount: number
	auditFilters: AuditLogFilters
	auditLogs: AnyRecord[]
	auditActorOptions: string[]
	auditActionOptions: string[]
	auditModuleOptions: string[]
	auditFiltersActive: boolean
	expandedAuditLogId: string | null
	currentUserId?: number | string | null
	loading: boolean
	onSettingsSectionChange: (section: SettingsSection) => void
	onBusinessLogoChange: (event: ChangeEvent<HTMLInputElement>) => void
	onOpenBusinessLogoPicker: () => void
	onPatchBusinessForm: (patch: AnyRecord) => void
	onSaveBusinessProfile: (event: FormEvent) => void
	onOpenExpenseClassificationForm: () => void
	onEditExpenseClassification: (item: CashClassificationPair) => void
	onDeleteExpenseClassification: (
		movementType: string,
		category: string,
		subcategory: string,
	) => void
	onOpenEmployeeForm: () => void
	onCreateSector: (data: AnyRecord) => void
	onSaveSector: (id: number, patch: AnyRecord) => void
	onSelectEmployee: (employee: AnyRecord) => void
	onDeselectEmployee: () => void
	onChangeEmployeePassword: (pk: number | string, newPassword: string) => void
	onToggleEmployeeActive: (pk: number | string, isActive: boolean) => void
	onRefreshData: () => void
	onRefreshAuditLogs: () => void
	onApplyAuditFilters: (event: FormEvent) => void
	onUpdateAuditFilter: (key: keyof AuditLogFilters, value: string) => void
	onClearAuditFilters: () => void
	onToggleAuditLog: (id: string | null) => void
	onAuditActionLabel: (action: string) => string
	onAuditModuleLabel: (module: string) => string
}

export function SettingsWorkspace({
	settingsSectionOptions,
	settingsSection,
	settingsSectionLabel,
	businessForm,
	businessLogoFile,
	businessLogoInputKey,
	businessLogoInputRef,
	businessLogoIsPdf,
	businessLogoPdfStatus,
	businessLogoPreview,
	businessProfile,
	businessSlug,
	safeBusinessLogoPdfThumbnail,
	safeBusinessLogoPreview,
	cashClassificationPairs,
	expenseClassificationPairs,
	incomeClassificationPairs,
	sectors,
	services,
	useReservationTimes,
	showStayDaysInAgenda,
	reservationUsePending,
	reservationUseInProgress,
	reservationUseReady,
	reservationUseCanceled,
	employees,
	selectedEmployee,
	employeeAuditLogs,
	employeeAuditLogsLoading,
	employeeAuditLogsError,
	activeEmployeeCount,
	inactiveEmployeeCount,
	auditFilters,
	auditLogs,
	auditActorOptions,
	auditActionOptions,
	auditModuleOptions,
	auditFiltersActive,
	expandedAuditLogId,
	currentUserId,
	loading,
	onSettingsSectionChange,
	onBusinessLogoChange,
	onOpenBusinessLogoPicker,
	onPatchBusinessForm,
	onSaveBusinessProfile,
	onOpenExpenseClassificationForm,
	onEditExpenseClassification,
	onDeleteExpenseClassification,
	onOpenEmployeeForm,
	onCreateSector,
	onSaveSector,
	onSelectEmployee,
	onDeselectEmployee,
	onChangeEmployeePassword,
	onToggleEmployeeActive,
	onRefreshData,
	onRefreshAuditLogs,
	onApplyAuditFilters,
	onUpdateAuditFilter,
	onClearAuditFilters,
	onToggleAuditLog,
	onAuditActionLabel,
	onAuditModuleLabel,
}: SettingsWorkspaceProps) {
	return (
		<div className="settings-workspace">
			<SegmentedControl
				ariaLabel="Secciones de configuracion"
				className="settings-section-toggle"
				options={settingsSectionOptions}
				selectionMode="tabs"
				value={settingsSection}
				onChange={onSettingsSectionChange}
			/>
			<div
				className="grid settings-grid"
				role="tabpanel"
				aria-label={`Panel de configuracion: ${settingsSectionLabel}`}
			>
				{settingsSection === 'business' ? (
					<BusinessSettingsPanel
						businessForm={businessForm}
						businessLogoFile={businessLogoFile}
						businessLogoInputKey={businessLogoInputKey}
						businessLogoInputRef={businessLogoInputRef}
						businessLogoIsPdf={businessLogoIsPdf}
						businessLogoPdfStatus={businessLogoPdfStatus}
						businessLogoPreview={businessLogoPreview}
						businessProfile={businessProfile}
						safeBusinessLogoPdfThumbnail={safeBusinessLogoPdfThumbnail}
						safeBusinessLogoPreview={safeBusinessLogoPreview}
						onBusinessLogoChange={onBusinessLogoChange}
						onOpenBusinessLogoPicker={onOpenBusinessLogoPicker}
						onPatchBusinessForm={onPatchBusinessForm}
						onSaveBusinessProfile={onSaveBusinessProfile}
					/>
				) : null}
				{settingsSection === 'turnera' ? (
					<TurneraSettingsPanel
						businessForm={businessForm}
						businessSlug={businessSlug}
						services={services}
						sectors={sectors}
						onPatchBusinessForm={onPatchBusinessForm}
						onSaveBusinessProfile={onSaveBusinessProfile}
					/>
				) : null}
				{settingsSection === 'quotes' ? (
					<QuotesSettingsPanel
						businessForm={businessForm}
						onPatchBusinessForm={onPatchBusinessForm}
						onSaveBusinessProfile={onSaveBusinessProfile}
					/>
				) : null}
				{settingsSection === 'cash' ? (
					<CashSettingsPanel
						cashClassificationPairs={cashClassificationPairs}
						expenseClassificationPairs={expenseClassificationPairs}
						incomeClassificationPairs={incomeClassificationPairs}
						onDeleteExpenseClassification={onDeleteExpenseClassification}
						onEditExpenseClassification={onEditExpenseClassification}
						onOpenExpenseClassificationForm={onOpenExpenseClassificationForm}
					/>
				) : null}
				{settingsSection === 'agenda' ? (
					<>
						<AgendaSettingsPanel
							reservationUsePending={reservationUsePending}
							reservationUseInProgress={reservationUseInProgress}
							reservationUseReady={reservationUseReady}
							reservationUseCanceled={reservationUseCanceled}
							showStayDaysInAgenda={showStayDaysInAgenda}
							useReservationTimes={useReservationTimes}
							onPatchBusinessForm={onPatchBusinessForm}
							onSaveBusinessProfile={onSaveBusinessProfile}
						/>
						<SectorsSettingsPanel
							businessForm={businessForm}
							sectors={sectors}
							onPatchBusinessForm={onPatchBusinessForm}
							onSaveBusinessProfile={onSaveBusinessProfile}
							onCreateSector={onCreateSector}
							onSaveSector={onSaveSector}
						/>
					</>
				) : null}
				{settingsSection === 'users' ? (
					<UsersSettingsPanel
						activeEmployeeCount={activeEmployeeCount}
						currentUserId={currentUserId}
						employees={employees}
						employeeAuditLogs={employeeAuditLogs}
						employeeAuditLogsError={employeeAuditLogsError}
						employeeAuditLogsLoading={employeeAuditLogsLoading}
						inactiveEmployeeCount={inactiveEmployeeCount}
						selectedEmployee={selectedEmployee}
						onChangeEmployeePassword={onChangeEmployeePassword}
						onDeselectEmployee={onDeselectEmployee}
						onOpenEmployeeForm={onOpenEmployeeForm}
						onRefreshData={onRefreshData}
						onSelectEmployee={onSelectEmployee}
						onToggleEmployeeActive={onToggleEmployeeActive}
						onAuditActionLabel={onAuditActionLabel}
						onAuditModuleLabel={onAuditModuleLabel}
					/>
				) : null}
				{settingsSection === 'history' ? (
					<HistorySettingsPanel
						auditActionOptions={auditActionOptions}
						auditActorOptions={auditActorOptions}
						auditFilters={auditFilters}
						auditFiltersActive={auditFiltersActive}
						auditLogs={auditLogs}
						auditModuleOptions={auditModuleOptions}
						currentUserId={currentUserId}
						expandedAuditLogId={expandedAuditLogId}
						loading={loading}
						onApplyAuditFilters={onApplyAuditFilters}
						onAuditActionLabel={onAuditActionLabel}
						onAuditModuleLabel={onAuditModuleLabel}
						onClearAuditFilters={onClearAuditFilters}
						onRefreshAuditLogs={onRefreshAuditLogs}
						onToggleAuditLog={onToggleAuditLog}
						onUpdateAuditFilter={onUpdateAuditFilter}
					/>
				) : null}
				{settingsSection === 'novedades' ? <NewsSettingsPanel /> : null}
			</div>
		</div>
	)
}

function QuotesSettingsPanel({
	businessForm,
	onPatchBusinessForm,
	onSaveBusinessProfile,
}: {
	businessForm: AnyRecord
	onPatchBusinessForm: (patch: AnyRecord) => void
	onSaveBusinessProfile: (event: FormEvent) => void
}) {
	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Venta y documentos</span>
					<h2>Cotizaciones</h2>
					<p>
						Define los valores comerciales que se cargan por defecto en nuevas
						cotizaciones y sus PDF.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-primary-actions">
						<button
							type="submit"
							className="primary"
							form="settings-quotes-form"
						>
							<FileText size={16} />
							Guardar defaults
						</button>
					</div>
				</div>
			</div>
			<form
				className="form-grid"
				id="settings-quotes-form"
				onSubmit={onSaveBusinessProfile}
			>
				<div className="form-row">
					<Field label="Validez dias">
						<input
							type="number"
							min="0"
							value={businessForm.default_quote_validity_days}
							onChange={(event) =>
								onPatchBusinessForm({
									default_quote_validity_days: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="Descuento % default">
						<input
							type="number"
							min="0"
							max="100"
							step="0.01"
							value={businessForm.default_quote_discount_rate}
							onChange={(event) =>
								onPatchBusinessForm({
									default_quote_discount_rate: event.target.value,
								})
							}
						/>
					</Field>
					<Field label="IVA % default">
						<input
							type="number"
							min="0"
							max="100"
							step="0.01"
							value={businessForm.default_quote_tax_rate}
							onChange={(event) =>
								onPatchBusinessForm({
									default_quote_tax_rate: event.target.value,
								})
							}
						/>
					</Field>
				</div>
				<Field label="Terminos default">
					<textarea
						value={businessForm.default_quote_terms}
						onChange={(event) =>
							onPatchBusinessForm({
								default_quote_terms: event.target.value,
							})
						}
					/>
				</Field>
				<Field label="Instrucciones de pago default">
					<textarea
						value={businessForm.default_quote_payment_instructions}
						onChange={(event) =>
							onPatchBusinessForm({
								default_quote_payment_instructions: event.target.value,
							})
						}
					/>
				</Field>
			</form>
		</section>
	)
}

function CashSettingsPanel({
	cashClassificationPairs,
	expenseClassificationPairs,
	incomeClassificationPairs,
	onDeleteExpenseClassification,
	onEditExpenseClassification,
	onOpenExpenseClassificationForm,
}: {
	cashClassificationPairs: CashClassificationPair[]
	expenseClassificationPairs: AnyRecord[]
	incomeClassificationPairs: AnyRecord[]
	onDeleteExpenseClassification: (
		movementType: string,
		category: string,
		subcategory: string,
	) => void
	onEditExpenseClassification: (item: CashClassificationPair) => void
	onOpenExpenseClassificationForm: () => void
}) {
	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Caja y resultado</span>
					<h2>Categorias de caja</h2>
					<p>
						Define las categorias y subcategorias que Caja sugiere para{' '}
						<span className="cash-term income">ingresos</span>,{' '}
						<span className="cash-term expense">egresos</span>, deudas y
						movimientos automaticos.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-primary-actions">
						<button
							type="button"
							className="primary"
							onClick={onOpenExpenseClassificationForm}
						>
							<Plus size={16} />
							Nueva clasificacion
						</button>
					</div>
				</div>
			</div>
			<section className="settings-operational-metrics section-block-end">
				<MetricCard
					label="Ingresos configurados"
					value={incomeClassificationPairs.length}
				/>
				<MetricCard
					label="Egresos configurados"
					value={expenseClassificationPairs.length}
				/>
				<MetricCard
					label="Total de sugerencias"
					value={cashClassificationPairs.length}
				/>
			</section>
			<div className="records compact-records settings-classification-list">
				{cashClassificationPairs.length ? (
					cashClassificationPairs.map((item) => (
						<RecordCard
							className="settings-classification-card"
							key={`${item.movement_type}-${item.category}-${item.subcategory}`}
						>
							<RecordCardHeader
								title={item.subcategory}
								subtitle={
									<>
										<span className={`cash-term ${item.movement_type}`}>
											{item.movement_type === 'income' ? 'Ingreso' : 'Egreso'}
										</span>{' '}
										- {item.category}
									</>
								}
								actions={
									<>
										<button
											type="button"
											className="ghost"
											onClick={() => onEditExpenseClassification(item)}
											aria-label={`Editar ${item.subcategory} de ${item.category}`}
										>
											<Pencil size={16} />
										</button>
										<button
											type="button"
											className="danger"
											onClick={() =>
												onDeleteExpenseClassification(
													item.movement_type,
													item.category,
													item.subcategory,
												)
											}
											aria-label={`Eliminar ${item.subcategory} de ${item.category}`}
										>
											<Trash2 size={16} />
										</button>
									</>
								}
							/>
						</RecordCard>
					))
				) : (
					<Empty
						text="Sin clasificaciones configuradas."
						hint="Carga categorias de ingreso y egreso para que Caja sugiera valores consistentes."
						action={
							<button
								type="button"
								className="primary"
								onClick={onOpenExpenseClassificationForm}
							>
								<Plus size={16} />
								Nueva clasificacion
							</button>
						}
					/>
				)}
			</div>
		</section>
	)
}

function AgendaSettingsPanel({
	reservationUsePending,
	reservationUseInProgress,
	reservationUseReady,
	reservationUseCanceled,
	showStayDaysInAgenda,
	useReservationTimes,
	onPatchBusinessForm,
	onSaveBusinessProfile,
}: {
	reservationUsePending: boolean
	reservationUseInProgress: boolean
	reservationUseReady: boolean
	reservationUseCanceled: boolean
	showStayDaysInAgenda: boolean
	useReservationTimes: boolean
	onPatchBusinessForm: (patch: AnyRecord) => void
	onSaveBusinessProfile: (event: FormEvent) => void
}) {
	const activeFlowLabels: string[] = []
	if (reservationUsePending) activeFlowLabels.push('Pendiente')
	activeFlowLabels.push('Confirmada')
	if (reservationUseInProgress) activeFlowLabels.push('En proceso')
	if (reservationUseReady) activeFlowLabels.push('Listo')
	activeFlowLabels.push('Entregada')
	const activeFlowSummary = activeFlowLabels.join(' → ')
	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Operacion diaria</span>
					<h2>Agenda y reservas</h2>
					<p>
						Define si la operacion usa horarios y como se ve la permanencia de
						reservas multidia.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-primary-actions">
						<button
							type="submit"
							className="primary"
							form="settings-agenda-form"
						>
							<CalendarDays size={16} />
							Guardar agenda
						</button>
					</div>
				</div>
			</div>
			<form
				className="form-grid"
				id="settings-agenda-form"
				onSubmit={onSaveBusinessProfile}
			>
				<div className="records compact-records">
					<RecordCard>
						<RecordCardHeader
							title="Usar horas de ingreso y egreso"
							subtitle="Muestra los campos de hora en reservas y los horarios en agenda, cotizaciones y listados."
							actions={
								<SegmentedControl
									ariaLabel="Usar horas de ingreso y egreso"
									className="settings-mode-toggle"
									options={[
										{ value: 'show', label: 'Mostrar' },
										{ value: 'hide', label: 'Ocultar' },
									]}
									value={useReservationTimes ? 'show' : 'hide'}
									onChange={(nextValue) =>
										onPatchBusinessForm({
											use_reservation_times: nextValue === 'show',
										})
									}
								/>
							}
						/>
					</RecordCard>
					<RecordCard>
						<RecordCardHeader
							title="Mostrar permanencia en todos los dias"
							subtitle="Si se desactiva, una reserva que dura varios dias se muestra solo en su fecha de ingreso."
							actions={
								<SegmentedControl
									ariaLabel="Mostrar permanencia en todos los dias"
									className="settings-mode-toggle"
									options={[
										{ value: 'stay', label: 'Permanencia' },
										{ value: 'entry', label: 'Ingreso' },
									]}
									value={showStayDaysInAgenda ? 'stay' : 'entry'}
									onChange={(nextValue) =>
										onPatchBusinessForm({
											show_stay_days_in_agenda: nextValue === 'stay',
										})
									}
								/>
							}
						/>
					</RecordCard>
					<RecordCard>
						<RecordCardHeader
							title="Estado Pendiente"
							subtitle="Si lo ocultas, las reservas nuevas se crean directamente como Confirmada."
							actions={
								<SegmentedControl
									ariaLabel="Estado Pendiente"
									className="settings-mode-toggle"
									options={[
										{ value: 'use', label: 'Usar' },
										{ value: 'skip', label: 'Saltar' },
									]}
									value={reservationUsePending ? 'use' : 'skip'}
									onChange={(nextValue) =>
										onPatchBusinessForm({
											reservation_use_pending: nextValue === 'use',
										})
									}
								/>
							}
						/>
					</RecordCard>
					<RecordCard>
						<RecordCardHeader
							title="Estado En proceso"
							subtitle="Si lo ocultas, una reserva Confirmada salta directamente al siguiente paso activo."
							actions={
								<SegmentedControl
									ariaLabel="Estado En proceso"
									className="settings-mode-toggle"
									options={[
										{ value: 'use', label: 'Usar' },
										{ value: 'skip', label: 'Saltar' },
									]}
									value={reservationUseInProgress ? 'use' : 'skip'}
									onChange={(nextValue) =>
										onPatchBusinessForm({
											reservation_use_in_progress: nextValue === 'use',
										})
									}
								/>
							}
						/>
					</RecordCard>
					<RecordCard>
						<RecordCardHeader
							title="Estado Listo"
							subtitle="Si lo ocultas, no hay paso intermedio entre el trabajo terminado y la entrega."
							actions={
								<SegmentedControl
									ariaLabel="Estado Listo"
									className="settings-mode-toggle"
									options={[
										{ value: 'use', label: 'Usar' },
										{ value: 'skip', label: 'Saltar' },
									]}
									value={reservationUseReady ? 'use' : 'skip'}
									onChange={(nextValue) =>
										onPatchBusinessForm({
											reservation_use_ready: nextValue === 'use',
										})
									}
								/>
							}
						/>
					</RecordCard>
					<RecordCard>
						<RecordCardHeader
							title="Estado Cancelada"
							subtitle="Si lo ocultas, la accion Cancelar elimina la reserva directamente."
							actions={
								<SegmentedControl
									ariaLabel="Estado Cancelada"
									className="settings-mode-toggle"
									options={[
										{ value: 'use', label: 'Usar' },
										{ value: 'skip', label: 'Saltar' },
									]}
									value={reservationUseCanceled ? 'use' : 'skip'}
									onChange={(nextValue) =>
										onPatchBusinessForm({
											reservation_use_canceled: nextValue === 'use',
										})
									}
								/>
							}
						/>
					</RecordCard>
				</div>
				<div className="record-sub">
					Si ocultas las horas, los datos historicos se conservan pero dejan de
					mostrarse y las nuevas reservas se guardan sin horario.
				</div>
				<div className="record-sub">
					Flujo de reserva activo: {activeFlowSummary}. Al guardar, las reservas
					existentes en estados que ocultes se moveran automaticamente al
					siguiente activo (o se eliminaran si ocultas Cancelada).
				</div>
			</form>
		</section>
	)
}

function SectorRow({
	sector,
	enforceCapacity,
	onSave,
}: {
	sector: AnyRecord
	enforceCapacity: boolean
	onSave: (patch: AnyRecord) => void
}) {
	const isActive = sector.is_active !== false
	const [name, setName] = useState(String(sector.name ?? ''))
	const [capacity, setCapacity] = useState(String(sector.default_capacity ?? ''))
	const [color, setColor] = useState(String(sector.color ?? ''))

	useEffect(() => {
		setName(String(sector.name ?? ''))
		setCapacity(String(sector.default_capacity ?? ''))
		setColor(String(sector.color ?? ''))
	}, [sector.id, sector.name, sector.default_capacity, sector.color])

	return (
		<RecordCard>
			<form
				className="sector-row"
				onSubmit={(e) => {
					e.preventDefault()
					onSave({
						name: name.trim() || String(sector.name ?? ''),
						default_capacity:
							capacity === '' ? null : Number(capacity) || 0,
						color: color.trim(),
					})
				}}
			>
				<div className="form-row">
					<Field label="Nombre">
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</Field>
					<Field label="Cupo diario">
						<input
							type="number"
							min="0"
							placeholder="0"
							disabled={!enforceCapacity}
							value={capacity}
							onChange={(e) => setCapacity(e.target.value)}
						/>
					</Field>
					<Field label="Color">
						<input
							type="color"
							value={color || '#888888'}
							onChange={(e) => setColor(e.target.value)}
						/>
					</Field>
				</div>
				<div className="sector-row-actions">
					<button type="submit" className="ghost">
						<Pencil size={14} />
						Guardar
					</button>
					<button
						type="button"
						className="ghost"
						onClick={() => onSave({ is_active: !isActive })}
					>
						{isActive ? (
							<>
								<Trash2 size={14} />
								Desactivar
							</>
						) : (
							<>
								<Eye size={14} />
								Activar
							</>
						)}
					</button>
				</div>
			</form>
		</RecordCard>
	)
}

function SectorsSettingsPanel({
	businessForm,
	sectors,
	onPatchBusinessForm,
	onSaveBusinessProfile,
	onCreateSector,
	onSaveSector,
}: {
	businessForm: AnyRecord
	sectors: AnyRecord[]
	onPatchBusinessForm: (patch: AnyRecord) => void
	onSaveBusinessProfile: (event: FormEvent) => void
	onCreateSector: (data: AnyRecord) => void
	onSaveSector: (id: number, patch: AnyRecord) => void
}) {
	const [newName, setNewName] = useState('')
	const enforceCapacity = businessForm.enforce_capacity_limit !== false

	const sortedSectors = useMemo(
		() =>
			[...sectors].sort(
				(a, b) =>
					Number(a.order ?? 0) - Number(b.order ?? 0) ||
					String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es'),
			),
		[sectors],
	)

	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Operacion diaria</span>
					<h2>Sectores y cupos</h2>
					<p>
						Gestioná los sectores del negocio y sus cupos diarios de turnos.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-primary-actions">
						<button
							type="submit"
							className="primary"
							form="settings-capacity-form"
						>
							<CalendarDays size={16} />
							Guardar limite
						</button>
					</div>
				</div>
			</div>
			<form
				className="form-grid"
				id="settings-capacity-form"
				onSubmit={onSaveBusinessProfile}
			>
				<div className="records compact-records">
					<RecordCard>
						<RecordCardHeader
							title="Aplicar limite de cupos"
							subtitle="Si lo desactivas, la agenda y la turnera aceptan turnos sin tope."
							actions={
								<SegmentedControl
									ariaLabel="Aplicar limite de cupos"
									className="settings-mode-toggle"
									options={[
										{ value: 'apply', label: 'Aplicar' },
										{ value: 'skip', label: 'No aplicar' },
									]}
									value={enforceCapacity ? 'apply' : 'skip'}
									onChange={(nextValue) =>
										onPatchBusinessForm({
											enforce_capacity_limit: nextValue === 'apply',
										})
									}
								/>
							}
						/>
					</RecordCard>
				</div>
			</form>
			<div className="records">
				{sortedSectors.map((sector) => (
					<SectorRow
						key={sector.id}
						sector={sector}
						enforceCapacity={enforceCapacity}
						onSave={(patch) => onSaveSector(Number(sector.id), patch)}
					/>
				))}
			</div>
			<form
				className="form-grid"
				onSubmit={(e) => {
					e.preventDefault()
					if (newName.trim()) {
						onCreateSector({ name: newName.trim() })
						setNewName('')
					}
				}}
			>
				<div className="form-row">
					<Field label="Nombre del nuevo sector">
						<input
							value={newName}
							placeholder="Ej: Gomeria, Taller, ..."
							onChange={(e) => setNewName(e.target.value)}
						/>
					</Field>
				</div>
				<button type="submit" className="primary">
					<Plus size={16} />
					Agregar sector
				</button>
			</form>
		</section>
	)
}

function UsersSettingsPanel({
	activeEmployeeCount,
	currentUserId,
	employees,
	employeeAuditLogs,
	employeeAuditLogsError,
	employeeAuditLogsLoading,
	inactiveEmployeeCount,
	selectedEmployee,
	onChangeEmployeePassword,
	onDeselectEmployee,
	onOpenEmployeeForm,
	onRefreshData,
	onSelectEmployee,
	onToggleEmployeeActive,
	onAuditActionLabel,
	onAuditModuleLabel,
}: {
	activeEmployeeCount: number
	currentUserId?: number | string | null
	employees: AnyRecord[]
	employeeAuditLogs: AnyRecord[]
	employeeAuditLogsError: string | null
	employeeAuditLogsLoading: boolean
	inactiveEmployeeCount: number
	selectedEmployee: AnyRecord | null
	onChangeEmployeePassword: (pk: number | string, newPassword: string) => void
	onDeselectEmployee: () => void
	onOpenEmployeeForm: () => void
	onRefreshData: () => void
	onSelectEmployee: (employee: AnyRecord) => void
	onToggleEmployeeActive: (pk: number | string, isActive: boolean) => void
	onAuditActionLabel: (action: string) => string
	onAuditModuleLabel: (module: string) => string
}) {
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [passwordError, setPasswordError] = useState<string | null>(null)
	const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null)

	function handlePasswordSubmit(event: FormEvent) {
		event.preventDefault()
		if (newPassword !== confirmPassword) {
			setPasswordError('Las contraseñas no coinciden')
			return
		}
		setPasswordError(null)
		onChangeEmployeePassword(selectedEmployee!.id, newPassword)
		setNewPassword('')
		setConfirmPassword('')
	}

	if (selectedEmployee) {
		return (
			<section className="panel">
				<div className="panel-head">
					<div>
						<span className="panel-kicker">Equipo y permisos</span>
						<h2>{selectedEmployee.username}</h2>
						<p>
							{selectedEmployee.email || 'Sin email'} -{' '}
							{selectedEmployee.is_active ? 'Activo' : 'Inactivo'}
						</p>
					</div>
					<div className="settings-action-rail">
						<div className="settings-primary-actions">
							<button
								type="button"
								className={selectedEmployee.is_active ? 'danger' : 'primary'}
								onClick={() =>
									onToggleEmployeeActive(
										selectedEmployee.id,
										selectedEmployee.is_active,
									)
								}
							>
								{selectedEmployee.is_active ? 'Desactivar' : 'Activar'}
							</button>
						</div>
						<div className="settings-secondary-actions">
							<button type="button" className="ghost" onClick={onDeselectEmployee}>
								<ArrowLeft size={16} />
								Volver
							</button>
						</div>
					</div>
				</div>

				<section className="employee-detail-section">
					<h3 className="employee-detail-heading">Cambiar contraseña</h3>
					<form className="form-grid" onSubmit={handlePasswordSubmit}>
						<div className="form-row">
							<Field label="Nueva contraseña">
								<input
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									required
									minLength={8}
								/>
							</Field>
							<Field label="Confirmar contraseña">
								<input
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									minLength={8}
								/>
							</Field>
						</div>
						{passwordError ? (
							<p className="employee-password-error">{passwordError}</p>
						) : null}
						<div className="record-actions">
							<button type="submit" className="primary">
								<Pencil size={16} />
								Actualizar contraseña
							</button>
						</div>
					</form>
				</section>

				<section className="employee-detail-section">
					<h3 className="employee-detail-heading">Historial de acciones</h3>
					{employeeAuditLogsLoading ? (
						<LoadingState
							text="Cargando historial..."
							hint="Trayendo los eventos registrados para este empleado."
						/>
					) : employeeAuditLogsError ? (
						<div className="record-sub employee-audit-error">
							{employeeAuditLogsError}
						</div>
					) : employeeAuditLogs.length ? (
						<div className="records audit-log-list">
							{employeeAuditLogs.map((item) => (
								<AuditLogCard
									key={item.id}
									item={item}
									expanded={expandedAuditId === String(item.id)}
									currentUserId={currentUserId}
									onToggle={setExpandedAuditId}
									onAuditActionLabel={onAuditActionLabel}
									onAuditModuleLabel={onAuditModuleLabel}
								/>
							))}
						</div>
					) : (
						<Empty
							text="Sin acciones registradas para este empleado."
							hint="Las acciones del empleado apareceran aqui cuando se registren."
						/>
					)}
				</section>
			</section>
		)
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Equipo y permisos</span>
					<h2>Empleados</h2>
					<p>
						Usuarios operativos que acceden al CRM con permisos de empleado.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-primary-actions">
						<button type="button" className="primary" onClick={onOpenEmployeeForm}>
							<Plus size={16} />
							Nuevo empleado
						</button>
					</div>
					<div className="settings-secondary-actions">
						<button type="button" className="ghost" onClick={onRefreshData}>
							<RefreshCw size={16} />
							Actualizar
						</button>
					</div>
				</div>
			</div>
			<section className="settings-operational-metrics section-block-end">
				<MetricCard label="Empleados" value={employees.length} />
				<MetricCard label="Activos" value={activeEmployeeCount} />
				<MetricCard label="Inactivos" value={inactiveEmployeeCount} />
			</section>
			<div className="records">
				{employees.length ? (
					employees.map((item) => (
						<RecordCard key={item.id}>
							<RecordCardHeader
								title={item.username}
								subtitle={`${item.email || 'Sin email'} - ${
									item.is_active ? 'Activo' : 'Inactivo'
								}`}
								actions={
									<button
										type="button"
										className="ghost"
										onClick={() => onSelectEmployee(item)}
									aria-label={`Ver detalle de ${item.username}`}
								>
									<Pencil size={16} />
									Editar
								</button>
								}
							>
								<div className="record-sub">
									Rol empleado - Alta {formatDateTimeLabel(item.date_joined)}
								</div>
							</RecordCardHeader>
						</RecordCard>
					))
				) : (
					<Empty
						text="Sin empleados creados."
						hint="Agrega empleados cuando necesites separar accesos de operacion."
						action={
							<button
								type="button"
								className="primary"
								onClick={onOpenEmployeeForm}
							>
								<Plus size={16} />
								Nuevo empleado
							</button>
						}
					/>
				)}
			</div>
		</section>
	)
}

function HistorySettingsPanel({
	auditActionOptions,
	auditActorOptions,
	auditFilters,
	auditFiltersActive,
	auditLogs,
	auditModuleOptions,
	currentUserId,
	expandedAuditLogId,
	loading,
	onApplyAuditFilters,
	onAuditActionLabel,
	onAuditModuleLabel,
	onClearAuditFilters,
	onRefreshAuditLogs,
	onToggleAuditLog,
	onUpdateAuditFilter,
}: {
	auditActionOptions: string[]
	auditActorOptions: string[]
	auditFilters: AuditLogFilters
	auditFiltersActive: boolean
	auditLogs: AnyRecord[]
	auditModuleOptions: string[]
	currentUserId?: number | string | null
	expandedAuditLogId: string | null
	loading: boolean
	onApplyAuditFilters: (event: FormEvent) => void
	onAuditActionLabel: (action: string) => string
	onAuditModuleLabel: (module: string) => string
	onClearAuditFilters: () => void
	onRefreshAuditLogs: () => void
	onToggleAuditLog: (id: string | null) => void
	onUpdateAuditFilter: (key: keyof AuditLogFilters, value: string) => void
}) {
	return (
		<section className="panel audit-log-panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Control operativo</span>
					<h2>Historial de acciones</h2>
					<p>
						Cambios registrados desde la activacion de la auditoria, con
						usuario, fecha y valores antes/despues.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-secondary-actions">
						<button type="button" className="ghost" onClick={onRefreshAuditLogs}>
							<RefreshCw size={16} />
							Actualizar
						</button>
					</div>
				</div>
			</div>
			<form className="audit-filter-grid" onSubmit={onApplyAuditFilters}>
				<Field label="Buscar">
					<input
						placeholder="Registro, usuario, modulo o ruta"
						value={auditFilters.q ?? ''}
						onChange={(event) => onUpdateAuditFilter('q', event.target.value)}
					/>
				</Field>
				<Field label="Usuario">
					<input
						list="audit-actor-options"
						placeholder="Todos"
						value={auditFilters.actor ?? ''}
						onChange={(event) =>
							onUpdateAuditFilter('actor', event.target.value)
						}
					/>
				</Field>
				<Field label="Modulo">
					<select
						value={auditFilters.module ?? ''}
						onChange={(event) =>
							onUpdateAuditFilter('module', event.target.value)
						}
					>
						<option value="">Todos</option>
						{auditModuleOptions.map((module) => (
							<option key={module} value={module}>
								{onAuditModuleLabel(module)}
							</option>
						))}
					</select>
				</Field>
				<Field label="Accion">
					<select
						value={auditFilters.action ?? ''}
						onChange={(event) =>
							onUpdateAuditFilter('action', event.target.value)
						}
					>
						<option value="">Todas</option>
						{auditActionOptions.map((action) => (
							<option key={action} value={action}>
								{onAuditActionLabel(action)}
							</option>
						))}
					</select>
				</Field>
				<Field label="Desde">
					<input
						type="date"
						value={auditFilters.from ?? ''}
						onChange={(event) => onUpdateAuditFilter('from', event.target.value)}
					/>
				</Field>
				<Field label="Hasta">
					<input
						type="date"
						value={auditFilters.to ?? ''}
						onChange={(event) => onUpdateAuditFilter('to', event.target.value)}
					/>
				</Field>
				<div className="record-actions audit-filter-actions">
					<button className="primary" type="submit">
						<Search size={16} />
						Filtrar
					</button>
					<button
						type="button"
						className="ghost"
						disabled={!auditFiltersActive}
						onClick={onClearAuditFilters}
					>
						Limpiar
					</button>
				</div>
			</form>
			<DataList id="audit-actor-options" values={auditActorOptions} />
			{loading && !auditLogs.length ? (
				<LoadingState
					text="Cargando historial de acciones..."
					hint="Estamos trayendo los eventos auditados para esta operacion."
				/>
			) : (
				<div className="records audit-log-list">
					{auditLogs.length ? (
						auditLogs.map((item) => (
							<AuditLogCard
								key={item.id}
								item={item}
								expanded={expandedAuditLogId === String(item.id)}
								currentUserId={currentUserId}
								onToggle={onToggleAuditLog}
								onAuditActionLabel={onAuditActionLabel}
								onAuditModuleLabel={onAuditModuleLabel}
							/>
						))
					) : (
						<Empty
							text="Sin acciones registradas para estos filtros."
							hint="Cambia los filtros o actualiza el historial para revisar eventos recientes."
							action={
								<button
									type="button"
									className="ghost"
									onClick={onRefreshAuditLogs}
								>
									<RefreshCw size={16} />
									Actualizar
								</button>
							}
						/>
					)}
				</div>
			)}
		</section>
	)
}

// ── Types for changelog JSON ──────────────────────────────────────────────────

type ChangelogSection = {
	heading: string
	text: string
}

type ChangelogItem = {
	slug: string
	title: string
	sections: ChangelogSection[]
}

type ChangelogGroup = {
	date: string
	items: ChangelogItem[]
}

const changelog = changelogData as unknown as ChangelogGroup[]

const CHANGELOG_PAGE_SIZE = 5

// ── NewsSettingsPanel ─────────────────────────────────────────────────────────

export function NewsSettingsPanel() {
	const firstDate = changelog.length > 0 ? changelog[0].date : null
	const [expandedDate, setExpandedDate] = useState<string | null>(firstDate)
	const [showAll, setShowAll] = useState(false)

	const visibleGroups = showAll ? changelog : changelog.slice(0, CHANGELOG_PAGE_SIZE)
	const hasMore = changelog.length > CHANGELOG_PAGE_SIZE

	function formatVersionDate(date: string) {
		const [year, month, day] = date.split('-').map(Number)
		return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('es-AR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC',
		})
	}

	function renderSectionText(text: string) {
		const blocks = text.split(/\n\n+/).filter((b) => b.trim())
		return blocks.map((block, i) => {
			const lines = block.split('\n').filter((l) => l.trim())
			const allList =
				lines.length > 0 && lines.every((l) => l.trimStart().startsWith('- '))
			if (allList) {
				return (
					<ul key={i} className="changelog-section-list">
						{lines.map((l, j) => (
							<li key={j}>{l.replace(/^\s*-\s+/, '').trim()}</li>
						))}
					</ul>
				)
			}
			return (
				<p key={i} className="changelog-section-para">
					{lines.join(' ')}
				</p>
			)
		})
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Sistema</span>
					<h2>Novedades</h2>
					<p>Cambios funcionales recientes de ShineApp.</p>
				</div>
			</div>
			{changelog.length === 0 ? (
				<div className="record-sub">Sin novedades registradas todavia.</div>
			) : (
				<>
					<div className="changelog-timeline">
						{visibleGroups.map((group, groupIndex) => {
							const isFirst = groupIndex === 0
							const isLast =
								groupIndex === visibleGroups.length - 1 && !hasMore
							const isExpanded = expandedDate === group.date
							return (
								<div
									key={group.date}
									className={
										isLast
											? 'changelog-group changelog-group--last'
											: 'changelog-group'
									}
								>
									<div className="changelog-spine">
										<div
											className={
												isFirst
													? 'changelog-version-icon changelog-version-icon--latest'
													: 'changelog-version-icon'
											}
											aria-hidden="true"
										>
											<FileText size={16} />
										</div>
										{isLast ? null : (
											<div className="changelog-spine-line" />
										)}
									</div>
									<div className="changelog-content">
										<button
											type="button"
											className={
												isExpanded
													? 'changelog-version-header changelog-version-header--expanded'
													: 'changelog-version-header'
											}
											onClick={() =>
												setExpandedDate(
													isExpanded ? null : group.date,
												)
											}
										>
											<div className="changelog-version-copy">
												<span className="changelog-version-label">
													{isFirst
														? 'Ultima version'
														: `Version ${group.date}`}
												</span>
												<span className="changelog-version-date">
													{formatVersionDate(group.date)}
												</span>
											</div>
											<ChevronDown
												size={14}
												className={
													isExpanded
														? 'changelog-chevron changelog-chevron--open'
														: 'changelog-chevron'
												}
											/>
										</button>
										{isExpanded ? (
											<div className="changelog-items">
												{group.items.map((item) => (
													<div
														key={item.slug}
														className="changelog-item"
													>
														<div className="changelog-item-title">
															{item.title}
														</div>
														{item.sections.map((sec) => (
															<div
																key={sec.heading}
																className="changelog-item-section"
															>
																<div className="changelog-item-section-heading">
																	{sec.heading}
																</div>
																<div className="changelog-item-section-body">
																	{renderSectionText(sec.text)}
																</div>
															</div>
														))}
													</div>
												))}
											</div>
										) : null}
									</div>
								</div>
							)
						})}
					</div>
					{hasMore && !showAll ? (
						<button
							type="button"
							className="ghost changelog-show-more"
							onClick={() => setShowAll(true)}
						>
							Mostrar todas las versiones
						</button>
					) : null}
				</>
			)}
		</section>
	)
}
