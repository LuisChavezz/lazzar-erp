/**
 * Quita los emoji del texto que va a un PDF (EC-958).
 *
 * Ninguna fuente de los PDF tiene emoji a color: Arimo no los tiene y el
 * respaldo de símbolos (`PdfSymbolsFallback`) solo cubre bloques del BMP. Sin
 * este paso un emoji caía a la Helvetica estándar de react-pdf y desaparecía
 * sin aviso, a veces junto con los selectores y uniones que lo acompañan. Se
 * quita aquí, a propósito y en un solo lugar (`renderPdfBlobWith`).
 *
 * Qué se quita:
 * - pictogramas fuera del BMP (😀, 🔥, 📦…), con lo que los acompañe;
 * - secuencias con unión (ZWJ, 👨‍👩‍👧, ⛹️‍♂️), modificador de tono (👍🏽) o
 *   etiquetas (🏴 de Escocia), aunque su base esté en el BMP;
 * - banderas e indicadores regionales sueltos, y modificadores de tono sueltos;
 * - de una tecla (1️⃣) solo el marco: queda el "1".
 *
 * Qué se conserva: un pictograma suelto del BMP (✓, ⚠, ❤, ★, ⭐, ©, ™), con su
 * selector de variación quitado: el respaldo los imprime en blanco y negro
 * (323 de los 342 del BMP; los que no tiene, como ✅ o ❌, desaparecen como
 * cualquier carácter sin glifo). Una ZWJ fuera de un emoji y cualquier otro
 * texto no se tocan. Tampoco se ajustan los espacios: "Entrega 🚚 hoy" queda
 * "Entrega  hoy".
 */

const EMOJI_SEQUENCE =
  /\p{Regional_Indicator}{1,2}|\p{Emoji_Modifier}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?[\u{E0020}-\u{E007F}]*(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)*/gu;

const COMPOUND = /[\u200D\u{E0020}-\u{E007F}]|\p{Emoji_Modifier}/u;
const FIRST_NON_BMP = 0x10000;

const replaceSequence = (sequence: string): string => {
  const [base] = Array.from(sequence);
  if (/^[0-9#*]/.test(sequence)) return base;
  if (/^(?:\p{Regional_Indicator}|\p{Emoji_Modifier})/u.test(sequence)) return "";
  if (COMPOUND.test(sequence)) return "";
  return (base.codePointAt(0) ?? 0) >= FIRST_NON_BMP ? "" : base;
};

/** Quita los emoji de un texto según las reglas de arriba. */
export const stripPdfEmoji = (text: string): string => text.replace(EMOJI_SEQUENCE, replaceSequence);

/** URLs que pueden llegar en las props (imágenes, data URLs): nunca se tocan. */
const URL_LIKE = /^(?:https?:|data:|blob:)/i;

const isPlainObject = (value: object): value is Record<string, unknown> => {
  if ("$$typeof" in value) return false; // un elemento de React
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * `stripPdfEmoji` sobre cada string de las props de un documento: entra en
 * arrays y objetos planos (el JSON del API, `company`, el modelo de la
 * cotización) y devuelve copias; cualquier otro valor (números, fechas, `Blob`,
 * elementos de React, instancias de clases) y los strings con forma de URL
 * pasan tal cual.
 */
export function stripPdfEmojiDeep<T>(value: T): T {
  if (typeof value === "string") return (URL_LIKE.test(value) ? value : stripPdfEmoji(value)) as T;
  if (Array.isArray(value)) return value.map((item) => stripPdfEmojiDeep(item)) as T;
  if (value !== null && typeof value === "object" && isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, stripPdfEmojiDeep(item)])) as T;
  }
  return value;
}
