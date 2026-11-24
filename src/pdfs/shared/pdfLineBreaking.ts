/**
 * Cómo se parten los renglones del texto de las celdas de las tablas de PDF
 * (EC-952): entre palabras, y en sílabas solo la palabra que no cabe entera en
 * su columna. Lo usan la tabla de la cotización (`QuotePdfDocument`) y la de la
 * plantilla base (`PdfLineItemsTable`, `PdfCellText`, `PdfCellCaption`).
 *
 * Por omisión react-pdf penaliza poco el guion (600) y su algoritmo de
 * renglones prefiere "…CORTA CA-" / "BALLERO PIQUE" a un renglón más corto,
 * aunque "CABALLERO" quepa entera en el siguiente.
 *
 * Con la penalización en 10 000 (el "infinito" del algoritmo de Knuth-Plass de
 * `@react-pdf/textkit`), un punto de separación nunca es candidato. Si todas
 * las palabras caben, los renglones se parten solo entre palabras; si una no
 * cabe, el algoritmo no encuentra solución y textkit cae a su "best fit", que
 * parte entre palabras siempre que puede y separa en sílabas solo la palabra
 * que no cabe. Esa palabra se sigue partiendo como antes, que es por lo que
 * EC-891 dejó la separación en las celdas de la base: en sus puntos de
 * separación (el diccionario de textkit), así que un pedazo entre dos de ellos
 * más ancho que la columna se sale igual que con la separación por omisión
 * ("NO/AMAR-" en una columna de talla de 33 pt).
 *
 * Un `hyphenationCallback` que devolviera palabras enteras (como el de los
 * encabezados de la base) la quitaría también para esas palabras.
 *
 * `hyphenationPenalty` lo lee `@react-pdf/layout` de las props del `Text`
 * (`getLayoutOptions`), pero los tipos públicos de `Text` no lo declaran: por
 * eso va en un objeto que se esparce (`<Text {...BREAK_BETWEEN_WORDS}>`). Lo
 * cubren `tests/unit/quote-pdf-table-cells.spec.ts` y
 * `tests/unit/document-pdf-table-word-wrap.spec.ts`; revisarlo al actualizar
 * react-pdf.
 */
export const BREAK_BETWEEN_WORDS = { hyphenationPenalty: 10_000 };
