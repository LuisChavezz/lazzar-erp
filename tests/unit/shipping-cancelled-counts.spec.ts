import { expect, test } from "@playwright/test";
import { shipmentPiezasVigentes } from "@/src/features/shipping/components/ShippingColumns";
import { shippingExportSummary } from "@/src/features/shipping/utils/shippingExport";
import type { Shipment } from "@/src/features/shipping/interfaces/shipping.interface";

/** EC-945: un envío cancelado no suma piezas en el filtro de contenido ni en el resumen de la exportación. */

const shipment = (estado: Shipment["estado"], piezas: string[]): Shipment =>
  ({
    estado,
    despacho_detalle: piezas.map((cantidad_empacada, i) => ({ cantidad_empacada, caja_numero: i })),
  }) as unknown as Shipment;

test("el filtro de contenido no ubica a un envío cancelado en ningún rango", () => {
  expect(shipmentPiezasVigentes(shipment("ACTIVO", ["2", "3"]))).toBe(5);
  expect(shipmentPiezasVigentes(shipment("CANCELADO", ["2", "3"]))).toBeNull();
});

test("el resumen cuenta los envíos vigentes y sus piezas, y los cancelados aparte", () => {
  expect(shippingExportSummary([shipment("ACTIVO", ["2"]), shipment("ACTIVO", ["1", "1"])])).toBe("2 envíos · 4 pzas");
  expect(
    shippingExportSummary([shipment("ACTIVO", ["2"]), shipment("CANCELADO", ["9"]), shipment("CANCELADO", ["1"])]),
  ).toBe("1 envío · 2 pzas · 2 cancelados");
});
