import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import type {
  SpecialOrderLine,
  SpecialOrderTalla,
} from "@/src/features/special-orders/interfaces/special-order.interface";
import {
  CATALOG_ALTA_WITH_EXISTING_SKUS,
  CATALOG_ALTA_WITHOUT_CATEGORY,
  getCatalogAltaBlockReason,
} from "@/src/features/special-orders/utils/catalogAlta";
import { parseSampleSkuOnboardingError } from "@/src/features/special-orders/utils/parseSampleSkuOnboardingError";
import {
  buildSampleSku,
  CHOSEN_COLOR_WITHOUT_CODE,
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

  test("línea sin color y sin elegir todavía: sin SKU y sin bloqueo", () => {
    const preview = getSampleSkuPreview(line({ tallas: [talla({})] }), null);
    expect(preview.rows[0].sku).toBeNull();
    expect(preview.blocker).toBeNull();
  });

  test("color elegido sin código: bloquea", () => {
    const preview = getSampleSkuPreview(line({ tallas: [talla({})] }), { codigo: "" });
    expect(preview.rows[0].sku).toBeNull();
    expect(preview.blocker).toBe(CHOSEN_COLOR_WITHOUT_CODE);
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

  test("con alguna talla con SKU de producción ya generado tampoco", () => {
    const withSku = line({
      tallas: [talla({ id: 1, sku_produccion: "MP720-100-G" }), talla({ id: 2, talla_nombre: "XG" })],
    });
    expect(getCatalogAltaBlockReason(withSku)).toBe(CATALOG_ALTA_WITH_EXISTING_SKUS);
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
