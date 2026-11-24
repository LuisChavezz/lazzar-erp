import { expect, test } from "@playwright/test";
import { entregaDetalle } from "@/src/features/picking/utils/pickingListado";

/**
 * Texto bajo la fecha de entrega del listado de surtidos (EC-932): solo si ya
 * venció o vence en los próximos 3 días, y nunca si ya se envió o se canceló.
 */
const HOY = "2026-11-24";
const surtido = (pedido_fecha_entrega: string | null, extra: Record<string, unknown> = {}) => ({
  pedido_fecha_entrega,
  estado: "Completado" as const,
  estado_empaque: "POR_EMPACAR" as const,
  ...extra,
});

test.describe("entregaDetalle", () => {
  test("vencida: singular y plural, en femenino", () => {
    expect(entregaDetalle(surtido("2026-11-23"), HOY)).toBe("Vencida hace 1 día");
    expect(entregaDetalle(surtido("2026-11-10"), HOY)).toBe("Vencida hace 14 días");
  });

  test("hoy, mañana y a 3 días", () => {
    expect(entregaDetalle(surtido("2026-11-24"), HOY)).toBe("Vence hoy");
    expect(entregaDetalle(surtido("2026-11-25"), HOY)).toBe("Falta 1 día");
    expect(entregaDetalle(surtido("2026-11-27"), HOY)).toBe("Faltan 3 días");
  });

  test("a 4 días o más ya no lleva texto", () => {
    expect(entregaDetalle(surtido("2026-11-28"), HOY)).toBeNull();
  });

  test("enviado o cancelado no lleva texto aunque haya vencido", () => {
    expect(entregaDetalle(surtido("2026-11-10", { estado_empaque: "ENVIADO" }), HOY)).toBeNull();
    expect(entregaDetalle(surtido("2026-11-24", { estado: "Cancelado" }), HOY)).toBeNull();
  });

  test("sin fecha, o sin 'hoy' del backend, no lleva texto", () => {
    expect(entregaDetalle(surtido(null), HOY)).toBeNull();
    expect(entregaDetalle(surtido("2026-11-23"), "")).toBeNull();
  });
});
