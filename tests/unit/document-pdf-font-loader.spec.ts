import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  createDocumentPdfFontLoader,
  DOCUMENT_PDF_FONT_FAMILY,
  PdfFontLoadError,
  type PdfFontRegistry,
} from "@/src/pdfs/shared/documentPdfFontLoader";

/**
 * EC-942: la fuente de los PDFs (Arimo) se descarga y registra en el navegador
 * justo antes de renderizar, y un fallo ya no deja la página sin PDFs hasta
 * recargar: el siguiente intento vuelve a descargar. Con `fetch`, `Font` y
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
  const ensure = createDocumentPdfFontLoader({
    fetch: (url) => {
      requested.push(url);
      return respond(url, requested.length);
    },
    createObjectURL: () => `blob:test/${++objectUrls}`,
  });
  return { ensure, font, requested, registrations };
};

const FILES = ["/fonts/pdf/Arimo-Regular.ttf", "/fonts/pdf/Arimo-Bold.ttf"];

test("descarga los dos pesos y registra la familia una sola vez desde URLs blob:", async () => {
  const { ensure, font, requested, registrations } = harness(async (url) => fontResponse(url));

  await ensure(font);

  expect([...requested].sort()).toEqual([...FILES].sort());
  expect(registrations).toEqual([
    {
      family: DOCUMENT_PDF_FONT_FAMILY,
      fonts: [
        { src: "blob:test/1", fontWeight: "normal" },
        { src: "blob:test/2", fontWeight: "bold" },
      ],
    },
  ]);
});

test("tras el éxito no vuelve a descargar ni a registrar", async () => {
  const { ensure, font, requested, registrations } = harness(async (url) => fontResponse(url));

  await ensure(font);
  await ensure(font);
  await ensure(font);

  expect(requested).toHaveLength(2);
  expect(registrations).toHaveLength(1);
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

  expect(requested).toHaveLength(4);
  expect(registrations).toHaveLength(1);
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
  expect(registrations).toHaveLength(1);
});

test("un 200 que no es una fuente (una página HTML) es un fallo y no se registra", async () => {
  const { ensure, font, registrations } = harness(async () => new Response("<!DOCTYPE html><html></html>"));

  await expect(ensure(font)).rejects.toBeInstanceOf(PdfFontLoadError);
  expect(registrations).toHaveLength(0);
});

test("si falla solo uno de los dos archivos no registra ninguno", async () => {
  let failBold = true;
  const { ensure, font, registrations } = harness(async (url) => {
    if (failBold && url.endsWith("Bold.ttf")) throw new TypeError("network error");
    return fontResponse(url);
  });

  await expect(ensure(font)).rejects.toBeInstanceOf(PdfFontLoadError);
  expect(registrations).toHaveLength(0);

  failBold = false;
  await ensure(font);
  expect(registrations).toHaveLength(1);
});

test("dos llamadas simultáneas comparten una sola descarga por archivo", async () => {
  const pendingResponses: (() => void)[] = [];
  const { ensure, font, requested, registrations } = harness(
    (url) => new Promise((resolve) => pendingResponses.push(() => resolve(fontResponse(url)))),
  );

  const first = ensure(font);
  const second = ensure(font);
  expect(second).toBe(first);

  await expect.poll(() => pendingResponses.length).toBe(2);
  pendingResponses.forEach((release) => release());
  await Promise.all([first, second]);

  expect(requested).toHaveLength(2);
  expect(registrations).toHaveLength(1);
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
  expect(requested).toHaveLength(2);

  offline = false;
  await ensure(font);
  expect(requested).toHaveLength(4);
  expect(registrations).toHaveLength(1);
});

test("un intento que termina de fallar después de que empezó otro no borra el nuevo", async () => {
  // El primer intento falla; mientras el segundo sigue en curso, el `catch`
  // del primero ya corrió: el segundo no se olvida ni se duplica.
  const releases: (() => void)[] = [];
  let call = 0;
  const { ensure, font, requested, registrations } = harness((url) => {
    call += 1;
    if (call <= 2) return Promise.reject(new TypeError("Failed to fetch"));
    return new Promise((resolve) => releases.push(() => resolve(fontResponse(url))));
  });

  await expect(ensure(font)).rejects.toBeInstanceOf(PdfFontLoadError);
  const second = ensure(font);
  const third = ensure(font);
  expect(third).toBe(second);

  await expect.poll(() => releases.length).toBe(2);
  releases.forEach((release) => release());
  await second;

  expect(requested).toHaveLength(4);
  expect(registrations).toHaveLength(1);
});
