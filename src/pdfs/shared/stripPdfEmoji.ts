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
 * (323 de los 342 del BMP). De los 19 que ninguna fuente de la pila tiene, los
 * que tienen un equivalente que sí se imprime se cambian por él
 * (`BMP_SUBSTITUTES`: ✅ → ✔, ❌ → ✗, ➕ → +…; la única excepción a "solo se
 * quitan emoji") y el resto se quita (`BMP_UNPRINTABLE`: ✨, ⏰…). Una ZWJ
 * fuera de un emoji y cualquier otro texto no se tocan.
 *
 * Espacios: quitar un emoji no deja uno doble ("Entrega 🚚 hoy" queda
 * "Entrega hoy", "🚚 Entrega" queda "Entrega"); ver `stripPdfEmoji`.
 */

const EMOJI_SEQUENCE =
  /\p{Regional_Indicator}{1,2}|\p{Emoji_Modifier}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?[\u{E0020}-\u{E007F}]*(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)*/gu;

const COMPOUND = /[\u200D\u{E0020}-\u{E007F}]|\p{Emoji_Modifier}/u;
const FIRST_NON_BMP = 0x10000;

/**
 * Pictogramas del BMP que ni Arimo ni el respaldo tienen, con un equivalente
 * que la pila sí imprime (comprobado con fontkit sobre los archivos servidos).
 */
const BMP_SUBSTITUTES: Readonly<Record<string, string>> = {
  "✅": "✔", // U+2705 → U+2714
  "❌": "✗", // U+274C → U+2717
  "❎": "☒", // U+274E → U+2612
  "➕": "+", // U+2795
  "➖": "−", // U+2796 → U+2212
  "➗": "÷", // U+2797 → U+00F7
  "❔": "?", // U+2754
  "❕": "!", // U+2755
  "⏫": "⇈", // U+23EB → U+21C8
  "⏬": "⇊", // U+23EC → U+21CA
};

/** Los demás pictogramas del BMP sin glifo en la pila y sin equivalente razonable: se quitan. */
const BMP_UNPRINTABLE: ReadonlySet<string> = new Set(["⏰", "✊", "✨", "➰", "➿", "〰", "〽", "㊗", "㊙"]);

const replaceBmpPictograph = (base: string): string =>
  BMP_SUBSTITUTES[base] ?? (BMP_UNPRINTABLE.has(base) ? "" : base);

const replaceSequence = (sequence: string): string => {
  const [base] = Array.from(sequence);
  if (/^[0-9#*]/.test(sequence)) return base;
  if (/^(?:\p{Regional_Indicator}|\p{Emoji_Modifier})/u.test(sequence)) return "";
  if (COMPOUND.test(sequence)) return "";
  return (base.codePointAt(0) ?? 0) >= FIRST_NON_BMP ? "" : replaceBmpPictograph(base);
};

const TRAILING_SPACE = /\s+$/;
const LEADING_SPACE = /^\s+/;

/**
 * Quita los emoji de un texto según las reglas de arriba.
 *
 * Al quitar uno no deja un espacio doble: si la eliminación junta espacios de
 * los dos lados, se queda uno de los dos (el que lleva un salto de línea, si
 * alguno lo lleva), y al principio o al final del texto se quitan los dos. Los
 * demás espacios del texto no se tocan.
 */
export const stripPdfEmoji = (text: string): string => {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(EMOJI_SEQUENCE)) {
    const start = match.index;
    const end = start + match[0].length;
    out += text.slice(last, start);
    last = end;
    const replacement = replaceSequence(match[0]);
    if (replacement !== "") {
      out += replacement;
      continue;
    }
    const before = TRAILING_SPACE.exec(out)?.[0] ?? "";
    const after = LEADING_SPACE.exec(text.slice(end))?.[0] ?? "";
    const atStart = out.length === before.length;
    const atEnd = end + after.length === text.length;
    if (atStart || atEnd) {
      out = out.slice(0, out.length - before.length);
      last += after.length;
    } else if (before && after) {
      if (before.includes("\n") && !after.includes("\n")) last += after.length;
      else out = out.slice(0, out.length - before.length);
    }
  }
  return out + text.slice(last);
};

/**
 * Un string que es SOLO una URL (imágenes, data URLs): nunca se toca. Un texto
 * libre que empieza con un enlace ("https://… revisar 🚚") lleva espacios y se
 * limpia como cualquier otro.
 */
const URL_ONLY = /^(?:https?:|data:|blob:)\S*$/i;

const isPlainObject = (value: object): value is Record<string, unknown> => {
  if ("$$typeof" in value) return false; // un elemento de React
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * `stripPdfEmoji` sobre cada string de las props de un documento: entra en
 * arrays y objetos planos (el JSON del API, `company`, el modelo de la
 * cotización) y devuelve copias; cualquier otro valor (números, fechas, `Blob`,
 * elementos de React, instancias de clases) y los strings que son solo una URL
 * pasan tal cual.
 *
 * Por eso las props de un documento tienen que ser datos planos: arrays y
 * objetos planos. Un `Map`, un `Set` o una instancia de clase NO se recorren, y
 * los emoji que lleven dentro llegan al PDF (y desaparecen sin aviso).
 */
export function stripPdfEmojiDeep<T>(value: T): T {
  if (typeof value === "string") return (URL_ONLY.test(value) ? value : stripPdfEmoji(value)) as T;
  if (Array.isArray(value)) return value.map((item) => stripPdfEmojiDeep(item)) as T;
  if (value !== null && typeof value === "object" && isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, stripPdfEmojiDeep(item)])) as T;
  }
  return value;
}
