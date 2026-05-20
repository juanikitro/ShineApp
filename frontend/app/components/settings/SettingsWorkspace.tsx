'use client'

import {
	type ChangeEvent,
	type FormEvent,
	type RefObject,
} from 'react'

import {
	CalendarDays,
	Eye,
	FileText,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
} from 'lucide-react'

import { BusinessSettingsPanel } from '@/app/components/settings/BusinessSettingsPanel'
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
	auditActorLabel,
	auditChangeRows,
	type AuditLogEntry,
	type AuditLogFilters,
} from '@/lib/audit-log'

export type SettingsSection =
	| 'business'
	| 'quotes'
	| 'cash'
	| 'agenda'
	| 'users'
	| 'history'

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
	useReservationTimes: boolean
	showStayDaysInAgenda: boolean
	employees: AnyRecord[]
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
	useReservationTimes,
	showStayDaysInAgenda,
	employees,
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
						businessSlug={businessSlug}
						safeBusinessLogoPdfThumbnail={safeBusinessLogoPdfThumbnail}
						safeBusinessLogoPreview={safeBusinessLogoPreview}
						onBusinessLogoChange={onBusinessLogoChange}
						onOpenBusinessLogoPicker={onOpenBusinessLogoPicker}
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
					<AgendaSettingsPanel
						showStayDaysInAgenda={showStayDaysInAgenda}
						useReservationTimes={useReservationTimes}
						onPatchBusinessForm={onPatchBusinessForm}
						onSaveBusinessProfile={onSaveBusinessProfile}
					/>
				) : null}
				{settingsSection === 'users' ? (
					<UsersSettingsPanel
						activeEmployeeCount={activeEmployeeCount}
						employees={employees}
						inactiveEmployeeCount={inactiveEmployeeCount}
						onOpenEmployeeForm={onOpenEmployeeForm}
						onRefreshData={onRefreshData}
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
	showStayDaysInAgenda,
	useReservationTimes,
	onPatchBusinessForm,
	onSaveBusinessProfile,
}: {
	showStayDaysInAgenda: boolean
	useReservationTimes: boolean
	onPatchBusinessForm: (patch: AnyRecord) => void
	onSaveBusinessProfile: (event: FormEvent) => void
}) {
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
				</div>
				<div className="record-sub">
					Si ocultas las horas, los datos historicos se conservan pero dejan de
					mostrarse y las nuevas reservas se guardan sin horario.
				</div>
			</form>
		</section>
	)
}

function UsersSettingsPanel({
	activeEmployeeCount,
	employees,
	inactiveEmployeeCount,
	onOpenEmployeeForm,
	onRefreshData,
}: {
	activeEmployeeCount: number
	employees: AnyRecord[]
	inactiveEmployeeCount: number
	onOpenEmployeeForm: () => void
	onRefreshData: () => void
}) {
	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Equipo y permisos</span>
					<h2>Empleados activos</h2>
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
	function auditFieldLabel(field: string) {
		return field.replaceAll('_', ' ')
	}

	function renderAuditLogCard(item: AnyRecord) {
		const itemId = String(item.id)
		const expanded = expandedAuditLogId === itemId
		const rows = auditChangeRows(item.changes ?? {})
		const actorLabel = auditActorLabel(item as AuditLogEntry, currentUserId)
		return (
			<RecordCard className="audit-log-card" key={item.id}>
				<RecordCardHeader
					title={
						<>
							{onAuditActionLabel(String(item.action ?? ''))} -{' '}
							{item.entity_label || item.entity_type || 'Registro'}
						</>
					}
					subtitle={
						<>
							{onAuditModuleLabel(String(item.module ?? ''))} -{' '}
							{String(item.entity_type ?? '')}
							{item.entity_id ? ` #${item.entity_id}` : ''}
						</>
					}
					actions={
						<button
							type="button"
							className="ghost"
							onClick={() => onToggleAuditLog(expanded ? null : itemId)}
						>
							<Eye size={16} />
							{expanded ? 'Ocultar' : 'Detalle'}
						</button>
					}
				>
					<div className="record-sub">
						{formatDateTimeLabel(item.created_at)} - {actorLabel}
					</div>
				</RecordCardHeader>
				{expanded ? (
					<div className="audit-change-table">
						<div className="audit-change-row audit-change-row--head">
							<span>Campo</span>
							<span>Antes</span>
							<span>Despues</span>
						</div>
						{rows.length ? (
							rows.map((row) => (
								<div className="audit-change-row" key={row.field}>
									<span>{auditFieldLabel(row.field)}</span>
									<strong>{row.before}</strong>
									<strong>{row.after}</strong>
								</div>
							))
						) : (
							<div className="record-sub audit-empty-change">
								Accion registrada sin cambios campo por campo.
							</div>
						)}
					</div>
				) : null}
			</RecordCard>
		)
	}

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
						auditLogs.map(renderAuditLogCard)
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
