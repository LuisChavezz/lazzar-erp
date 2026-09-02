import type { z } from "zod";
import type { quoteItemSchema } from "../schemas/quote-item.schema";
import { Branch } from "../../branches/interfaces/branch.interface";
import { Color } from "../../colors/interfaces/color.interface";
import { Company } from "../../companies/interfaces/company.interface";
import { Currency } from "../../currency/interfaces/currency.interface";
import { Product } from '../../products/interfaces/product.interface';
import { Size } from '../../sizes/interfaces/size.interface';


export type QuotePaymentCondition =
  | "100_anticipo"
  | "50_anticipo"
  | "vendedor_autoriza"
  | "pago_antes_embarque"
  | "por_confirmar"
  | "otra_cantidad";

/**
 * Partida del FORMULARIO de cotización.
 *
 * Se deriva del schema, que es la única fuente de verdad: antes vivía aquí una
 * copia escrita a mano que replicaba la forma del schema y podía separarse de
 * él sin que nada lo notara. Hoy es una UNIÓN DISCRIMINADA por `tipo`
 * (catálogo | muestra) — ver `schemas/quote-item.schema.ts`.
 */
export type QuoteItem = z.output<typeof quoteItemSchema>;

export interface Quote {
  id: number;
  estatus: number;
  estatus_label: string;
  /**
   * Ver `TIPO_PEDIDO` en `orders/constants/pedidoStatus`: 1 = pedido de venta,
   * 2 = muestra, 3 = pedido de error. No es opcional — el campo del modelo
   * tiene `default=1` y `CotizacionDashboardItemSerializer` lo lista siempre.
   */
  tipo_pedido: number;
  /**
   * Etiqueta del backend (`get_tipo_pedido_display`), en mayúsculas:
   * "PEDIDO DE VENTA". La tabla NO la pinta — usa el `label` de
   * `getTipoPedidoConfig`, que ya viene con el casing de la app y trae un
   * respaldo para valores fuera de rango. Se tipa por completitud del contrato.
   */
  tipo_pedido_label: string;
  cliente: number;
  cliente_nombre: string;
  cliente_razon_social: string;
  oc: string;
  uso_cfdi: string;
  gran_total: string;
  importe_sin_iva: string;
  piezas: number;
  autorizada_at: string | null;
  cambios_solicitados_at: string | null;
  created_at: string;
  updated_at: string;
  pedido_id: number | null;
  pedido_folio: string | null;
}

/**
 * Campos por los que `GET /ventas/cotizaciones/` acepta ordenar (whitelist del
 * backend en `CotizacionViewSet.get_queryset`). Sin `ordering`, el backend usa
 * `-created_at` con `-id` como desempate.
 */
export type QuoteOrdering =
  | "id"
  | "-id"
  | "created_at"
  | "-created_at"
  | "updated_at"
  | "-updated_at"
  | "gran_total"
  | "-gran_total"
  | "estatus"
  | "-estatus";

/** Parámetros de consulta (todos opcionales) de `GET /ventas/cotizaciones/`. */
export interface QuoteQueryParams {
  ordering?: QuoteOrdering;
}

export interface QuoteById {
  id: number;
  estatus_label: string;
  detalles: {
    id: number;
    tallas: {
      id: number;
      sku: string;
      talla_nombre: string;
      cantidad: number;
      precio_unitario: string;
      subtotal_talla: string;
      lleva_bordado: boolean;
      bordado_config: {
        notas: string;
        ubicaciones: {
          codigo: string;
          descripcion_posicion?: string | null;
          ancho_cm: number;
          alto_cm: number;
          color_hilo: string | null;
          imagen: string;
          /**
           * `pantones` y las cinco banderas de técnica SÍ vuelven en la
           * respuesta —`bordado_config` es un JSON que el backend guarda y
           * devuelve verbatim, y el alta los escribe siempre—, pero este tipo
           * no los declaraba, así que quien rehidrata el formulario no tenía
           * de dónde leerlos y los reponía en `false`. Eso borraba las técnicas
           * en cada edición, y desde que `tipos_servicio` se deriva de ellas
           * borraba también el agregado que lee Producción.
           *
           * OPCIONALES: las cotizaciones anteriores a estos campos tienen el
           * JSON sin ellos, y ahí `undefined` es el dato real, no un error.
           */
          pantones?: string | null;
          nuevo_ponchado?: boolean;
          serigrafia?: boolean;
          sublimado?: boolean;
          dtf?: boolean;
          revelado?: boolean;
        }[];
      };
      lleva_reflejante: boolean;
      reflejante_config: {
        opcion: string;
        posicion: string;
        tipo: string;
      }[];
      lleva_corte_manga: boolean;
      corte_manga_config: {
        tipo: string;
      } | null;
      cotizacion_detalle: number;
      talla: number;
    }[];
    precio_unitario: string;
    costo_unitario: string | null;
    subtotal_linea: string;
    cotizacion: number;
    /**
     * `null` en una línea de PRODUCTO DE MUESTRA (producto externo): la partida
     * no apunta al catálogo, el nombre viaja en `producto_nombre_externo`.
     */
    producto: number | null;
    /**
     * OPCIONAL Y NULLABLE a propósito. El serializer lo declara como
     * `CharField(source="producto.nombre", read_only=True)` SIN `default=None`,
     * así que con `producto = null` DRF lanza `SkipField` y la clave ni siquiera
     * aparece en el JSON — no llega como `null`, llega ausente.
     */
    producto_nombre?: string | null;
    /** Nombre libre de la línea de muestra. `null` en líneas de catálogo. */
    producto_nombre_externo?: string | null;
    color: number | null;
    color_nombre: string | null;
    color_codigo_hex: string | null;
  }[];
  cliente_nombre: string;
  cliente_razon_social: string;
  estatus: number;
  /**
   * Campo del modelo `Cotizacion` expuesto por el serializer (`fields="__all__"`).
   * Ver `TIPO_PEDIDO` en `orders/constants/pedidoStatus`: 1 = pedido de venta,
   * 2 = muestra. Opcional porque una respuesta anterior al campo no lo trae.
   */
  tipo_pedido?: number;
  autorizada_at: string | null;
  cambios_solicitados_at: string | null;
  aprobado_snapshot: string | null;
  created_at: string;
  updated_at: string;
  persona_pagos: string;
  correo_facturas: string;
  telefono_pagos: string;
  oc: string;
  forma_pago: string;
  metodo_pago: string;
  uso_cfdi: string;
  anticipo_total: boolean;
  anticipo_parcial: boolean;
  vendedor_autoriza: boolean;
  pago_antes_embarque: boolean;
  por_confirmar: boolean;
  otra_cantidad: boolean;
  monto: string;
  embarque_parcial: boolean;
  comentarios_parcialidad: string;
  destinatario: string | null;
  empresa_envio: string | null;
  telefono_envio: string | null;
  celular_envio: string | null;
  direccion_envio: string | null;
  colonia_envio: string | null;
  codigo_postal: string | null;
  ciudad_envio: string | null;
  estado_envio: string | null;
  referencias: string | null;
  envio: string;
  programa_bordados: string;
  bordado_pantalones_extras: string;
  bordado_logotipo: boolean;
  serigrafia: string;
  reflejante: string;
  observaciones: string;
  flete: string;
  seguros: string;
  anticipo: string;
  subtotal: string;
  descuento_global: string;
  ieps: string;
  iva: number;
  gran_total: string;
  empresa: number;
  vendedor: number;
  sucursal: number;
  cliente: number;
  oportunidad: number | null;
  moneda: number;
  servicios_extras: {
    id: number;
    nombre: string;
    monto: string;
    cantidad: number;
    cotizacion: number;
    visible_en_factura: boolean;
    created_at: string;
    updated_at: string;
  }[];
}

export interface QuoteCreate {
  pedido: {
    empresa: Company["id"];
    sucursal: Branch["id"];
    cliente: number | null;
    moneda: Currency["id"];
    persona_pagos: string;
    correo_facturas: string;
    telefono_pagos: string;
    forma_pago: string;
    metodo_pago: string;
    uso_cfdi: string;
    tipo_pedido: number;
    estatus: number;
    oc: string;
    anticipo_total: boolean;
    anticipo_parcial: boolean;
    vendedor_autoriza: boolean;
    pago_antes_embarque: boolean;
    por_confirmar: boolean;
    otra_cantidad: boolean;
    monto: string;
    cliente_razon_social: string;
    cliente_nombre: string;
    cliente_rfc: string;
    cliente_regimen_fiscal: number;
    cliente_direccion_fiscal: string;
    cliente_colonia: string;
    cliente_codigo_postal: string;
    cliente_ciudad: string;
    cliente_estado: string;
    destinatario: string;
    empresa_envio: string;
    telefono_envio: string;
    celular_envio: string;
    direccion_envio: string;
    colonia_envio: string;
    codigo_postal: string;
    ciudad_envio: string;
    estado_envio: string;
    referencias: string;
    embarque_parcial: boolean;
    comentarios_parcialidad: string;
    observaciones: string;
    envio: string;
    programa_bordados: string;
    bordado_pantalones_extras: string;
    serigrafia: string;
    reflejante: string;
    bordado_logotipo: boolean;
    flete: string;
    seguros: string;
    anticipo: string;
    subtotal: string;
    descuento_global: string;
    ieps: string;
    iva: number;
    gran_total: string;
    activo: boolean;
    cotizacion: { id: number }
  },
  /**
   * Partidas de la cotización. Una partida de catálogo (`QuoteDetail`) apunta al
   * catálogo con `producto`; una de muestra (`QuoteMuestraDetail`) lleva
   * `producto: null` y el nombre libre en `producto_nombre_externo`. Es la
   * PRESENCIA de `producto_nombre_externo` lo que distingue una de otra.
   *
   * El arreglo es MIXTO: una misma cotización puede llevar partidas de los dos
   * tipos. `useQuoteForm` lo arma ramificando por el discriminante `tipo` del
   * formulario, que no se copia al payload.
   */
  detalle: (QuoteDetail | QuoteMuestraDetail)[],
  servicios_extras: QuoteExtraService[];
}

/**
 * Partida de PRODUCTO DE MUESTRA (producto externo): una solicitud de alta de
 * producto, no una venta de catálogo. El nombre viaja como texto libre en
 * `producto_nombre_externo` y `producto` va en `null`.
 *
 * `tallas` es obligatorio, no opcional: el backend lo recorre sin comprobar su
 * ausencia. Una muestra sin tallas capturadas mandaría `[]`.
 *
 * Lo construye el armador de `detalle` de `useQuoteForm`, en la rama
 * `item.tipo === "muestra"`.
 */
export interface QuoteMuestraDetail {
  producto: null;
  producto_nombre_externo: string;
  precio_unitario: string;
  /**
   * MISMA forma que las tallas de catálogo: una muestra sí lleva tallas (del
   * catálogo global de tallas activas) y sus servicios. Lo único que no tiene
   * es `color_id`.
   */
  tallas: QuoteDetail["tallas"];
}

interface QuoteDetail {
  producto: Product["id"];
  precio_unitario: string;
  color_id: Color["id"] | null;
  tallas: {
    talla: Size["id"];
    cantidad: number;
    lleva_bordado: boolean;
    bordado_config: {
      ubicaciones: {
        codigo: string;
        descripcion_posicion?: string | null;
        ancho_cm: number;
        alto_cm: number;
        color_hilo: string | null;
        pantones: string | null;
        imagen: string;
        nuevo_ponchado: boolean;
        serigrafia: boolean;
        sublimado: boolean;
        dtf: boolean;
        revelado: boolean;
      }[];
      notas: string;
      /**
       * Vista AGREGADA de las banderas de arriba, en claves del enum
       * `TipoServicioBordado` de Ventas: la unión de las técnicas activas en
       * todas las ubicaciones del renglón. La calcula `deriveTiposServicio` al
       * serializar —el formulario sigue capturando casillas por ubicación— y es
       * lo que lee Producción, que necesita el dato por talla y no por
       * ubicación.
       *
       * Nunca ausente: un renglón sin bordado, o con bordado pero sin ninguna
       * casilla marcada, viaja con `[]`.
       */
      tipos_servicio: string[];
    };
    lleva_reflejante: boolean;
    reflejante_config: {
      opcion: string;
      posicion: string;
      tipo: string;
    }[];
    lleva_corte_manga: boolean;
    corte_manga_config: {
      tipo: string;
    } | null;
  }[];
}

export interface QuoteExtraService {
  nombre: string;
  monto: string;
  cantidad: number;
}

export interface QuoteOnboardingData {
  vendedor: {
    id: number;
    username: string;
    email: string;
    empresa_id: Company["id"];
  },
  catalogos: {
    formas_pago: {
      value: string;
      label: string;
    }[],
    metodos_pago: {
      value: string;
      label: string;
    }[],
    usos_cfdi: {
      value: string;
      label: string;
    }[],
    regimenes_fiscales: {
      value: string;
      label: string;
    }[],
    tipos_pedido: {
      value: number;
      label: string;
    }[],
    /**
     * OPCIONAL porque el endpoint de onboarding NO la devuelve hoy: el objeto
     * `catalogos` nunca trajo `tallas`. Se declaraba obligatoria, y esa mentira
     * es la que dejó pasar durante meses un `catalogos.tallas ?? []` que en
     * tiempo de ejecución siempre valía `[]` sin una sola queja del compilador.
     *
     * El catálogo global de tallas activas se pide con `useSizes()`
     * (`GET /catalogo/talla/`) — ver `useQuoteForm`. NO leas esta clave.
     */
    tallas?: Size[]
  },
  busqueda: {
    clientes: {
      id: number;
      razon_social: string;
      nombre: string;
      rfc: string;
      correo: string;
      telefono: string;
      direccion_fiscal: string;
      colonia: string;
      codigo_postal: string;
      ciudad: string;
      estado: string;
      sat_regimen_fiscal_id: number;
      sat_regimen_fiscal__codigo: string;
      sat_regimen_fiscal__descripcion: string;
    }[];
    productos: (Partial<Product> & {
      variantes: QuoteOnboardingDataVariantProduct[];
    })[];
  }
}

export interface QuoteOnboardingDataVariantProduct {
  sku: string;
  color: Color;
  talla: Size;
}