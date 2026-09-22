import { Company } from "../../companies/interfaces/company.interface";
import { RegimenFiscal, UsoCfdi } from "../../sat/interfaces/sat-info.interface";


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
}

export interface VerifyRfcResponse {
  Rfc: string;
  FormatoCorrecto: boolean;
  Activo: boolean;
  Localizado: boolean;
}