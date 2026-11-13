import { expect, test } from "@playwright/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { BomStep1 } from "@/src/features/bom/components/BomStep1";
import { BomStepManager } from "@/src/features/bom/components/BomStepManager";
import type { ProductSelectorItem } from "@/src/features/products/interfaces/product-selector.interface";
import { isPwElement, toReactElement } from "./support/pwJsx";

/**
 * EC-887: el asistente de BOM conserva lo elegido al regresar del Paso 2.
 *
 * - `BomStep1` arranca con `initialSelected`: esos materiales salen fijos arriba
 *   y cuentan como seleccionados, sin depender de la búsqueda (que en el
 *   servidor del test no llega a correr).
 * - `BomStepManager` le pasa al Paso 1 su propia selección guardada. Se llama
 *   su función dentro de una sonda y se leen las props del `BomStep1` que monta.
 */

const material = (id: number, nombre: string): ProductSelectorItem => ({
  id,
  nombre,
  codigo: `C${id}`,
  descripcion: "",
  activo: true,
  unidad_id: 12,
  unidad_nombre: "Pieza",
  unidad_abreviatura: "pz",
  tipo: 2,
  categoria_producto: null,
});

const withClient = (node: unknown) =>
  createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    toReactElement(node),
  );

test("BomStep1 starts with the kept selection pinned and counted", () => {
  const html = renderToString(
    withClient(
      createElement(BomStep1, {
        onNext: () => {},
        onBack: () => {},
        initialSelected: [material(1, "SHIFON"), material(2, "DRY OXFORD")],
      }),
    ),
  );
  expect(html).toContain("2 materiales seleccionados");
  expect(html).toContain("SHIFON");
  expect(html).toContain("DRY OXFORD");
  expect(html).toContain('aria-pressed="true"');
});

type TreeNode = { type: unknown; props: Record<string, unknown> };

const elementsOf = (node: unknown): TreeNode[] => {
  if (Array.isArray(node)) return node.flatMap(elementsOf);
  if (typeof node !== "object" || node === null || !("props" in node) || !("type" in node)) return [];
  const element = node as TreeNode;
  if (!isPwElement(node) && typeof element.props !== "object") return [];
  return [element, ...elementsOf(element.props?.children)];
};

test("BomStepManager hands its kept selection back to step 1", () => {
  let step1Props: Record<string, unknown> | undefined;
  const Probe = ({ onTree }: { onTree: (tree: unknown) => void }) => {
    onTree(BomStepManager({ productoVarianteId: 3107, onSuccess: () => {} }));
    return null;
  };
  renderToString(
    createElement(Probe, {
      onTree: (tree: unknown) => {
        step1Props = elementsOf(tree).find((element) => element.type === BomStep1)?.props;
      },
    }),
  );
  expect(step1Props).toBeDefined();
  expect(step1Props?.initialSelected).toEqual([]);
  expect(typeof step1Props?.onNext).toBe("function");
});
