/**
 * Convención ÚNICA del nombre del cliente de una cotización (EC-810), para
 * Ventas y Mesa de Control: tablero, listados, filtros, diálogos y
 * confirmaciones.
 *
 * Qué trae cada campo (los dos se leen EN VIVO del cliente; la cotización no
 * guarda copia):
 *
 * - `cliente_razon_social` = `cliente.razon_social`: la EMPRESA. Puede venir
 *   en blanco (`""`).
 * - `cliente_nombre` = `cliente.nombre`: la PERSONA DE CONTACTO (en el alta de
 *   clientes se captura como "Nombre de contacto"), no un nombre comercial.
 *   Obligatorio en el cliente.
 * - Un borrador sin cliente trae `cliente` y ambos nombres en `null`.
 *
 * La identidad del cliente es la razón social TAL CUAL llega, sin cambiarle
 * mayúsculas/minúsculas, como en Clientes y Pedidos: los datos reales vienen
 * casi todos en mayúsculas ("ABARROTES ABEJA, SA DE CV") y cualquier
 * transformación rompe siglas y tipos de sociedad. El contacto solo aparece
 * como línea secundaria rotulada (`getQuoteClienteContacto`).
 *
 * Las exportaciones NO pasan por aquí: llevan la razón social cruda.
 */

/** Los campos de cliente que traen todas las respuestas de cotización. */
export interface QuoteClienteFields {
  cliente: number | null;
  cliente_razon_social?: string | null;
  cliente_nombre?: string | null;
}

/** Texto de una cotización guardada sin cliente. */
export const SIN_CLIENTE_LABEL = "Sin cliente";

/**
 * Nombre del cliente para mostrar: la razón social cruda; si viene en
 * blanco, el contacto; si tampoco hay, `Cliente #<id>`. Sin cliente,
 * "Sin cliente". Nunca devuelve `""`, `"null"` ni `"undefined"`.
 */
export const getQuoteClienteLabel = (quote: QuoteClienteFields): string => {
  if (quote.cliente == null) return SIN_CLIENTE_LABEL;
  return (
    quote.cliente_razon_social?.trim() ||
    quote.cliente_nombre?.trim() ||
    `Cliente #${quote.cliente}`
  );
};

/**
 * Contacto para la línea secundaria ("Contacto: …"), o `null` cuando no
 * aporta nada: sin cliente, sin contacto, o cuando el contacto ya es la
 * etiqueta (razón social en blanco) o coincide con la razón social (sin
 * distinguir mayúsculas).
 */
export const getQuoteClienteContacto = (quote: QuoteClienteFields): string | null => {
  if (quote.cliente == null) return null;
  const contacto = quote.cliente_nombre?.trim();
  const razonSocial = quote.cliente_razon_social?.trim();
  if (!contacto || !razonSocial) return null;
  if (contacto.toLocaleUpperCase("es") === razonSocial.toLocaleUpperCase("es")) return null;
  return contacto;
};

/**
 * Complemento " de <cliente>" para frases ("¿Confirmas autorizar la
 * cotización #00012 de ACME SA DE CV?"). Sin cliente devuelve `""`, para no
 * escribir "de Sin cliente".
 */
export const formatQuoteClienteDe = (quote: QuoteClienteFields): string =>
  quote.cliente == null ? "" : ` de ${getQuoteClienteLabel(quote)}`;
