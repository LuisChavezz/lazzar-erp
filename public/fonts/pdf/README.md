# Fuente de los PDF de documentos

`Arimo-Regular.ttf` y `Arimo-Bold.ttf`: **Arimo** (Google Fonts v36, TTF estáticos
del paquete npm `@expo-google-fonts/arimo@0.4.3`), bajo la **SIL Open Font License
1.1** (`OFL.txt`). Proyecto: https://github.com/googlefonts/arimo.

La registra `src/pdfs/shared/documentPdfFonts.ts` para la plantilla base
(`DocumentPdfLayout`, EC-858). Sustituye a la Helvetica estándar de react-pdf,
que solo tiene WinAnsi y borraba en silencio cualquier otro carácter (flechas,
≥, comillas tipográficas fuera de WinAnsi…). Arimo tiene las mismas métricas que
Arial/Helvetica, así que las tablas y tarjetas conservan sus anchos.

No incluye emoji ni la palomita ✓/✔. Se sirve como archivo estático y react-pdf
la descarga solo al generar un PDF.
