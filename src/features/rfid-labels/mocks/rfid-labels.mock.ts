import { faker } from "@faker-js/faker";
import type { RfidLabel, RfidLabelEstado } from "../interfaces/rfid-label.interface";

// Semilla fija para datos deterministas, misma convención que el resto de
// módulos maqueta (`accounts-payable`, `embroidery`, `cedicor`): el mismo
// registro debe salir idéntico en cada render y en cada recarga, de lo
// contrario el ZPL —que embebe el SKU— cambiaría con el diálogo ya abierto.
faker.seed(730114);

// ── Catálogos ────────────────────────────────────────────────────────────────

/** Prendas reales del catálogo del negocio (no `faker.commerce.product()`,
 *  que devuelve productos genéricos en inglés). */
const PRODUCTOS = [
  { nombre: "Camisa Oxford Manga Larga", prefijo: "CAM" },
  { nombre: "Playera Piqué Cuello Redondo", prefijo: "PLA" },
  { nombre: "Chamarra Rompevientos Impermeable", prefijo: "CHA" },
];

const COLORES = [
  { nombre: "Azul Marino", codigo: "AZM" },
  { nombre: "Blanco", codigo: "BLA" },
  { nombre: "Negro", codigo: "NEG" },
  { nombre: "Gris Oxford", codigo: "GRO" },
  { nombre: "Vino", codigo: "VIN" },
];

const TALLAS = ["CH", "M", "G", "XG"];

/** Un estatus distinto por registro: con solo 3 renglones, repetir uno dejaría
 *  un color del badge sin representar en la maqueta. */
const ESTADOS: RfidLabelEstado[] = ["IMPRESA", "PENDIENTE", "REIMPRESION"];

// ── Generador de ZPL ─────────────────────────────────────────────────────────

interface ZplParams {
  producto: string;
  sku: string;
  color: string;
  talla: string;
  codigo: string;
  epc: string;
}

/**
 * ZPL de la etiqueta con el contenido del registro embebido en sus campos
 * `^FD` — igual que lo haría un generador real, para que el bloque del diálogo
 * se lea como una vista previa creíble de ESA etiqueta y no como texto de
 * relleno. Es una plantilla de maqueta: la estructura es ZPL II válido
 * (`^XA`…`^XZ`, `^BC` Code 128, `^RFW` de escritura RFID), pero nada la envía
 * a una impresora ni la valida.
 */
function generarZpl({ producto, sku, color, talla, codigo, epc }: ZplParams): string {
  return [
    "^XA",
    "^CI28",
    "^PW799",
    "^LL400",
    "^LH0,0",
    `^FO32,26^A0N,38,38^FD${producto}^FS`,
    `^FO32,76^A0N,28,28^FDSKU: ${sku}^FS`,
    `^FO32,114^A0N,28,28^FDColor: ${color}   Talla: ${talla}^FS`,
    `^FO32,158^BY3,2.5,90^BCN,90,Y,N,N^FD${sku}^FS`,
    `^FO32,300^A0N,32,32^FDCOD: ${codigo}^FS`,
    "^FO600,26^GB168,110,3^FS",
    `^FO628,52^A0N,64,64^FD${talla}^FS`,
    `^RFW,H,1,2,1^FD${epc}^FS`,
    "^PQ1,0,1,Y",
    "^XZ",
  ].join("\n");
}

// ── Generador de registros ───────────────────────────────────────────────────

function generarRfidLabel(producto: (typeof PRODUCTOS)[number], index: number): RfidLabel {
  const color = faker.helpers.arrayElement(COLORES);
  const talla = faker.helpers.arrayElement(TALLAS);
  const consecutivo = faker.number.int({ min: 1000, max: 9999 });

  const sku = `${producto.prefijo}-${color.codigo}-${talla}-${consecutivo}`;
  const codigo = String(1000 + index * 7 + faker.number.int({ min: 1, max: 40 }));
  // EPC de 24 hex, el largo habitual de un tag RFID EPC Gen2 de 96 bits.
  const epc = faker.string.hexadecimal({ length: 24, prefix: "", casing: "upper" });

  return {
    id: index + 1,
    sku,
    producto_nombre: producto.nombre,
    color_nombre: color.nombre,
    talla_nombre: talla,
    codigo,
    estado: ESTADOS[index % ESTADOS.length],
    zpl: generarZpl({
      producto: producto.nombre,
      sku,
      color: color.nombre,
      talla,
      codigo,
      epc,
    }),
  };
}

/** Las 3 etiquetas de la maqueta, una por prenda del catálogo. */
export const MOCK_RFID_LABELS: RfidLabel[] = PRODUCTOS.map(generarRfidLabel);
