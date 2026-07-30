/**
 * Catálogos FIJOS del alta de encuadres: órdenes de compra, almacenes y
 * series. Listas escritas a mano —no `faker`, no `v1_api`— igual que
 * `constants/labelPrinters.ts`: este módulo no tiene backend, y los códigos
 * escaneables de cada línea tienen que ser estables para que la simulación de
 * `RfidMatchDetailDialog` responda siempre igual.
 *
 * Las tres opciones de almacén y las dos de serie ("RC"/"RG") son las mismas
 * que ofrece el workspace de QA de `nucleo-erp`.
 */

/** Línea de detalle de una OC del catálogo, con sus códigos escaneables. */
export interface RfidMatchPurchaseOrderLine {
  id: number;
  producto: string;
  /** `Producto.codigo` — escaneable. */
  codigo: string;
  /** `Producto.cod_proscai` — escaneable. */
  cod_proscai: string;
  /** SKUs de variante (uno por talla) — el caso normal de escaneo. */
  skus: string[];
  /** Piezas pedidas en la OC. */
  esperado: number;
}

export interface RfidMatchPurchaseOrder {
  /** Folio, y a la vez la llave del catálogo. */
  id: string;
  proveedor: string;
  sucursal: string;
  lineas: RfidMatchPurchaseOrderLine[];
}

/** Arma los SKUs de variante de un producto: `<PREFIJO>-<CODIGO>-<TALLA>`. */
const skusPorTalla = (prefijo: string, codigo: string, tallas: string[]): string[] =>
  tallas.map((talla) => `${prefijo}-${codigo}-${talla}`);

/**
 * Órdenes de compra "abiertas" que pueden encuadrarse.
 *
 * Cada línea ofrece MÁS códigos escaneables distintos que su `esperado` (los
 * SKUs por talla, más `codigo` y `cod_proscai`), condición necesaria para que
 * el encuadre pueda llegar a completarse: un tag solo cuenta UNA vez por
 * encuadre (ver la restricción única de `RfidMatchReading`), así que con menos
 * códigos que piezas esperadas la diferencia jamás llegaría a cero.
 */
export const MOCK_ORDENES_COMPRA: RfidMatchPurchaseOrder[] = [
  {
    id: "OC-1042",
    proveedor: "Textiles del Bajío S.A. de C.V.",
    sucursal: "Matriz",
    lineas: [
      {
        id: 1,
        producto: "AMBASSADOR",
        codigo: "93E0",
        cod_proscai: "PRO-93E0",
        skus: skusPorTalla("AMB", "93E0", ["CH", "M", "G", "XG", "2XG", "3XG"]),
        esperado: 5,
      },
      {
        id: 2,
        producto: "GALA CABALLERO",
        codigo: "88A1",
        cod_proscai: "PRO-88A1",
        skus: skusPorTalla("GAL", "88A1", ["CH", "M", "G", "XG"]),
        esperado: 3,
      },
      {
        id: 3,
        producto: "POLO EJECUTIVO",
        codigo: "45C7",
        cod_proscai: "PRO-45C7",
        skus: skusPorTalla("POL", "45C7", ["M", "G", "XG"]),
        esperado: 2,
      },
    ],
  },
  {
    id: "OC-1043",
    proveedor: "Hilos y Avíos del Norte",
    sucursal: "Matriz",
    lineas: [
      {
        id: 1,
        producto: "CAMISA OXFORD MANGA LARGA",
        codigo: "71B3",
        cod_proscai: "PRO-71B3",
        skus: skusPorTalla("CAM", "71B3", ["CH", "M", "G", "XG", "2XG", "3XG"]),
        esperado: 6,
      },
      {
        id: 2,
        producto: "CHAMARRA ROMPEVIENTOS",
        codigo: "60D9",
        cod_proscai: "PRO-60D9",
        skus: skusPorTalla("CHA", "60D9", ["M", "G", "XG"]),
        esperado: 3,
      },
    ],
  },
  {
    id: "OC-1051",
    proveedor: "Confecciones Peña",
    sucursal: "Norte",
    lineas: [
      {
        id: 1,
        producto: "PLAYERA PIQUÉ CUELLO REDONDO",
        codigo: "33F5",
        cod_proscai: "PRO-33F5",
        skus: skusPorTalla("PLA", "33F5", ["CH", "M", "G", "XG"]),
        esperado: 4,
      },
      {
        id: 2,
        producto: "SUDADERA CERRADA",
        codigo: "27E8",
        cod_proscai: "PRO-27E8",
        skus: skusPorTalla("SUD", "27E8", ["G", "XG"]),
        esperado: 2,
      },
    ],
  },
];

export const findOrdenCompra = (folio: string): RfidMatchPurchaseOrder | undefined =>
  MOCK_ORDENES_COMPRA.find((orden) => orden.id === folio);

export interface RfidMatchWarehouse {
  id: string;
  nombre: string;
}

export const MOCK_ALMACENES: RfidMatchWarehouse[] = [
  { id: "ALM-01", nombre: "Almacén General" },
  { id: "ALM-02", nombre: "Almacén de Materia Prima" },
  { id: "ALM-03", nombre: "Almacén de Producto Terminado" },
];

export const findAlmacen = (id: string): RfidMatchWarehouse | undefined =>
  MOCK_ALMACENES.find((almacen) => almacen.id === id);

/** `serie_codigo`: 2 caracteres, mismas opciones que el workspace de QA. */
export const MOCK_SERIES = [
  { value: "RC", label: "RC — Recepción de compra" },
  { value: "RG", label: "RG — Recepción general" },
];
