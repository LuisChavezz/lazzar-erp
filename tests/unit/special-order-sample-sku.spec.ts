import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import type {
  SpecialOrderLine,
  SpecialOrderTalla,
} from "@/src/features/special-orders/interfaces/special-order.interface";
import {
  CATALOG_ALTA_WITHOUT_CATEGORY,
  getCatalogAltaBlockReason,
  hasPendingCatalogAlta,
  isTallaPendingCatalogAlta,
} from "@/src/features/special-orders/utils/catalogAlta";
import {
  CATALOG_ALTA_GENERIC_ERROR,
  parseCatalogAltaError,
} from "@/src/features/special-orders/utils/parseCatalogAltaError";
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
 * Pruebas unitarias de EC-651: la vista previa del SKU por talla (misma
 * fórmula que `variante_onboarding` en nucleo-erp), cuándo se bloquea
 * "Dar de alta en catálogo" y cómo llegan al diálogo los `400` del alta.
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

test.describe("getCatalogAltaBlockReason", () => {
  test("sin categoría no se puede dar de alta en catálogo", () => {
    expect(getCatalogAltaBlockReason(line({ categoria_producto: null }))).toBe(
      CATALOG_ALTA_WITHOUT_CATEGORY,
    );
  });

  test("los SKU de producción ya generados NO lo impiden: el backend reutiliza el producto", () => {
    const withSku = line({
      tallas: [talla({ id: 1, sku_produccion: "MP720-100-G" }), talla({ id: 2, talla_nombre: "XG" })],
    });
    expect(getCatalogAltaBlockReason(withSku)).toBeNull();
  });

  test("`sku_siguiente` en null NO cuenta como SKU generado", () => {
    expect(getCatalogAltaBlockReason(line({ tallas: [talla({ sku_siguiente: null })] }))).toBeNull();
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

test.describe("alta en catálogo por línea (EC-655)", () => {
  test("pendiente = tiene SKU de producción y aún no está en catálogo", () => {
    expect(isTallaPendingCatalogAlta(talla({ sku_produccion: "MP720-100-G" }))).toBe(true);
    expect(
      isTallaPendingCatalogAlta(
        talla({ sku_produccion: "MP720-100-G", aplica_catalogo: true, sku_catalogo: "CH001-100-G" }),
      ),
    ).toBe(false);
    // `aplica_catalogo` en false SIN variante no es pendiente: no hay nada que dar de alta.
    expect(isTallaPendingCatalogAlta(talla({ sku_produccion: null }))).toBe(false);
  });

  test("la línea se ofrece si ALGUNA talla está pendiente, también tras un alta parcial", () => {
    const parcial = line({
      tallas: [
        talla({ id: 1, sku_produccion: "MP720-100-G", aplica_catalogo: true, sku_catalogo: "CH001-100-G" }),
        talla({ id: 2, talla_nombre: "XG", sku_produccion: "MP720-100-XG" }),
      ],
    });
    expect(hasPendingCatalogAlta(parcial)).toBe(true);
    expect(hasPendingCatalogAlta(line({ tallas: [talla({})] }))).toBe(false);
    expect(
      hasPendingCatalogAlta(
        line({ tallas: [talla({ sku_produccion: "MP720-100-G", aplica_catalogo: true })] }),
      ),
    ).toBe(false);
  });
});

test.describe("parseCatalogAltaError", () => {
  for (const key of ["alta_catalogo", "categoria_producto", "permiso"] as const) {
    test(`el 400 \`${key}\` muestra el mensaje del backend`, () => {
      const message = `Mensaje de ${key}.`;
      const parsed = parseCatalogAltaError(httpError(400, { [key]: [message] }));
      expect(parsed).toEqual({ message, staleLine: false });
    });
  }

  test("el 400 `pedido_detalle_id` muestra su mensaje y marca la línea obsoleta", () => {
    const message = "La línea no tiene SKU de producción pendientes de alta en catálogo.";
    const parsed = parseCatalogAltaError(httpError(400, { pedido_detalle_id: message }));
    expect(parsed).toEqual({ message, staleLine: true });
  });

  test("un 404 relee el detalle", () => {
    const parsed = parseCatalogAltaError(httpError(404, { detail: "No encontrado." }));
    expect(parsed).toEqual({ message: "No encontrado.", staleLine: true });
  });

  test("sin cuerpo utilizable, el genérico (nunca el `message` de Axios)", () => {
    expect(parseCatalogAltaError(httpError(500, "<html>")).message).toBe(CATALOG_ALTA_GENERIC_ERROR);
    expect(parseCatalogAltaError(new Error("Network Error")).message).toBe(
      CATALOG_ALTA_GENERIC_ERROR,
    );
  });
});

test.describe("parseCatalogAltaError con pedido cancelado", () => {
  test("el 400 `pedido` muestra su mensaje y marca la línea obsoleta", () => {
    const message = "El pedido está CANCELADO; no se puede dar de alta en catálogo.";
    const parsed = parseCatalogAltaError(httpError(400, { pedido: message }));
    expect(parsed).toEqual({ message, staleLine: true });
  });
});
