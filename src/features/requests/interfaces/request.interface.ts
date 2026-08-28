/**
 * Capa de tipos propia del módulo de solicitudes (CRM).
 *
 * CLON de las partes de `quotes/interfaces/quote.interface.ts` que consume el
 * formulario. Se clonan SOLO `QuoteItem` y `QuotePaymentCondition`; NO se clona
 * `QuoteCreate` (payload de alta) porque no hay endpoint de solicitudes al que
 * enviarlo, ni `QuoteOnboardingData`, que es la forma de respuesta de una query
 * que se reutiliza por import.
 *
 * Ver la nota de `schemas/request.schema.ts` sobre por qué esto es un clon.
 */

export type RequestPaymentCondition =
  | "100_anticipo"
  | "50_anticipo"
  | "vendedor_autoriza"
  | "pago_antes_embarque"
  | "por_confirmar"
  | "otra_cantidad";

export interface RequestItem {
  productoId: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio: number;
  descuento: number;
  importe: number;
  availableSizes?: {
    id: number;
    nombre: string;
  }[];
  tallas?: {
    tallaId: number;
    nombre: string;
    cantidad: number;
  }[];
  bordados?: {
    activo: boolean;
    observaciones?: string;
    especificaciones: {
      posicionCodigo: string;
      posicionNombre: string;
      posicionPersonalizada?: string;
      ancho?: number;
      alto?: number;
      colorHilo?: string;
      pantones?: string;
      imagen: string;
      nuevoPonchado: boolean;
      serigrafia: boolean;
      sublimado: boolean;
      dtf: boolean;
      revelado: boolean;
    }[];
  };
  reflejantes?: {
    activo: boolean;
    observaciones?: string;
    especificaciones: {
      opcion: string;
      posicion: string;
      tipo: string;
    }[];
  };
  lleva_corte_manga?: boolean;
  colorId?: number;
  colorNombre?: string;
  colorHex?: string;
}

/** Servicio extra capturado en el formulario (estado local, fuera del schema). */
export interface RequestExtraService {
  id: string;
  nombre: string;
  monto: number;
  cantidad: number;
}
