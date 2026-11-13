import { inflateSync } from "node:zlib";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement, Fragment, type ComponentType, type ReactElement, type ReactNode } from "react";

/**
 * MAQUETAR de verdad un documento de react-pdf en las pruebas unitarias.
 *
 * El runner compila el JSX con su propio runtime: un elemento sale como
 * `{ __pw_type: "jsx", type, props, key }`, no como un elemento de React, y el
 * reconciliador de react-pdf lo rechaza ("Objects are not valid as a React
 * child"). `toReactElement` traduce esos objetos a `createElement` de `react`,
 * envuelve cada componente de función para traducir también lo que devuelve al
 * renderizarse y cambia su `Fragment` (un objeto propio) por el de React. El
 * layout (`@react-pdf/layout`) y el render son los reales: solo cambia la forma
 * del objeto del elemento.
 */

type PwElement = { __pw_type: "jsx"; type: unknown; props: Record<string, unknown>; key?: unknown };

const isPwElement = (node: unknown): node is PwElement =>
  typeof node === "object" && node !== null && (node as { __pw_type?: unknown }).__pw_type === "jsx";

const wrappedComponents = new WeakMap<object, ComponentType<Record<string, unknown>>>();

const wrapType = (type: unknown): unknown => {
  if (typeof type === "object" && type !== null && "__pw_jsx_fragment" in type) return Fragment;
  if (typeof type !== "function") return type;
  const cached = wrappedComponents.get(type);
  if (cached) return cached;
  const component = type as (props: Record<string, unknown>) => unknown;
  const wrapped = (props: Record<string, unknown>) => toReactNode(component(props));
  wrappedComponents.set(type, wrapped as ComponentType<Record<string, unknown>>);
  return wrapped;
};

const convertProps = (props: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, key === "children" ? toReactNode(value) : value]),
  );

function toReactNode(node: unknown): ReactNode {
  if (Array.isArray(node)) return node.map(toReactNode);
  if (isPwElement(node)) {
    const props = convertProps(node.props ?? {});
    if (node.key !== undefined && node.key !== null) props.key = node.key;
    return createElement(wrapType(node.type) as ComponentType, props);
  }
  if (typeof node === "object" && node !== null && "props" in node && "type" in node) {
    // Un elemento real de React (p. ej. de `createElement` en la prueba): su
    // tipo y sus hijos pueden traer JSX del runner.
    const element = node as ReactElement<Record<string, unknown>>;
    const props = convertProps(element.props ?? {});
    if (element.key !== null) props.key = element.key;
    return createElement(wrapType(element.type) as ComponentType, props);
  }
  return node as ReactNode;
}

export const toReactElement = (node: unknown) => toReactNode(node) as ReactElement;

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
