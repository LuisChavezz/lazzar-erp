import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import type {
  SpecialOrderLine,
  SpecialOrderTalla,
} from "@/src/features/special-orders/interfaces/special-order.interface";
import {
  buildAltaCatalogoPayload,
  CATALOG_ALTA_INHERITED_OFF,
  getCatalogAltaButtonState,
  getCategoriesCoveringLine,
  getLineSizeNames,
  CATALOG_ALTA_MIXED,
  CATALOG_ALTA_WITHOUT_CATEGORY,
  catalogAltaDeviates,
  catalogAltaInheritedOn,
  getCatalogAltaState,
  getDefaultAltaCatalogo,
  hasPendingCatalogAlta,
  isTallaPendingCatalogAlta,
  resolveAltaCatalogo,
} from "@/src/features/special-orders/utils/catalogAlta";
import { getLineSkuStatus } from "@/src/features/special-orders/utils/lineSkuStatus";
import {
  CATALOG_ALTA_GENERIC_ERROR,
  isCategoryRejection,
  parseCatalogAltaError,
} from "@/src/features/special-orders/utils/parseCatalogAltaError";
import { canActOnSpecialOrderLines } from "@/src/features/special-orders/utils/lineActions";
import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";
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
  const enCatalogo = (overrides: Partial<SpecialOrderTalla>) =>
    talla({ sku_produccion: "MP720-100-G", aplica_catalogo: true, ...overrides });
  const fueraDeCatalogo = (overrides: Partial<SpecialOrderTalla>) =>
    talla({ sku_produccion: "MP720-100-G", ...overrides });

  test("sin tallas generadas y con categoría: libre, empieza desmarcada", () => {
    const state = getCatalogAltaState(line({ tallas: [talla({})] }));
    expect(state).toEqual({ kind: "editable", categoriaId: 3, inherited: null });
    expect(getDefaultAltaCatalogo(state)).toBe(false);
    expect(catalogAltaDeviates(state, true)).toBe(false);
  });

  test("sin categoría: bloqueada, también en una línea parcial", () => {
    const blocked = { kind: "blocked", reason: CATALOG_ALTA_WITHOUT_CATEGORY };
    expect(getCatalogAltaState(line({ categoria_producto: null }))).toEqual(blocked);
    expect(
      getCatalogAltaState(
        line({ categoria_producto: null, tallas: [enCatalogo({ id: 1 }), pendiente] }),
      ),
    ).toEqual(blocked);
  });

  test("parcial con las generadas en catálogo: empieza marcada y editable", () => {
    const state = getCatalogAltaState(
      line({ tallas: [enCatalogo({ id: 1, sku_catalogo: "30013-100-G" }), pendiente] }),
    );
    expect(state).toEqual({
      kind: "editable",
      categoriaId: 3,
      inherited: {
        value: true,
        reason: catalogAltaInheritedOn("30013-100-G"),
        mixed: false,
        hasCatalogProduct: true,
      },
    });
    expect(getDefaultAltaCatalogo(state)).toBe(true);
    expect(catalogAltaDeviates(state, true)).toBe(false);
    expect(catalogAltaDeviates(state, false)).toBe(true);
    expect(resolveAltaCatalogo(state, false)).toBe(false);
  });

  test("parcial con las generadas fuera de catálogo: empieza desmarcada y editable", () => {
    const state = getCatalogAltaState(line({ tallas: [fueraDeCatalogo({ id: 1 }), pendiente] }));
    expect(state).toEqual({
      kind: "editable",
      categoriaId: 3,
      inherited: {
        value: false,
        reason: CATALOG_ALTA_INHERITED_OFF,
        mixed: false,
        hasCatalogProduct: false,
      },
    });
    expect(getDefaultAltaCatalogo(state)).toBe(false);
    expect(catalogAltaDeviates(state, true)).toBe(true);
    expect(resolveAltaCatalogo(state, true)).toBe(true);
  });

  test("parcial mezclada: desmarcada, editable, con aviso y sin aviso de desviación", () => {
    const state = getCatalogAltaState(
      line({
        tallas: [
          enCatalogo({ id: 1 }),
          fueraDeCatalogo({ id: 2, talla_nombre: "XG", sku_produccion: "MP720-100-XG" }),
          pendiente,
        ],
      }),
    );
    expect(state).toEqual({
      kind: "editable",
      categoriaId: 3,
      inherited: { value: false, reason: CATALOG_ALTA_MIXED, mixed: true, hasCatalogProduct: true },
    });
    expect(getDefaultAltaCatalogo(state)).toBe(false);
    expect(catalogAltaDeviates(state, true)).toBe(false);
  });

  test("`aplica_catalogo` en una talla sin SKU no cuenta como generada", () => {
    const state = getCatalogAltaState(line({ tallas: [talla({ aplica_catalogo: true })] }));
    expect(state).toEqual({ kind: "editable", categoriaId: 3, inherited: null });
  });

  test("bloqueada nunca envía catálogo aunque se haya marcado", () => {
    expect(
      resolveAltaCatalogo({ kind: "blocked", reason: CATALOG_ALTA_WITHOUT_CATEGORY }, true),
    ).toBe(false);
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

test.describe("getCatalogAltaButtonState (EC-671)", () => {
  const pendiente = talla({ sku_produccion: "MP720-100-G" });

  test("con categoría y tallas pendientes: confirmación simple", () => {
    expect(getCatalogAltaButtonState(line({ tallas: [pendiente] }), true)).toBe("confirm");
  });

  test("sin categoría ya NO se deshabilita: el diálogo pide la categoría", () => {
    expect(
      getCatalogAltaButtonState(line({ categoria_producto: null, tallas: [pendiente] }), true),
    ).toBe("choose-category");
  });

  test("sin permiso o sin pendientes no se ofrece, tenga o no categoría", () => {
    for (const categoria_producto of [null, { id: 3, nombre: "Chamarra" }]) {
      expect(getCatalogAltaButtonState(line({ categoria_producto, tallas: [pendiente] }), false)).toBe(
        "hidden",
      );
      expect(getCatalogAltaButtonState(line({ categoria_producto, tallas: [talla({})] }), true)).toBe(
        "hidden",
      );
    }
  });
});

test.describe("cobertura de tallas de la categoría (EC-671)", () => {
  const sizes = [
    { id: 4, nombre: "G" },
    { id: 5, nombre: "XG" },
    { id: 11, nombre: "UNI" },
  ];
  const category = (id: number, tallas: number[]) => ({ id, nombre: `Cat ${id}`, tallas });
  const sinCategoria = line({
    categoria_producto: null,
    tallas: [
      talla({ id: 1, talla_nombre: "G", sku_produccion: "MP720-100-G" }),
      talla({ id: 2, talla_nombre: "xg ", cantidad: 3 }),
      // Sin cantidad ni SKU: no se genera, así que no se exige.
      talla({ id: 3, talla_nombre: "UNI", cantidad: 0 }),
    ],
  });

  test("las tallas exigidas son las que tienen cantidad o SKU, normalizadas y sin repetir", () => {
    expect(getLineSizeNames(sinCategoria)).toEqual(["G", "XG"]);
  });

  test("solo quedan las que admiten TODAS las tallas; sin tallas, la categoría no acota", () => {
    const categorias = [
      category(1, [4, 5]),
      category(2, [4]),
      category(3, [4, 5, 11]),
      category(4, []),
      category(5, [11]),
    ];
    expect(getCategoriesCoveringLine(categorias, sinCategoria, sizes).map((c) => c.id)).toEqual([
      1, 3, 4,
    ]);
  });

  test("un id de talla de la categoría que el catálogo no conoce (inactiva) se ignora", () => {
    expect(
      getCategoriesCoveringLine([category(1, [4, 5, 99]), category(2, [4, 99])], sinCategoria, sizes).map(
        (c) => c.id,
      ),
    ).toEqual([1]);
  });

  test("una talla de la LÍNEA que el catálogo no conoce no excluye: decide el backend", () => {
    const conInactiva = line({
      categoria_producto: null,
      tallas: [
        talla({ id: 1, talla_nombre: "G", cantidad: 1 }),
        talla({ id: 2, talla_nombre: "XCH", cantidad: 1 }), // desactivada después de cotizar
      ],
    });
    expect(
      getCategoriesCoveringLine([category(1, [4]), category(2, [5])], conInactiva, sizes).map((c) => c.id),
    ).toEqual([1]);
  });

  test("ninguna la cubre: lista vacía (el diálogo lo explica y no deja confirmar)", () => {
    expect(getCategoriesCoveringLine([category(2, [4])], sinCategoria, sizes)).toEqual([]);
  });
});

test.describe("buildAltaCatalogoPayload (EC-671)", () => {
  test("sin categoría elegida solo manda la línea", () => {
    expect(buildAltaCatalogoPayload(720)).toStrictEqual({ pedido_detalle_id: 720 });
  });

  test("con la categoría elegida la agrega con el nombre del backend", () => {
    expect(buildAltaCatalogoPayload(720, 194)).toStrictEqual({
      pedido_detalle_id: 720,
      categoria_producto: 194,
    });
  });
});

test.describe("parseCatalogAltaError", () => {
  for (const key of ["alta_catalogo", "categoria_producto", "permiso"] as const) {
    test(`el 400 \`${key}\` muestra el mensaje del backend`, () => {
      const message = `Mensaje de ${key}.`;
      const parsed = parseCatalogAltaError(httpError(400, { [key]: [message] }));
      expect(parsed).toEqual({ message, staleLine: false, key });
    });
  }

  test("rechazos de la categoría: todo `categoria_producto` y solo los `alta_catalogo` sobre ella", () => {
    // Textos reales de nucleo-erp (`_categoria_para_alta`, `_alta_variante_catalogo`, `codigos.py`).
    const parse = (body: unknown) => parseCatalogAltaError(httpError(400, body));
    expect(isCategoryRejection(parse({ categoria_producto: "Categoría no válida." }))).toBe(true);
    expect(
      isCategoryRejection(
        parse({ categoria_producto: "Se agotaron los codigos disponibles para la categoria 'Vestido'." }),
      ),
    ).toBe(true);
    expect(
      isCategoryRejection(parse({ alta_catalogo: "Tallas que no son de la categoría Vestido: UNI." })),
    ).toBe(true);
    expect(
      isCategoryRejection(
        parse({
          alta_catalogo: "La categoría Vestido está inactiva; no se puede dar de alta en catálogo.",
        }),
      ),
    ).toBe(true);
  });

  test("el resto sigue al toast: SKU repetido, línea sin categoría, sin pendientes, permiso", () => {
    const parse = (body: unknown) => parseCatalogAltaError(httpError(400, body));
    expect(
      isCategoryRejection(parse({ alta_catalogo: "El SKU '10014-703-G' ya existe en catálogo." })),
    ).toBe(false);
    expect(
      isCategoryRejection(
        parse({
          alta_catalogo:
            "La línea no tiene categoría (se captura en la cotización); no se puede dar de alta en catálogo.",
        }),
      ),
    ).toBe(false);
    // Un texto que no se reconoce cae al toast.
    expect(isCategoryRejection(parse({ alta_catalogo: "Otro motivo." }))).toBe(false);
    expect(
      isCategoryRejection(
        parse({ pedido_detalle_id: "La línea no tiene SKU de producción pendientes de alta en catálogo." }),
      ),
    ).toBe(false);
    expect(isCategoryRejection(parse({ permiso: "Solo producción." }))).toBe(false);
    expect(isCategoryRejection(parseCatalogAltaError(new Error("Network Error")))).toBe(false);
  });

  test("el 400 `pedido_detalle_id` muestra su mensaje y marca la línea obsoleta", () => {
    const message = "La línea no tiene SKU de producción pendientes de alta en catálogo.";
    const parsed = parseCatalogAltaError(httpError(400, { pedido_detalle_id: message }));
    expect(parsed).toEqual({ message, staleLine: true, key: "pedido_detalle_id" });
  });

  test("un 404 relee el detalle", () => {
    const parsed = parseCatalogAltaError(httpError(404, { detail: "No encontrado." }));
    expect(parsed).toEqual({ message: "No encontrado.", staleLine: true, key: "detail" });
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
    expect(parsed).toEqual({ message, staleLine: true, key: "pedido" });
  });
});

test.describe("canActOnSpecialOrderLines", () => {
  test("un pedido CANCELADO no ofrece ninguna acción de línea, aunque el usuario las vea", () => {
    expect(canActOnSpecialOrderLines(true, PEDIDO_ESTATUS.CANCELADO)).toBe(false);
  });

  test("un pedido vivo las ofrece solo a quien las ve", () => {
    for (const estatus of [PEDIDO_ESTATUS.AUTORIZADA, PEDIDO_ESTATUS.EN_PROCESO]) {
      expect(canActOnSpecialOrderLines(true, estatus)).toBe(true);
      expect(canActOnSpecialOrderLines(false, estatus)).toBe(false);
    }
  });
});
