"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { InfoField, InfoGrid, Section } from "@/src/components/DetailDialogPrimitives";
import { getPedidoClasificacionLabel } from "@/src/features/orders/constants/pedidoStatus";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatShortDate } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import { useSpecialOrderDetail } from "../hooks/useSpecialOrderDetail";
import { SampleSkuOnboardingDialog } from "./SampleSkuOnboardingDialog";
import { SpecialOrderLines } from "./SpecialOrderLines";

// Destino fijo del "Volver": la ruta cuelga de `/manufacturing` y solo se
// alcanza desde el listado del propio módulo (mismo criterio que
// `CorteMangaOrderPageContent`).
const BACK = {
  href: "/manufacturing/special-orders",
  label: "Volver a Pedidos Especiales",
};

interface SpecialOrderPageContentProps {
  /** Id del pedido tal cual llega del segmento de ruta (string). */
  orderId: string;
}

/**
 * Cuerpo de la página de detalle de un pedido especial: cabecera con los datos
 * del pedido y sus líneas de muestra con las tallas y servicios a fabricar.
 * Sin enlace al pedido completo. La única escritura es el alta de SKU de
 * producción + lista de materiales por línea (`SampleSkuOnboardingDialog`).
 */
export function SpecialOrderPageContent({ orderId }: SpecialOrderPageContentProps) {
  const numericId = Number(orderId);
  const isValidId = Number.isInteger(numericId) && numericId > 0;
  const { data, isLoading, isError, error } = useSpecialOrderDetail(
    isValidId ? numericId : null,
  );

  // Visibilidad del alta de SKU: admin de empresa / superusuario (`role ===
  // "admin"`, que `hasPermission` cortocircuita) o cualquier usuario con
  // `R-PRODUCCION`. Es UX, no la regla real: el backend exige además el
  // DEPARTAMENTO Producción, que la sesión no trae, así que un usuario puede ver
  // la acción y recibir el rechazo al enviar (el diálogo lo explica).
  const { data: session } = useSession();
  const canGenerateSkus = hasPermission("R-PRODUCCION", session?.user);

  // Se guarda el id y no la línea: así el diálogo siempre lee la línea del
  // detalle vigente, y se cierra solo si un refetch la deja de traer.
  const [onboardingLineId, setOnboardingLineId] = useState<number | null>(null);

  const BackLink = (
    <Link
      href={BACK.href}
      className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <ArrowLeftIcon className="w-4 h-4" />
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
  // 404: el backend no los distingue.
  if (isError || !data) {
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
      <div className="sticky top-0 z-10 py-2 w-fit">{BackLink}</div>

      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
          {data.folio || `Pedido #${data.id}`}
        </h1>
        <InfoGrid>
          <InfoField label="Cliente">{data.cliente_nombre || "—"}</InfoField>
          <InfoField label="Clasificación">
            <span className={data.clasificacion ? undefined : "text-slate-400 dark:text-slate-500"}>
              {getPedidoClasificacionLabel(data.clasificacion)}
            </span>
          </InfoField>
          {/* Mismo formateo que el detalle de pedido (`PedidoDetailContent`):
              `formatShortDate` sin `timeZone: "UTC"`, en la zona del navegador. */}
          <InfoField label="Fecha de confirmación">
            <span className="tabular-nums">
              {data.fecha_confirmacion ? formatShortDate(data.fecha_confirmacion) : "—"}
            </span>
          </InfoField>
        </InfoGrid>
      </section>

      <Section title={`Líneas de muestra (${totalLineas})`}>
        <p className="-mt-2 mb-3 text-[11px] text-slate-500 dark:text-slate-400">
          Solo se muestran las líneas con producto fuera de catálogo. Las líneas de catálogo del
          mismo pedido no se listan aquí.
        </p>
        <SpecialOrderLines
          detalles={data.detalles}
          canGenerateSkus={canGenerateSkus}
          onGenerateSkus={(line) => setOnboardingLineId(line.id)}
        />
      </Section>

      <SampleSkuOnboardingDialog
        pedidoId={data.id}
        line={data.detalles.find((line) => line.id === onboardingLineId) ?? null}
        onClose={() => setOnboardingLineId(null)}
      />
    </div>
  );
}
