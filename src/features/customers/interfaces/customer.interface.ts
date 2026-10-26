import { Company } from "../../companies/interfaces/company.interface";
import { RegimenFiscal, UsoCfdi } from "../../sat/interfaces/sat-info.interface";

/**
 * Campos del ERP que Facturama exige para dar de alta al cliente, en el orden
 * en que el backend los reporta (`terceros/facturama.py`, `faltantes()`).
 * `razon_social` solo falta si también falta `nombre`.
 */
export type FacturamaFaltante =
  | "correo"
  | "rfc"
  | "razon_social"
  | "sat_regimen_fiscal"
  | "sat_uso_cfdi"
  | "codigo_postal";

export interface Customer {
  id: string;
  empresa: Company["id"];
  razon_social: string;
  nombre: string;
  telefono: string;
  correo: string;
  rfc: string;
  direccion_fiscal: string;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  activo: boolean;
  sat_regimen_fiscal: RegimenFiscal["id_sat_regimen_fiscal"];
  sat_uso_cfdi: UsoCfdi["id_sat_uso_cfdi"];
  /**
   * NO es informativo: una factura de venta registrada sin fecha de vencimiento
   * vence (ella y su cuenta por cobrar) hoy + estos días.
   */
  dias_credito: number;
  /**
   * Decimal(14,2) como string. Solo informativo (nada en el backend lo lee) y
   * SIN moneda: no se pinta con símbolo ni se opera contra la cartera.
   */
  limite_credito: string;
  /**
   * Solo lectura (#659). `null`: la empresa DEL CLIENTE no usa Facturama.
   * `true`: el cliente está en Facturama y no le falta nada. `false`: no se ha
   * subido, falte algo (`facturama_faltantes`) o no (alta antigua o hecha por la
   * herramienta de IA). Volver a guardarlo completo es lo único que lo sube.
   */
  facturama_verificado: boolean | null;
  /** Lo que le falta para subirse a Facturama; `[]` cuando el verificado es `null`. */
  facturama_faltantes: FacturamaFaltante[];
}

/**
 * Respuesta de `POST /terceros/clientes/`: el cliente más
 * `facturama_sincronizado`, `true` si quedó en el catálogo de clientes de
 * Facturama y `false` si no se subió (la empresa no usa Facturama o al cliente
 * le falta algo). Para el estado del cliente se lee `facturama_verificado`,
 * que distingue ambos casos.
 */
export interface CustomerCreateResponse extends Customer {
  facturama_sincronizado?: boolean;
}

/**
 * Pedido resumido dentro de `resumen_comercial` (`pedidos_recientes` y
 * `ultimo_pedido`). Lo arma el backend con `.values()` fuera de un serializer:
 * `gran_total` llega como número JSON (no string decimal), `estatus` es el
 * entero crudo del enum y `fecha` un datetime ISO completo con offset.
 */
export interface ResumenComercialPedido {
  id: number;
  folio: string;
  fecha: string;
  estatus: number;
  estatus_display: string;
  gran_total: number;
  /** Código ISO 4217 (p.ej. "MXN"). */
  moneda: string;
}

export interface ResumenComercialMonto {
  /** Código ISO 4217 (p.ej. "MXN"). */
  moneda: string;
  total: number;
}

/**
 * Antigüedad de saldos de UNA moneda (`resumen_comercial.cartera`). Excluye
 * cuentas por cobrar canceladas y las de saldo cero. A diferencia del resto del
 * resumen, aquí los importes llegan como STRING con 2 decimales.
 */
export interface CarteraMoneda {
  /** Código ISO 4217 (p.ej. "MXN"). */
  moneda: string;
  saldo_total: string;
  por_vencer: string;
  vencido_1_30: string;
  vencido_31_60: string;
  vencido_61_90: string;
  vencido_91_120: string;
  vencido_mas_120: string;
}

/**
 * Bloque de solo lectura que `GET /terceros/clientes/{id}/` agrega al
 * `ClienteSerializer`. NO viene en el listado ni en la respuesta del PUT.
 */
export interface ResumenComercial {
  /** Pedidos activos del cliente, INCLUIDOS los cancelados. */
  total_pedidos: number;
  total_cotizaciones: number;
  /**
   * `{ <label de estatus del backend>: conteo }` — p.ej. `{ "AUTORIZADA": 18 }`.
   * Disperso: un estatus sin pedidos no aparece (no viene en 0).
   */
  pedidos_por_estatus: Record<string, number>;
  /** Suma de `gran_total` por moneda, EXCLUYENDO pedidos cancelados. */
  montos_por_moneda: ResumenComercialMonto[];
  ultimo_pedido: ResumenComercialPedido | null;
  /** Hasta 5, del más reciente al más antiguo. */
  pedidos_recientes: ResumenComercialPedido[];
  /** Una entrada por moneda; `[]` si el cliente no tiene saldo pendiente. */
  cartera: CarteraMoneda[];
}

/**
 * Respuesta de `GET /terceros/clientes/{id}/`. `resumen_comercial` es opcional
 * porque mientras llega el detalle se muestra la fila del listado como
 * `placeholderData`, que no lo trae.
 */
export interface CustomerDetail extends Customer {
  resumen_comercial?: ResumenComercial;
}

export interface CustomerCreate {
  empresa: Company["id"];
  razon_social: string;
  nombre: string;
  telefono: string;
  correo: string;
  rfc: string;
  direccion_fiscal: string;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  sat_regimen_fiscal: RegimenFiscal["id_sat_regimen_fiscal"];
  sat_uso_cfdi: UsoCfdi["id_sat_uso_cfdi"];
  /**
   * Opcionales en POST y PUT: omitidos, el alta usa 0 y la edición CONSERVA el
   * valor guardado. Por eso la edición solo los manda si el usuario los cambió.
   */
  dias_credito?: number;
  limite_credito?: string;
}

/**
 * Respuesta de Facturama (`/customers/status`). El flujo de clientes ya no la
 * usa: sigue aquí porque la importa `verifyRfc.server.ts`, del Route Handler
 * `/api/facturama/customers/status`, del que aún depende Proveedores.
 */
export interface VerifyRfcResponse {
  Rfc: string;
  FormatoCorrecto: boolean;
  Activo: boolean;
  Localizado: boolean;
}

/** Parámetros de `GET /terceros/clientes/verificar-rfc/`. */
export interface VerifyCustomerRfcParams {
  rfc: string;
  /** Solo al editar: aplica la regla de la empresa de ESE cliente. */
  cliente?: number;
}

/**
 * Resultado de `GET /terceros/clientes/verificar-rfc/`: el mismo veredicto y el
 * mismo mensaje que daría guardar ese RFC. No revisa duplicados ni el estatus
 * en el SAT.
 */
export interface CustomerRfcVerification {
  /** RFC normalizado (sin espacios, en mayúsculas). */
  rfc: string;
  valido: boolean;
  /** Mensaje con el que el guardado rechazaría el campo `rfc`; `null` si es válido. */
  error: string | null;
  /**
   * `true` si se revisaron formato y dígito verificador (la empresa usa
   * Facturama); `false` si solo se revisó la longitud.
   */
  formato_verificado: boolean;
}