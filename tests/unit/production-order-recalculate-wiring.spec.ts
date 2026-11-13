import { expect, test } from "@playwright/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ProductionOrderConsumptionSection } from "@/src/features/production-order-consumption/components/ProductionOrderConsumptionSection";
import { RecalculateConsumptionDialog } from "@/src/features/production-order-consumption/components/RecalculateConsumptionDialog";
import { ProductionOrderPageContent } from "@/src/features/production-orders/components/ProductionOrderPageContent";
import { productionOrderOnboardingKey } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import type {
  ProductionOrderConsumoResumen,
  ProductionOrderOnboarding,
} from "@/src/features/production-orders/interfaces/production-order.interface";
import { isPwElement, toReactElement } from "./support/pwJsx";

/**
 * "Recalcular consumos" en la página de la OP (EC-857): la página le pasa al
 * diálogo SOLO los materiales que el backend acepta recalcular (planeado ≠ 0),
 * y el botón de la sección se apaga con su motivo cuando ninguno lo es.
 *
 * La página corre de verdad: su función se llama dentro del render de una
 * sonda (sus hooks son los de la sonda, con un `QueryClient` que ya trae la
 * OP), y se recorre el árbol que devuelve para leer las props con que monta
 * el diálogo y la sección. La sección se renderiza con `react-dom/server`.
 */

const OP_ID = 52;

const resumen = (overrides: Partial<ProductionOrderConsumoResumen>): ProductionOrderConsumoResumen => ({
  producto: 1,
  producto_nombre: "GABARDINA",
  unidad: "M",
  planeado: "120.0000",
  ajustes: "20.0000",
  actual: "140.0000",
  ...overrides,
});

const op = (consumosResumen: ProductionOrderConsumoResumen[]): ProductionOrderOnboarding => ({
  op_id: OP_ID,
  folio_op: "2026-OP-00022",
  estatus_op: 2,
  estatus_op_display: "Preparacion",
  prioridad: 2,
  fecha_inicio: "2026-10-15T08:46:15-06:00",
  fecha_fin: null,
  observaciones: null,
  cerrar_orden: false,
  activo: true,
  empresa: 1,
  empresa_nombre: "LAZZAR",
  sucursal: 1,
  sucursal_nombre: "Toneles",
  pedido: null,
  pedido_folio: null,
  ruta_produccion: null,
  usuario_asignado: 4,
  usuario_nombre: "Operador",
  pedidos: [],
  op_info: "2026-OP-00022",
  productos: [],
  consumos: [
    { consumo_produccion_id: 22, detalles: [{ producto: 1, producto_nombre: "GABARDINA", cantidad: "120.0000" }] },
  ],
  consumos_resumen: consumosResumen,
});

type TreeNode = { type: unknown; props: Record<string, unknown> };

/** Elementos del árbol (JSX del runner o de React), sin renderizar. */
const elementsOf = (node: unknown): TreeNode[] => {
  if (Array.isArray(node)) return node.flatMap(elementsOf);
  if (typeof node !== "object" || node === null || !("props" in node) || !("type" in node)) return [];
  const element = node as TreeNode;
  if (!isPwElement(node) && typeof element.props !== "object") return [];
  return [element, ...elementsOf(element.props?.children)];
};

/** Corre la página con la OP en caché y devuelve las props de sus hijos clave. */
function pagePropsFor(detail: ProductionOrderOnboarding) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(productionOrderOnboardingKey(OP_ID), detail);
  let tree: unknown;
  const Probe = ({ onTree }: { onTree: (value: unknown) => void }) => {
    onTree(ProductionOrderPageContent({ orderId: String(OP_ID) }));
    return null;
  };
  renderToString(
    createElement(QueryClientProvider, { client }, createElement(Probe, { onTree: (value) => (tree = value) })),
  );
  const elements = elementsOf(tree);
  const propsOf = (type: unknown) => {
    const element = elements.find((candidate) => candidate.type === type);
    if (!element) throw new Error("La página no montó el componente esperado");
    return element.props;
  };
  return {
    dialog: propsOf(RecalculateConsumptionDialog) as { products: ProductionOrderConsumoResumen[] },
    section: propsOf(ProductionOrderConsumptionSection) as {
      products: ProductionOrderConsumoResumen[];
      recalculableCount: number;
    },
  };
}

test.describe("Recalcular consumos en la página de la OP", () => {
  const conPlaneado = resumen({ producto: 1 });
  const soloEnAjuste = resumen({
    producto: 2,
    producto_nombre: "BOTON",
    planeado: "0.0000",
    ajustes: "5.0000",
    actual: "5.0000",
  });

  test("el diálogo recibe solo los materiales con planeado; la tabla, todos", () => {
    const { dialog, section } = pagePropsFor(op([conPlaneado, soloEnAjuste]));
    expect(dialog.products.map((row) => row.producto)).toEqual([1]);
    expect(section.products.map((row) => row.producto)).toEqual([1, 2]);
    expect(section.recalculableCount).toBe(1);
  });

  test("sin materiales con planeado, el botón se apaga y dice por qué", () => {
    const { dialog, section } = pagePropsFor(op([soloEnAjuste]));
    expect(dialog.products).toEqual([]);
    expect(section.recalculableCount).toBe(0);

    const html = renderToString(
      toReactElement(
        createElement(ProductionOrderConsumptionSection, {
          consumos: op([soloEnAjuste]).consumos,
          products: section.products,
          recalculableCount: section.recalculableCount,
          isClosed: false,
          onRecalculate: () => {},
        }),
      ),
    );
    const button = /<span title="([^"]*)"><button[^>]*?(disabled="")?[^>]*>Recalcular consumos<\/button>/.exec(html);
    expect(button, "la sección no pintó el botón").not.toBeNull();
    expect(button?.[1]).toBe("Ningún material tiene consumo planeado: no hay nada que recalcular.");
    expect(button?.[0]).toContain('disabled=""');
  });
});
