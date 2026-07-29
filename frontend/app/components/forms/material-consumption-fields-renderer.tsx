import { type ComponentProps, type ReactNode } from 'react'

import { MaterialConsumptionFields } from './MaterialConsumptionFields'

type MaterialConsumptionFieldsProps = ComponentProps<
	typeof MaterialConsumptionFields
>

type MaterialConsumptionFieldsRendererProps = Omit<
	MaterialConsumptionFieldsProps,
	'materialClassName' | 'onOpenMaterial' | 'openUnitClassName'
> & {
	flashClass: (target: string | null) => string
	fieldFlashKey: (target: string) => string
	onOpenQuickCreate: (kind: string, target: string) => void
}

type MaterialConsumptionFieldsRendererConfig = Omit<
	MaterialConsumptionFieldsRendererProps,
	'showWorkOrder'
>

export function renderMaterialConsumptionFields({
	flashClass,
	fieldFlashKey,
	onOpenQuickCreate,
	...props
}: MaterialConsumptionFieldsRendererProps): ReactNode {
	return (
		<MaterialConsumptionFields
			{...props}
			materialClassName={flashClass(fieldFlashKey('consumption.material'))}
			openUnitClassName={flashClass(fieldFlashKey('consumption.open_unit'))}
			onOpenMaterial={() =>
				onOpenQuickCreate('material', 'consumption.material')
			}
		/>
	)
}

export function createMaterialConsumptionFieldsRenderer(
	config: MaterialConsumptionFieldsRendererConfig,
) {
	return (showWorkOrder = true) =>
		renderMaterialConsumptionFields({ ...config, showWorkOrder })
}
