// Helpers para convertir datos de contacto del negocio en enlaces accionables
// dentro de la landing publica.
//
// WhatsApp: el celular de contacto del negocio es texto libre (no hay selector
// de codigo de pais como el que si tiene el perfil de usuario). Asumimos
// Argentina (+54) cuando el numero no trae codigo de pais. No agregamos el "9"
// de moviles argentinos porque desde el numero suelto no se puede distinguir un
// movil de un fijo, y anteponerlo romperia los fijos. Un negocio que quiera
// control total puede cargar el numero en formato internacional completo.

const ARGENTINA_COUNTRY_CODE = '54'

// Limpia separadores (espacios, guiones, parentesis, "+") y antepone el codigo
// de pais argentino si falta. Devuelve null si no queda ningun digito.
export function normalizeWhatsappDigits(
	raw: string | null | undefined,
): string | null {
	const digits = String(raw ?? '').replace(/\D/g, '')
	if (!digits) return null
	return digits.startsWith(ARGENTINA_COUNTRY_CODE)
		? digits
		: `${ARGENTINA_COUNTRY_CODE}${digits}`
}

// Arma el enlace de WhatsApp (wa.me) a partir del telefono de contacto.
// Devuelve null cuando no hay un numero utilizable.
export function whatsappUrl(raw: string | null | undefined): string | null {
	const digits = normalizeWhatsappDigits(raw)
	return digits ? `https://wa.me/${digits}` : null
}

// El badge de direccion se vuelve boton a Maps solo si el negocio cargo un link.
export function mapsUrlIsUsable(value: string | null | undefined): boolean {
	return Boolean(value && value.trim())
}
