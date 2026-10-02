"use client";

import { PedidosIcon } from "@/src/components/Icons";
import { InfoField, InfoGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatShortDate } from "@/src/utils/formatDate";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { useSatInfo } from "@/src/features/sat/hooks/useSatInfo";
import { useUpdatePedidoHeader } from "../hooks/useUpdatePedidoHeader";
import {
  getPedidoClasificacionLabel,
  getPedidoEstatusConfig,
  getTipoPedidoConfig,
  ORIGIN_BADGE_CLASS,
} from "../constants/pedidoStatus";
import { getFormaPagoLabel, getMetodoPagoLabel, getUsoCfdiLabel } from "../constants/satCatalogs";
import { formatEntregaEstimada } from "../utils/pedidoFormat";
import type { Order, PedidoDetail } from "../interfaces/order.interface";
import { PedidoClasificacionSelect } from "./PedidoClasificacionSelect";
import { useOrderMoney } from "./OrderCurrencyContext";
import { OrderFechaConfirmacionField } from "./OrderFechaConfirmacionField";
import { OrderBadge, OrderChip, SheetPanel, SheetSection } from "./OrderSheetPrimitives";

// Banderas de origen del pedido — se pintan solo las que vienen en `true`.
const ORIGIN_FLAGS: { key: keyof Order; label: string }[] = [
  { key: "recompra", label: "Recompra" },
  { key: "chat_online", label: "Chat online" },
  { key: "pedido_online", label: "Pedido online" },
  { key: "prospeccion", label: "Prospección" },
  { key: "recomendacion", label: "Recomendación" },
  { key: "amazon", label: "Amazon" },
  { key: "google", label: "Google" },
  { key: "publicidad", label: "Publicidad" },
  { key: "mercado_libre", label: "Mercado Libre" },
  { key: "redes_sociales", label: "Redes sociales" },
  { key: "otro", label: "Otro" },
  { key: "mailing", label: "Mailing" },
];

// Condiciones de pago (booleanas). Todas menos `vendedor_autoriza` son campos
// contables que el backend elimina sin permiso, así que el panel entero solo se
// pinta con datos contables: con una sola bandera sobreviviente, las demás
// ausentes se leerían como "no aplica" cuando en realidad "no se sabe".
const PAYMENT_CONDITIONS: { key: keyof Order; label: string }[] = [
  { key: "anticipo_total", label: "Anticipo total" },
  { key: "anticipo_parcial", label: "Anticipo parcial" },
  { key: "vendedor_autoriza", label: "Vendedor autoriza" },
  { key: "pago_antes_embarque", label: "Pago antes de embarque" },
  { key: "por_confirmar", label: "Por confirmar" },
  { key: "otra_cantidad", label: "Otra cantidad" },
];

interface OrderCommercialInfoSectionProps {
  pedido: PedidoDetail;
  showAccounting: boolean;
  /** Edición en línea de Fecha confirmada y Clasificación (ver la página). */
  canEditHeader: boolean;
}

/**
 * "Información Comercial", con la estructura de la cotización: a la izquierda
 * la identidad del pedido y sus datos comerciales (donde el formulario pone al
 * vendedor, que el pedido no trae), a la derecha los datos de facturación, y
 * debajo forma de pago/contacto y condiciones de pago.
 *
 * Fecha confirmada y Clasificación se editan aquí en línea con la MISMA regla
 * de siempre (permiso de Mesa de Control y pedido no terminal); cada control
 * manda solo su clave en el PATCH.
 */
export function OrderCommercialInfoSection({
  pedido,
  showAccounting,
  canEditHeader,
}: OrderCommercialInfoSectionProps) {
  const { formatMoney } = useOrderMoney();
  // Una mutación por campo, para que cada control lleve su propio pendiente.
  const updateFechaConfirmacion = useUpdatePedidoHeader();
  const updateClasificacion = useUpdatePedidoHeader();
  // Catálogo SAT (cacheado 24h) para resolver `cliente_regimen_fiscal`, que
  // llega como PK del FK (no como código SAT) y no se puede mapear sin él.
  const { data: satCatalogs } = useSatInfo();

  const estatusCfg = getPedidoEstatusConfig(pedido.estatus);
  const tipoCfg = getTipoPedidoConfig(pedido.tipo_pedido);
  const activeOrigins = ORIGIN_FLAGS.filter((flag) => pedido[flag.key]);
  const activeConditions = PAYMENT_CONDITIONS.filter((cond) => pedido[cond.key]);

  // Régimen fiscal: mientras carga el catálogo (o si no hay coincidencia) cae a
  // "Régimen {id}"; "—" cuando no hay valor.
  const regimenId = pedido.cliente_regimen_fiscal;
  const regimenMatch =
    regimenId != null
      ? satCatalogs?.regimenes_fiscales.find((r) => r.id_sat_regimen_fiscal === regimenId)
      : undefined;
  const regimenLabel =
    regimenId == null
      ? "—"
      : regimenMatch
        ? `${regimenMatch.codigo} - ${regimenMatch.descripcion}`
        : `Régimen ${regimenId}`;

  return (
    <SheetSection
      icon={<PedidosIcon className="w-6 h-6" />}
      title="Información Comercial"
      subtitle="Datos principales del pedido y configuración comercial."
      badges={
        <>
          <OrderBadge config={estatusCfg} />
          <OrderBadge config={tipoCfg} />
          {/* Origen del pedido — badge NEUTRO para distinguirlo de estatus/tipo. */}
          {activeOrigins.map((flag) => (
            <OrderBadge
              key={flag.key as string}
              config={{ label: flag.label, className: ORIGIN_BADGE_CLASS }}
            />
          ))}
        </>
      }
    >
      <div className="flex flex-col xl:flex-row items-start gap-8">
        <SheetPanel title="Pedido" className="shrink-0 w-full xl:w-80">
          {/* El folio es el ÚNICO <h1> de esta hoja (la de Avances tiene el suyo). */}
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-6 break-all">
            {pedido.folio || `#${pedido.id}`}
          </h1>
          <div className="space-y-4 text-xs">
            <InfoField label="Tipo de pedido">{tipoCfg.label}</InfoField>
            <InfoField label="Clasificación">
              {canEditHeader ? (
                <PedidoClasificacionSelect
                  value={pedido.clasificacion}
                  onChange={(clasificacion) =>
                    updateClasificacion.mutate({ pedidoId: pedido.id, payload: { clasificacion } })
                  }
                  isPending={updateClasificacion.isPending}
                />
              ) : pedido.clasificacion ? (
                getPedidoClasificacionLabel(pedido.clasificacion)
              ) : (
                "—"
              )}
            </InfoField>
            <InfoField label="Fecha">{formatShortDate(pedido.created_at)}</InfoField>
            <InfoField label="Fecha confirmada">
              {/* Lectura con lápiz (solo con la regla de edición de siempre);
                  el lápiz abre el editor existente. */}
              <OrderFechaConfirmacionField
                value={pedido.fecha_confirmacion}
                canEdit={canEditHeader}
                onSave={(fecha_confirmacion) =>
                  updateFechaConfirmacion.mutateAsync({
                    pedidoId: pedido.id,
                    payload: { fecha_confirmacion },
                  })
                }
                isPending={updateFechaConfirmacion.isPending}
              />
            </InfoField>
            <InfoField label="Entrega estimada">
              {formatEntregaEstimada(pedido.fecha_entrega_min, pedido.fecha_entrega_max)}
            </InfoField>
          </div>
        </SheetPanel>

        <SheetPanel title="Datos de Facturación" className="flex-1 self-start w-full">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 -mt-2">
            Foto de los datos fiscales al momento del pedido, no el cliente en vivo.
          </p>
          <InfoGrid>
            <InfoField label="Nombre del cliente">{textOrDash(pedido.cliente_nombre)}</InfoField>
            <InfoField label="Razón social" className="col-span-2">
              {textOrDash(pedido.cliente_razon_social)}
            </InfoField>
            <InfoField label="RFC">{textOrDash(pedido.cliente_rfc)}</InfoField>
            <InfoField label="Régimen fiscal">{regimenLabel}</InfoField>
            <InfoField label="Giro empresarial">
              {textOrDash(pedido.cliente_giro_empresarial)}
            </InfoField>
            <InfoField label="Dirección fiscal" className="col-span-2 md:col-span-3">
              {textOrDash(pedido.cliente_direccion_fiscal)}
            </InfoField>
            <InfoField label="Colonia">{textOrDash(pedido.cliente_colonia)}</InfoField>
            <InfoField label="C.P.">{textOrDash(pedido.cliente_codigo_postal)}</InfoField>
            <InfoField label="Ciudad">{textOrDash(pedido.cliente_ciudad)}</InfoField>
            <InfoField label="Estado">{textOrDash(pedido.cliente_estado)}</InfoField>
          </InfoGrid>
        </SheetPanel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
        <SheetPanel
          heading="Forma de pago y contacto para envío de facturas"
          className={showAccounting ? "" : "md:col-span-2"}
        >
          <InfoGrid>
            <InfoField label="Persona pagos">{textOrDash(pedido.persona_pagos)}</InfoField>
            <InfoField label="Correo facturas">{textOrDash(pedido.correo_facturas)}</InfoField>
            <InfoField label="Teléfono pagos">{textOrDash(pedido.telefono_pagos)}</InfoField>
            <InfoField label="O.C.">{textOrDash(pedido.oc)}</InfoField>
            <InfoField label="Forma de pago">{getFormaPagoLabel(pedido.forma_pago)}</InfoField>
            <InfoField label="Método de pago">{getMetodoPagoLabel(pedido.metodo_pago)}</InfoField>
            <InfoField label="Uso de CFDI">{getUsoCfdiLabel(pedido.uso_cfdi)}</InfoField>
          </InfoGrid>
        </SheetPanel>

        {showAccounting && (
          <SheetPanel heading="Condiciones de pago" className="h-fit">
            {activeConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeConditions.map((cond) => (
                  <OrderChip key={cond.key as string}>{cond.label}</OrderChip>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Sin condición de pago registrada.
              </p>
            )}
            {/* El monto de "Otra cantidad": solo si es > 0, como el resto de
                importes opcionales del pedido. */}
            {safeParseAmount(pedido.monto) > 0 && (
              <div className="mt-4 text-xs">
                <InfoField label="Monto">
                  <span className="tabular-nums">{formatMoney(pedido.monto)}</span>
                </InfoField>
              </div>
            )}
          </SheetPanel>
        )}
      </div>
    </SheetSection>
  );
}
