import { expect, test } from "@playwright/test";
import {
  ajusteLineaCentavos,
  ajusteLineaError,
  ajusteMaquilaCambios,
  ajusteValoresIniciales,
  ivaDeLinea,
} from "@/src/features/supplier-invoices/utils/ajusteMaquila";

/** EC-919: ajuste de la factura de maquila (`ajustar-maquila/`). */

const linea = { id: 69, precio_unitario: "12.50", descuento: "0.00", impuesto: "0.00" };

test("total = cantidad × precio − descuento + impuesto (impuesto es monto)", () => {
  expect(ajusteLineaCentavos("4.00", { precio_unitario: "12.50", descuento: "5", impuesto: "7.20" })).toEqual({
    subtotal: 5000,
    total: 5220,
  });
});

test("IVA 16 % sobre la base gravable, como monto redondeado al centavo", () => {
  expect(ivaDeLinea("4.00", { precio_unitario: "12.50", descuento: "0", impuesto: "0" })).toBe("8.00");
  expect(ivaDeLinea("4.00", { precio_unitario: "12.50", descuento: "5", impuesto: "0" })).toBe("7.20");
  expect(ivaDeLinea("3", { precio_unitario: "0.33", descuento: "0", impuesto: "0" })).toBe("0.16");
  // Base negativa: 0.
  expect(ivaDeLinea("1", { precio_unitario: "1", descuento: "5", impuesto: "0" })).toBe("0.00");
});

test("valida importes >= 0 con 2 decimales y total no negativo", () => {
  const ok = { precio_unitario: "6", descuento: "0", impuesto: "16" };
  expect(ajusteLineaError("1", ok)).toBeNull();
  expect(ajusteLineaError("1", { ...ok, precio_unitario: "-1" })).not.toBeNull();
  expect(ajusteLineaError("1", { ...ok, impuesto: "1.234" })).not.toBeNull();
  expect(ajusteLineaError("1", { ...ok, descuento: "" })).toBe("Requerido");
  expect(ajusteLineaError("1", { precio_unitario: "1", descuento: "5", impuesto: "0" })).toBe(
    "El total de la línea queda negativo",
  );
});

test("solo viajan las líneas y los campos que cambiaron, con 2 decimales", () => {
  expect(ajusteValoresIniciales({ precio_unitario: "12.5000", descuento: "0", impuesto: "0.00" })).toEqual({
    precio_unitario: "12.50",
    descuento: "0.00",
    impuesto: "0.00",
  });
  expect(
    ajusteMaquilaCambios([linea, { ...linea, id: 70 }], {
      "69": { precio_unitario: "12.5", descuento: "0", impuesto: "8" },
      "70": { precio_unitario: "12.50", descuento: "0.00", impuesto: "0" },
    }),
  ).toEqual([{ id: 69, impuesto: "8.00" }]);
  expect(ajusteMaquilaCambios([linea], {})).toEqual([]);
});
