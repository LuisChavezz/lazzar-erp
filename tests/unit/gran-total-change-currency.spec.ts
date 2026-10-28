import { expect, test } from "@playwright/test";
import { granTotalChangeCurrency } from "@/src/features/orders/utils/granTotalChangeCurrency";
import { formatCurrency } from "@/src/utils/formatCurrency";

/**
 * Pruebas unitarias de EC-606 (decisión 5): moneda del aviso "Guardado hoy →
 * se guardará" de la edición de Mesa de Control. Funciones puras.
 */

const plain = (text: string) => text.replace(/[  ]/g, " ");

/** El aviso tal como lo arma el formulario. */
const aviso = (saved: string | null, next: string | null) => {
  const { savedCodigo, nextCodigo, overrides } = granTotalChangeCurrency(saved, next);
  return plain(
    `${formatCurrency(116, savedCodigo, overrides)} → ${formatCurrency(232, nextCodigo, overrides)}`,
  );
};

test.describe("moneda del aviso de gran total de Mesa de Control", () => {
  test("monedas distintas y conocidas: cada importe con su código", () => {
    expect(granTotalChangeCurrency("MXN", "USD")).toEqual({
      savedCodigo: "MXN",
      nextCodigo: "USD",
      overrides: { currencyDisplay: "code" },
    });
    expect(aviso("MXN", "USD")).toBe("MXN 116.00 → USD 232.00");
  });

  test("misma moneda: con su símbolo, como siempre", () => {
    expect(granTotalChangeCurrency("MXN", "MXN").overrides).toBeUndefined();
    expect(aviso("MXN", "MXN")).toBe("$116.00 → $232.00");
  });

  test("moneda guardada sin resolver: ninguno lleva código ni símbolo", () => {
    // El catálogo aún no carga (o falló) y el formulario ya tiene su moneda:
    // no se mezcla un número suelto con "MXN 232.00".
    expect(aviso(null, "MXN")).toBe("116.00 → 232.00");
  });

  test("moneda nueva sin resolver, o ninguna: los dos sin símbolo", () => {
    expect(aviso("USD", null)).toBe("116.00 → 232.00");
    expect(aviso(null, null)).toBe("116.00 → 232.00");
  });
});
