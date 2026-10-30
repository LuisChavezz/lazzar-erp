import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import type {
  SpecialOrderLine,
  SpecialOrderTalla,
} from "@/src/features/special-orders/interfaces/special-order.interface";
import {
  CATALOG_ALTA_INHERITED_OFF,
  CATALOG_ALTA_MIXED,
  CATALOG_ALTA_WITHOUT_CATEGORY,
  catalogAltaInheritedOn,
  getCatalogAltaState,
  resolveAltaCatalogo,
} from "@/src/features/special-orders/utils/catalogAlta";
import { getLineSkuStatus } from "@/src/features/special-orders/utils/lineSkuStatus";
import { parseSampleSkuOnboardingError } from "@/src/features/special-orders/utils/parseSampleSkuOnboardingError";
import {
  buildSampleSku,
  CHOOSE_COLOR_HINT,
  CHOSEN_COLOR_LOADING,
  CHOSEN_COLOR_UNAVAILABLE,
  getSampleSkuPreview,
  LINE_COLOR_WITHOUT_CODE,
} from "@/src/features/special-orders/utils/sampleSkuPreview";

/**
 * Pruebas unitarias de EC-651 y EC-658: la vista previa del SKU por talla (misma
 * fórmula que `variante_onboarding` en nucleo-erp), el estado del alta en la
 * tarjeta, qué admite "Dar de alta en catálogo" y cómo llegan al diálogo los `400` del alta.
 */

const talla = (overrides: Partial<SpecialOrderTalla>): SpecialOrderTalla => ({
  id: 1,
  talla_nombre: "G",
  cantidad: 1,
  sku_produccion: null,
  sku_siguiente: null,
  aplica_catalogo: false,
  sku_catalogo: null,
  lleva_bordado: false,
  bordado_config: null,
  lleva_reflejante: false,
  reflejante_config: null,
  lleva_corte_manga: false,
  corte_manga_config: null,
  lleva_cambio_talla: false,
  cambio_talla_config: null,
  ...overrides,
});

const line = (overrides: Partial<SpecialOrderLine>): SpecialOrderLine => ({
  id: 720,
  producto_nombre_externo: "Chamarra",
  color_nombre: null,
  categoria_producto: { id: 3, nombre: "Chamarra" },
  sku_prefijo: "MP720",
  tallas: [],
  ...overrides,
});

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

test.describe("buildSampleSku", () => {
  test("une con guiones y pasa TODA la cadena a mayúsculas, como el backend", () => {
    expect(buildSampleSku("MP720", "100", "G")).toBe("MP720-100-G");
    expect(buildSampleSku("MP720", "az", "unitalla")).toBe("MP720-AZ-UNITALLA");
  });

  test("solo recorta los extremos de la cadena completa (`.strip()`), no cada parte", () => {
    expect(buildSampleSku("MP720", " 10", "Talla 10 ")).toBe("MP720- 10-TALLA 10");
  });
});

test.describe("getSampleSkuPreview", () => {
  test("usa `sku_siguiente` cuando el backend lo trae", () => {
    const preview = getSampleSkuPreview(
      line({ color_nombre: "Negro", tallas: [talla({ sku_siguiente: "MP720-100-G" })] }),
      null,
    );
    expect(preview.rows.map((row) => row.sku)).toEqual(["MP720-100-G"]);
    expect(preview.blocker).toBeNull();
  });

  test("línea sin color: arma el SKU con el color elegido y omite tallas sin cantidad", () => {
    const preview = getSampleSkuPreview(
      line({
        tallas: [
          talla({ id: 1, talla_nombre: "ch" }),
          talla({ id: 2, talla_nombre: "M", cantidad: 0 }),
        ],
      }),
      { codigo: "703" },
    );
    expect(preview.rows.map((row) => [row.talla.id, row.sku])).toEqual([[1, "MP720-703-CH"]]);
    expect(preview.blocker).toBeNull();
  });

  test("línea sin color y sin elegir todavía: pide el color y no bloquea", () => {
    const preview = getSampleSkuPreview(line({ tallas: [talla({})] }), null);
    expect(preview.rows[0].sku).toBeNull();
    expect(preview.missingSkuHint).toBe(CHOOSE_COLOR_HINT);
    expect(preview.blocker).toBeNull();
  });

  test("color elegido cuyo código aún no se conoce: no pide elegirlo y bloquea el envío", () => {
    const loading = getSampleSkuPreview(line({ tallas: [talla({})] }), "loading");
    expect(loading.rows[0].sku).toBeNull();
    expect(loading.missingSkuHint).not.toBe(CHOOSE_COLOR_HINT);
    expect(loading.blocker).toBe(CHOSEN_COLOR_LOADING);

    const unavailable = getSampleSkuPreview(line({ tallas: [talla({})] }), "unavailable");
    expect(unavailable.missingSkuHint).not.toBe(CHOOSE_COLOR_HINT);
    expect(unavailable.blocker).toBe(CHOSEN_COLOR_UNAVAILABLE);
  });

  test("omite las tallas que ya tienen SKU de producción, como el alta incremental", () => {
    const preview = getSampleSkuPreview(
      line({
        color_nombre: "Negro",
        tallas: [
          talla({ id: 1, sku_produccion: "MP720-100-G" }),
          talla({ id: 2, talla_nombre: "2XG", sku_siguiente: "MP720-100-2XG" }),
        ],
      }),
      null,
    );
    expect(preview.rows.map((row) => [row.talla.id, row.sku])).toEqual([[2, "MP720-100-2XG"]]);
    expect(preview.blocker).toBeNull();
  });

  test("línea con color y `sku_siguiente` en null sin SKU previo: el color no tiene código", () => {
    const preview = getSampleSkuPreview(line({ color_nombre: "Negro", tallas: [talla({})] }), null);
    expect(preview.blocker).toBe(LINE_COLOR_WITHOUT_CODE);
  });
});

test.describe("getLineSkuStatus", () => {
  test("sin SKU y con tallas con cantidad: pendiente, no parcial (botón solo)", () => {
    const status = getLineSkuStatus(line({ tallas: [talla({ id: 1 })] }));
    expect(status).toEqual({ kind: "pending", pendientes: [talla({ id: 1 })], partial: false });
  });

  test("con SKU y una talla agregada después: pendiente y parcial (incompletos + botón)", () => {
    const status = getLineSkuStatus(
      line({
        tallas: [
          talla({ id: 1, sku_produccion: "MP720-100-G" }),
          talla({ id: 2, talla_nombre: "2XG" }),
          talla({ id: 3, talla_nombre: "3XG", cantidad: 0 }),
        ],
      }),
    );
    expect(status.kind).toBe("pending");
    if (status.kind !== "pending") return;
    expect(status.partial).toBe(true);
    expect(status.pendientes.map((t) => t.id)).toEqual([2]);
  });

  test("todas las tallas con cantidad tienen SKU: generados", () => {
    const status = getLineSkuStatus(
      line({
        tallas: [
          talla({ id: 1, sku_produccion: "MP720-100-G" }),
          talla({ id: 2, talla_nombre: "XG", cantidad: 0 }),
        ],
      }),
    );
    expect(status).toEqual({ kind: "generated" });
  });

  test("sin SKU ni tallas con cantidad: nada que ofrecer", () => {
    expect(getLineSkuStatus(line({ tallas: [talla({ cantidad: 0 })] }))).toEqual({ kind: "none" });
  });
});

test.describe("getCatalogAltaState", () => {
  const pendiente = talla({ id: 9, talla_nombre: "2XG", sku_siguiente: "MP720-100-2XG" });

  test("sin tallas generadas y con categoría se elige libremente", () => {
    expect(getCatalogAltaState(line({ tallas: [talla({})] }))).toEqual({ kind: "free" });
  });

  test("sin categoría se bloquea desmarcada", () => {
    expect(getCatalogAltaState(line({ categoria_producto: null }))).toEqual({
      kind: "locked",
      value: false,
      reason: CATALOG_ALTA_WITHOUT_CATEGORY,
      mixed: false,
    });
  });

  test("línea parcial con las generadas en catálogo: hereda marcada", () => {
    const state = getCatalogAltaState(
      line({
        tallas: [
          talla({
            id: 1,
            sku_produccion: "MP720-100-G",
            aplica_catalogo: true,
            sku_catalogo: "30013-100-G",
          }),
          pendiente,
        ],
      }),
    );
    expect(state).toEqual({
      kind: "locked",
      value: true,
      reason: catalogAltaInheritedOn("30013-100-G"),
      mixed: false,
    });
  });

  test("línea parcial con las generadas fuera de catálogo: hereda desmarcada", () => {
    const state = getCatalogAltaState(
      line({ tallas: [talla({ id: 1, sku_produccion: "MP720-100-G" }), pendiente] }),
    );
    expect(state).toEqual({
      kind: "locked",
      value: false,
      reason: CATALOG_ALTA_INHERITED_OFF,
      mixed: false,
    });
  });

  test("línea parcial mezclada: desmarcada con aviso", () => {
    const state = getCatalogAltaState(
      line({
        tallas: [
          talla({ id: 1, sku_produccion: "MP720-100-G", aplica_catalogo: true }),
          talla({ id: 2, talla_nombre: "XG", sku_produccion: "MP720-100-XG" }),
          pendiente,
        ],
      }),
    );
    expect(state).toEqual({ kind: "locked", value: false, reason: CATALOG_ALTA_MIXED, mixed: true });
  });

  test("la herencia manda sobre la categoría y `aplica_catalogo` sin SKU no cuenta", () => {
    const state = getCatalogAltaState(
      line({
        categoria_producto: null,
        tallas: [
          talla({ id: 1, sku_produccion: "MP720-100-G", aplica_catalogo: true }),
          talla({ id: 2, talla_nombre: "XG", aplica_catalogo: true }),
        ],
      }),
    );
    expect(state).toMatchObject({ kind: "locked", value: true, mixed: false });
  });

  test("se envía el valor heredado, no el elegido", () => {
    const locked = { kind: "locked", value: true, reason: "", mixed: false } as const;
    expect(resolveAltaCatalogo(locked, false)).toBe(true);
    expect(resolveAltaCatalogo({ ...locked, value: false }, true)).toBe(false);
    expect(resolveAltaCatalogo({ kind: "free" }, true)).toBe(true);
  });
});

test.describe("parseSampleSkuOnboardingError con alta en catálogo", () => {
  test("el 400 `alta_catalogo` llega al aviso del diálogo con el mensaje del backend", () => {
    const message = "Tallas que no son de la categoría Chamarra: 3XG.";
    const parsed = parseSampleSkuOnboardingError(httpError(400, { alta_catalogo: message }));
    expect(parsed.formError).toBe(message);
    expect(parsed.toastMessage).toBe(message);
  });

  test("el 400 `categoria_producto` (códigos agotados) también", () => {
    const message = "Se agotaron los codigos disponibles para la categoria 'Chamarra'.";
    const parsed = parseSampleSkuOnboardingError(
      httpError(400, { categoria_producto: [message] }),
    );
    expect(parsed.formError).toBe(message);
  });
});
