# Fuente de los PDF de documentos

`Arimo-Regular.ttf` y `Arimo-Bold.ttf`: **Arimo** (Google Fonts v36, TTF estáticos
del paquete npm `@expo-google-fonts/arimo@0.4.3`), bajo la **SIL Open Font License
1.1** (`OFL.txt`). Proyecto: https://github.com/googlefonts/arimo.

La usan la plantilla base (`DocumentPdfLayout`, EC-858) y el PDF de cotización
(`QuotePdfStyles.ts`, fuera de la base, vía `withDocumentPdfFont`, EC-892). Sustituye a la Helvetica estándar de react-pdf,
que solo tiene WinAnsi y borraba en silencio cualquier otro carácter (flechas,
≥, comillas tipográficas fuera de WinAnsi…). Arimo tiene las mismas métricas que
Arial/Helvetica, así que las tablas y tarjetas conservan sus anchos.

No incluye emoji ni la palomita ✓/✔. Se sirve como archivo estático y solo se
descarga al generar un PDF.

## Cómo se carga

- **Navegador**: `src/pdfs/shared/documentPdfFontLoader.ts`. `renderPdfBlob`
  empieza a descargar los dos archivos a la vez que los chunks del PDF,
  comprueba que la respuesta sea `ok` y que sea una fuente (TTF/OTF), y solo
  entonces los registra en react-pdf, una vez por página, desde URLs `blob:`. Si
  la descarga falla no se registra nada y el siguiente PDF la vuelve a pedir,
  sin recargar la página (EC-942).
- **Node** (las pruebas que maquetan un PDF real): `src/pdfs/shared/documentPdfFonts.ts`
  la registra al importar, por ruta de disco.
