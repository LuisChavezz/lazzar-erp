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
} from "@/src/features/quotes/constants/quoteStatus";
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
        cls: column.badgeClass,
        dot: column.accentDot,
        dialogColor: column.dialogColor,
      });
    }
  });

  test("Borrador es gris y Por Autorizar ámbar en el encabezado de diálogo", () => {
    expect(getQuoteDialogStatusColor(1)).toBe("slate");
    expect(getQuoteDialogStatusColor(2)).toBe("amber");
    expect(getQuoteDialogStatusColor(99)).toBe("sky");
    expect(getQuoteDialogStatusColor(null)).toBe("sky");
  });

  test("getStatusStyles usa el badge del tablero y cae al neutro", () => {
    expect(getStatusStyles(3)).toBe(QUOTE_STATUS_CONFIG[3].cls);
    expect(getStatusStyles({ estatus: 1 })).toBe(QUOTE_STATUS_CONFIG[1].cls);
    expect(getStatusStyles(null)).toBe(QUOTE_STATUS_FALLBACK_CLS);
    expect(getStatusStyles(99)).toBe(QUOTE_STATUS_FALLBACK_CLS);
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
