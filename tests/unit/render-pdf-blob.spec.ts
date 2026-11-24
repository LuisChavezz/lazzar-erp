import { expect, test } from "@playwright/test";
import type { ReactElement } from "react";
import {
  PDF_FONT_LOAD_ERROR_MESSAGE,
  PDF_GENERATOR_LOAD_ERROR_MESSAGE,
  renderPdfBlobWith,
  type PdfRenderer,
} from "@/src/utils/renderPdfBlob";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { PdfFontLoadError, type PdfFontRegistry } from "@/src/pdfs/shared/documentPdfFontLoader";

/**
 * Pruebas unitarias de EC-700: `renderPdfBlob` (vía `renderPdfBlobWith`, con
 * el renderer inyectable) renderiza el documento cargado
 * con sus props y traduce a un mensaje legible SOLO el fallo al descargar un
 * chunk (`ChunkLoadError`, como lo nombran Turbopack y webpack); cualquier
 * otro error —al cargar el documento o al renderizar— llega intacto a quien
 * llama, y el mensaje del PDF sobrevive a `extractErrorMessage`. Corren con
 * `npm run test:unit`.
 *
 * Usan un renderer falso: no se renderiza un PDF real en Node. El registro de
 * la fuente (`ensureFonts`, EC-942) también se inyecta: por defecto no hace
 * nada, y las pruebas de la fuente lo sustituyen.
 */

type Props = { label: string };

const SampleDocument = ({ label }: Props) => label;

const chunkLoadError = () => {
  const error = new Error("Failed to load chunk /_next/static/chunks/src_pdfs_x.js");
  error.name = "ChunkLoadError";
  return error;
};

/** Renderer falso que registra el elemento recibido y devuelve `blob`. */
const fakeRenderer = (toBlob: () => Promise<Blob>) => {
  const rendered: ReactElement[] = [];
  const renderer: PdfRenderer = {
    pdf(element) {
      rendered.push(element);
      return { toBlob };
    },
    Font: { register() {} },
  };
  return { rendered, renderer, loadRenderer: async () => renderer };
};

/** `renderPdfBlobWith` con un registro de fuente que no hace nada salvo que se pase otro. */
const renderWith = <P extends object>(
  loadRenderer: Parameters<typeof renderPdfBlobWith<P>>[0],
  loadDocument: Parameters<typeof renderPdfBlobWith<P>>[1],
  props: P,
  ensureFonts: (font: PdfFontRegistry) => Promise<void> = async () => {},
) => renderPdfBlobWith(loadRenderer, loadDocument, props, ensureFonts);

test("renderiza el documento cargado con sus props y devuelve el Blob del renderer", async () => {
  const blob = new Blob(["%PDF-"], { type: "application/pdf" });
  const { rendered, loadRenderer } = fakeRenderer(async () => blob);

  const result = await renderWith(loadRenderer, async () => SampleDocument, {
    label: "Hola",
  });

  expect(result).toBe(blob);
  expect(rendered).toHaveLength(1);
  expect(rendered[0].type).toBe(SampleDocument);
  expect(rendered[0].props).toEqual({ label: "Hola" });
});

test("un error al renderizar el PDF se propaga sin traducir", async () => {
  const original = chunkLoadError();
  const { loadRenderer } = fakeRenderer(() => Promise.reject(original));

  // Aunque se llame ChunkLoadError: solo se traduce el fallo al CARGAR.
  const error = await renderWith(loadRenderer, async () => SampleDocument, {
    label: "x",
  }).catch((e: unknown) => e);

  expect(error).toBe(original);
});

test("un ChunkLoadError al cargar el documento se traduce y conserva el original en cause", async () => {
  const original = chunkLoadError();
  const { loadRenderer } = fakeRenderer(async () => new Blob());

  const error = await renderWith<Props>(
    loadRenderer,
    () => Promise.reject(original),
    { label: "x" },
  ).catch((e: unknown) => e);

  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(PDF_GENERATOR_LOAD_ERROR_MESSAGE);
  expect((error as Error).cause).toBe(original);
});

test("un ChunkLoadError al cargar la librería también se traduce", async () => {
  const original = chunkLoadError();

  const error = await renderWith(
    () => Promise.reject(original),
    async () => SampleDocument,
    { label: "x" },
  ).catch((e: unknown) => e);

  expect((error as Error).message).toBe(PDF_GENERATOR_LOAD_ERROR_MESSAGE);
  expect((error as Error).cause).toBe(original);
});

test("un error de import que no es de chunk se propaga sin cambios", async () => {
  const original = new TypeError("StyleSheet.create is not a function");
  const { loadRenderer } = fakeRenderer(async () => new Blob());

  const error = await renderWith<Props>(
    loadRenderer,
    () => Promise.reject(original),
    { label: "x" },
  ).catch((e: unknown) => e);

  expect(error).toBe(original);
});

// EC-892: la fuente del PDF (Arimo) se descarga al renderizar.
for (const [caso, original] of [
  ["sin red (Chrome)", new TypeError("Failed to fetch")],
  ["descarga cortada a medias (Chrome)", new TypeError("network error")],
  ["sin red (Firefox)", new TypeError("NetworkError when attempting to fetch resource.")],
  ["sin red (Safari)", new TypeError("Load failed")],
  ["respuesta que no es una fuente", new Error("Unknown font format")],
] as const) {
  test(`un fallo al descargar la fuente al renderizar se traduce: ${caso}`, async () => {
    const { loadRenderer } = fakeRenderer(() => Promise.reject(original));

    const error = await renderWith(loadRenderer, async () => SampleDocument, {
      label: "x",
    }).catch((e: unknown) => e);

    expect((error as Error).message).toBe(PDF_FONT_LOAD_ERROR_MESSAGE);
    expect((error as Error).cause).toBe(original);
    expect(extractErrorMessage(error, "fallback")).toBe(PDF_FONT_LOAD_ERROR_MESSAGE);
  });
}

test("un TypeError al renderizar que no es de red se propaga sin cambios", async () => {
  const original = new TypeError("Cannot read properties of undefined (reading 'x')");
  const { loadRenderer } = fakeRenderer(() => Promise.reject(original));

  const error = await renderWith(loadRenderer, async () => SampleDocument, {
    label: "x",
  }).catch((e: unknown) => e);

  expect(error).toBe(original);
});

test("un Error que no es TypeError con «network error» se propaga sin cambios", async () => {
  const original = new Error("network error");
  const { loadRenderer } = fakeRenderer(() => Promise.reject(original));

  const error = await renderWith(loadRenderer, async () => SampleDocument, {
    label: "x",
  }).catch((e: unknown) => e);

  expect(error).toBe(original);
});

// EC-942: la fuente se registra (y se reintenta) antes de renderizar.
test("registra la fuente con el Font del renderer ANTES de renderizar", async () => {
  const blob = new Blob(["%PDF-"], { type: "application/pdf" });
  const { renderer, rendered, loadRenderer } = fakeRenderer(async () => blob);
  const fontsSeen: PdfFontRegistry[] = [];
  let renderedWhenFontsCalled = -1;

  const result = await renderWith(loadRenderer, async () => SampleDocument, { label: "x" }, async (font) => {
    fontsSeen.push(font);
    renderedWhenFontsCalled = rendered.length;
  });

  expect(result).toBe(blob);
  expect(fontsSeen).toEqual([renderer.Font]);
  expect(renderedWhenFontsCalled).toBe(0);
});

test("si falla la descarga de la fuente se traduce y no se renderiza", async () => {
  const original = new PdfFontLoadError("La fuente /fonts/pdf/Arimo-Regular.ttf respondió 404");
  const { rendered, loadRenderer } = fakeRenderer(async () => new Blob());

  const error = await renderWith(loadRenderer, async () => SampleDocument, { label: "x" }, () =>
    Promise.reject(original),
  ).catch((e: unknown) => e);

  expect((error as Error).message).toBe(PDF_FONT_LOAD_ERROR_MESSAGE);
  expect((error as Error).cause).toBe(original);
  expect(rendered).toHaveLength(0);
});

test("un error del registro que no es de descarga se propaga sin cambios", async () => {
  const original = new Error("register exploded");
  const { loadRenderer } = fakeRenderer(async () => new Blob());

  const error = await renderWith(loadRenderer, async () => SampleDocument, { label: "x" }, () =>
    Promise.reject(original),
  ).catch((e: unknown) => e);

  expect(error).toBe(original);
});

test("el mensaje de la fuente ya no pide recargar", () => {
  expect(PDF_FONT_LOAD_ERROR_MESSAGE).toBe("No se pudo cargar la fuente del PDF. Intenta de nuevo.");
});

test("extractErrorMessage conserva el mensaje del PDF ya traducido", () => {
  const translated = new Error(PDF_GENERATOR_LOAD_ERROR_MESSAGE, { cause: chunkLoadError() });

  expect(extractErrorMessage(translated, "fallback")).toBe(PDF_GENERATOR_LOAD_ERROR_MESSAGE);
});
