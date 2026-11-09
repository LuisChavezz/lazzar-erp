"use client";

import { BACK_ARROW_CLASS, BACK_BUTTON_CLASS } from "@/src/components/backButtonClass";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, LayersIcon, OrdenesIcon, SpecialOrdersIcon } from "@/src/components/Icons";
import { PreOrderSheet } from "@/src/features/pre-orders/components/PreOrderSheet";
import { usePreOrderByPedido } from "@/src/features/pre-orders/hooks/usePreOrders";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { InfoField } from "@/src/components/DetailDialogPrimitives";
import { WorkOrderTopBar } from "@/src/components/WorkOrderSheets";
import {
  OrderChip,
  SheetPanel,
  SheetSection,
} from "@/src/features/orders/components/OrderSheetPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { EntregaCell } from "./SpecialOrderPriorityCells";
import { getPedidoClasificacionLabel } from "@/src/features/orders/constants/pedidoStatus";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatShortDate } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import { useSpecialOrderDetail } from "../hooks/useSpecialOrderDetail";
import { canActOnSpecialOrderLines } from "../utils/lineActions";
import { CatalogAltaConfirmDialog } from "./CatalogAltaConfirmDialog";
import { SampleSkuOnboardingDialog } from "./SampleSkuOnboardingDialog";
import { SpecialOrderLines } from "./SpecialOrderLines";
import { SpecialOrderSummary } from "./SpecialOrderSummary";

// Destino fijo del "Volver": la ruta cuelga de `/manufacturing` y solo se
// alcanza desde el listado del propio módulo (mismo criterio que
// `CorteMangaOrderPageContent`).
const BACK = {
  href: "/manufacturing/special-orders",
  label: "Volver a Fabricación Especial",
};

interface SpecialOrderPageContentProps {
  /** Id del pedido tal cual llega del segmento de ruta (string). */
  orderId: string;
}

/**
 * Cuerpo de la página de detalle de un pedido especial: cabecera con los datos
 * del pedido y sus líneas de muestra con las tallas y servicios a fabricar.
 * Sin enlace al pedido completo. Escrituras por línea: el alta de SKU de
 * producción + lista de materiales (`SampleSkuOnboardingDialog`) y el alta en
 * catálogo de esos SKU (`CatalogAltaConfirmDialog`).
 */
export function SpecialOrderPageContent({ orderId }: SpecialOrderPageContentProps) {
  const numericId = Number(orderId);
  const isValidId = Number.isInteger(numericId) && numericId > 0;
  const { data, isLoading, isInitialError, error } = useSpecialOrderDetail(
    isValidId ? numericId : null,
  );

  // Visibilidad del alta de SKU y del alta en catálogo: admin de empresa /
  // superusuario (`role === "admin"`, que `hasPermission` cortocircuita) o
  // cualquier usuario con `R-PRODUCCION`. Es UX, no la regla real: el backend
  // exige además el DEPARTAMENTO Producción, que la sesión no trae, así que un
  // usuario puede ver la acción y recibir el rechazo al enviar (el diálogo lo
  // explica).
  const preOrden = usePreOrderByPedido(isValidId ? numericId : null);
  const { data: session } = useSession();
  const canGenerateSkus = hasPermission("R-PRODUCCION", session?.user);

  // Se guarda el id y no la línea: así el diálogo siempre lee la línea del
  // detalle vigente. `open` va aparte del id a propósito: al cerrar, la línea
  // sigue montada mientras el diálogo anima su salida y se suelta después
  // (`onClosed`). `session` cambia en cada apertura para que el asistente
  // arranque limpio aunque se reabra la misma línea.
  const [onboarding, setOnboarding] = useState<{
    lineId: number | null;
    open: boolean;
    session: number;
  }>({ lineId: null, open: false, session: 0 });

  // Alta en catálogo: mismo criterio de id + `open` aparte; la copia de la
  // línea al abrir la toma el propio diálogo (`useDialogSession`).
  const [catalogAlta, setCatalogAlta] = useState<{ lineId: number | null; open: boolean }>({
    lineId: null,
    open: false,
  });

  const BackLink = (
    <Link
      href={BACK.href}
      className={BACK_BUTTON_CLASS}
    >
      <ArrowLeftIcon className={BACK_ARROW_CLASS} />
      <span className="text-sm font-medium">{BACK.label}</span>
    </Link>
  );

  // Los estados de fallo repiten el "Volver" para que la página no quede sin salida.
  if (!isValidId) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Pedido no válido"
          message="El identificador del pedido especial no es válido."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader
          title="Cargando pedido especial"
          message="Obteniendo el detalle del pedido..."
        />
      </div>
    );
  }

  // Un pedido sin líneas de muestra, de otra empresa o inexistente responde
  // 404: el backend no los distingue. Solo cuenta la carga INICIAL: un refetch
  // fallido con el detalle ya cargado conserva la página (y el asistente
  // abierto) y avisa por toast (ver `useSpecialOrderDetail`).
  if (isInitialError || !data) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="No se pudo cargar el pedido especial"
          message={extractErrorMessage(
            error,
            "No existe, no es un pedido especial o falló la conexión.",
          )}
        />
      </div>
    );
  }

  const totalLineas = data.detalles.length;

  return (
    <div className="w-full space-y-6">
      <WorkOrderTopBar backLink={BackLink} />

      {/* ── 1. El pedido y su resumen ─────────────────────────────────── */}
      <SheetSection
        icon={<SpecialOrdersIcon className="w-5 h-5" />}
        title="Fabricación especial"
        subtitle="Datos del pedido y cómo va el alta de SKU y la producción."
        badges={
          data.piezas_total !== undefined ? (
            <OrderChip>
              {formatQuantityValue(data.piezas_total)} pzs
              {data.prendas_total !== undefined &&
                ` · ${data.prendas_total} ${data.prendas_total === 1 ? "prenda" : "prendas"}`}
            </OrderChip>
          ) : undefined
        }
      >
        <div className="flex flex-col xl:flex-row gap-6">
          <SheetPanel title="Pedido" className="shrink-0 w-full xl:w-80">
            {/* El folio es el único <h1> de la página. */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-6 break-all">
              {data.folio || `Pedido #${data.id}`}
            </h1>
            <div className="space-y-4 text-xs">
              <InfoField label="Cliente">{data.cliente_nombre || "—"}</InfoField>
              <InfoField label="Clasificación">
                <span className={data.clasificacion ? undefined : "text-slate-400 dark:text-slate-500"}>
                  {getPedidoClasificacionLabel(data.clasificacion)}
                </span>
              </InfoField>
              <div className="grid grid-cols-2 gap-4">
                {/* Mismo formateo que el detalle de pedido (`PedidoDetailContent`). */}
                <InfoField label="Confirmación">
                  <span className="tabular-nums">
                    {data.fecha_confirmacion ? formatShortDate(data.fecha_confirmacion) : "—"}
                  </span>
                </InfoField>
                <InfoField label="Entrega">
                  <EntregaCell fecha={data.fecha_compromiso} />
                </InfoField>
              </div>
            </div>
          </SheetPanel>

          <SheetPanel title="Resumen" className="flex-1 self-start w-full">
            <SpecialOrderSummary detalles={data.detalles} />
          </SheetPanel>
        </div>
      </SheetSection>

      {/* ── 2. Líneas de muestra ──────────────────────────────────────── */}
      <SheetSection
        icon={<LayersIcon className="w-5 h-5" />}
        title={`Líneas de muestra (${totalLineas})`}
        subtitle="Toca una línea para ver sus tallas. Las que ya tienen todos sus SKU aparecen cerradas."
      >
        <SpecialOrderLines
          pedidoId={data.id}
          detalles={data.detalles}
          canGenerateSkus={canActOnSpecialOrderLines(canGenerateSkus, data.estatus)}
          onGenerateSkus={(line) =>
            setOnboarding((prev) => ({ lineId: line.id, open: true, session: prev.session + 1 }))
          }
          onAltaCatalogo={(line) => setCatalogAlta({ lineId: line.id, open: true })}
        />
      </SheetSection>

      {/* ── 3. Pre-orden: materiales antes de la OP ───────────────────── */}
      {preOrden ? (
        <PreOrderSheet preOrderId={preOrden.id} />
      ) : preOrden === null ? (
        <SheetSection
          icon={<OrdenesIcon className="w-5 h-5" />}
          title="Pre-orden de producción"
          subtitle="Se crea sola cuando las muestras tienen lista de materiales (BOM)."
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este pedido aún no tiene pre-orden. Si sus muestras ya tenían BOM antes de este
            cambio, se generará en cuanto se edite su lista de materiales.
          </p>
        </SheetSection>
      ) : null}

      <SampleSkuOnboardingDialog
        pedidoId={data.id}
        key={onboarding.session}
        open={onboarding.open}
        line={data.detalles.find((line) => line.id === onboarding.lineId) ?? null}
        onClose={() => setOnboarding((prev) => ({ ...prev, open: false }))}
        onClosed={() => setOnboarding((prev) => (prev.open ? prev : { ...prev, lineId: null }))}
      />

      <CatalogAltaConfirmDialog
        pedidoId={data.id}
        open={catalogAlta.open}
        line={data.detalles.find((line) => line.id === catalogAlta.lineId) ?? null}
        onClose={() => setCatalogAlta((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
