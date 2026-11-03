import { expect, test } from "@playwright/test";
import {
  PDF_GENERATOR_LOAD_ERROR_MESSAGE,
  renderPdfBlob,
} from "@/src/utils/renderPdfBlob";

/**
 * Pruebas unitarias de EC-700: `renderPdfBlob` traduce a un mensaje legible
 * SOLO el fallo al descargar un chunk (`ChunkLoadError`, como lo nombran
 * Turbopack y webpack); cualquier otro error al cargar el documento llega
 * intacto a quien llama. Corren con `npm run test:unit`.
 *
 * No renderizan un PDF: el runner de Playwright transforma el JSX de los
 * `.tsx` que importa y react-pdf no puede reconciliarlo en Node. El render
 * real se verifica en la app.
 */

type Props = { label: string };

test("un ChunkLoadError al cargar el documento se traduce y conserva el original en cause", async () => {
  const original = new Error("Failed to load chunk /_next/static/chunks/src_pdfs_x.js");
  original.name = "ChunkLoadError";

  const error = await renderPdfBlob<Props>(() => Promise.reject(original), { label: "x" }).catch(
    (e: unknown) => e,
  );

  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(PDF_GENERATOR_LOAD_ERROR_MESSAGE);
  expect((error as Error).cause).toBe(original);
});

test("un error de import que no es de chunk se propaga sin cambios", async () => {
  const original = new TypeError("StyleSheet.create is not a function");

  const error = await renderPdfBlob<Props>(() => Promise.reject(original), { label: "x" }).catch(
    (e: unknown) => e,
  );

  expect(error).toBe(original);
});
