"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import toast from "react-hot-toast";

import type { Customer } from "@/src/features/customers/interfaces/customer.interface";
import { useCustomerAddresses } from "@/src/features/customers/hooks/useCustomerAddresses";
import type { CustomerAddress } from "@/src/features/customers/interfaces/customer-address.interface";
import { useCurrencies } from "@/src/features/currency/hooks/useCurrencies";
import { useSatInfo } from "@/src/features/sat/hooks/useSatInfo";
import type { RegimenFiscal as SatRegimenFiscal } from "@/src/features/sat/interfaces/sat-info.interface";
import { useSizes } from "@/src/features/sizes/hooks/useSizes";
import type { FormFieldError } from "@/src/utils/getFieldError";
import {
  quoteFormSchema,
  quoteSubmitSchema,
  type QuoteFormValues,
} from "@/src/features/quotes/schemas/quote.schema";
import type {
  QuoteItem,
  QuoteOnboardingData,
  QuotePaymentCondition,
} from "@/src/features/quotes/interfaces/quote.interface";
import { createEmptyValues, type ExtraService } from "@/src/features/quotes/hooks/useQuoteForm";
import { useQuoteOnboardingData } from "@/src/features/quotes/hooks/useQuoteOnboardingData";
import { deriveTiposServicio } from "@/src/features/quotes/utils/deriveTiposServicio";
import type { QuoteValidationIssue } from "@/src/features/quotes/utils/quoteValidationErrors";
import { scrollToFirstValidationError } from "@/src/features/quotes/utils/scrollToFirstValidationError";
import {
  getPathValue,
  normalizeItem,
  setErrorByPath,
  type ErrorNode,
} from "@/src/features/quotes/utils/quoteFormErrorTree";

import { canEditPedidoMesaControl, TIPO_PEDIDO } from "../constants/pedidoStatus";
import { usePedidoDetail } from "./usePedidoDetail";
import { useUpdatePedidoMesaControl } from "./useUpdatePedidoMesaControl";
import type {
  PedidoDetail,
  PedidoDetalleLinea,
  PedidoDetalleTalla,
  ServicioConfig,
} from "../interfaces/order.interface";
import type {
  PedidoBordadoConfig,
  PedidoMesaControlDetalleInput,
  PedidoMesaControlTallaInput,
  PedidoMesaControlUpdate,
  PedidoReflejanteConfig,
} from "../interfaces/pedido-mesa-control.interface";

/**
 * Formulario de EDICIÓN DE PEDIDO por Mesa de Control.
 *
 * Produce exactamente el mismo contrato que `useQuoteForm`/`useQuoteEditForm`
 * (`QuoteFormHookResult`) para poder renderizarse con `QuoteFormContent`, el
 * mismo JSX que usan el alta y la edición de cotizaciones. Lo que cambia es de
 * dónde se hidrata (el detalle del PEDIDO) y a dónde se envía
 * (`POST /ventas/pedidos/{id}/editar-mesa-control/`).
 *
 * Además del contrato compartido devuelve un puñado de claves propias
 * (`pedido`, `pedidoLoadFailed`, el estado del diálogo de confirmación…) que el
 * WRAPPER desestructura antes de hacer spread, igual que hace `QuoteEditForm`
 * con `quoteLoadFailed`.
 *
 * PERMISOS — divergencia consciente: la pantalla se protege en el frontend con
 * `E-MESACONTROL-PEDIDOS` (guard de ruta + botones), pero el endpoint NO valida
 * ese código: `PedidoViewSet._require_mesa_control` exige pertenecer al ROL
 * `MESA-DE-CONTROL` (o ser superuser / admin de empresa). O sea que el permiso
 * del catálogo es consistencia de UI y la frontera real es el rol. Un usuario
 * con el permiso pero sin el rol llegará a la pantalla y recibirá un 403 al
 * guardar.
 */

// ─── Catálogos y constantes (mismos valores que los hooks de cotización) ──────

const PAYMENT_CONDITION_OPTIONS: { value: QuotePaymentCondition; label: string }[] = [
  { value: "100_anticipo", label: "100% Anticipo" },
  { value: "50_anticipo", label: "50% Anticipo" },
  { value: "vendedor_autoriza", label: "Vendedor autoriza" },
  { value: "pago_antes_embarque", label: "Pago antes de embarque" },
  { value: "por_confirmar", label: "Por confirmar" },
  { value: "otra_cantidad", label: "Otra cantidad" },
];

const IVA_OPTIONS = [
  { value: 16, label: "16%" },
  { value: 8, label: "8%" },
  { value: 0, label: "0%" },
];

const DEFAULT_USO_CFDI_VALUE = "G03";
const DEFAULT_USO_CFDI_LABEL = "G03 - Gastos en general";

/** Listado de Mesa de Control: destino del "Volver" y de las denegaciones. */
const OPERATIONS_ORDERS_PATH = "/operations/orders";

type OnboardingCustomer = QuoteOnboardingData["busqueda"]["clientes"][number];
type OnboardingProduct = QuoteOnboardingData["busqueda"]["productos"][number];

// ─── Estrechado de las configuraciones congeladas ─────────────────────────────

/**
 * `bordado_config` llega como `ServicioConfig` (el tipo laxo y honesto de un
 * `JSONField`). Aquí se estrecha a la forma que sí escribe este formulario, sin
 * confiar en que el JSON la cumpla: un pedido viejo puede no traer `notas` ni
 * `ubicaciones`. Devuelve `null` cuando el valor no es un objeto (p. ej. si
 * llegara el ARRAY que sí usa `reflejante_config`).
 */
const asBordadoConfig = (value: ServicioConfig): PedidoBordadoConfig | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    notas: typeof record.notas === "string" ? record.notas : "",
    ubicaciones: Array.isArray(record.ubicaciones)
      ? (record.ubicaciones as PedidoBordadoConfig["ubicaciones"])
      : [],
  };
};

/** Objeto JSON llano, o `null` para cualquier otra cosa (array, escalar…). */
const asPlainObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** `reflejante_config` es ARRAY (a diferencia de bordado y corte de manga). */
const asReflejanteConfig = (value: ServicioConfig): PedidoReflejanteConfig =>
  Array.isArray(value) ? (value as PedidoReflejanteConfig) : [];

/**
 * Un JSON de config está "vacío" para el backend. Réplica exacta de
 * `_is_empty_json` (`value in (None, "", [], {})`), incluida la CADENA VACÍA:
 * sin ella, una talla con `lleva_cambio_talla=true` y `cambio_talla_config=""`
 * pasaba el guard de aquí y luego el backend la rechazaba con 400 en cada
 * intento de guardar.
 */
const isEmptyConfig = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && Object.keys(value as object).length === 0);

/**
 * Huella de los servicios de UNA talla. Se usa solo para comparar tallas de la
 * MISMA línea entre sí, escritas por el mismo productor en la misma operación,
 * así que el orden de claves de `JSON.stringify` es estable en la práctica; un
 * falso positivo bloquea la edición, que es el lado seguro del error.
 */
const tallaServiciosFingerprint = (talla: PedidoDetalleTalla) =>
  JSON.stringify([
    talla.lleva_bordado,
    talla.bordado_config ?? null,
    talla.lleva_reflejante,
    talla.reflejante_config ?? null,
    talla.lleva_corte_manga,
    talla.corte_manga_config ?? null,
    talla.lleva_cambio_talla,
    talla.cambio_talla_config ?? null,
  ]);

/**
 * Líneas que este formulario NO PUEDE representar sin destruir datos.
 *
 * `PedidoDetalleTalla` guarda `lleva_bordado`/`lleva_reflejante`/
 * `lleva_corte_manga`/`lleva_cambio_talla` y sus cuatro JSON **por talla**, y
 * `_save_pedido_detalle` los recrea uno por uno desde el payload. En cambio
 * `QuoteFormContent` —el JSX compartido con cotizaciones— modela los servicios
 * a nivel de LÍNEA: `QuoteItem` lleva `bordados`, `reflejantes` y
 * `lleva_corte_manga` sueltos, y sus `tallas` solo tienen
 * `{ tallaId, nombre, cantidad }`. No hay dónde poner una variación por talla.
 *
 * Aplanarla en silencio significaba propagar la config de `tallas[0]` a todas:
 * o se perdía el bordado de las tallas grandes, o se inventaba en las que no lo
 * llevaban. Aquí se DETECTA y la pantalla se niega a abrir, que es lo único que
 * no pierde nada. Se detecta también la talla con `lleva_cambio_talla` y config
 * vacía, que el backend rechaza con 400 al recrearla.
 */
const findLineasNoRepresentables = (pedido: PedidoDetail): PedidoDetalleLinea[] =>
  (pedido.detalles ?? []).filter((linea) => {
    if (linea.tallas.some((t) => t.lleva_cambio_talla && isEmptyConfig(t.cambio_talla_config))) {
      return true;
    }
    if (linea.tallas.length <= 1) return false;
    const first = tallaServiciosFingerprint(linea.tallas[0]);
    return linea.tallas.some((talla) => tallaServiciosFingerprint(talla) !== first);
  });

// ─── Utilidades de mapeo ─────────────────────────────────────────────────────

/** Banderas booleanas de condición de pago → enum del formulario. */
const reverseMapCondicionPago = (pedido: PedidoDetail): QuotePaymentCondition => {
  if (pedido.anticipo_total) return "100_anticipo";
  if (pedido.anticipo_parcial) return "50_anticipo";
  if (pedido.vendedor_autoriza) return "vendedor_autoriza";
  if (pedido.pago_antes_embarque) return "pago_antes_embarque";
  if (pedido.por_confirmar) return "por_confirmar";
  if (pedido.otra_cantidad) return "otra_cantidad";
  return "100_anticipo";
};

/**
 * Renglón del pedido → partida del formulario.
 *
 * A diferencia del mapeo de cotizaciones —que fija `tipo: "catalogo"` y deja la
 * edición de muestras como deuda—, aquí SÍ se ramifica: `PedidoDetalle.producto`
 * es nullable y una muestra abierta en esta pantalla tiene que poder volver a
 * guardarse. Con `tipo: "catalogo"` forzado caería en `productoId >= 1` de
 * `quoteItemSchema` y el pedido quedaría imposible de guardar entero.
 */
const mapLineaToQuoteItem = (
  linea: PedidoDetalleLinea,
  products?: OnboardingProduct[],
): QuoteItem => {
  const primeraTalla = linea.tallas[0];
  const llevaBordado = primeraTalla?.lleva_bordado ?? false;
  const llevaReflejante = primeraTalla?.lleva_reflejante ?? false;
  const llevaCorteManga = primeraTalla?.lleva_corte_manga ?? false;

  const cantidadTotal = linea.tallas.reduce((sum, talla) => sum + talla.cantidad, 0);
  const precio = Number(linea.precio_unitario) || 0;
  // `subtotal_linea` es columna muerta (siempre 0), así que el importe se
  // calcula local — mismo criterio que la edición de cotizaciones.
  const importe = Number((cantidadTotal * precio).toFixed(2));
  const bordadoConfig = asBordadoConfig(primeraTalla?.bordado_config ?? null);

  const base = {
    unidad: "PZA",
    cantidad: cantidadTotal,
    precio,
    descuento: 0,
    importe,
    colorId: linea.color ?? undefined,
    colorNombre: linea.color_nombre ?? undefined,
    colorHex: linea.color_codigo_hex ?? undefined,
    // Passthrough opacos: no se editan en ninguna parte del formulario, viajan
    // de la lectura al payload para sobrevivir al borrado-y-recreado.
    //
    // Los tres de servicios se leen de `tallas[0]` SIN riesgo de aplanamiento:
    // `findLineasNoRepresentables` ya rechazó cualquier línea cuyas tallas no
    // coincidan, así que aquí la primera talla habla por todas.
    precio_lista: linea.precio_lista != null ? Number(linea.precio_lista) : undefined,
    // `|| null`: el backend trata el 0 como "sin dirección" y lo colapsa a
    // `None`, así que se normaliza aquí en vez de arrastrar un cero que solo
    // significa ausencia.
    direccion_envio_cliente: linea.direccion_envio_cliente || null,
    corte_manga_config: primeraTalla?.corte_manga_config ?? null,
    lleva_cambio_talla: primeraTalla?.lleva_cambio_talla ?? false,
    cambio_talla_config: primeraTalla?.cambio_talla_config ?? null,
    // Los dos JSON de bordado/reflejante COMPLETOS, sin estrechar: son la base
    // sobre la que se fusiona al serializar, para no perder las claves que el
    // formulario no modela. `asBordadoConfig`/`asReflejanteConfig` siguen
    // usándose aparte, solo para pintar lo que sí se edita.
    bordado_config_original: primeraTalla?.bordado_config ?? null,
    reflejante_config_original: primeraTalla?.reflejante_config ?? null,
    // Tallas disponibles según las variantes del producto para ese color; si no
    // hay coincidencia queda `undefined` y el diálogo cae al catálogo global.
    availableSizes: (() => {
      if (!products?.length || linea.producto == null) return undefined;
      const product = products.find((p) => p.id === linea.producto);
      if (!product?.variantes?.length) return undefined;
      const colorId = linea.color ?? null;
      const seen = new Set<number>();
      const sizesList: Array<{ id: number; nombre: string }> = [];
      for (const variant of product.variantes) {
        if (colorId !== null && variant.color.id !== colorId) continue;
        if (!seen.has(variant.talla.id)) {
          seen.add(variant.talla.id);
          sizesList.push(variant.talla);
        }
      }
      return sizesList.length > 0 ? sizesList : undefined;
    })(),
    tallas: linea.tallas.map((talla) => ({
      tallaId: talla.talla,
      nombre: talla.talla_nombre,
      cantidad: talla.cantidad,
    })),
    bordados: llevaBordado
      ? {
          activo: true,
          observaciones: bordadoConfig?.notas ?? "",
          especificaciones: (bordadoConfig?.ubicaciones ?? []).map((ubicacion) => ({
            posicionCodigo: ubicacion.codigo,
            posicionNombre: ubicacion.descripcion_posicion?.trim() || ubicacion.codigo,
            posicionPersonalizada: ubicacion.descripcion_posicion ?? "",
            // null/cero → undefined para que Zod los omita en `.optional()`.
            ancho: Number(ubicacion.ancho_cm) > 0 ? ubicacion.ancho_cm : undefined,
            alto: Number(ubicacion.alto_cm) > 0 ? ubicacion.alto_cm : undefined,
            colorHilo: ubicacion.color_hilo ?? undefined,
            pantones: ubicacion.pantones ?? undefined,
            imagen: ubicacion.imagen ?? "",
            // `?? false` para los pedidos anteriores a estas claves: sin ellas,
            // abrir y guardar borraría las técnicas capturadas y, con ellas, el
            // agregado `tipos_servicio` que lee Producción.
            nuevoPonchado: ubicacion.nuevo_ponchado ?? false,
            serigrafia: ubicacion.serigrafia ?? false,
            sublimado: ubicacion.sublimado ?? false,
            dtf: ubicacion.dtf ?? false,
            revelado: ubicacion.revelado ?? false,
          })),
        }
      : { activo: false, observaciones: "", especificaciones: [] },
    reflejantes: llevaReflejante
      ? {
          activo: true,
          observaciones: "",
          especificaciones: asReflejanteConfig(primeraTalla?.reflejante_config ?? null).map(
            (spec) => ({
              opcion: spec.opcion || "",
              posicion: spec.posicion || "",
              tipo: spec.tipo || "",
            }),
          ),
        }
      : { activo: false, observaciones: "", especificaciones: [] },
    lleva_corte_manga: llevaCorteManga,
  };

  if (linea.producto == null) {
    return {
      ...base,
      tipo: "muestra",
      productoId: null,
      descripcion: linea.producto_nombre_externo ?? "",
      producto_nombre_externo: linea.producto_nombre_externo ?? "",
    } satisfies QuoteItem;
  }

  return {
    ...base,
    tipo: "catalogo",
    productoId: linea.producto,
    descripcion: linea.producto_nombre ?? "",
  } satisfies QuoteItem;
};

/** Detalle del pedido → valores iniciales del formulario. */
const mapPedidoDetailToFormValues = (
  pedido: PedidoDetail,
  todayStr: string,
  userName: string,
  satRegimenes: SatRegimenFiscal[],
  customer?: OnboardingCustomer,
  products?: OnboardingProduct[],
): QuoteFormValues => {
  const oc = pedido.oc ?? "";

  /**
   * El pedido lleva su PROPIO snapshot fiscal (foto al momento del pedido) y es
   * el que se reenvía, así que se hidrata de ahí y NO del catálogo de clientes
   * —lo contrario reescribiría el snapshot con los datos actuales del cliente
   * solo por abrir y guardar—. El cliente del catálogo entra únicamente como
   * respaldo cuando el snapshot no se puede resolver.
   *
   * TRADUCCIÓN OBLIGATORIA: `pedido.cliente_regimen_fiscal` es el PK de
   * `SatRegimenFiscal` y el campo del formulario habla en CÓDIGOS SAT (el
   * catálogo de onboarding se arma con `value = codigo`). Se traduce con el
   * catálogo SAT, que expone las dos mitades. Sin esta traducción el select
   * mostraba el régimen del CLIENTE en vez del guardado en el pedido.
   */
  const regimenFiscal = (() => {
    if (pedido.cliente_regimen_fiscal != null) {
      const match = satRegimenes.find(
        (regimen) => regimen.id_sat_regimen_fiscal === pedido.cliente_regimen_fiscal,
      );
      /* Si el pedido YA tiene régimen pero no se puede nombrar (fila dada de
       * baja: los catálogos filtran `activo=True`), se deja VACÍO en vez de
       * caer al del cliente. Caer al del cliente pintaba un régimen que el
       * pedido no tiene y, al guardar, lo escribía encima del snapshot — justo
       * lo que este bloque existe para impedir. Vacío hace que la clave se
       * omita del payload y el pedido conserve el suyo. */
      return match?.codigo ?? "";
    }
    return customer?.sat_regimen_fiscal__codigo ?? "";
  })();

  return {
    clienteBusqueda: pedido.cliente_razon_social || pedido.cliente_nombre || "",
    clienteNombre: pedido.cliente_nombre || "",
    razonSocial: pedido.cliente_razon_social || "",
    rfc: pedido.cliente_rfc || customer?.rfc || "",
    regimenFiscal,
    direccionFiscal: pedido.cliente_direccion_fiscal || customer?.direccion_fiscal || "",
    coloniaFiscal: pedido.cliente_colonia || customer?.colonia || "",
    codigoPostalFiscal: pedido.cliente_codigo_postal || customer?.codigo_postal || "",
    ciudadFiscal: pedido.cliente_ciudad || customer?.ciudad || "",
    estadoFiscal: pedido.cliente_estado || customer?.estado || "",
    persona_pagos: pedido.persona_pagos || "",
    correo_facturas: pedido.correo_facturas || "",
    telefono_pagos: pedido.telefono_pagos || "",
    oc,
    forma_pago: pedido.forma_pago || "03",
    metodo_pago: pedido.metodo_pago || "PUE",
    uso_cfdi: pedido.uso_cfdi || DEFAULT_USO_CFDI_VALUE,
    referenciarOcFactura: false,
    condicionPago: reverseMapCondicionPago(pedido),
    condicionPagoMonto: Number(pedido.monto) || 0,
    fecha: todayStr,
    agente: userName,
    tipo_pedido: pedido.tipo_pedido ?? TIPO_PEDIDO.PEDIDO_DE_VENTA,
    destinatario: pedido.destinatario || "",
    empresaEnvio: pedido.empresa_envio || "",
    telefonoEnvio: pedido.telefono_envio || "",
    celularEnvio: pedido.celular_envio || "",
    direccionEnvio: pedido.direccion_envio || "",
    coloniaEnvio: pedido.colonia_envio || "",
    codigoPostalEnvio: pedido.codigo_postal || "",
    ciudadEnvio: pedido.ciudad_envio || "",
    estadoEnvio: pedido.estado_envio || "",
    referenciasEnvio: pedido.referencias || "",
    enviarDomicilioFiscal: false,
    embarcarConOtrosPedidos: false,
    embarque_parcial: Boolean(pedido.embarque_parcial),
    comentarios_parcialidad: pedido.comentarios_parcialidad || "",
    servicioEnvioActivo: Number(pedido.envio) > 0,
    envio: Number(pedido.envio) || 0,
    programaBordadosActivo: Number(pedido.programa_bordados) > 0,
    programa_bordados: Number(pedido.programa_bordados) || 0,
    bordadoPantalonesExtrasActivo: Number(pedido.bordado_pantalones_extras) > 0,
    bordado_pantalones_extras: Number(pedido.bordado_pantalones_extras) || 0,
    serigrafiaActivo: Number(pedido.serigrafia) > 0,
    serigrafia: Number(pedido.serigrafia) || 0,
    reflejanteActivo: Number(pedido.reflejante) > 0,
    reflejante: Number(pedido.reflejante) || 0,
    bordado_logotipo: Boolean(pedido.bordado_logotipo),
    /* Campo SOLO DE FORMULARIO en este flujo: el serializer de cabecera EXCLUYE
     * `estatus`, así que nunca viaja. Se deja en el valor por defecto del schema
     * para no inventar una lectura que no se usa. */
    estatusPedido: "Pendiente",
    docRelacionado: `pedido-oc${oc.trim()}`,
    observaciones: pedido.observaciones || "",
    flete: Number(pedido.flete) || 0,
    seguros: Number(pedido.seguros) || 0,
    anticipo: Number(pedido.anticipo) || 0,
    iva: pedido.iva ?? 16,
    moneda: pedido.moneda || 0,
    items: (pedido.detalles ?? []).map((linea) => mapLineaToQuoteItem(linea, products)),
  };
};

/**
 * Subtotal y descuento global del pedido.
 *
 * `descuento_global` es un IMPORTE de cabecera que el cliente fija por su
 * cuenta: el backend nunca lo calcula ni lo deriva de las líneas, y ninguna
 * tabla de renglón guarda un descuento (`PedidoDetalle` solo tiene
 * `precio_lista`/`precio_unitario`/`costo_unitario`, y `subtotal_linea` se
 * escribe siempre en 0). Tampoco es recuperable de los dos precios: son dos
 * valores independientes, `precio_lista` es nullable y su diferencia mezcla
 * descuento, ajuste y desfase de catálogo.
 *
 * Consecuencia: el descuento guardado NO se puede reconstruir desde las líneas,
 * así que se ARRASTRA. Antes se recalculaba desde el `descuento` por renglón
 * —que este formulario hidrata en 0 y ni siquiera deja editar (se pinta como
 * texto)—, de modo que abrir y guardar sin tocar nada mandaba
 * `descuento_global: "0.00"` y un `subtotal` inflado por el descuento perdido,
 * subiendo el `gran_total` facturado.
 *
 * Con el arrastre, un guardado sin cambios reproduce byte a byte lo guardado:
 * `subtotal = Σ(cantidad × precio) − descuento_guardado`, que es exactamente la
 * identidad con la que se creó el pedido. El `Math.min` evita un subtotal
 * negativo si se borran líneas hasta bajar del descuento.
 */
const computeSubtotales = (items: QuoteItem[], storedDescuentoGlobal: number) => {
  const rawTotal = items.reduce(
    (sum, item) => sum + (Number(item.cantidad) || 0) * (Number(item.precio) || 0),
    0,
  );
  // Descuentos por renglón capturados en esta sesión. Hoy siempre 0 — el
  // formulario compartido no expone el campo —, pero se suma para que el día
  // que se exponga el total siga cuadrando.
  const lineDiscounts = items.reduce(
    (sum, item) =>
      sum + ((Number(item.cantidad) || 0) * (Number(item.precio) || 0) - item.importe),
    0,
  );
  /* `Math.max(0, …)` no es defensa teórica: `lineDiscounts` es la resta de un
   * producto contra su propio `toFixed(2)`, así que con descuento 0 vale ±1e-16
   * según los decimales del precio. Un residuo NEGATIVO daba
   * `(-1.11e-16).toFixed(2) === "-0.00"`, y con precios de más de dos decimales
   * llegaba a un `"-0.01"` real que el backend persiste sin objetar (el campo no
   * tiene `min_value`) y que la siguiente apertura vuelve a sumar: un trinquete
   * que corría el dinero un centavo por guardado. El techo `rawTotal` evita el
   * subtotal negativo al borrar líneas. */
  const descuentoTotal = Math.min(
    Math.max(0, storedDescuentoGlobal + lineDiscounts),
    Math.max(0, rawTotal),
  );
  return { subtotal: rawTotal - descuentoTotal, descuentoTotal };
};

/**
 * Renglones del payload a partir de las partidas del formulario.
 *
 * Vive a nivel de MODULO y no dentro del submit para que el detector de
 * fusiones trabaje sobre LOS MISMOS renglones que se van a enviar: si el
 * detector reconstruyera su propia version, podria dejar de coincidir con el
 * payload y avisar de mas o de menos.
 */
const buildDetalleFromItems = (
  items: QuoteItem[],
): PedidoMesaControlDetalleInput[] =>
  items.map((item) => {
    const llevaBordado = Boolean(item.bordados?.activo);
    /* FUSIÓN, no reconstrucción. El JSON de bordado lo escriben también los
     * módulos de Producción, que leen de él claves que este formulario no
     * modela: a nivel del config, `foto`/`imagen`/`imagen_url`/`foto_url`,
     * `observaciones`/`comentarios` y `posicion`; y dentro de cada ubicación,
     * `nombre` (produccion/api/views.py:139-175, que además publica el
     * config CRUDO íntegro cuando arma OR). Armar el objeto desde cero las
     * borraba en cada guardado, porque el detalle se borra y se recrea.
     *
     * Se parte del original y se sobreescriben SOLO las claves que el
     * formulario posee; lo mismo por ubicación, emparejadas por índice (el
     * diálogo conserva el orden). Una ubicación nueva no tiene original que
     * fusionar y se arma con los campos del formulario, que es correcto. */
    const bordadoOriginal = asPlainObject(item.bordado_config_original);
    const ubicacionesOriginales = Array.isArray(bordadoOriginal?.ubicaciones)
      ? bordadoOriginal.ubicaciones
      : [];
    const ubicaciones = llevaBordado
      ? (item.bordados?.especificaciones?.map((spec, index) => ({
          ...(asPlainObject(ubicacionesOriginales[index]) ?? {}),
          codigo: spec.posicionCodigo,
          descripcion_posicion: spec.posicionPersonalizada?.trim() || null,
          ancho_cm: Math.max(0, Number(spec.ancho) || 0),
          alto_cm: Math.max(0, Number(spec.alto) || 0),
          color_hilo: spec.colorHilo ?? null,
          pantones: spec.pantones ?? null,
          imagen: spec.imagen,
          nuevo_ponchado: spec.nuevoPonchado,
          serigrafia: spec.serigrafia,
          sublimado: spec.sublimado,
          dtf: spec.dtf,
          revelado: spec.revelado,
        })) ?? [])
      : [];
    /* Con el bordado APAGADO no se fusiona: apagarlo es una acción
     * deliberada del usuario y el config vacío es el resultado correcto. */
    const bordadoConfig: Record<string, unknown> = {
      ...(llevaBordado ? (bordadoOriginal ?? {}) : {}),
      ubicaciones,
      notas: llevaBordado ? (item.bordados?.observaciones ?? "") : "",
      // Agregado que lee Producción — se deriva de las casillas por
      // ubicación, igual que en cotizaciones.
      tipos_servicio: deriveTiposServicio(ubicaciones),
    };
    const llevaReflejante = Boolean(item.reflejantes?.activo);
    /* Misma fusión por entrada que en bordado. `reflejante_config` es un
     * ARRAY, así que no hay nivel superior donde fusionar: el original se
     * empareja por índice con cada especificación. Producción publica este
     * config crudo íntegro en el onboarding de OR, de modo que cualquier
     * clave extra por entrada importa. */
    const reflejanteOriginales = Array.isArray(item.reflejante_config_original)
      ? item.reflejante_config_original
      : [];
    const reflejanteConfig: Record<string, unknown>[] = llevaReflejante
      ? (item.reflejantes?.especificaciones?.map((spec, index) => ({
          ...(asPlainObject(reflejanteOriginales[index]) ?? {}),
          opcion: spec.opcion,
          posicion: spec.posicion,
          tipo: spec.tipo,
        })) ?? [])
      : [];
    const llevaCorteManga = Boolean(item.lleva_corte_manga);
    /* Se REENVÍA la config congelada que traía la línea, no un literal:
     * el formulario solo tiene la bandera, y `_save_pedido_detalle` recrea
     * la columna desde el payload, así que reconstruirla como `{tipo:"1"}`
     * pisaba el tipo de corte que hubiera elegido Producción. El literal
     * queda solo como valor de arranque para una línea a la que se le acaba
     * de marcar la casilla y por tanto no tiene config previa. */
    const corteMangaConfig = llevaCorteManga
      ? (isEmptyConfig(item.corte_manga_config) ? { tipo: "1" } : item.corte_manga_config)
      : null;
    /* Cambio de talla: el formulario no lo expone en absoluto. Sin
     * reenviarlo, el borrado-y-recreado lo dejaba en `false`/`null`. */
    const llevaCambioTalla = Boolean(item.lleva_cambio_talla);
    const cambioTallaConfig = llevaCambioTalla ? (item.cambio_talla_config ?? null) : null;

    /* Aquí NO se filtran tallas en cero: no puede haberlas. `cantidad` de
     * `quoteItemSizeSchema` exige `>= 1`, así que una talla vacía revienta
     * en `quoteSubmitSchema.safeParse` mucho antes de llegar a este punto —
     * el `.filter(cantidad > 0)` que había era código muerto que prometía
     * una tolerancia inexistente.
     *
     * El manejo de verdad —descartar la talla que el usuario dejó en cero
     * en vez de bloquearlo con un error en `items.N.tallas.M.cantidad`, una
     * ruta que ningún input pinta— NO se implementa aquí a propósito: haría
     * falta filtrarlas ANTES del `safeParse`, y ese arreglo pertenece al
     * diálogo de tallas, que es COMPARTIDO con cotizaciones. Descartarlas
     * solo en este flujo silenciaría un renglón que el usuario quizá sigue
     * queriendo, y con distinto criterio que el alta de cotización. */
    const tallas: PedidoMesaControlTallaInput[] = (item.tallas ?? []).map((talla) => ({
      talla: talla.tallaId,
      cantidad: Math.max(0, Number(talla.cantidad) || 0),
      lleva_bordado: llevaBordado,
      bordado_config: bordadoConfig,
      lleva_reflejante: llevaReflejante,
      reflejante_config: reflejanteConfig,
      lleva_corte_manga: llevaCorteManga,
      corte_manga_config: corteMangaConfig,
      lleva_cambio_talla: llevaCambioTalla,
      cambio_talla_config: cambioTallaConfig,
    }));

    const precioUnitario = String(Number(item.precio).toFixed(2));
    /* `precio_lista` explícito: ESTE endpoint sí lo respeta (a diferencia
     * del alta de cotización). En un renglón sin precio de lista propio
     * —uno agregado en esta sesión— va `null` y el backend lo resuelve
     * desde `producto.precio_base`, que es el precio de lista del catálogo. */
    const precioLista =
      item.precio_lista != null ? String(Number(item.precio_lista).toFixed(2)) : null;

    if (item.tipo === "muestra") {
      return {
        producto: null,
        producto_nombre_externo: item.producto_nombre_externo,
        precio_lista: precioLista,
        precio_unitario: precioUnitario,
        color: null,
        direccion_envio_cliente: item.direccion_envio_cliente ?? null,
        tallas,
      };
    }

    return {
      producto: item.productoId,
      precio_lista: precioLista,
      precio_unitario: precioUnitario,
      color: item.colorId ?? null,
      direccion_envio_cliente: item.direccion_envio_cliente ?? null,
      tallas,
    };
  });

/** `JSON.stringify` con las claves de objeto ordenadas, a cualquier nivel. */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
};

/**
 * Llave de agrupación de `_merge_detalle`, replicada.
 *
 * El backend agrupa por `(producto, producto_nombre_externo, color, direccion,
 * json.dumps(tallas, sort_keys=True))` — **el precio NO entra**. Dos renglones
 * que coincidan en todo eso pero difieran en `precio_unitario` se fusionan: se
 * conserva el precio del PRIMERO, se suman las cantidades y el pedido pierde un
 * renglón. Se replica el `0`/`""` → `None` de color y dirección.
 *
 * No se puede evitar desde el frontend sin cambiar el contrato del endpoint, y
 * tampoco se debe: lo que sí se puede es AVISAR antes de guardar.
 */
const mergeGroupKey = (row: PedidoMesaControlDetalleInput): string =>
  stableStringify([
    row.producto ?? null,
    row.producto_nombre_externo ?? null,
    row.color || null,
    row.direccion_envio_cliente || null,
    row.tallas,
  ]);

/** Grupos de 2+ partidas que el backend fusionaría, con su índice en la tabla. */
export interface MergeCollision {
  descripcion: string;
  /** Posición (base 1) de cada partida en la tabla del formulario. */
  posiciones: number[];
  /** Precios distintos dentro del grupo — lo que de verdad se pierde. */
  precios: string[];
}

const findMergeCollisions = (items: QuoteItem[]): MergeCollision[] => {
  const detalle = buildDetalleFromItems(items);
  const groups = new Map<string, number[]>();
  detalle.forEach((row, index) => {
    const key = mergeGroupKey(row);
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  return [...groups.values()]
    .filter((indices) => indices.length > 1)
    .map((indices) => ({
      descripcion: items[indices[0]]?.descripcion || `Partida ${indices[0] + 1}`,
      posiciones: indices.map((index) => index + 1),
      precios: [...new Set(indices.map((index) => detalle[index].precio_unitario))],
    }));
};

type QuoteField = keyof QuoteFormValues;

// ─── Hook principal ──────────────────────────────────────────────────────────

export function usePedidoMesaControlEditForm(pedidoId: number) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();
  const { data: onboardingData, isLoading: isOnboardingLoading } = useQuoteOnboardingData();
  const { data: satInfo } = useSatInfo();
  // A diferencia de la edición de cotizaciones —que lee `catalogos.tallas`, un
  // campo que el backend nunca envía, y se queda con `[]`—, esta pantalla usa el
  // catálogo global real, como el alta. Sin él, el diálogo de tallas queda
  // inservible en cuanto un producto pierde sus variantes.
  const { sizes, isLoading: isSizesLoading } = useSizes();

  const {
    data: pedidoData,
    isLoading: isPedidoLoading,
    isFetching: isPedidoFetching,
    error: pedidoError,
    refetch: refetchPedido,
  } = usePedidoDetail(pedidoId);

  /* 404/403: denegaciones DEFINITIVAS del backend. Este hook es el punto
   * AUTORITATIVO de verificación de acceso al DATO: el guard del servidor solo
   * valida la forma del id y el permiso del JWT de NextAuth, porque en esta
   * topología `auth-jwt` vive en el dominio del backend y el servidor de Next
   * nunca la recibe. */
  const pedidoErrorStatus =
    pedidoError instanceof AxiosError ? pedidoError.response?.status : undefined;
  const pedidoAccessDenied = pedidoErrorStatus === 404 || pedidoErrorStatus === 403;
  /* Cualquier otro fallo (500, red, timeout) es TÉCNICO: el wrapper pinta un
   * estado con reintento en vez de dejar el loader girando para siempre. */
  const pedidoLoadFailed = Boolean(pedidoError) && !pedidoAccessDenied;

  /**
   * Sin cotización ligada NO hay nada que editar por aquí: el endpoint responde
   * 400 ("El pedido no tiene cotización relacionada para sincronizar") porque su
   * contrato es editar-y-espejar, no editar a secas. Se detecta al cargar el
   * detalle —el listado de pedidos no expone `cotizacion`, así que la acción de
   * la tabla no puede filtrarlo antes— y el wrapper lo explica en pantalla en
   * lugar de dejar que reviente al guardar.
   */
  const hasSourceQuote = Boolean(pedidoData?.cotizacion);
  const pedidoNotSyncable = Boolean(pedidoData) && !hasSourceQuote;

  /**
   * Estatus no editable (hoy: CANCELADO, y cualquier valor fuera del enum).
   *
   * Es la ÚLTIMA línea, no la única: los dos disparadores ya ocultan la acción
   * con la misma regla (`canEditPedidoMesaControl`). Se repite aquí porque la
   * ruta es alcanzable escribiendo la URL, y el guard del servidor solo mira la
   * forma del id y el permiso del JWT — nunca el estatus, que vive en el
   * backend de negocio al que este servidor no puede consultar.
   */
  const pedidoNotEditableStatus =
    Boolean(pedidoData) && !canEditPedidoMesaControl(pedidoData?.estatus);

  /**
   * El retrieve pasa por `filtrar_campos_contabilidad_pedido`, que ELIMINA (no
   * anula) ~24 claves cuando el usuario no tiene rol contable: en la cabecera
   * `gran_total`, `subtotal`, `iva`, `forma_pago`, `metodo_pago`, `uso_cfdi`,
   * las banderas de condición de pago y los cargos; y en cada renglón
   * `precio_unitario`, `precio_lista`, `costo_unitario` y `subtotal_linea`.
   *
   * Esta pantalla NO PUEDE trabajar con esa respuesta, y el fallo sería
   * silencioso y catastrófico: los precios hidratarían en 0 y el guardado
   * —que borra y recrea el detalle— los escribiría en 0 de verdad, además de
   * reescribir forma/método de pago con los defaults del formulario. Por eso se
   * detecta y se corta ANTES de montar el formulario, en vez de confiar en que
   * quien llega aquí siempre tenga el rol contable.
   *
   * La ausencia de `gran_total` es el detector: `PedidoSerializer` usa
   * `fields="__all__"`, así que la clave solo puede faltar por este filtro.
   *
   * No es un caso teórico: el endpoint exige el rol `MESA-DE-CONTROL`, cuyo
   * token normalizado es `MESADECONTROL`, y la lista que abre los campos
   * contables (`TOKENS_ROL_VER_TODO`) contiene `MESACONTROL` — sin el "DE". Los
   * dos permisos no están alineados en el backend.
   */
  const pedidoAccountingHidden =
    Boolean(pedidoData) && pedidoData?.gran_total === undefined;

  /**
   * Líneas con servicios que varían POR TALLA (o con un cambio de talla mal
   * formado). El JSX compartido solo sabe describirlos por línea, así que
   * editarlas aquí las aplanaría. Ver `findLineasNoRepresentables`.
   */
  const lineasNoRepresentables = useMemo(
    () => (pedidoData ? findLineasNoRepresentables(pedidoData) : []),
    [pedidoData],
  );
  const pedidoNotRepresentable = lineasNoRepresentables.length > 0;

  /**
   * Descuento global e IEPS GUARDADOS. Son importes de cabecera que el
   * formulario no captura por ningún lado, así que se arrastran para que un
   * guardado sin cambios no los ponga en cero (ver `computeSubtotales`).
   *
   * `ieps` se reenvía como el MISMO string que devolvió el servidor, sin
   * reformatear, y NO entra en el `gran_total`: el alta de cotización tampoco lo
   * suma, así que incluirlo cambiaría el total guardado.
   */
  const storedDescuentoGlobal = Number(pedidoData?.descuento_global) || 0;
  const storedIeps = pedidoData?.ieps ?? "0.00";

  const userName = session?.user?.name || "Usuario";
  const sellerName = userName;
  const todayStr = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement | null>(null);
  const emptyValues = useMemo(() => createEmptyValues(todayStr, userName), [todayStr, userName]);

  const customers = useMemo(
    () => onboardingData?.busqueda.clientes ?? [],
    [onboardingData?.busqueda.clientes],
  );
  const isCustomersLoading = isOnboardingLoading;

  const [errorTree, setErrorTree] = useState<ErrorNode>({});
  const [isAddProductsOpen, setIsAddProductsOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(0);
  const [customerSelectedFromSearch, setCustomerSelectedFromSearch] = useState(false);
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [embroideryEditIndex, setEmbroideryEditIndex] = useState<number | null>(null);
  const [isEmbroideryEditOpen, setIsEmbroideryEditOpen] = useState(false);
  const [reflectiveEditIndex, setReflectiveEditIndex] = useState<number | null>(null);
  const [isReflectiveEditOpen, setIsReflectiveEditOpen] = useState(false);
  const [sizesEditIndex, setSizesEditIndex] = useState<number | null>(null);
  const [isSizesEditOpen, setIsSizesEditOpen] = useState(false);

  const [extraServicesInitialized, setExtraServicesInitialized] = useState(false);
  /**
   * `visible_en_factura` por servicio extra, indexado por el `id` que usa la
   * tabla del formulario. `ExtraService` no lo lleva —es un campo que solo
   * existe en pedidos— y el payload lo exige, así que se conserva aparte para no
   * reescribir a `true` un servicio marcado como no facturable. Los servicios
   * capturados en esta sesión no están en el mapa y salen con `true`, el mismo
   * default del modelo.
   */
  const extraServicesVisibilityRef = useRef<Record<string, boolean>>({});

  /**
   * El catálogo SAT es REQUISITO de hidratación, no un adorno: es la única
   * tabla que relaciona el PK del régimen (lo que guarda el pedido) con su
   * código (lo que habla el formulario). Si se hidratara sin él, el select
   * caería al respaldo del cliente y `form.reset` —que corre UNA sola vez— no
   * se volvería a ejecutar cuando el catálogo llegara tarde.
   */
  const satRegimenes = satInfo?.regimenes_fiscales;

  const initialFormValues = useMemo(() => {
    if (!pedidoData || !onboardingData || !satRegimenes) return null;
    if (pedidoAccessDenied || pedidoNotSyncable || pedidoAccountingHidden) return null;
    if (pedidoNotEditableStatus) return null;
    if (pedidoNotRepresentable) return null;
    const matchedCustomer = onboardingData.busqueda.clientes.find(
      (c) => c.id === pedidoData.cliente,
    );
    return mapPedidoDetailToFormValues(
      pedidoData,
      todayStr,
      userName,
      satRegimenes,
      matchedCustomer,
      onboardingData.busqueda.productos,
    );
  }, [
    pedidoData,
    todayStr,
    userName,
    onboardingData,
    satRegimenes,
    pedidoAccessDenied,
    pedidoNotSyncable,
    pedidoAccountingHidden,
    pedidoNotRepresentable,
    pedidoNotEditableStatus,
  ]);

  /**
   * Código SAT del formulario → PK que espera el backend.
   *
   * `null` cuando no se puede traducir (catálogo aún sin cargar, valor vacío, o
   * un código que no está en el catálogo). Quien lo consume decide qué hacer con
   * ese `null`: NUNCA mandarlo como `cliente_regimen_fiscal: null`, que borraría
   * el régimen guardado en el snapshot fiscal del pedido.
   */
  const resolveRegimenFiscalPk = useCallback(
    (codigo: string | undefined): number | null => {
      const normalized = (codigo ?? "").trim();
      if (!normalized || !satRegimenes) return null;
      return (
        satRegimenes.find((regimen) => regimen.codigo === normalized)
          ?.id_sat_regimen_fiscal ?? null
      );
    },
    [satRegimenes],
  );

  /**
   * ¿El valor del formulario sigue siendo el que ya tiene guardado el pedido?
   *
   * Distingue los dos motivos por los que la traducción puede fallar. Si no
   * cambió, omitir la clave es exactamente lo correcto: el pedido conserva su
   * régimen. Si SÍ cambió y no se puede traducir, omitir se tragaría una
   * edición deliberada, así que el guardado se detiene con el error en el campo.
   */
  const isRegimenFiscalUnchanged = useCallback(
    (codigo: string | undefined) => {
      const normalized = (codigo ?? "").trim();
      const storedPk = pedidoData?.cliente_regimen_fiscal ?? null;
      const storedCodigo =
        storedPk != null
          ? (satRegimenes?.find((regimen) => regimen.id_sat_regimen_fiscal === storedPk)
              ?.codigo ?? "")
          : "";
      return normalized === storedCodigo;
    },
    [pedidoData?.cliente_regimen_fiscal, satRegimenes],
  );

  // Denegación definitiva del backend: de vuelta al listado de Mesa de Control.
  useEffect(() => {
    if (!pedidoAccessDenied) return;
    router.replace(OPERATIONS_ORDERS_PATH);
  }, [pedidoAccessDenied, router]);

  useEffect(() => {
    if (!pedidoData || !initialFormValues || extraServicesInitialized) return;

    setSelectedCustomerId(pedidoData.cliente || 0);
    setCustomerSelectedFromSearch(pedidoData.cliente > 0);
    const visibility: Record<string, boolean> = {};
    setExtraServices(
      (pedidoData.servicios_extras ?? []).map((service) => {
        visibility[String(service.id)] = service.visible_en_factura;
        return {
          id: String(service.id),
          nombre: service.nombre,
          monto: Number(service.monto) || 0,
          cantidad: service.cantidad,
        };
      }),
    );
    extraServicesVisibilityRef.current = visibility;
    setExtraServicesInitialized(true);
  }, [extraServicesInitialized, initialFormValues, pedidoData]);

  const { addresses: customerAddresses } = useCustomerAddresses({
    customerId: selectedCustomerId,
    enabled: customerSelectedFromSearch && selectedCustomerId > 0,
  });

  const showForm =
    Boolean(initialFormValues) &&
    extraServicesInitialized &&
    !isOnboardingLoading &&
    !isCurrenciesLoading;

  const applyServerValidationIssues = useCallback((issues: QuoteValidationIssue[]) => {
    const nextErrors: ErrorNode = {};
    issues.forEach((issue) => {
      setErrorByPath(nextErrors, issue.path.split(".").filter(Boolean), issue.message);
    });
    setErrorTree((prev) => ({ ...prev, ...nextErrors }));
    const issuePaths = issues.map((issue) => issue.path).filter(Boolean);
    if (formRef.current) {
      requestAnimationFrame(() => {
        if (!formRef.current) return;
        scrollToFirstValidationError(formRef.current, issuePaths);
      });
    }
  }, []);

  const { mutateAsync: updatePedidoMutation, isPending: isUpdatingPedido } =
    useUpdatePedidoMesaControl({ onValidationError: applyServerValidationIssues });

  /**
   * Marca UN campo del formulario con un error y hace scroll hasta él.
   *
   * Genérico a propósito: lo usan las validaciones previas al envío que no
   * vienen de Zod ni del backend (`requireSelectedCustomer`,
   * `requireResolvableRegimenFiscal`). Para un campo nuevo con la misma
   * necesidad, se llama a esto — no se escribe otro ayudante igual al lado.
   */
  const setFieldError = useCallback((path: string, message: string) => {
    const nextErrors: ErrorNode = {};
    setErrorByPath(nextErrors, path.split("."), message);
    setErrorTree((prev) => ({ ...prev, ...nextErrors }));
    if (formRef.current) {
      const formElement = formRef.current;
      requestAnimationFrame(() => scrollToFirstValidationError(formElement, [path]));
    }
  }, []);

  /**
   * `Pedido.cliente` es un FK OBLIGATORIO (a diferencia de `Cotizacion`, que sí
   * admite `null`). Sin cliente seleccionado el backend responde un 400 sobre
   * `pedido.cliente`, una ruta que no corresponde a ningún campo del formulario
   * y que por tanto no se pinta en ninguna parte. Se corta aquí, señalando el
   * buscador de cliente, que es donde se arregla.
   */
  const requireSelectedCustomer = useCallback(() => {
    if (selectedCustomerId > 0) return true;
    setFieldError("clienteBusqueda", "Selecciona un cliente");
    return false;
  }, [selectedCustomerId, setFieldError]);

  /**
   * Corta el guardado solo cuando el usuario CAMBIÓ el régimen fiscal a un valor
   * que no se puede traducir a PK. Si no lo cambió, no hay nada que validar: la
   * clave simplemente no viajará y el pedido conserva la que ya tiene.
   */
  const requireResolvableRegimenFiscal = useCallback(
    (codigo: string | undefined) => {
      if (resolveRegimenFiscalPk(codigo) != null) return true;
      if (isRegimenFiscalUnchanged(codigo)) return true;
      /* VACÍO no es un cambio: es "no tengo nada que decir de este campo". Se
       * omite la clave y el pedido conserva su régimen. Bloquear aquí dejaba el
       * guardado muerto —el select de régimen está `disabled` en el JSX
       * compartido, así que el mensaje "vuelve a seleccionarlo" no tenía dónde
       * cumplirse— en cuanto se elegía un cliente sin régimen registrado. */
      if (!(codigo ?? "").trim()) return true;
      setFieldError(
        "regimenFiscal",
        "No se pudo resolver el régimen fiscal en el catálogo SAT. Vuelve a seleccionarlo.",
      );
      return false;
    },
    [isRegimenFiscalUnchanged, resolveRegimenFiscalPk, setFieldError],
  );

  const form = useForm({
    defaultValues: initialFormValues ?? emptyValues,
    onSubmit: async ({ value }) => {
      const parsed = quoteSubmitSchema.safeParse({
        ...value,
        servicios_extras: extraServices,
      });

      if (!parsed.success) {
        const nextErrors: ErrorNode = {};
        const issuePaths = parsed.error.issues
          .map((issue) => issue.path.map((segment) => String(segment)).join("."))
          .filter(Boolean);
        parsed.error.issues.forEach((issue) => {
          if (issue.path.length === 0) return;
          setErrorByPath(nextErrors, issue.path as (string | number)[], issue.message);
        });
        setErrorTree(nextErrors);
        if (formRef.current) {
          requestAnimationFrame(() => {
            if (!formRef.current) return;
            scrollToFirstValidationError(formRef.current, issuePaths);
          });
        }
        return;
      }

      if (!requireSelectedCustomer()) return;
      if (!requireResolvableRegimenFiscal(parsed.data.regimenFiscal)) return;

      setErrorTree({});

      // ── Cálculo de importes (client-side; el backend los guarda verbatim) ──
      const normalizedItems = (parsed.data.items ?? []).map(normalizeItem);
      const { subtotal: subtotalAmount, descuentoTotal: descuentoTotalAmount } =
        computeSubtotales(normalizedItems, storedDescuentoGlobal);

      const servicioEnvio = parsed.data.servicioEnvioActivo ? (parsed.data.envio ?? 0) : 0;
      const programaBordados = parsed.data.programaBordadosActivo
        ? (parsed.data.programa_bordados ?? 0)
        : 0;
      const bordadoPantalones = parsed.data.bordadoPantalonesExtrasActivo
        ? (parsed.data.bordado_pantalones_extras ?? 0)
        : 0;
      const serigrafia = parsed.data.serigrafiaActivo ? (parsed.data.serigrafia ?? 0) : 0;
      const reflejante = parsed.data.reflejanteActivo ? (parsed.data.reflejante ?? 0) : 0;
      const extraServicesTotal = parsed.data.servicios_extras.reduce(
        (sum, service) => sum + (service.monto ?? 0) * (service.cantidad ?? 0),
        0,
      );
      const extras =
        (parsed.data.flete ?? 0) +
        (parsed.data.seguros ?? 0) +
        servicioEnvio +
        programaBordados +
        bordadoPantalones +
        serigrafia +
        reflejante +
        extraServicesTotal;
      const ivaRateDecimal = (parsed.data.iva ?? 0) / 100;
      const ivaTotal = Number(((subtotalAmount + extras) * ivaRateDecimal).toFixed(2));
      const granTotalAmount = Number((subtotalAmount + extras + ivaTotal).toFixed(2));

      const condicion = parsed.data.condicionPago ?? "100_anticipo";
      const resolvedRegimenFiscalPk = resolveRegimenFiscalPk(parsed.data.regimenFiscal);

      // ── Detalle COMPLETO (el backend borra y recrea) ──────────────────────
      const detalle = buildDetalleFromItems(parsed.data.items ?? []);

      const payload: PedidoMesaControlUpdate = {
        pedido: {
          // `empresa`, `estatus`, `activo`, `cotizacion`, folios y timestamps NO
          // viajan: el serializer de cabecera los excluye.
          sucursal: pedidoData?.sucursal ?? 1,
          cliente: selectedCustomerId,
          moneda: parsed.data.moneda || 1,
          persona_pagos: parsed.data.persona_pagos ?? "",
          correo_facturas: parsed.data.correo_facturas ?? "",
          telefono_pagos: parsed.data.telefono_pagos ?? "",
          forma_pago: parsed.data.forma_pago ?? "",
          metodo_pago: parsed.data.metodo_pago ?? "",
          uso_cfdi: parsed.data.uso_cfdi ?? "",
          tipo_pedido: parsed.data.tipo_pedido ?? 0,
          oc: parsed.data.oc?.trim() || "",
          anticipo_total: condicion === "100_anticipo",
          anticipo_parcial: condicion === "50_anticipo",
          vendedor_autoriza: condicion === "vendedor_autoriza",
          pago_antes_embarque: condicion === "pago_antes_embarque",
          por_confirmar: condicion === "por_confirmar",
          otra_cantidad: condicion === "otra_cantidad",
          monto: parsed.data.condicionPagoMonto
            ? String(parsed.data.condicionPagoMonto)
            : "0",
          cliente_razon_social: parsed.data.razonSocial || "",
          cliente_nombre: parsed.data.clienteNombre || "",
          cliente_rfc: parsed.data.rfc || "",
          /* El formulario habla en CÓDIGOS SAT y el backend espera el PK de
           * `SatRegimenFiscal`. Antes se mandaba `Number(codigo)` —o sea el
           * literal 626— y el serializer respondía 400 ("Clave primaria 626
           * inválida - objeto no existe"), bloqueando el guardado aunque no se
           * hubiera tocado nada.
           *
           * Si la traducción no se puede hacer, la clave se OMITE. Omitir
           * PRESERVA lo guardado (la vista solo hace `setattr` de las claves
           * recibidas); mandar `null` lo BORRARÍA, porque el campo es nullable.
           * El caso en que omitir se tragaría una edición real ya quedó cortado
           * arriba por `requireResolvableRegimenFiscal`. */
          ...(resolvedRegimenFiscalPk != null
            ? { cliente_regimen_fiscal: resolvedRegimenFiscalPk }
            : {}),
          cliente_direccion_fiscal: parsed.data.direccionFiscal || "",
          cliente_colonia: parsed.data.coloniaFiscal || "",
          cliente_codigo_postal: parsed.data.codigoPostalFiscal || "",
          cliente_ciudad: parsed.data.ciudadFiscal || "",
          cliente_estado: parsed.data.estadoFiscal || "",
          destinatario: parsed.data.destinatario || "",
          empresa_envio: parsed.data.empresaEnvio || "",
          telefono_envio: parsed.data.telefonoEnvio || "",
          celular_envio: parsed.data.celularEnvio || "",
          direccion_envio: parsed.data.direccionEnvio || "",
          colonia_envio: parsed.data.coloniaEnvio || "",
          codigo_postal: parsed.data.codigoPostalEnvio || "",
          ciudad_envio: parsed.data.ciudadEnvio || "",
          estado_envio: parsed.data.estadoEnvio || "",
          referencias: parsed.data.referenciasEnvio || "",
          embarque_parcial: Boolean(parsed.data.embarque_parcial),
          comentarios_parcialidad: parsed.data.embarque_parcial
            ? parsed.data.comentarios_parcialidad || ""
            : "",
          observaciones: parsed.data.observaciones || "",
          envio: servicioEnvio ? String(servicioEnvio.toFixed(2)) : "0.00",
          programa_bordados: programaBordados ? String(programaBordados.toFixed(2)) : "0.00",
          bordado_pantalones_extras: bordadoPantalones
            ? String(bordadoPantalones.toFixed(2))
            : "0.00",
          serigrafia: serigrafia ? String(serigrafia.toFixed(2)) : "0.00",
          reflejante: reflejante ? String(reflejante.toFixed(2)) : "0.00",
          bordado_logotipo: Boolean(parsed.data.bordado_logotipo),
          flete: parsed.data.flete ? String(parsed.data.flete.toFixed(2)) : "0.00",
          seguros: parsed.data.seguros ? String(parsed.data.seguros.toFixed(2)) : "0.00",
          anticipo: parsed.data.anticipo ? String(parsed.data.anticipo.toFixed(2)) : "0.00",
          subtotal: String(subtotalAmount.toFixed(2)),
          descuento_global: String(descuentoTotalAmount.toFixed(2)),
          // Arrastre verbatim: el formulario no tiene campo de IEPS (el JSX
          // compartido lo pinta como "$0.00" fijo), así que recalcularlo solo
          // podía borrarlo.
          ieps: storedIeps,
          iva: parsed.data.iva || 0,
          gran_total: String(granTotalAmount.toFixed(2)),
        },
        detalle,
        /* Un servicio sin nombre tumbaría el guardado: `nombre` es
         * `CharField(max_length=150)` requerido y no admite blanco. Se descartan
         * los renglones vacíos que la tabla permite dejar a medio capturar. */
        servicios_extras: parsed.data.servicios_extras
          .filter((service) => (service.nombre ?? "").trim().length > 0)
          .map((service) => ({
            nombre: (service.nombre ?? "").trim(),
            monto: String((service.monto ?? 0).toFixed(2)),
            // `min_value=1` en el serializer.
            cantidad: Math.max(1, service.cantidad ?? 1),
            visible_en_factura:
              service.id != null
                ? (extraServicesVisibilityRef.current[service.id] ?? true)
                : true,
          })),
      };

      try {
        await updatePedidoMutation({
          pedidoId,
          cotizacionId: pedidoData?.cotizacion ?? null,
          payload,
        });
      } catch {
        // `useUpdatePedidoMesaControl` ya avisó (toast + errores de campo).
        return;
      }

      setIsRouteTransitioning(true);
      router.push(`/orders/${pedidoId}?from=operations`);
    },
  });

  // Hidrata el formulario una sola vez, en cuanto el detalle está disponible.
  const wasInitializedRef = useRef(false);
  useEffect(() => {
    if (initialFormValues && !wasInitializedRef.current) {
      wasInitializedRef.current = true;
      form.reset(initialFormValues);
    }
  }, [form, initialFormValues]);

  const values = useStore(form.baseStore, (state) => state.values);

  useEffect(() => {
    if (!values.enviarDomicilioFiscal) return;
    form.setFieldValue("destinatario", values.clienteNombre || "");
    form.setFieldValue("empresaEnvio", values.razonSocial || "");
    form.setFieldValue("telefonoEnvio", values.telefono_pagos || "");
    form.setFieldValue("celularEnvio", values.telefono_pagos || "");
    form.setFieldValue("direccionEnvio", values.direccionFiscal || "");
    form.setFieldValue("coloniaEnvio", values.coloniaFiscal || "");
    form.setFieldValue("codigoPostalEnvio", values.codigoPostalFiscal || "");
    form.setFieldValue("ciudadEnvio", values.ciudadFiscal || "");
    form.setFieldValue("estadoEnvio", values.estadoFiscal || "");
  }, [
    form,
    values.ciudadFiscal,
    values.clienteNombre,
    values.codigoPostalFiscal,
    values.coloniaFiscal,
    values.direccionFiscal,
    values.enviarDomicilioFiscal,
    values.estadoFiscal,
    values.razonSocial,
    values.telefono_pagos,
  ]);

  const watchedDocRelacionado = useMemo(
    () => `pedido-oc${(values.oc ?? "").trim()}`,
    [values.oc],
  );

  useEffect(() => {
    if (values.docRelacionado === watchedDocRelacionado) return;
    form.setFieldValue("docRelacionado", watchedDocRelacionado);
  }, [form, values.docRelacionado, watchedDocRelacionado]);

  const normalizePath = (field: string) => field.replace(/\[(\d+)\]/g, ".$1");

  const clearFieldErrors = useCallback((field: string) => {
    const path = field.replace(/\[(\d+)\]/g, ".$1").split(".");
    setErrorTree((prev) => {
      if (!prev || typeof prev !== "object") return prev;
      const next = structuredClone(prev) as ErrorNode;
      let current: unknown = next;
      for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        if (!current || typeof current !== "object") return next;
        current = (current as Record<string, unknown>)[key];
      }
      if (current && typeof current === "object") {
        delete (current as Record<string, unknown>)[path[path.length - 1]];
      }
      return next;
    });
  }, []);

  const clienteSearchTerm = values.clienteBusqueda ?? "";

  const setClienteSearchTerm = (value: string) => {
    form.setFieldValue("clienteBusqueda", value);
    clearFieldErrors("clienteBusqueda");
  };

  const validateField = (field: QuoteField, value: QuoteFormValues[QuoteField]) => {
    const fieldSchema = quoteFormSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success) {
      clearFieldErrors(field);
      return true;
    }
    setErrorTree((prev) => {
      const next = structuredClone(prev) as ErrorNode;
      next[field] = { message: parsed.error.issues[0]?.message ?? "Valor inválido" };
      return next;
    });
    return false;
  };

  const getError = (field: string): FormFieldError | undefined => {
    const value = getPathValue(errorTree, normalizePath(field));
    if (value && typeof value === "object" && "message" in value) {
      return value as FormFieldError;
    }
    return undefined;
  };

  const watchedItems = useMemo(() => values.items ?? [], [values.items]);
  const { subtotal, descuentoTotal, ivaAmount, granTotal, saldoPendiente } = useMemo(() => {
    // MISMA fórmula que el payload (`computeSubtotales`): lo que se pinta en el
    // resumen tiene que ser exactamente lo que se va a guardar.
    const { subtotal: nextSubtotal, descuentoTotal: nextDescuentoTotal } = computeSubtotales(
      watchedItems,
      storedDescuentoGlobal,
    );
    const servicioEnvioTotal = values.servicioEnvioActivo ? Number(values.envio) || 0 : 0;
    const programaBordadosTotal = values.programaBordadosActivo
      ? Number(values.programa_bordados) || 0
      : 0;
    const bordadoPantalonesTotal = values.bordadoPantalonesExtrasActivo
      ? Number(values.bordado_pantalones_extras) || 0
      : 0;
    const serigrafiaTotal = values.serigrafiaActivo ? Number(values.serigrafia) || 0 : 0;
    const reflejanteTotal = values.reflejanteActivo ? Number(values.reflejante) || 0 : 0;
    const extraServicesTotal = extraServices.reduce(
      (sum, service) => sum + (Number(service.monto) || 0) * (Number(service.cantidad) || 0),
      0,
    );
    const extras =
      (Number(values.flete) || 0) +
      (Number(values.seguros) || 0) +
      servicioEnvioTotal +
      programaBordadosTotal +
      bordadoPantalonesTotal +
      serigrafiaTotal +
      reflejanteTotal +
      extraServicesTotal;
    const ivaRate = Number(values.iva) || 0;
    const nextIvaAmount = Number(((nextSubtotal + extras) * (ivaRate / 100)).toFixed(2));
    const nextGranTotal = Number((nextSubtotal + extras + nextIvaAmount).toFixed(2));
    const nextSaldoPendiente = Number(
      (nextGranTotal - (Number(values.anticipo) || 0)).toFixed(2),
    );
    return {
      subtotal: nextSubtotal,
      descuentoTotal: nextDescuentoTotal,
      ivaAmount: nextIvaAmount,
      granTotal: nextGranTotal,
      saldoPendiente: nextSaldoPendiente,
    };
  }, [
    watchedItems,
    values.anticipo,
    values.bordadoPantalonesExtrasActivo,
    values.bordado_pantalones_extras,
    values.envio,
    values.flete,
    values.iva,
    values.programaBordadosActivo,
    values.programa_bordados,
    values.reflejante,
    values.reflejanteActivo,
    values.serigrafia,
    values.serigrafiaActivo,
    values.seguros,
    values.servicioEnvioActivo,
    extraServices,
    storedDescuentoGlobal,
  ]);

  const fields = useMemo(
    () =>
      watchedItems.map((item: QuoteItem, index: number) => ({
        id: `${item.productoId || "item"}-${index}`,
      })),
    [watchedItems],
  );

  /**
   * Partidas que el backend FUSIONARÍA al guardar. Se calcula sobre los mismos
   * renglones que se van a enviar y se enseña en la confirmación: el merge
   * ocurre en el servidor y no se puede impedir desde aquí, pero sí se puede
   * dejar de ser una sorpresa.
   */
  const mergeCollisions = useMemo(() => findMergeCollisions(watchedItems), [watchedItems]);

  const append = (itemOrItems: QuoteItem | QuoteItem[]) => {
    const incomingItems = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    if (incomingItems.length === 0) return;
    const normalizedItems = incomingItems.map(normalizeItem);
    const currentItems = form.state.values.items ?? [];
    form.setFieldValue("items", [...currentItems, ...normalizedItems]);
    clearFieldErrors("items");
  };

  const remove = (index: number) => {
    form.setFieldValue(
      "items",
      watchedItems.filter((_: QuoteItem, itemIndex: number) => itemIndex !== index),
    );
  };

  const update = (index: number, item: QuoteItem) => {
    const normalized = normalizeItem(item);
    form.setFieldValue(
      "items",
      watchedItems.map((current: QuoteItem, itemIndex: number) =>
        itemIndex === index ? normalized : current,
      ),
    );
    clearFieldErrors(`items.${index}`);
  };

  const openEmbroideryEdit = useCallback((index: number) => {
    setEmbroideryEditIndex(index);
    setIsEmbroideryEditOpen(true);
  }, []);

  const handleEmbroideryEditSave = useCallback(
    (updatedItem: QuoteItem) => {
      if (embroideryEditIndex === null) return;
      update(embroideryEditIndex, updatedItem);
      setIsEmbroideryEditOpen(false);
      setEmbroideryEditIndex(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [embroideryEditIndex],
  );

  const handleEmbroideryEditOpenChange = useCallback((nextOpen: boolean) => {
    setIsEmbroideryEditOpen(nextOpen);
    if (!nextOpen) setEmbroideryEditIndex(null);
  }, []);

  const openReflectiveEdit = useCallback((index: number) => {
    setReflectiveEditIndex(index);
    setIsReflectiveEditOpen(true);
  }, []);

  const handleReflectiveEditSave = useCallback(
    (updatedItem: QuoteItem) => {
      if (reflectiveEditIndex === null) return;
      update(reflectiveEditIndex, updatedItem);
      setIsReflectiveEditOpen(false);
      setReflectiveEditIndex(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reflectiveEditIndex],
  );

  const handleReflectiveEditOpenChange = useCallback((nextOpen: boolean) => {
    setIsReflectiveEditOpen(nextOpen);
    if (!nextOpen) setReflectiveEditIndex(null);
  }, []);

  const openSizesEdit = useCallback((index: number) => {
    setSizesEditIndex(index);
    setIsSizesEditOpen(true);
  }, []);

  const handleSizesEditSave = useCallback(
    (updatedItem: QuoteItem) => {
      if (sizesEditIndex === null) return;
      update(sizesEditIndex, updatedItem);
      setIsSizesEditOpen(false);
      setSizesEditIndex(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sizesEditIndex],
  );

  const handleSizesEditOpenChange = useCallback((nextOpen: boolean) => {
    setIsSizesEditOpen(nextOpen);
    if (!nextOpen) setSizesEditIndex(null);
  }, []);

  const handleSelectShippingAddress = useCallback(
    (address: CustomerAddress) => {
      form.setFieldValue("destinatario", address.destinatario ?? "");
      form.setFieldValue("empresaEnvio", address.empresa_envio ?? "");
      form.setFieldValue("telefonoEnvio", address.telefono_envio ?? "");
      form.setFieldValue("celularEnvio", address.celular_envio ?? "");
      form.setFieldValue("direccionEnvio", address.direccion_envio ?? "");
      form.setFieldValue("coloniaEnvio", address.colonia_envio ?? "");
      form.setFieldValue("codigoPostalEnvio", address.codigo_postal ?? "");
      form.setFieldValue("ciudadEnvio", address.ciudad_envio ?? "");
      form.setFieldValue("estadoEnvio", address.estado_envio ?? "");
      form.setFieldValue("referenciasEnvio", address.referencias ?? "");
    },
    [form],
  );

  const handleSelectCustomer = useCallback(
    (customer: OnboardingCustomer, fromSearch = true) => {
      /* El campo `regimenFiscal` habla en CÓDIGOS SAT (el catálogo de
       * onboarding se arma con `value = codigo`), y el cliente trae el PK en
       * `sat_regimen_fiscal_id`. Se traduce con el catálogo SAT, que expone las
       * dos mitades; el respaldo es el código que ya trae el propio cliente.
       *
       * NUNCA se cae a `String(sat_regimen_fiscal_id)`: eso metía un PK en un
       * campo de códigos y luego `requireResolvableRegimenFiscal` bloqueaba el
       * guardado por un valor que había escrito el propio formulario. Vacío es
       * el respaldo correcto — se omite la clave y el pedido conserva la suya. */
      const regimenValue =
        satRegimenes?.find(
          (regimen) => regimen.id_sat_regimen_fiscal === Number(customer.sat_regimen_fiscal_id),
        )?.codigo ??
        customer.sat_regimen_fiscal__codigo ??
        "";
      form.setFieldValue("clienteBusqueda", customer.razon_social ?? customer.nombre ?? "");
      form.setFieldValue("clienteNombre", customer.nombre ?? "");
      form.setFieldValue("razonSocial", customer.razon_social ?? "");
      form.setFieldValue("rfc", customer.rfc ?? "");
      form.setFieldValue("regimenFiscal", regimenValue);
      form.setFieldValue("direccionFiscal", customer.direccion_fiscal ?? "");
      form.setFieldValue("coloniaFiscal", customer.colonia ?? "");
      form.setFieldValue("codigoPostalFiscal", customer.codigo_postal ?? "");
      form.setFieldValue("ciudadFiscal", customer.ciudad ?? "");
      form.setFieldValue("estadoFiscal", customer.estado ?? "");
      setSelectedCustomerId(Number(customer.id) || 0);
      setCustomerSelectedFromSearch(fromSearch);
      form.setFieldValue("telefono_pagos", customer.telefono ?? "");
      form.setFieldValue("correo_facturas", customer.correo ?? "");
      form.setFieldValue("enviarDomicilioFiscal", true);
      form.setFieldValue("destinatario", customer.nombre ?? "");
      form.setFieldValue("empresaEnvio", customer.razon_social ?? "");
      form.setFieldValue("telefonoEnvio", customer.telefono ?? "");
      form.setFieldValue("celularEnvio", customer.telefono ?? "");
      form.setFieldValue("direccionEnvio", customer.direccion_fiscal ?? "");
      form.setFieldValue("coloniaEnvio", customer.colonia ?? "");
      form.setFieldValue("codigoPostalEnvio", customer.codigo_postal ?? "");
      form.setFieldValue("ciudadEnvio", customer.ciudad ?? "");
      form.setFieldValue("estadoEnvio", customer.estado ?? "");
      clearFieldErrors("clienteBusqueda");
    },
    [clearFieldErrors, form, satRegimenes],
  );

  const handleCustomerCreated = (customer?: Customer) => {
    setIsCustomerDialogOpen(false);
    if (!customer) return;
    const satRegimen = satInfo?.regimenes_fiscales.find(
      (item) => item.id_sat_regimen_fiscal === customer.sat_regimen_fiscal,
    );
    handleSelectCustomer(
      {
        id: Number(customer.id),
        razon_social: customer.razon_social,
        nombre: customer.nombre,
        rfc: customer.rfc,
        correo: customer.correo,
        telefono: customer.telefono,
        direccion_fiscal: customer.direccion_fiscal,
        colonia: customer.colonia,
        codigo_postal: customer.codigo_postal,
        ciudad: customer.ciudad,
        estado: customer.estado,
        sat_regimen_fiscal_id: Number(customer.sat_regimen_fiscal),
        sat_regimen_fiscal__codigo: satRegimen?.codigo ?? "",
        sat_regimen_fiscal__descripcion: satRegimen?.descripcion ?? "",
      },
      false,
    );
  };

  /**
   * El submit del formulario NO guarda: valida y abre la confirmación por folio.
   *
   * Se valida ANTES de abrir el diálogo a propósito. Si se abriera primero, el
   * usuario tecleaba el folio, confirmaba, y recién ahí aparecían los errores de
   * captura detrás del diálogo ya cerrado — pidiendo un gesto deliberado para
   * después no hacer nada.
   */
  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmittingForm || isUpdatingPedido) return;

    const parsed = quoteSubmitSchema.safeParse({
      ...form.state.values,
      servicios_extras: extraServices,
    });

    if (!parsed.success) {
      const nextErrors: ErrorNode = {};
      const issuePaths = parsed.error.issues
        .map((issue) => issue.path.map((segment) => String(segment)).join("."))
        .filter(Boolean);
      parsed.error.issues.forEach((issue) => {
        if (issue.path.length === 0) return;
        setErrorByPath(nextErrors, issue.path as (string | number)[], issue.message);
      });
      setErrorTree(nextErrors);
      if (formRef.current) {
        requestAnimationFrame(() => {
          if (!formRef.current) return;
          scrollToFirstValidationError(formRef.current, issuePaths);
        });
      }
      return;
    }

    if (!requireSelectedCustomer()) return;
    if (!requireResolvableRegimenFiscal(parsed.data.regimenFiscal)) return;

    setErrorTree({});
    setIsConfirmOpen(true);
  };

  /**
   * Confirmación aceptada: aquí sí se envía.
   *
   * El diálogo se cierra al TERMINAR, no antes: mientras la petición viaja sigue
   * en pantalla con sus botones bloqueados y el label "Guardando...", que es
   * donde el usuario está mirando. Cerrarlo primero dejaba el gesto sin
   * respuesta visible hasta que llegaba el toast.
   */
  const confirmSubmit = async () => {
    if (isSubmittingForm) return;
    setIsSubmittingForm(true);
    try {
      await Promise.resolve(form.handleSubmit());
    } finally {
      setIsSubmittingForm(false);
      setIsConfirmOpen(false);
    }
  };

  const handleReset = () => {
    if (initialFormValues) {
      form.reset(initialFormValues);
      const visibility: Record<string, boolean> = {};
      setExtraServices(
        (pedidoData?.servicios_extras ?? []).map((service) => {
          visibility[String(service.id)] = service.visible_en_factura;
          return {
            id: String(service.id),
            nombre: service.nombre,
            monto: Number(service.monto) || 0,
            cantidad: service.cantidad,
          };
        }),
      );
      extraServicesVisibilityRef.current = visibility;
      setSelectedCustomerId(pedidoData?.cliente || 0);
      setCustomerSelectedFromSearch((pedidoData?.cliente ?? 0) > 0);
    }
    setErrorTree({});
    toast.success("Formulario restablecido a los datos originales del pedido");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleBack = () => {
    router.push(`/orders/${pedidoId}?from=operations`);
  };

  const isPending =
    isSubmittingForm || form.state.isSubmitting || isUpdatingPedido || isRouteTransitioning;

  const itemErrors = getError("items");
  const tipoPedidoError = getError("tipo_pedido");

  const tiposPedidoOptions = useMemo(
    () => [{ value: 0, label: "Seleccionar..." }, ...(onboardingData?.catalogos.tipos_pedido ?? [])],
    [onboardingData?.catalogos.tipos_pedido],
  );

  const formasPagoOptions = useMemo(
    () => [{ value: "", label: "Seleccionar..." }, ...(onboardingData?.catalogos.formas_pago ?? [])],
    [onboardingData?.catalogos.formas_pago],
  );

  const metodosPagoOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar..." },
      ...(onboardingData?.catalogos.metodos_pago ?? []),
    ],
    [onboardingData?.catalogos.metodos_pago],
  );

  const regimenFiscalOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar..." },
      ...(onboardingData?.catalogos.regimenes_fiscales ?? []),
    ],
    [onboardingData?.catalogos.regimenes_fiscales],
  );

  const usoCfdiOptions = useMemo(
    () => onboardingData?.catalogos.usos_cfdi ?? [],
    [onboardingData?.catalogos.usos_cfdi],
  );

  const currencyOptions = useMemo(() => {
    const preferredCodes = ["MXN", "USD", "EUR"];
    const activeCurrencies = (currencies ?? []).filter((item) => item.activo);
    const sortedCurrencies = activeCurrencies.sort((left, right) => {
      const leftIndex = preferredCodes.indexOf(left.codigo_iso);
      const rightIndex = preferredCodes.indexOf(right.codigo_iso);
      const leftPriority = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const rightPriority = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.nombre.localeCompare(right.nombre);
    });
    return [
      { value: 0, label: "Seleccionar..." },
      ...sortedCurrencies.map((item) => ({
        value: item.id,
        label: `${item.codigo_iso} - ${item.nombre}`,
      })),
    ];
  }, [currencies]);

  useEffect(() => {
    if (!values.moneda && currencyOptions.length > 1) {
      form.setFieldValue("moneda", Number(currencyOptions[1].value));
    }
  }, [currencyOptions, form, values.moneda]);

  useEffect(() => {
    if (usoCfdiOptions.length === 0) return;
    const preferredCfdiOption = usoCfdiOptions.find(
      (option) =>
        option.value === DEFAULT_USO_CFDI_VALUE ||
        option.label.trim().toLowerCase() === DEFAULT_USO_CFDI_LABEL.toLowerCase(),
    );
    const fallbackCfdiOption = usoCfdiOptions[0];
    const defaultCfdiValue = preferredCfdiOption?.value ?? fallbackCfdiOption.value;
    const isCurrentValueValid = usoCfdiOptions.some((option) => option.value === values.uso_cfdi);
    if (!values.uso_cfdi || !isCurrentValueValid) {
      form.setFieldValue("uso_cfdi", defaultCfdiValue);
    }
  }, [form, usoCfdiOptions, values.uso_cfdi]);

  return {
    // ── Claves PROPIAS de este flujo (las consume el wrapper, no
    //    QuoteFormContent, que las ignora por no estar en su contrato) ────────
    pedido: pedidoData,
    pedidoLoadFailed,
    pedidoNotSyncable,
    pedidoAccountingHidden,
    pedidoNotRepresentable,
    pedidoNotEditableStatus,
    lineasNoRepresentables,
    mergeCollisions,
    isPedidoRetrying: isPedidoFetching,
    retryPedidoLoad: refetchPedido,
    isConfirmOpen,
    setIsConfirmOpen,
    confirmSubmit,

    // ── Contrato compartido con QuoteFormContent ─────────────────────────────
    form,
    formRef,
    formKey: `pedido-mesa-control-edit-${pedidoId}`,
    getError,
    clearFieldErrors,
    validateField,
    isPending,
    sellerName,
    userName,
    todayStr,
    tiposPedidoOptions,
    paymentConditionOptions: PAYMENT_CONDITION_OPTIONS,
    ivaOptions: IVA_OPTIONS,
    regimenFiscalOptions,
    usoCfdiOptions,
    currencyOptions,
    formasPagoOptions,
    metodosPagoOptions,
    sizes,
    products: onboardingData?.busqueda.productos ?? [],
    isCustomersLoading,
    isCurrenciesLoading,
    isOnboardingLoading: isOnboardingLoading || isPedidoLoading,
    isSizesLoading,
    showForm,
    /* Este flujo no tiene pantalla de éxito propia: al guardar se vuelve al
     * detalle 360° del pedido, que ya muestra el resultado real. */
    isCreationSuccessVisible: false,
    isRouteTransitioning,
    handleFormSubmit,
    handleReset,
    handleBack,
    fields,
    append,
    remove,
    update,
    watchedItems,
    watchedFecha: values.fecha,
    watchedDocRelacionado,
    watchedEnviarDomicilioFiscal: values.enviarDomicilioFiscal,
    watchedCondicionPago: values.condicionPago,
    hasCustomerSelected: selectedCustomerId !== 0,
    subtotal,
    descuentoTotal,
    ivaAmount,
    granTotal,
    saldoPendiente,
    itemsError: itemErrors,
    tipoPedidoError,
    isAddProductsOpen,
    setIsAddProductsOpen,
    editIndex,
    setEditIndex,
    clienteSearchTerm,
    setClienteSearchTerm,
    isCustomerDialogOpen,
    setIsCustomerDialogOpen,
    customers,
    handleSelectCustomer,
    handleCustomerCreated,
    customerAddresses,
    handleSelectShippingAddress,
    extraServices,
    setExtraServices,
    embroideryEditIndex,
    isEmbroideryEditOpen,
    openEmbroideryEdit,
    handleEmbroideryEditSave,
    handleEmbroideryEditOpenChange,
    reflectiveEditIndex,
    isReflectiveEditOpen,
    openReflectiveEdit,
    handleReflectiveEditSave,
    handleReflectiveEditOpenChange,
    sizesEditIndex,
    isSizesEditOpen,
    openSizesEdit,
    handleSizesEditSave,
    handleSizesEditOpenChange,
  };
}
