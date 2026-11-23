import { expect, test } from "@playwright/test";
import {
  recepcionesVivasIds,
  regresoPorRenglon,
} from "@/src/features/maquila-outputs/utils/salidaMaquilaRegreso";

/**
 * EC-925: lo que regresó de cada renglón de una SM no cuenta las recepciones
 * canceladas (`estatus` 6), que devolvieron lo recibido a pendiente.
 * Corren con `npm run test:unit`.
 */

const recepcion = (id: number, estatus: number) => ({
  id,
  folio: `RC-${id}`,
  estatus,
  fecha_recepcion: null,
});

test("solo se piden las recepciones no canceladas, ordenadas", () => {
  expect(
    recepcionesVivasIds({ recepciones: [recepcion(9, 5), recepcion(3, 6), recepcion(4, 4)] }),
  ).toEqual([4, 9]);
  expect(recepcionesVivasIds({ recepciones: [recepcion(3, 6)] })).toEqual([]);
  expect(recepcionesVivasIds(undefined)).toEqual([]);
});

test("sin cantidad_recibida del backend, suma solo los renglones de recepciones vivas", () => {
  const detallesSm = [
    { id: 1, descripcion: "SKU-A", cantidad_recibida: undefined },
    { id: 2, descripcion: "SKU-B", cantidad_recibida: undefined },
  ];
  const result = regresoPorRenglon(detallesSm, [
    {
      estatus: 5,
      detalles: [
        { salida_maquila_detalle: 1, cantidad_recibida: "4.0000", producto_nombre: "CAMISA" },
        { producto_variante_sku: "SKU-B", cantidad_recibida: "2.5000" },
      ],
    },
    {
      estatus: 6,
      detalles: [
        { salida_maquila_detalle: 1, cantidad_recibida: "10.0000", producto_nombre: "CANCELADA" },
        { producto_variante_sku: "SKU-B", cantidad_recibida: "7" },
      ],
    },
  ]);
  expect(result).toEqual({
    1: { recibidas: 4, nombre: "CAMISA" },
    2: { recibidas: 2.5, nombre: null },
  });
});

test("con cantidad_recibida del backend, se usa esa cifra", () => {
  const result = regresoPorRenglon(
    [{ id: 1, descripcion: "SKU-A", cantidad_recibida: "3.50" }],
    [{ estatus: 6, detalles: [{ salida_maquila_detalle: 1, cantidad_recibida: "9" }] }],
  );
  expect(result).toEqual({ 1: { recibidas: 3.5, nombre: null } });
});
