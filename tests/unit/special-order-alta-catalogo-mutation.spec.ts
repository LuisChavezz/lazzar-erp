import { expect, test } from "@playwright/test";
import { MutationObserver, QueryClient, type QueryKey } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import toast from "react-hot-toast";
import { altaCatalogoMutationOptions } from "@/src/features/special-orders/hooks/useAltaCatalogoLinea";

/**
 * Pruebas unitarias de EC-671: la mutación de "Dar de alta en catálogo"
 * (`altaCatalogoMutationOptions`, la que usa `useAltaCatalogoLinea`) solo
 * calla el toast de un rechazo de la categoría cuando SE ENVIÓ una, y solo
 * relee el detalle de ventas y "Programar pedido" cuando el alta guardó la
 * categoría en la línea. Sin React: la mutación corre con un `MutationObserver`
 * sobre un `QueryClient` real, con la petición (`v1_api.post`) y los toasts
 * sustituidos. Corren con `npm run test:unit`.
 */

const PEDIDO_ID = 387;
const DETALLE_ID = 771;

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

interface Run {
  /** Cuerpos enviados a `alta-catalogo`. */
  bodies: unknown[];
  /** Llaves invalidadas, en orden. */
  invalidated: QueryKey[];
  toasts: { kind: "success" | "error"; message: string }[];
}

/**
 * Ejecuta UNA mutación con `variables`. `respond` decide la respuesta del
 * POST: devuelve los datos del `201` o lanza el error.
 */
const runAlta = async (
  variables: { categoriaProductoId?: number },
  respond: () => unknown,
): Promise<Run> => {
  const run: Run = { bodies: [], invalidated: [], toasts: [] };
  const { v1_api } = await import("@/src/api/v1.api");
  const originalPost = v1_api.post;
  const originalSuccess = toast.success;
  const originalError = toast.error;
  v1_api.post = (async (url: string, body: unknown) => {
    if (!url.includes(`/produccion/pedidos-especiales/${PEDIDO_ID}/alta-catalogo/`)) {
      throw new Error(`POST inesperado en la prueba: ${url}`);
    }
    run.bodies.push(body);
    return { data: respond() };
  }) as typeof v1_api.post;
  toast.success = ((message: string) => {
    run.toasts.push({ kind: "success", message });
    return "";
  }) as typeof toast.success;
  toast.error = ((message: string) => {
    run.toasts.push({ kind: "error", message });
    return "";
  }) as typeof toast.error;

  const queryClient = new QueryClient();
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = ((filters?: { queryKey?: QueryKey }) => {
    if (filters?.queryKey) run.invalidated.push(filters.queryKey);
    return originalInvalidate(filters);
  }) as typeof queryClient.invalidateQueries;

  try {
    const observer = new MutationObserver(
      queryClient,
      altaCatalogoMutationOptions(queryClient, PEDIDO_ID, DETALLE_ID),
    );
    await observer.mutate(variables).catch(() => undefined);
  } finally {
    v1_api.post = originalPost;
    toast.success = originalSuccess;
    toast.error = originalError;
  }
  return run;
};

const VARIANTES = [{ id: 72, talla_nombre: "G" }, { id: 73, talla_nombre: "XG" }];
const fail = (status: number, data: unknown) => () => {
  throw httpError(status, data);
};

test.describe("altaCatalogoMutationOptions: invalidaciones (EC-671)", () => {
  test("con categoría: además del detalle especial, relee el pedido de ventas y Programar", async () => {
    const run = await runAlta({ categoriaProductoId: 131 }, () => VARIANTES);
    expect(run.bodies).toEqual([{ pedido_detalle_id: DETALLE_ID, categoria_producto: 131 }]);
    expect(run.invalidated).toEqual([
      ["product-variants"],
      ["pedido-detail", PEDIDO_ID],
      ["pedido-programar", PEDIDO_ID],
      ["special-order-detail", PEDIDO_ID],
    ]);
    expect(run.toasts).toEqual([{ kind: "success", message: "Se dieron de alta 2 SKU en catálogo" }]);
  });

  test("sin categoría: no toca el pedido de ventas ni Programar", async () => {
    const run = await runAlta({}, () => VARIANTES.slice(0, 1));
    expect(run.bodies).toEqual([{ pedido_detalle_id: DETALLE_ID }]);
    expect(run.invalidated).toEqual([["product-variants"], ["special-order-detail", PEDIDO_ID]]);
    expect(run.toasts).toEqual([{ kind: "success", message: "Se dio de alta 1 SKU en catálogo" }]);
  });
});

test.describe("altaCatalogoMutationOptions: toasts de error (EC-671)", () => {
  const INVALIDA = { categoria_producto: "Categoría no válida." };
  const TALLAS = { alta_catalogo: "Tallas que no son de la categoría Vestido: UNI." };
  const SKU = { alta_catalogo: "El SKU '10014-703-G' ya existe en catálogo." };

  test("rechazo de la categoría ENVIADA: sin toast (lo muestra el diálogo)", async () => {
    for (const body of [INVALIDA, TALLAS]) {
      const run = await runAlta({ categoriaProductoId: 131 }, fail(400, body));
      expect(run.toasts).toEqual([]);
      expect(run.invalidated).toEqual([]);
    }
  });

  test("el mismo rechazo SIN categoría enviada sí da toast", async () => {
    const run = await runAlta({}, fail(400, TALLAS));
    expect(run.toasts).toEqual([{ kind: "error", message: TALLAS.alta_catalogo }]);
  });

  test("un rechazo ajeno a la categoría da toast aunque se haya enviado una", async () => {
    const run = await runAlta({ categoriaProductoId: 131 }, fail(400, SKU));
    expect(run.toasts).toEqual([{ kind: "error", message: SKU.alta_catalogo }]);
  });

  test("sin pendientes: toast y relee el detalle especial (línea obsoleta)", async () => {
    const message = "La línea no tiene SKU de producción pendientes de alta en catálogo.";
    const run = await runAlta({ categoriaProductoId: 131 }, fail(400, { pedido_detalle_id: message }));
    expect(run.toasts).toEqual([{ kind: "error", message }]);
    expect(run.invalidated).toEqual([["special-order-detail", PEDIDO_ID]]);
  });
});
