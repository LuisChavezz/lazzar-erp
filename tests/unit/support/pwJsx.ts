import { createElement, forwardRef, Fragment, memo, type ComponentType, type ReactElement, type ReactNode } from "react";

/**
 * Elementos de React reales a partir del JSX que compila el runner, para
 * renderizar componentes con un renderer de verdad (react-pdf, `react-dom/server`)
 * o recorrer su árbol.
 *
 * El runner compila el JSX con su propio runtime: un elemento sale como
 * `{ __pw_type: "jsx", type, props, key }`, no como un elemento de React, y el
 * reconciliador de react-pdf lo rechaza ("Objects are not valid as a React
 * child"). `toReactElement` traduce esos objetos a `createElement` de `react`,
 * envuelve cada componente de función para traducir también lo que devuelve al
 * renderizarse y cambia su `Fragment` (un objeto propio) por el de React. El
 * renderer es el real: solo cambia la forma del objeto del elemento.
 */

export type PwElement = { __pw_type: "jsx"; type: unknown; props: Record<string, unknown>; key?: unknown };

export const isPwElement = (node: unknown): node is PwElement =>
  typeof node === "object" && node !== null && (node as { __pw_type?: unknown }).__pw_type === "jsx";

const wrappedComponents = new WeakMap<object, ComponentType<Record<string, unknown>>>();

const wrapType = (type: unknown): unknown => {
  if (typeof type === "object" && type !== null && "__pw_jsx_fragment" in type) return Fragment;
  if (typeof type === "object" && type !== null) {
    // `forwardRef` y `memo` son objetos: lo que devuelve su función también
    // puede traer JSX del runner.
    const cached = wrappedComponents.get(type);
    if (cached) return cached;
    const exotic = type as { render?: (props: unknown, ref: unknown) => unknown; type?: unknown };
    let wrapped: unknown = type;
    if (typeof exotic.render === "function") {
      const render = exotic.render;
      const forwarded = forwardRef((props, ref) => toReactNode(render(props, ref)));
      forwarded.displayName = "PwForwardRef";
      wrapped = forwarded;
    } else if (exotic.type !== undefined && "compare" in (type as object)) {
      wrapped = memo(wrapType(exotic.type) as ComponentType);
    }
    if (wrapped !== type) wrappedComponents.set(type, wrapped as ComponentType<Record<string, unknown>>);
    return wrapped;
  }
  if (typeof type !== "function") return type;
  const cached = wrappedComponents.get(type);
  if (cached) return cached;
  const component = type as (props: Record<string, unknown>) => unknown;
  const wrapped = (props: Record<string, unknown>) => toReactNode(component(props));
  wrappedComponents.set(type, wrapped as ComponentType<Record<string, unknown>>);
  return wrapped;
};

/** ¿El valor trae JSX del runner (directo o en un arreglo)? Los datos se dejan tal cual. */
const carriesJsx = (value: unknown): boolean =>
  isPwElement(value) || (Array.isArray(value) && value.some(carriesJsx));

/**
 * Props con el JSX traducido: `children` siempre, y cualquier otra prop que
 * traiga JSX (`icon`, `badges`, `action`… de los componentes de hoja).
 */
const convertProps = (props: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [
      key,
      key === "children" || carriesJsx(value) ? toReactNode(value) : value,
    ]),
  );

/**
 * `createElement` con los hijos como argumentos: el runtime del runner no
 * distingue hijos estáticos de un arreglo hecho con `map`, y pasarlos como
 * arreglo en `props.children` haría que React pidiera `key` a hijos estáticos.
 */
const elementWithChildren = (type: unknown, props: Record<string, unknown>) => {
  const { children, ...rest } = props;
  const args = Array.isArray(children) ? children : children === undefined ? [] : [children];
  return createElement(type as ComponentType, rest, ...(args as ReactNode[]));
};

function toReactNode(node: unknown): ReactNode {
  if (Array.isArray(node)) return node.map(toReactNode);
  if (isPwElement(node)) {
    const props = convertProps(node.props ?? {});
    if (node.key !== undefined && node.key !== null) props.key = node.key;
    return elementWithChildren(wrapType(node.type), props);
  }
  if (typeof node === "object" && node !== null && "props" in node && "type" in node) {
    // Un elemento real de React (p. ej. de `createElement` en la prueba): su
    // tipo y sus hijos pueden traer JSX del runner.
    const element = node as ReactElement<Record<string, unknown>>;
    const props = convertProps(element.props ?? {});
    if (element.key !== null) props.key = element.key;
    return elementWithChildren(wrapType(element.type), props);
  }
  return node as ReactNode;
}

export const toReactElement = (node: unknown) => toReactNode(node) as ReactElement;
