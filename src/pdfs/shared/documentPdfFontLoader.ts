/**
 * Registro en el navegador de las fuentes de la base de PDFs con reintento tras
 * un fallo (EC-942): Arimo (EC-858) y su respaldo de símbolos (EC-958).
 *
 * Si react-pdf descarga la fuente por su cuenta, guarda la promesa de carga de
 * cada archivo y la reutiliza aunque se haya rechazado: tras un fallo de red
 * ningún PDF volvía a generarse hasta recargar la página. Aquí la descarga es
 * nuestra: se piden todos los archivos, se comprueba que llegó una fuente y
 * solo entonces se registran en react-pdf (`Font.register`, API pública) desde
 * URLs `blob:`, que react-pdf lee en local, sin red. Si algo falla no se
 * registra nada y el siguiente PDF vuelve a intentarlo.
 *
 * Las dos familias se registran juntas o ninguna: los estilos piden la pila
 * `[Arimo, respaldo]` (`DOCUMENT_PDF_FONT_STACK`), y una familia de la pila sin
 * registrar hace que react-pdf lance "Font family not registered" en TODOS los
 * PDF, no solo en los que llevan símbolos.
 *
 * Este módulo NO importa `@react-pdf/*`: lo usa `renderPdfBlob`, que no puede
 * meter la librería en el chunk inicial (EC-700); recibe el `Font` del
 * renderer ya cargado. En Node (las pruebas que maquetan un PDF real) no se
 * usa: `documentPdfFonts` registra los archivos por ruta de disco al importar.
 */

/** Familia del texto de la base; los estilos la usan con `fontWeight` normal o `"bold"`. */
export const DOCUMENT_PDF_FONT_FAMILY = "Arimo";

/**
 * Respaldo de símbolos (EC-958): ✓, ⇒, ★, ①, ⚠… que Arimo no tiene. Un solo
 * peso; react-pdf lo usa también en negritas (toma el peso más cercano).
 * Archivo y licencias en `public/fonts/pdf/` (ver su README).
 */
export const DOCUMENT_PDF_FALLBACK_FONT_FAMILY = "PdfSymbolsFallback";

/**
 * Pila de familias de los estilos de la base y de la cotización: textkit elige
 * por punto de código la primera que tenga el glifo. Es la única fuente de
 * verdad para `fontFamily`; ninguna hoja de estilos debe nombrar las familias
 * por separado. (`string[]` y no tupla `readonly`: es el tipo que acepta el
 * `fontFamily` de react-pdf; textkit la copia antes de usarla.)
 */
export const DOCUMENT_PDF_FONT_STACK: string[] = [DOCUMENT_PDF_FONT_FAMILY, DOCUMENT_PDF_FALLBACK_FONT_FAMILY];

/**
 * Los archivos de `public/fonts/pdf/` que se registran, con su familia y peso.
 * Tienen que ser TTF u OTF: `isFontFile` solo reconoce esas firmas, así que un
 * WOFF/WOFF2 se tomaría por "no es una fuente".
 */
export const DOCUMENT_PDF_FONT_FILES = [
  { file: "Arimo-Regular.ttf", family: DOCUMENT_PDF_FONT_FAMILY, fontWeight: "normal" },
  { file: "Arimo-Bold.ttf", family: DOCUMENT_PDF_FONT_FAMILY, fontWeight: "bold" },
  { file: "PdfSymbolsFallback-Regular.ttf", family: DOCUMENT_PDF_FALLBACK_FONT_FAMILY, fontWeight: "normal" },
] as const;

/** Donde sirve `public/` los archivos en el navegador. */
export const DOCUMENT_PDF_FONT_PUBLIC_PATH = "/fonts/pdf";

/** Lo que recibe `Font.register` para una familia (misma forma que la de react-pdf). */
export interface PdfFontRegistration {
  family: string;
  fonts: { src: string; fontWeight: (typeof DOCUMENT_PDF_FONT_FILES)[number]["fontWeight"] }[];
}

/** Lo único que se usa del `Font` de react-pdf (misma forma que su `register`). */
export interface PdfFontRegistry {
  register(data: PdfFontRegistration): void;
}

/**
 * Las registraciones de `Font.register`, una por familia, con sus archivos en
 * el orden de `DOCUMENT_PDF_FONT_FILES`. El `src` de cada archivo lo da
 * `srcOf(index)`: una URL `blob:` en el navegador, una ruta de disco en Node.
 */
export function documentPdfFontRegistrations(srcOf: (index: number) => string): PdfFontRegistration[] {
  const byFamily = new Map<string, PdfFontRegistration>();
  DOCUMENT_PDF_FONT_FILES.forEach(({ family, fontWeight }, index) => {
    const registration = byFamily.get(family) ?? { family, fonts: [] };
    registration.fonts.push({ src: srcOf(index), fontWeight });
    byFamily.set(family, registration);
  });
  return [...byFamily.values()];
}

/** No se pudo descargar la fuente, o lo que llegó no es una fuente. */
export class PdfFontLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PdfFontLoadError";
  }
}

/**
 * ¿Empiezan los bytes como una fuente TrueType u OpenType? Un 200 con otra
 * cosa (una página HTML) se registraría y react-pdf guardaría su
 * "Unknown font format" para siempre, que es justo lo que se evita aquí.
 */
const isFontFile = (bytes: Uint8Array): boolean => {
  if (bytes.length < 4) return false;
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  return tag === "\u0000\u0001\u0000\u0000" || tag === "true" || tag === "OTTO";
};

interface FontLoaderDeps {
  fetch: (url: string) => Promise<Response>;
  createObjectURL: (blob: Blob) => string;
}

const downloadFont = async (deps: FontLoaderDeps, url: string): Promise<Blob> => {
  try {
    const response = await deps.fetch(url);
    if (!response.ok) throw new PdfFontLoadError(`La fuente ${url} respondió ${response.status}`);
    const blob = await response.blob();
    if (!isFontFile(new Uint8Array(await blob.slice(0, 4).arrayBuffer()))) {
      throw new PdfFontLoadError(`La respuesta de ${url} no es una fuente`);
    }
    return blob;
  } catch (error) {
    throw error instanceof PdfFontLoadError
      ? error
      : new PdfFontLoadError(`No se pudo descargar la fuente ${url}`, { cause: error });
  }
};

/** Una URL `blob:` por archivo, en el orden de `DOCUMENT_PDF_FONT_FILES`. */
export type DocumentPdfFontUrls = readonly string[];

/**
 * Las dos mitades del registro, separadas para que `renderPdfBlob` empiece la
 * descarga a la vez que carga los chunks del renderer y del documento: la
 * descarga no necesita `Font`, solo el registro.
 */
export interface DocumentPdfFontLoader {
  /** Descarga y valida los archivos; devuelve sus URLs `blob:`. */
  download(): Promise<DocumentPdfFontUrls>;
  /** Registra las dos familias en react-pdf; solo la primera vez hace algo. */
  register(font: PdfFontRegistry, urls: DocumentPdfFontUrls): void;
}

/**
 * Crea un cargador con su propio estado (las pruebas inyectan `fetch`).
 *
 * - Llamadas simultáneas a `download` comparten UNA descarga por archivo (la
 *   misma promesa).
 * - Si falla, se olvida esa promesa (solo si sigue siendo la vigente) y la
 *   siguiente llamada vuelve a descargar. Si falla solo uno de los archivos,
 *   el reintento vuelve a pedir también los que sí llegaron: se acepta para
 *   no guardar estado por archivo en un caso raro.
 * - Tras el éxito, la promesa resuelta se queda: nunca se descarga de nuevo, y
 *   `register` registra las dos familias una sola vez.
 *
 * Las URLs `blob:` no se revocan: el registro dura lo que dura la página y
 * react-pdf podría leerlas en cualquier render posterior.
 */
export function createDocumentPdfFontLoader(
  deps: FontLoaderDeps,
  baseUrl = DOCUMENT_PDF_FONT_PUBLIC_PATH,
): DocumentPdfFontLoader {
  let pending: Promise<DocumentPdfFontUrls> | null = null;
  let registered = false;

  const load = async (): Promise<DocumentPdfFontUrls> => {
    const blobs = await Promise.all(DOCUMENT_PDF_FONT_FILES.map(({ file }) => downloadFont(deps, `${baseUrl}/${file}`)));
    return blobs.map((blob) => deps.createObjectURL(blob));
  };

  return {
    download() {
      if (pending) return pending;
      const attempt = load().catch((error: unknown) => {
        if (pending === attempt) pending = null;
        throw error;
      });
      pending = attempt;
      return attempt;
    },
    register(font, urls) {
      if (registered) return;
      documentPdfFontRegistrations((index) => urls[index]).forEach((registration) => font.register(registration));
      registered = true;
    },
  };
}

/**
 * El de la página: `fetch` y `URL.createObjectURL` del navegador. Se resuelven
 * al llamar (no al importar) para que el módulo se pueda importar en Node.
 */
export const documentPdfFontLoader = createDocumentPdfFontLoader({
  fetch: (url) => fetch(url),
  createObjectURL: (blob) => URL.createObjectURL(blob),
});
