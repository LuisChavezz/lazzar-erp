# Fuentes de los PDF de documentos

`Arimo-Regular.ttf` y `Arimo-Bold.ttf`: **Arimo** (Google Fonts v36, TTF estáticos
del paquete npm `@expo-google-fonts/arimo@0.4.3`), bajo la **SIL Open Font License
1.1** (`OFL.txt`). Proyecto: https://github.com/googlefonts/arimo.

La usan la plantilla base (`DocumentPdfLayout`, EC-858) y el PDF de cotización
(`QuotePdfStyles.ts`, fuera de la base, vía `withDocumentPdfFont`, EC-892). Sustituye a la Helvetica estándar de react-pdf,
que solo tiene WinAnsi y borraba en silencio cualquier otro carácter (flechas,
≥, comillas tipográficas fuera de WinAnsi…). Arimo tiene las mismas métricas que
Arial/Helvetica, así que las tablas y tarjetas conservan sus anchos.

Se sirven como archivos estáticos y solo se descargan al generar un PDF.

## Respaldo de símbolos (EC-958)

`PdfSymbolsFallback-Regular.ttf` (familia `PdfSymbolsFallback`): los símbolos que
Arimo no tiene (✓ ✔ ✗, ⇒ y demás flechas, ★, ①, ⚠, ⌀, ◆, operadores
matemáticos…). Es un subconjunto unido de tres fuentes Noto, todas bajo la
**SIL Open Font License 1.1**:

| Fuente | Paquete npm | Licencia |
|---|---|---|
| Noto Sans Symbols 2 | `@expo-google-fonts/noto-sans-symbols-2@0.4.1` | `OFL-NotoSansSymbols.txt` |
| Noto Sans Symbols | `@expo-google-fonts/noto-sans-symbols@0.4.1` | `OFL-NotoSansSymbols.txt` (el mismo texto) |
| Noto Sans Math | `@expo-google-fonts/noto-sans-math@0.4.2` | `OFL-NotoSansMath.txt` |

Cubre, con Arimo, estos bloques completos o casi: Arrows, Supplemental
Arrows-A/B, Mathematical Operators, Miscellaneous Technical (249/256), Enclosed
Alphanumerics, Geometric Shapes, Miscellaneous Symbols, Dingbats (180/192) y
Miscellaneous Symbols and Arrows (253/256). Cuando dos fuentes tienen el mismo
carácter gana Symbols 2, luego Symbols, luego Math. Lo que Arimo ya tiene no se
incluye. Las unidades por em y las métricas verticales (`hhea`, `OS/2`) son las
de Arimo, así que un renglón con un símbolo mide lo mismo que uno sin él.

No incluye emoji: `src/pdfs/shared/stripPdfEmoji.ts` los quita antes de
renderizar.

**Regenerarla**: `scripts/pdf-fonts/build_symbols_fallback.py` (instrucciones en
el propio script). Usa fonttools en un entorno virtual aparte; ni fonttools ni
los paquetes de Noto son dependencias del proyecto. Con las mismas entradas el
resultado es idéntico byte a byte.

## Cómo se cargan

Los estilos piden la pila `[Arimo, PdfSymbolsFallback]`
(`DOCUMENT_PDF_FONT_STACK`); textkit elige fuente por carácter.

- **Navegador**: `src/pdfs/shared/documentPdfFontLoader.ts`. `renderPdfBlob`
  empieza a descargar los tres archivos a la vez que los chunks del PDF,
  comprueba que cada respuesta sea `ok` y que sea una fuente (TTF/OTF), y solo
  entonces registra las dos familias en react-pdf, una vez por página, desde
  URLs `blob:`. Se registran las dos o ninguna: una familia de la pila sin
  registrar haría fallar todos los PDF. Si la descarga falla no se registra nada
  y el siguiente PDF la vuelve a pedir, sin recargar la página (EC-942).
- **Node** (las pruebas que maquetan un PDF real): `src/pdfs/shared/documentPdfFonts.ts`
  las registra al importar, por ruta de disco.
