'use client'

import { type FormEvent, type KeyboardEvent } from 'react'

import { Plus } from 'lucide-react'

import { Button } from '@/app/components/ui/Button'
import { Field } from '@/app/components/ui/Field'
import { type AnyRecord } from '@/lib/page-support'

type EmployeeFormProps = {
	submitLabel: string
	employeeForm: AnyRecord
	setEmployeeForm: (form: AnyRecord) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	focusNextOnEnter: (
		key: string,
	) => (event: KeyboardEvent<HTMLElement>) => void
	submitting?: boolean
}

export function EmployeeForm({
	submitLabel,
	employeeForm,
	setEmployeeForm,
	onSubmit,
	focusNextOnEnter,
	submitting = false,
}: EmployeeFormProps) {
	return (
		<form className="form-grid" onSubmit={onSubmit}>
			<Field label="Usuario">
				<input
					data-focus-key="employee.username"
					required
					autoComplete="username"
					value={employeeForm.username}
					onChange={(event) =>
						setEmployeeForm({
							...employeeForm,
							username: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('employee.email')}
				/>
			</Field>
			<Field label="Email">
				<input
					data-focus-key="employee.email"
					type="email"
					autoComplete="email"
					value={employeeForm.email}
					onChange={(event) =>
						setEmployeeForm({
							...employeeForm,
							email: event.target.value,
						})
					}
					onKeyDown={focusNextOnEnter('employee.password')}
				/>
			</Field>
			<Field label="Contrasena inicial">
				<input
					data-focus-key="employee.password"
					required
					type="password"
					minLength={4}
					autoComplete="new-password"
					value={employeeForm.password}
					onChange={(event) =>
						setEmployeeForm({
							...employeeForm,
							password: event.target.value,
						})
					}
				/>
			</Field>
			<Button
				type="submit"
				variant="primary"
				loading={submitting}
				leadingIcon={<Plus size={16} />}
			>
				{submitLabel}
			</Button>
		</form>
	)
}
