import { expect, test } from "@playwright/test";
import {
  PEDIDO_ESTATUS,
  PEDIDO_ESTATUS_CONFIG,
  getPedidoEstatusBadge,
} from "@/src/features/orders/constants/pedidoStatus";
import { KANBAN_COLUMNS } from "@/src/features/quotes/constants/kanbanColumns";
import {
  QUOTE_STATUS_CONFIG,
  QUOTE_STATUS_FALLBACK_CLS,
  getQuoteDialogStatusColor,
  getQuoteStatusConfig,
} from "@/src/features/quotes/constants/quoteStatus";
import { cotizacionEstatusBadge } from "@/src/features/opportunities/utils/cotizacionEstatus";
import type { OpportunityCotizacion } from "@/src/features/opportunities/interfaces/opportunity-onboarding.interface";
import { getStatusStyles } from "@/src/features/quotes/utils/getStatusStyle";

/**
 * Pruebas unitarias de EC-751: configs de estatus de Ventas con una sola fuente
 * de colores (tablero de cotizaciones y `PEDIDO_ESTATUS_CONFIG`).
 */

/** Enum completo del backend (`Cotizacion.CHOICES_ESTATUS`, `Pedido.CHOICES_ESTATUS`). */
const BACKEND_ESTATUS = [1, 2, 3, 4, 5];

test.describe("QUOTE_STATUS_CONFIG", () => {
  test("cubre el enum completo del backend", () => {
    expect(Object.keys(QUOTE_STATUS_CONFIG).map(Number).sort()).toEqual(BACKEND_ESTATUS);
  });

  test("deriva cada color del tablero", () => {
    for (const column of KANBAN_COLUMNS) {
      expect(QUOTE_STATUS_CONFIG[column.estatus]).toEqual({
        label: column.label,
        cls: column.statusBadgeClass,
        dot: column.accentDot,
        dialogColor: column.dialogColor,
      });
    }
  });

  test("Borrador es gris y Por Autorizar ámbar en el encabezado de diálogo", () => {
    expect(getQuoteDialogStatusColor(1)).toBe("slate");
    expect(getQuoteDialogStatusColor(2)).toBe("amber");
    // Estatus desconocido: el mismo neutro que el badge, no "sky".
    expect(getQuoteDialogStatusColor(99)).toBe("slate");
    expect(getQuoteDialogStatusColor(null)).toBe("slate");
  });

  test("getStatusStyles usa el badge del tablero y cae al neutro", () => {
    expect(getStatusStyles(3)).toBe(QUOTE_STATUS_CONFIG[3].cls);
    expect(getStatusStyles({ estatus: 1 })).toBe(QUOTE_STATUS_CONFIG[1].cls);
    expect(getStatusStyles(null)).toBe(QUOTE_STATUS_FALLBACK_CLS);
    expect(getStatusStyles(99)).toBe(QUOTE_STATUS_FALLBACK_CLS);
  });
});

test.describe("getQuoteStatusConfig", () => {
  test("devuelve undefined fuera del enum o sin estatus", () => {
    expect(getQuoteStatusConfig(1)?.label).toBe("Borrador");
    expect(getQuoteStatusConfig(99)).toBeUndefined();
    expect(getQuoteStatusConfig(null)).toBeUndefined();
    expect(getQuoteStatusConfig(undefined)).toBeUndefined();
  });

  test("el badge de estatus no depende del contador de la columna", () => {
    for (const column of KANBAN_COLUMNS) {
      expect(getQuoteStatusConfig(column.estatus)?.cls).toBe(column.statusBadgeClass);
    }
  });
});

test.describe("KANBAN_COLUMNS: punto vs franja", () => {
  test("puntos en 500 (gris en 400) y franja con su propio campo en 400", () => {
    expect(KANBAN_COLUMNS.map((c) => c.accentDot)).toEqual([
      "bg-slate-400",
      "bg-amber-500",
      "bg-emerald-500",
      "bg-rose-500",
      "bg-orange-500",
    ]);
    expect(KANBAN_COLUMNS.map((c) => c.accentStripe)).toEqual([
      "bg-slate-400",
      "bg-amber-400",
      "bg-emerald-400",
      "bg-rose-400",
      "bg-orange-400",
    ]);
  });
});

test.describe("cotizacionEstatusBadge", () => {
  test("usa la config de cotización y su mismo neutro", () => {
    expect(cotizacionEstatusBadge({ estatus: 2, estatus_display: "EN REVISION" } as OpportunityCotizacion)).toEqual({
      label: "Por Autorizar",
      className: QUOTE_STATUS_CONFIG[2].cls,
    });
    expect(cotizacionEstatusBadge({ estatus: 9, estatus_display: "NUEVO" } as OpportunityCotizacion)).toEqual({
      label: "NUEVO",
      className: QUOTE_STATUS_FALLBACK_CLS,
    });
  });
});

test.describe("getPedidoEstatusBadge", () => {
  test("cubre el enum completo del backend con punto", () => {
    expect(Object.keys(PEDIDO_ESTATUS_CONFIG).map(Number).sort()).toEqual(BACKEND_ESTATUS);
    for (const estatus of BACKEND_ESTATUS) {
      expect(PEDIDO_ESTATUS_CONFIG[estatus].dot).toBeTruthy();
    }
  });

  test("arma la forma de StatusBadge desde la config, sin copiar clases", () => {
    const cfg = PEDIDO_ESTATUS_CONFIG[PEDIDO_ESTATUS.CANCELADO];
    expect(getPedidoEstatusBadge(PEDIDO_ESTATUS.CANCELADO)).toEqual({
      label: cfg.label,
      cls: cfg.className,
      dot: cfg.dot,
    });
  });

  test("un estatus fuera de rango queda neutro", () => {
    expect(getPedidoEstatusBadge(42)).toMatchObject({
      label: "Desconocido (42)",
      dot: "bg-slate-400",
    });
  });
});
