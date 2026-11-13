import { inflateSync } from "node:zlib";
import { renderToBuffer } from "@react-pdf/renderer";
import { toReactElement } from "./pwJsx";

/**
 * MAQUETAR de verdad un documento de react-pdf en las pruebas unitarias: el
 * JSX del runner se traduce a elementos de React (`toReactElement`) y se
 * renderiza con `renderToBuffer`; el layout (`@react-pdf/layout`) es el real.
 */

/** Código de una cadena (hex) → texto, por fuente; `null` = fuente estándar (WinAnsi). */
type FontText = Map<string, string> | null;

/**
 * Texto de cada página de un PDF de react-pdf, en el orden de las páginas.
 *
 * Se sigue el árbol de páginas del PDF: el objeto `/Type /Pages` lista sus
 * páginas en `/Kids`, y cada página apunta a su(s) stream(s) de contenido con
 * `/Contents`. Los streams van comprimidos (Flate) y cada cadena va en
 * hexadecimal. Con una fuente estándar (Helvetica) es un byte por carácter
 * (WinAnsi); con una incrustada (la Arimo de la base, EC-858) son índices de
 * glifo que se traducen con el `/ToUnicode` de esa fuente, así que se sigue qué
 * fuente fija cada `Tf`. El orden de los streams en el archivo NO es el de las
 * páginas.
 */
export function pdfPageTexts(pdf: Buffer): string[] {
  const raw = pdf.toString("latin1");
  const refs = (text: string) => [...text.matchAll(/(\d+) 0 R/g)].map(([, id]) => id);

  const objectStart = (id: string): number => {
    const match = new RegExp(`(^|\\s)${id} 0 obj`).exec(raw);
    if (!match) throw new Error(`El PDF no tiene el objeto ${id}`);
    return match.index + match[0].length;
  };

  const objectBody = (id: string): string => {
    const start = objectStart(id);
    return raw.slice(start, raw.indexOf("endobj", start));
  };

  const streamContent = (id: string): string => {
    const start = objectStart(id);
    const streamKeyword = raw.indexOf("stream", start);
    const dict = raw.slice(start, streamKeyword);
    const dataStart = raw.indexOf("\n", streamKeyword) + 1;
    const data = pdf.subarray(dataStart, raw.indexOf("endstream", dataStart));
    return (dict.includes("/FlateDecode") ? inflateSync(data) : data).toString("latin1");
  };

  /** UTF-16BE (como lo escribe un CMap) → texto. */
  const utf16be = (hex: string) => Buffer.from(hex, "hex").swap16().toString("utf16le");

  /** El `/ToUnicode` de una fuente incrustada; `null` si es estándar. */
  const toUnicode = (fontId: string): FontText => {
    const ref = /\/ToUnicode\s+(\d+) 0 R/.exec(objectBody(fontId));
    if (!ref) return null;
    const cmap = streamContent(ref[1]);
    const map = new Map<string, string>();
    for (const [, block] of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const [, code, value] of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
        map.set(code.toLowerCase(), utf16be(value));
      }
    }
    for (const [, block] of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const [, from, to, target] of block.matchAll(
        /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F]+>)/g,
      )) {
        const first = parseInt(from, 16);
        const list = target.startsWith("[") ? [...target.matchAll(/<([0-9a-fA-F]+)>/g)].map(([, v]) => v) : null;
        for (let code = first; code <= parseInt(to, 16); code += 1) {
          const key = code.toString(16).padStart(from.length, "0");
          const value = list
            ? utf16be(list[code - first] ?? "")
            : String.fromCodePoint(parseInt(target.slice(1, -1), 16) + code - first);
          map.set(key, value);
        }
      }
    }
    return map;
  };

  /** Fuentes de la página: nombre del recurso (`F1`) → su texto. */
  const pageFonts = (page: string): Map<string, FontText> => {
    const resourcesRef = /\/Resources\s+(\d+) 0 R/.exec(page);
    const resources = resourcesRef ? objectBody(resourcesRef[1]) : page;
    const fontDict = /\/Font\s*<<([\s\S]*?)>>/.exec(resources);
    const fonts = new Map<string, FontText>();
    for (const [, name, id] of fontDict?.[1].matchAll(/\/(\w+)\s+(\d+) 0 R/g) ?? []) {
      fonts.set(name, toUnicode(id));
    }
    return fonts;
  };

  const streamText = (id: string, fonts: Map<string, FontText>): string => {
    let current: FontText = null;
    let text = "";
    for (const [, font, hex] of streamContent(id).matchAll(/\/(\w+)\s+[\d.]+\s+Tf|<([0-9a-fA-F]+)>/g)) {
      if (font) {
        current = fonts.get(font) ?? null;
      } else if (current) {
        const width = current.keys().next().value?.length ?? 4;
        for (let i = 0; i < hex.length; i += width) text += current.get(hex.slice(i, i + width).toLowerCase()) ?? "";
      } else {
        text += Buffer.from(hex, "hex").toString("latin1");
      }
    }
    return text;
  };

  const pagesTree = /\/Type\s*\/Pages[\s\S]*?\/Kids\s*\[([^\]]*)\]/.exec(raw);
  if (!pagesTree) throw new Error("El PDF no tiene árbol de páginas");
  return refs(pagesTree[1]).map((pageId) => {
    const page = objectBody(pageId);
    const fonts = pageFonts(page);
    const contents = /\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/.exec(page);
    return contents ? refs(contents[1]).map((id) => streamText(id, fonts)).join("") : "";
  });
}

/** Maqueta el documento con react-pdf y devuelve el texto de cada página. */
export const layoutPdfPages = async (document: unknown) =>
  pdfPageTexts(await renderToBuffer(toReactElement(document) as Parameters<typeof renderToBuffer>[0]));
