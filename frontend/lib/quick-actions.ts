export function availableQuickActions<T extends { hidden?: boolean }>(
	actions: readonly T[],
) {
	return actions.filter((action) => !action.hidden)
}
