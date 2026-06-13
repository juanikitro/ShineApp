// Formatters Intl cacheados a nivel modulo.
//
// Construir un `Intl.NumberFormat` / `Intl.DateTimeFormat` (o llamar
// `Number#toLocaleString` / `Date#toLocaleDateString` con opciones) es la parte
// cara: instancia un formatter nuevo cada vez. `.format()` sobre un singleton es
// barato. Reusar estos singletons evita reconstruir el formatter por fila y por
// render en listas grandes (clientes, caja, dashboard, agenda).
//
// La salida es identica a `value.toLocaleString('es-AR', opts)` porque
// `toLocaleString` usa internamente `Intl` con las mismas opciones.

const LOCALE = 'es-AR'

export const currencyArsFormatter = new Intl.NumberFormat(LOCALE, {
	style: 'currency',
	currency: 'ARS',
	maximumFractionDigits: 0,
})

export const decimalFormatter = new Intl.NumberFormat(LOCALE, {
	maximumFractionDigits: 2,
})

export const weekdayShortFormatter = new Intl.DateTimeFormat(LOCALE, {
	weekday: 'short',
})

export const dayMonthFormatter = new Intl.DateTimeFormat(LOCALE, {
	day: '2-digit',
	month: '2-digit',
})

export const fullDateFormatter = new Intl.DateTimeFormat(LOCALE, {
	weekday: 'long',
	day: '2-digit',
	month: 'long',
	year: 'numeric',
})

export const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
	day: '2-digit',
	month: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
})

export const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
})
