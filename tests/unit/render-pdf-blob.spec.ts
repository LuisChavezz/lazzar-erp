import { expect, test } from "@playwright/test";
import type { ReactElement } from "react";
import {
  PDF_GENERATOR_LOAD_ERROR_MESSAGE,
  renderPdfBlobWith,
  type PdfRenderer,
} from "@/src/utils/renderPdfBlob";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";

/**
 * Pruebas unitarias de EC-700: `renderPdfBlob` (vía `renderPdfBlobWith`, con
 * el renderer inyectable) renderiza el documento cargado
 * con sus props y traduce a un mensaje legible SOLO el fallo al descargar un
 * chunk (`ChunkLoadError`, como lo nombran Turbopack y webpack); cualquier
 * otro error —al cargar el documento o al renderizar— llega intacto a quien
 * llama, y el mensaje del PDF sobrevive a `extractErrorMessage`. Corren con
 * `npm run test:unit`.
 *
 * Usan un renderer falso: no se renderiza un PDF real en Node.
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
  };
  return { rendered, loadRenderer: async () => renderer };
};

test("renderiza el documento cargado con sus props y devuelve el Blob del renderer", async () => {
  const blob = new Blob(["%PDF-"], { type: "application/pdf" });
  const { rendered, loadRenderer } = fakeRenderer(async () => blob);

  const result = await renderPdfBlobWith(loadRenderer, async () => SampleDocument, {
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
  const error = await renderPdfBlobWith(loadRenderer, async () => SampleDocument, {
    label: "x",
  }).catch((e: unknown) => e);

  expect(error).toBe(original);
});

test("un ChunkLoadError al cargar el documento se traduce y conserva el original en cause", async () => {
  const original = chunkLoadError();
  const { loadRenderer } = fakeRenderer(async () => new Blob());

  const error = await renderPdfBlobWith<Props>(
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

  const error = await renderPdfBlobWith(
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

  const error = await renderPdfBlobWith<Props>(
    loadRenderer,
    () => Promise.reject(original),
    { label: "x" },
  ).catch((e: unknown) => e);

  expect(error).toBe(original);
});

test("extractErrorMessage conserva el mensaje del PDF ya traducido", () => {
  const translated = new Error(PDF_GENERATOR_LOAD_ERROR_MESSAGE, { cause: chunkLoadError() });

  expect(extractErrorMessage(translated, "fallback")).toBe(PDF_GENERATOR_LOAD_ERROR_MESSAGE);
});
