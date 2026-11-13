import { inflateSync } from "node:zlib";
import { renderToBuffer } from "@react-pdf/renderer";
import { toReactElement } from "./pwJsx";

/**
 * MAQUETAR de verdad un documento de react-pdf en las pruebas unitarias: el
 * JSX del runner se traduce a elementos de React (`toReactElement`) y se
 * renderiza con `renderToBuffer`; el layout (`@react-pdf/layout`) es el real.
 */

/**
 * Texto de cada página de un PDF de react-pdf, en el orden de las páginas.
 *
 * Se sigue el árbol de páginas del PDF: el objeto `/Type /Pages` lista sus
 * páginas en `/Kids`, y cada página apunta a su(s) stream(s) de contenido con
 * `/Contents`. Los streams van comprimidos (Flate) y, con las fuentes estándar
 * (Helvetica), cada cadena va en hexadecimal, un byte por carácter (WinAnsi):
 * basta inflarlos y decodificar los hex. El orden de los streams en el archivo
 * NO es el de las páginas.
 */
export function pdfPageTexts(pdf: Buffer): string[] {
  const raw = pdf.toString("latin1");
  const refs = (text: string) => [...text.matchAll(/(\d+) 0 R/g)].map(([, id]) => id);

  const objectStart = (id: string): number => {
    const match = new RegExp(`(^|\\s)${id} 0 obj`).exec(raw);
    if (!match) throw new Error(`El PDF no tiene el objeto ${id}`);
    return match.index + match[0].length;
  };

  const streamText = (id: string): string => {
    const start = objectStart(id);
    const streamKeyword = raw.indexOf("stream", start);
    const dict = raw.slice(start, streamKeyword);
    const dataStart = raw.indexOf("\n", streamKeyword) + 1;
    const data = pdf.subarray(dataStart, raw.indexOf("endstream", dataStart));
    const content = (dict.includes("/FlateDecode") ? inflateSync(data) : data).toString("latin1");
    return [...content.matchAll(/<([0-9a-fA-F]+)>/g)]
      .map(([, hex]) => Buffer.from(hex, "hex").toString("latin1"))
      .join("");
  };

  const pagesTree = /\/Type\s*\/Pages[\s\S]*?\/Kids\s*\[([^\]]*)\]/.exec(raw);
  if (!pagesTree) throw new Error("El PDF no tiene árbol de páginas");
  return refs(pagesTree[1]).map((pageId) => {
    const start = objectStart(pageId);
    const page = raw.slice(start, raw.indexOf("endobj", start));
    const contents = /\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/.exec(page);
    return contents ? refs(contents[1]).map(streamText).join("") : "";
  });
}

/** Maqueta el documento con react-pdf y devuelve el texto de cada página. */
export const layoutPdfPages = async (document: unknown) =>
  pdfPageTexts(await renderToBuffer(toReactElement(document) as Parameters<typeof renderToBuffer>[0]));
