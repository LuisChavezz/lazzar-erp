import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  createDocumentPdfFontLoader,
  DOCUMENT_PDF_FALLBACK_FONT_FAMILY,
  DOCUMENT_PDF_FONT_FAMILY,
  PdfFontLoadError,
  type PdfFontRegistry,
} from "@/src/pdfs/shared/documentPdfFontLoader";

/**
 * EC-942: las fuentes de los PDFs (Arimo y, desde EC-958, su respaldo de
 * símbolos) se descargan y registran en el navegador justo antes de renderizar
 * (`download` + `register`), y un fallo ya no deja la página sin PDFs hasta
 * recargar: el siguiente intento vuelve a descargar. Las dos familias se
 * registran juntas o ninguna. Con `fetch`, `Font` y
 * `createObjectURL` falsos; las respuestas llevan los bytes reales de
 * `public/fonts/pdf/`.
 */

const FONT_DIR = path.join(process.cwd(), "public/fonts/pdf");
const fontBytes = (file: string) => readFileSync(path.join(FONT_DIR, file));

const fontResponse = (url: string) => new Response(fontBytes(path.basename(url)), { status: 200 });

type Registration = Parameters<PdfFontRegistry["register"]>[0];

/** `fetch` falso que registra cada URL pedida y responde con `respond`. */
const harness = (respond: (url: string, call: number) => Promise<Response>) => {
  const requested: string[] = [];
  const registrations: Registration[] = [];
  const font: PdfFontRegistry = { register: (data) => void registrations.push(data) };
  let objectUrls = 0;
  const loader = createDocumentPdfFontLoader({
    fetch: (url) => {
      requested.push(url);
      return respond(url, requested.length);
    },
    createObjectURL: () => `blob:test/${++objectUrls}`,
  });
  /** Lo mismo que hace `renderPdfBlob`: descargar y, ya con el `Font`, registrar. */
  const ensure = async (target: PdfFontRegistry) => loader.register(target, await loader.download());
  return { loader, ensure, font, requested, registrations };
};

const FILES = [
  "/fonts/pdf/Arimo-Regular.ttf",
  "/fonts/pdf/Arimo-Bold.ttf",
  "/fonts/pdf/PdfSymbolsFallback-Regular.ttf",
];

/** Lo que se espera de `Font.register` con las URLs `blob:` dadas, en orden de archivo. */
const expectedRegistrations = (regular: string, bold: string, fallback: string) => [
  {
    family: DOCUMENT_PDF_FONT_FAMILY,
    fonts: [
      { src: regular, fontWeight: "normal" },
      { src: bold, fontWeight: "bold" },
    ],
  },
  { family: DOCUMENT_PDF_FALLBACK_FONT_FAMILY, fonts: [{ src: fallback, fontWeight: "normal" }] },
];

test("descarga los tres archivos y registra las dos familias una sola vez desde URLs blob:", async () => {
  const { ensure, font, requested, registrations } = harness(async (url) => fontResponse(url));

  await ensure(font);

  expect([...requested].sort()).toEqual([...FILES].sort());
  expect(registrations).toEqual(expectedRegistrations("blob:test/1", "blob:test/2", "blob:test/3"));
});

test("register solo llama a Font.register la primera vez", () => {
  const { loader, font, registrations } = harness(async (url) => fontResponse(url));

  loader.register(font, ["blob:a", "blob:b", "blob:c"]);
  loader.register(font, ["blob:d", "blob:e", "blob:f"]);

  expect(registrations).toEqual(expectedRegistrations("blob:a", "blob:b", "blob:c"));
});

test("tras el éxito no vuelve a descargar ni a registrar", async () => {
  const { ensure, font, requested, registrations } = harness(async (url) => fontResponse(url));

  await ensure(font);
  await ensure(font);
  await ensure(font);

  expect(requested).toHaveLength(3);
  expect(registrations).toHaveLength(2);
});

test("si la red falla no registra nada, y el siguiente intento vuelve a descargar y registra", async () => {
  let offline = true;
  const { ensure, font, requested, registrations } = harness(async (url) => {
    if (offline) throw new TypeError("Failed to fetch");
    return fontResponse(url);
  });

  const error = await ensure(font).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(PdfFontLoadError);
  expect((error as Error).cause).toBeInstanceOf(TypeError);
  expect(registrations).toHaveLength(0);

  offline = false;
  await ensure(font);

  expect(requested).toHaveLength(6);
  expect(registrations).toHaveLength(2);
});

test("una respuesta que no es ok es un fallo de la fuente y se reintenta", async () => {
  let status = 404;
  const { ensure, font, registrations } = harness(async (url) =>
    status === 200 ? fontResponse(url) : new Response("<html>Not found</html>", { status }),
  );

  await expect(ensure(font)).rejects.toBeInstanceOf(PdfFontLoadError);
  expect(registrations).toHaveLength(0);

  status = 200;
  await ensure(font);
  expect(registrations).toHaveLength(2);
});

test("un 200 que no es una fuente (una página HTML) es un fallo y no se registra", async () => {
  const { ensure, font, registrations } = harness(async () => new Response("<!DOCTYPE html><html></html>"));

  await expect(ensure(font)).rejects.toBeInstanceOf(PdfFontLoadError);
  expect(registrations).toHaveLength(0);
});

test("si falla solo el respaldo de símbolos no registra ni Arimo, y el reintento registra las dos", async () => {
  let failFallback = true;
  const { ensure, font, requested, registrations } = harness(async (url) => {
    if (failFallback && url.endsWith("PdfSymbolsFallback-Regular.ttf")) throw new TypeError("Failed to fetch");
    return fontResponse(url);
  });

  await expect(ensure(font)).rejects.toBeInstanceOf(PdfFontLoadError);
  expect(registrations).toHaveLength(0);

  failFallback = false;
  await ensure(font);
  expect(requested).toHaveLength(6);
  expect(registrations.map(({ family }) => family)).toEqual([
    DOCUMENT_PDF_FONT_FAMILY,
    DOCUMENT_PDF_FALLBACK_FONT_FAMILY,
  ]);
});

test("un respaldo que responde HTML es un fallo de la fuente, y el siguiente intento lo vuelve a pedir", async () => {
  let html = true;
  const { ensure, font, registrations } = harness(async (url) =>
    html && url.endsWith("PdfSymbolsFallback-Regular.ttf") ? new Response("<!DOCTYPE html>") : fontResponse(url),
  );

  await expect(ensure(font)).rejects.toBeInstanceOf(PdfFontLoadError);
  expect(registrations).toHaveLength(0);

  html = false;
  await ensure(font);
  expect(registrations).toHaveLength(2);
});

test("si falla solo uno de los archivos de Arimo no registra ninguno", async () => {
  let failBold = true;
  const { ensure, font, registrations } = harness(async (url) => {
    if (failBold && url.endsWith("Bold.ttf")) throw new TypeError("network error");
    return fontResponse(url);
  });

  await expect(ensure(font)).rejects.toBeInstanceOf(PdfFontLoadError);
  expect(registrations).toHaveLength(0);

  failBold = false;
  await ensure(font);
  expect(registrations).toHaveLength(2);
});

test("dos llamadas simultáneas comparten una sola descarga por archivo", async () => {
  const pendingResponses: (() => void)[] = [];
  const { loader, ensure, font, requested, registrations } = harness(
    (url) => new Promise((resolve) => pendingResponses.push(() => resolve(fontResponse(url)))),
  );

  expect(loader.download()).toBe(loader.download());
  const first = ensure(font);
  const second = ensure(font);

  await expect.poll(() => pendingResponses.length).toBe(3);
  pendingResponses.forEach((release) => release());
  await Promise.all([first, second]);

  expect(requested).toHaveLength(3);
  expect(registrations).toHaveLength(2);
});

test("dos llamadas simultáneas que fallan reciben el mismo error, y la siguiente reintenta", async () => {
  let offline = true;
  const { ensure, font, requested, registrations } = harness(async (url) => {
    if (offline) throw new TypeError("Failed to fetch");
    return fontResponse(url);
  });

  const [a, b] = await Promise.all([ensure(font).catch((e) => e), ensure(font).catch((e) => e)]);
  expect(a).toBeInstanceOf(PdfFontLoadError);
  expect(b).toBe(a);
  expect(requested).toHaveLength(3);

  offline = false;
  await ensure(font);
  expect(requested).toHaveLength(6);
  expect(registrations).toHaveLength(2);
});

test("el reintento tras un fallo también lo comparten las llamadas simultáneas", async () => {
  const releases: (() => void)[] = [];
  let call = 0;
  const { loader, ensure, font, requested, registrations } = harness((url) => {
    call += 1;
    if (call <= 3) return Promise.reject(new TypeError("Failed to fetch"));
    return new Promise((resolve) => releases.push(() => resolve(fontResponse(url))));
  });

  await expect(ensure(font)).rejects.toBeInstanceOf(PdfFontLoadError);
  expect(loader.download()).toBe(loader.download());
  const second = ensure(font);
  const third = ensure(font);

  await expect.poll(() => releases.length).toBe(3);
  releases.forEach((release) => release());
  await Promise.all([second, third]);

  expect(requested).toHaveLength(6);
  expect(registrations).toHaveLength(2);
});
