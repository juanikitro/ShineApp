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
	Eye,
	FileText,
	KeyRound,
	MessageCircle,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
} from 'lucide-react'

import changelogData from '@/app/data/changelog.generated.json'

import { BusinessSettingsPanel } from '@/app/components/settings/BusinessSettingsPanel'
import { TrashSettingsPanel } from '@/app/components/settings/TrashSettingsPanel'
import { TurneraSettingsPanel } from '@/app/components/settings/TurneraSettingsPanel'
import { Button } from '@/app/components/ui/Button'
import { AuditLogCard } from '@/app/components/ui/AuditLogCard'
import { Empty, LoadingState } from '@/app/components/ui/Empty'
import { Field } from '@/app/components/ui/Field'
import { MetricCard } from '@/app/components/ui/MetricCard'
import {
	RecordCard,
	RecordCardHeader,
} from '@/app/components/ui/RecordCard'
import { Toggle } from '@/app/components/ui/Toggle'
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
	| 'trash'
	| 'whatsapp'
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
	whatsappAutomationRules: AnyRecord[]
	whatsappConfig: AnyRecord | null
	whatsappMessages: AnyRecord[]
	whatsappTemplates: AnyRecord[]
	incomeCategoryTree: Record<string, string[]>
	expenseCategoryTree: Record<string, string[]>
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
	onEditExpenseClassification: (item: CashClassificationPair) => void
	onDeleteExpenseClassification: (
		movementType: string,
		category: string,
		subcategory: string,
	) => void
	onAddSubcategory: (movementType: string, category: string) => void
	onOpenCashCategoryForm: (movementType: string) => void
	onEditCashCategory: (movementType: string, category: string) => void
	onDeleteCashCategory: (movementType: string, category: string) => void
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
	onSaveWhatsappConfig: (patch: AnyRecord) => Promise<any>
	onCreateWhatsappTemplate: (data: AnyRecord) => Promise<any>
	onUpdateWhatsappAutomationRule: (
		id: number | string,
		patch: AnyRecord,
	) => Promise<any>
	onUpdateWhatsappTemplate: (
		id: number | string,
		patch: AnyRecord,
	) => Promise<any>
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
	whatsappAutomationRules,
	whatsappConfig,
	whatsappMessages,
	whatsappTemplates,
	incomeCategoryTree,
	expenseCategoryTree,
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
	onEditExpenseClassification,
	onDeleteExpenseClassification,
	onAddSubcategory,
	onOpenCashCategoryForm,
	onEditCashCategory,
	onDeleteCashCategory,
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
	onSaveWhatsappConfig,
	onCreateWhatsappTemplate,
	onUpdateWhatsappAutomationRule,
	onUpdateWhatsappTemplate,
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
						incomeCategoryTree={incomeCategoryTree}
						expenseCategoryTree={expenseCategoryTree}
						onDeleteExpenseClassification={onDeleteExpenseClassification}
						onEditExpenseClassification={onEditExpenseClassification}
						onAddSubcategory={onAddSubcategory}
						onOpenCashCategoryForm={onOpenCashCategoryForm}
						onEditCashCategory={onEditCashCategory}
						onDeleteCashCategory={onDeleteCashCategory}
					/>
				) : null}
				{settingsSection === 'whatsapp' ? (
					<WhatsappSettingsPanel
						automationRules={whatsappAutomationRules}
						config={whatsappConfig}
						messages={whatsappMessages}
						templates={whatsappTemplates}
						onCreateTemplate={onCreateWhatsappTemplate}
						onSaveConfig={onSaveWhatsappConfig}
						onUpdateAutomationRule={onUpdateWhatsappAutomationRule}
						onUpdateTemplate={onUpdateWhatsappTemplate}
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
				{settingsSection === 'trash' ? <TrashSettingsPanel /> : null}
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
						<Button
							type="submit"
							variant="primary"
							form="settings-quotes-form"
						>
							<FileText size={16} />
							Guardar defaults
						</Button>
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

const whatsappTemplateKeyOptions = [
	{ value: 'reservation_confirmed', label: 'Turno confirmado' },
	{ value: 'work_ready', label: 'Trabajo listo' },
	{ value: 'work_delivered', label: 'Trabajo finalizado' },
	{ value: 'quote_sent', label: 'Cotizacion enviada' },
	{ value: 'manual', label: 'Manual' },
]

const whatsappProviderOptions = [
	{ value: 'meta', label: 'Meta Cloud API' },
	{ value: 'fake', label: 'Fake' },
	{ value: 'twilio', label: 'Twilio' },
]

function splitTemplateVariables(value: string) {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
}

function templateVariablesText(value: unknown) {
	return Array.isArray(value) ? value.join(', ') : ''
}

function WhatsappSettingsPanel({
	automationRules,
	config,
	messages,
	templates,
	onCreateTemplate,
	onSaveConfig,
	onUpdateAutomationRule,
	onUpdateTemplate,
}: {
	automationRules: AnyRecord[]
	config: AnyRecord | null
	messages: AnyRecord[]
	templates: AnyRecord[]
	onCreateTemplate: (data: AnyRecord) => Promise<any>
	onSaveConfig: (patch: AnyRecord) => Promise<any>
	onUpdateAutomationRule: (
		id: number | string,
		patch: AnyRecord,
	) => Promise<any>
	onUpdateTemplate: (id: number | string, patch: AnyRecord) => Promise<any>
}) {
	const [configDraft, setConfigDraft] = useState<AnyRecord>({
		provider: 'meta',
		is_enabled: false,
		phone_number_display: '',
		phone_number_id: '',
		business_account_id: '',
		default_country_code: '54',
		access_token: '',
	})
	const [templateDraft, setTemplateDraft] = useState<AnyRecord>({
		key: 'reservation_confirmed',
		provider_template_name: '',
		language: 'es_AR',
		category: 'utility',
		body_preview: '',
		variables_schema: '',
		is_active: true,
	})

	useEffect(() => {
		setConfigDraft({
			provider: config?.provider ?? 'meta',
			is_enabled: Boolean(config?.is_enabled),
			phone_number_display: config?.phone_number_display ?? '',
			phone_number_id: config?.phone_number_id ?? '',
			business_account_id: config?.business_account_id ?? '',
			default_country_code: config?.default_country_code ?? '54',
			access_token: '',
		})
	}, [config])

	function patchConfigDraft(patch: AnyRecord) {
		setConfigDraft((current) => ({ ...current, ...patch }))
	}

	function patchTemplateDraft(patch: AnyRecord) {
		setTemplateDraft((current) => ({ ...current, ...patch }))
	}

	async function submitTemplate(event: FormEvent) {
		event.preventDefault()
		await onCreateTemplate({
			...templateDraft,
			variables_schema: splitTemplateVariables(
				String(templateDraft.variables_schema ?? ''),
			),
		})
		setTemplateDraft((current) => ({
			...current,
			provider_template_name: '',
			body_preview: '',
			variables_schema: '',
		}))
	}

	return (
		<>
			<section className="panel">
				<div className="panel-head">
					<div>
						<span className="panel-kicker">Canal operativo</span>
						<h2>WhatsApp</h2>
						<p>
							Configura el provider, los templates transaccionales y los
							envios automaticos.
						</p>
					</div>
					<div className="settings-action-rail">
						<div className="settings-primary-actions">
							<Button type="submit" variant="primary" form="whatsapp-config-form">
								<MessageCircle size={16} />
								Guardar conexion
							</Button>
						</div>
					</div>
				</div>
				<form
					className="form-grid"
					id="whatsapp-config-form"
					onSubmit={(event) => {
						event.preventDefault()
						void onSaveConfig(configDraft)
					}}
				>
					<div className="form-row">
						<Field label="Provider">
							<select
								value={configDraft.provider}
								onChange={(event) =>
									patchConfigDraft({ provider: event.target.value })
								}
							>
								{whatsappProviderOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</Field>
						<Field label="Numero visible">
							<input
								value={configDraft.phone_number_display}
								onChange={(event) =>
									patchConfigDraft({
										phone_number_display: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="Codigo pais default">
							<input
								value={configDraft.default_country_code}
								onChange={(event) =>
									patchConfigDraft({
										default_country_code: event.target.value,
									})
								}
							/>
						</Field>
					</div>
					<div className="form-row">
						<Field label="Phone number ID">
							<input
								value={configDraft.phone_number_id}
								onChange={(event) =>
									patchConfigDraft({ phone_number_id: event.target.value })
								}
							/>
						</Field>
						<Field label="Business account ID">
							<input
								value={configDraft.business_account_id}
								onChange={(event) =>
									patchConfigDraft({
										business_account_id: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="Token">
							<input
								type="password"
								placeholder={config?.has_access_token ? 'Configurado' : ''}
								value={configDraft.access_token}
								onChange={(event) =>
									patchConfigDraft({ access_token: event.target.value })
								}
							/>
						</Field>
					</div>
					<Toggle
						checked={Boolean(configDraft.is_enabled)}
						onChange={(checked) => patchConfigDraft({ is_enabled: checked })}
					>
						Canal habilitado
					</Toggle>
				</form>
			</section>

			<section className="panel">
				<div className="panel-head">
					<div>
						<span className="panel-kicker">Templates aprobados</span>
						<h2>Mensajes</h2>
						<p>Administra los nombres de provider y previews usados por evento.</p>
					</div>
					<div className="settings-action-rail">
						<div className="settings-primary-actions">
							<Button type="submit" variant="primary" form="whatsapp-template-form">
								<Plus size={16} />
								Crear template
							</Button>
						</div>
					</div>
				</div>
				<form
					className="form-grid section-block-end"
					id="whatsapp-template-form"
					onSubmit={submitTemplate}
				>
					<div className="form-row">
						<Field label="Evento">
							<select
								value={templateDraft.key}
								onChange={(event) => patchTemplateDraft({ key: event.target.value })}
							>
								{whatsappTemplateKeyOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</Field>
						<Field label="Nombre provider">
							<input
								value={templateDraft.provider_template_name}
								onChange={(event) =>
									patchTemplateDraft({
										provider_template_name: event.target.value,
									})
								}
							/>
						</Field>
						<Field label="Idioma">
							<input
								value={templateDraft.language}
								onChange={(event) =>
									patchTemplateDraft({ language: event.target.value })
								}
							/>
						</Field>
					</div>
					<Field label="Preview">
						<textarea
							value={templateDraft.body_preview}
							onChange={(event) =>
								patchTemplateDraft({ body_preview: event.target.value })
							}
						/>
					</Field>
					<Field label="Variables">
						<input
							value={templateDraft.variables_schema}
							onChange={(event) =>
								patchTemplateDraft({ variables_schema: event.target.value })
							}
						/>
					</Field>
				</form>
				{templates.length ? (
					<div className="records">
						{templates.map((template) => (
							<WhatsappTemplateRow
								key={template.id}
								template={template}
								onUpdateTemplate={onUpdateTemplate}
							/>
						))}
					</div>
				) : (
					<Empty text="Sin templates" />
				)}
			</section>

			<section className="panel">
				<div className="panel-head">
					<div>
						<span className="panel-kicker">Automatizacion</span>
						<h2>Envios automaticos</h2>
						<p>Activa los eventos que deben generar mensajes de WhatsApp.</p>
					</div>
				</div>
				{automationRules.length ? (
					<div className="records">
						{automationRules.map((rule) => (
							<RecordCard key={rule.id}>
								<RecordCardHeader
									title={rule.template_label ?? 'Sin template'}
									subtitle={`${rule.event_label ?? rule.event} - ${
										rule.enabled ? 'Activo' : 'Inactivo'
									}`}
								/>
								<div className="record-actions">
									<Toggle
										checked={Boolean(rule.enabled)}
										onChange={(checked) =>
											void onUpdateAutomationRule(rule.id, { enabled: checked })
										}
									>
										Enviar automatico
									</Toggle>
									<select
										value={rule.template ?? ''}
										onChange={(event) =>
											void onUpdateAutomationRule(rule.id, {
												template: event.target.value || null,
											})
										}
									>
										<option value="">Sin template</option>
										{templates.map((template) => (
											<option key={template.id} value={template.id}>
												{template.provider_template_name || template.key}
											</option>
										))}
									</select>
								</div>
							</RecordCard>
						))}
					</div>
				) : (
					<Empty text="Sin reglas" />
				)}
			</section>

			<section className="panel">
				<div className="panel-head">
					<div>
						<span className="panel-kicker">Auditoria</span>
						<h2>Historial WhatsApp</h2>
						<p>Ultimos mensajes registrados por el outbox.</p>
					</div>
				</div>
				{messages.length ? (
					<div className="records">
						{messages.slice(0, 10).map((message) => (
							<RecordCard key={message.id}>
								<RecordCardHeader
									title={message.recipient_name || message.recipient_phone}
									subtitle={`${message.event_label ?? message.event} - ${
										message.status_label ?? message.status
									}`}
								/>
								<p className="record-sub">
									{formatDateTimeLabel(message.created_at)} -{' '}
									{message.provider ?? 'provider'}
								</p>
								{message.last_error ? (
									<p className="record-sub danger">{message.last_error}</p>
								) : null}
							</RecordCard>
						))}
					</div>
				) : (
					<Empty text="Sin mensajes" />
				)}
			</section>
		</>
	)
}

function WhatsappTemplateRow({
	template,
	onUpdateTemplate,
}: {
	template: AnyRecord
	onUpdateTemplate: (id: number | string, patch: AnyRecord) => Promise<any>
}) {
	const [draft, setDraft] = useState<AnyRecord>({
		provider_template_name: '',
		language: '',
		body_preview: '',
		variables_schema: '',
		is_active: true,
	})

	useEffect(() => {
		setDraft({
			provider_template_name: template.provider_template_name ?? '',
			language: template.language ?? '',
			body_preview: template.body_preview ?? '',
			variables_schema: templateVariablesText(template.variables_schema),
			is_active: Boolean(template.is_active),
		})
	}, [template])

	function patchDraft(patch: AnyRecord) {
		setDraft((current) => ({ ...current, ...patch }))
	}

	return (
		<RecordCard>
			<RecordCardHeader
				title={template.provider_template_name || 'Template sin nombre'}
				subtitle={`${template.key_label ?? template.key} - ${
					template.is_active ? 'Activo' : 'Inactivo'
				}`}
			/>
			<div className="form-grid">
				<div className="form-row">
					<Field label="Nombre provider">
						<input
							value={draft.provider_template_name}
							onChange={(event) =>
								patchDraft({ provider_template_name: event.target.value })
							}
						/>
					</Field>
					<Field label="Idioma">
						<input
							value={draft.language}
							onChange={(event) => patchDraft({ language: event.target.value })}
						/>
					</Field>
				</div>
				<Field label="Preview">
					<textarea
						value={draft.body_preview}
						onChange={(event) =>
							patchDraft({ body_preview: event.target.value })
						}
					/>
				</Field>
				<Field label="Variables">
					<input
						value={draft.variables_schema}
						onChange={(event) =>
							patchDraft({ variables_schema: event.target.value })
						}
					/>
				</Field>
				<div className="record-actions">
					<Toggle
						checked={Boolean(draft.is_active)}
						onChange={(checked) => patchDraft({ is_active: checked })}
					>
						Activo
					</Toggle>
					<Button
						variant="ghost"
						onClick={() =>
							void onUpdateTemplate(template.id, {
								...draft,
								variables_schema: splitTemplateVariables(
									String(draft.variables_schema ?? ''),
								),
							})
						}
					>
						<FileText size={16} />
						Guardar template
					</Button>
				</div>
			</div>
		</RecordCard>
	)
}

function CashSettingsPanel({
	cashClassificationPairs,
	incomeCategoryTree,
	expenseCategoryTree,
	onDeleteExpenseClassification,
	onEditExpenseClassification,
	onAddSubcategory,
	onOpenCashCategoryForm,
	onEditCashCategory,
	onDeleteCashCategory,
}: {
	cashClassificationPairs: CashClassificationPair[]
	incomeCategoryTree: Record<string, string[]>
	expenseCategoryTree: Record<string, string[]>
	onDeleteExpenseClassification: (
		movementType: string,
		category: string,
		subcategory: string,
	) => void
	onEditExpenseClassification: (item: CashClassificationPair) => void
	onAddSubcategory: (movementType: string, category: string) => void
	onOpenCashCategoryForm: (movementType: string) => void
	onEditCashCategory: (movementType: string, category: string) => void
	onDeleteCashCategory: (movementType: string, category: string) => void
}) {
	const [activeType, setActiveType] = useState<'income' | 'expense'>('income')
	const [expanded, setExpanded] = useState<Record<string, boolean>>({})

	const incomeCategoryCount = Object.keys(incomeCategoryTree).length
	const expenseCategoryCount = Object.keys(expenseCategoryTree).length
	const tree = activeType === 'income' ? incomeCategoryTree : expenseCategoryTree
	const movementLabel = activeType === 'income' ? 'ingreso' : 'egreso'
	const categories = useMemo(
		() =>
			Object.keys(tree).sort((a, b) =>
				a.localeCompare(b, 'es', { sensitivity: 'base' }),
			),
		[tree],
	)

	function toggleCategory(category: string) {
		const key = `${activeType}:${category}`
		setExpanded((current) => ({ ...current, [key]: !current[key] }))
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<div>
					<span className="panel-kicker">Caja y resultado</span>
					<h2>Categorias de caja</h2>
					<p>
						Organiza las categorias y subcategorias que Caja sugiere para{' '}
						<span className="cash-term income">ingresos</span>,{' '}
						<span className="cash-term expense">egresos</span>, deudas y
						movimientos automaticos.
					</p>
				</div>
				<div className="settings-action-rail">
					<div className="settings-primary-actions">
						<Button
							variant="primary"
							onClick={() => onOpenCashCategoryForm(activeType)}
						>
							<Plus size={16} />
							Nueva categoria
						</Button>
					</div>
				</div>
			</div>
			<section className="settings-operational-metrics section-block-end">
				<MetricCard
					label="Categorias de ingreso"
					value={incomeCategoryCount}
				/>
				<MetricCard
					label="Categorias de egreso"
					value={expenseCategoryCount}
				/>
				<MetricCard
					label="Subcategorias totales"
					value={cashClassificationPairs.length}
				/>
			</section>
			<SegmentedControl
				className="settings-classification-toggle section-block-end"
				ariaLabel="Tipo de movimiento"
				selectionMode="tabs"
				value={activeType}
				onChange={(value) => setActiveType(value)}
				options={[
					{
						value: 'income',
						label: `Ingresos (${incomeCategoryCount})`,
					},
					{
						value: 'expense',
						label: `Egresos (${expenseCategoryCount})`,
					},
				]}
			/>
			<div className="settings-classification-list settings-category-accordion">
				{categories.length ? (
					categories.map((category) => {
						const key = `${activeType}:${category}`
						const isOpen = Boolean(expanded[key])
						const subcategories = tree[category] ?? []
						return (
							<div
								className={`settings-category-item${
									isOpen ? ' is-open' : ''
								}`}
								key={key}
							>
								<div className="settings-category-row">
									<button
										type="button"
										className="settings-category-toggle"
										aria-expanded={isOpen}
										onClick={() => toggleCategory(category)}
									>
										<ChevronDown
											size={16}
											className="settings-category-chevron"
											aria-hidden={true}
										/>
										<span className="settings-category-name">{category}</span>
										<span className="settings-category-count">
											{subcategories.length}{' '}
											{subcategories.length === 1
												? 'subcategoria'
												: 'subcategorias'}
										</span>
									</button>
									<div className="settings-category-actions">
										<Button
											variant="ghost"
											onClick={() => onAddSubcategory(activeType, category)}
											aria-label={`Agregar subcategoria a ${category}`}
										>
											<Plus size={16} />
										</Button>
										<Button
											variant="ghost"
											onClick={() => onEditCashCategory(activeType, category)}
											aria-label={`Renombrar categoria ${category}`}
										>
											<Pencil size={16} />
										</Button>
										<Button
											variant="danger"
											onClick={() => onDeleteCashCategory(activeType, category)}
											aria-label={`Eliminar categoria ${category}`}
										>
											<Trash2 size={16} />
										</Button>
									</div>
								</div>
								{isOpen ? (
									<div className="settings-subcategory-list">
										{subcategories.length ? (
											subcategories.map((subcategory) => (
												<div
													className="settings-subcategory-row"
													key={`${key}:${subcategory}`}
												>
													<span className="settings-subcategory-name">
														{subcategory}
													</span>
													<div className="settings-subcategory-actions">
														<Button
															variant="ghost"
															onClick={() =>
																onEditExpenseClassification({
																	movement_type: activeType,
																	category,
																	subcategory,
																})
															}
															aria-label={`Editar subcategoria ${subcategory}`}
														>
															<Pencil size={16} />
														</Button>
														<Button
															variant="danger"
															onClick={() =>
																onDeleteExpenseClassification(
																	activeType,
																	category,
																	subcategory,
																)
															}
															aria-label={`Eliminar subcategoria ${subcategory}`}
														>
															<Trash2 size={16} />
														</Button>
													</div>
												</div>
											))
										) : (
											<p className="settings-subcategory-empty">
												Sin subcategorias todavia. Agrega una con el boton{' '}
												<Plus size={13} aria-hidden={true} />.
											</p>
										)}
									</div>
								) : null}
							</div>
						)
					})
				) : (
					<Empty
						text={`Sin categorias de ${movementLabel}.`}
						hint="Crea una categoria para empezar a clasificar los movimientos de Caja."
						action={
							<Button
								variant="primary"
								onClick={() => onOpenCashCategoryForm(activeType)}
							>
								<Plus size={16} />
								Nueva categoria
							</Button>
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
						<Button
							type="submit"
							variant="primary"
							form="settings-agenda-form"
						>
							<CalendarDays size={16} />
							Guardar agenda
						</Button>
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
					<Button type="submit" variant="ghost">
						<Pencil size={14} />
						Guardar
					</Button>
					<Button
						variant="ghost"
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
					</Button>
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
						<Button
							type="submit"
							variant="primary"
							form="settings-capacity-form"
						>
							<CalendarDays size={16} />
							Guardar limite
						</Button>
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
				<Button type="submit" variant="primary">
					<Plus size={16} />
					Agregar sector
				</Button>
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
							<Button
								variant={selectedEmployee.is_active ? 'danger' : 'primary'}
								onClick={() =>
									onToggleEmployeeActive(
										selectedEmployee.id,
										selectedEmployee.is_active,
									)
								}
							>
								{selectedEmployee.is_active ? 'Desactivar' : 'Activar'}
							</Button>
						</div>
						<div className="settings-secondary-actions">
							<Button variant="ghost" onClick={onDeselectEmployee}>
								<ArrowLeft size={16} />
								Volver
							</Button>
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
							<Button type="submit" variant="primary">
								<Pencil size={16} />
								Actualizar contraseña
							</Button>
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
						<Button variant="primary" onClick={onOpenEmployeeForm}>
							<Plus size={16} />
							Nuevo empleado
						</Button>
					</div>
					<div className="settings-secondary-actions">
						<Button variant="ghost" onClick={onRefreshData}>
							<RefreshCw size={16} />
							Actualizar
						</Button>
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
									<Button
										variant="ghost"
										onClick={() => onSelectEmployee(item)}
										aria-label={`Ver detalle de ${item.username}`}
									>
										<Pencil size={16} />
										Editar
									</Button>
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
							<Button
								variant="primary"
								onClick={onOpenEmployeeForm}
							>
								<Plus size={16} />
								Nuevo empleado
							</Button>
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
						<Button variant="ghost" onClick={onRefreshAuditLogs}>
							<RefreshCw size={16} />
							Actualizar
						</Button>
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
					<Button variant="primary" type="submit">
						<Search size={16} />
						Filtrar
					</Button>
					<Button
						variant="ghost"
						disabled={!auditFiltersActive}
						onClick={onClearAuditFilters}
					>
						Limpiar
					</Button>
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
								<Button
									variant="ghost"
									onClick={onRefreshAuditLogs}
								>
									<RefreshCw size={16} />
									Actualizar
								</Button>
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
						<Button
							variant="ghost"
							className="changelog-show-more"
							onClick={() => setShowAll(true)}
						>
							Mostrar todas las versiones
						</Button>
					) : null}
				</>
			)}
		</section>
	)
}
