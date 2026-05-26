import {
	DEFAULT_PAYMENT_METHOD,
	today,
} from '@/lib/page-support'

export function blankSupplierForm() {
	return {
		name: '',
		legal_name: '',
		category: '',
		tax_condition: '',
		website: '',
		contact_name: '',
		phone: '',
		email: '',
		tax_id: '',
		address: '',
		notes: '',
	}
}

export function blankStockMovementLine() {
	return {
		material: '',
		quantity: '',
		unit_price: '',
	}
}

export function blankStockMovementForm(day = today) {
	return {
		movement_type: 'purchase',
		occurred_on: day,
		supplier: '',
		customer: '',
		reservation: '',
		document_type: '',
		document_number: '',
		affects_cash: true,
		products_received: false,
		payment_method: DEFAULT_PAYMENT_METHOD,
		notes: '',
		lines: [blankStockMovementLine()],
	}
}
