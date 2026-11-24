import { expect, test } from "@playwright/test";
import { computePackingKpis } from "@/src/features/packing/utils/packing.utils";
import type { Packing } from "@/src/features/packing/interfaces/packing.interface";

/** EC-945: un embarque cancelado no suma a los KPIs del listado de Packing. */

const packing = (estado: Packing["estado"], cajas: number, peso: string, lineas: string[]): Packing =>
  ({
    estado,
    numero_cajas: cajas,
    peso_total: peso,
    volumen_total: "0.500",
    packing_detalle: lineas.map((cantidad_empacada) => ({ cantidad_empacada })),
  }) as unknown as Packing;

test("los cancelados no cuentan en líneas, cajas, peso ni volumen", () => {
  const kpis = computePackingKpis([
    packing("PENDIENTE", 2, "10.000", ["3", "1"]),
    packing("CANCELADO", 5, "40.000", ["9"]),
  ]);
  expect(kpis).toEqual({ totalLineasEmpacadas: 2, totalCajas: 2, pesoTotal: 10, volumenTotal: 0.5 });
});
