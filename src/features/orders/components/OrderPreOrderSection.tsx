"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { OrdenesIcon } from "@/src/components/Icons";
import { PreOrderTracker } from "@/src/features/pre-orders/components/PreOrderTracker";
import { SemaforoBadge } from "@/src/features/pre-orders/components/PreOrderTracking";
import type { PreOrderRef } from "@/src/features/pre-orders/interfaces/pre-order.interface";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import { SheetSection } from "./OrderSheetPrimitives";

/**
 * Pre-orden de producción del pedido, en "Avances". Viene en el detalle
 * (`pre_orden`) sin pedir permisos de Producción, así que Ventas ve en qué va
 * y con quién está. `null`/ausente (sin pre-orden o solo cancelada): no se
 * muestra. El enlace a la pre-orden solo sale con permiso de Producción, que es
 * lo que exige su ruta.
 */
export function OrderPreOrderSection({ preOrden }: { preOrden?: PreOrderRef | null }) {
  const { data: session } = useSession();
  if (!preOrden) return null;

  const canOpen = hasPermission("R-PRODUCCION", session?.user);
  const showSemaforo =
    preOrden.semaforo && preOrden.estatus !== "convertida" && preOrden.estatus !== "cancelada";

  return (
    <SheetSection
      icon={<OrdenesIcon className="w-5 h-5" />}
      title="Pre-orden de producción"
      subtitle="Materiales que necesita el pedido antes de fabricarse."
      badges={showSemaforo ? <SemaforoBadge semaforo={preOrden.semaforo!} /> : undefined}
      action={
        canOpen ? (
          <Link
            href={`/manufacturing/pre-orders/${preOrden.id}`}
            className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Ver pre-orden
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <PreOrderTracker estatus={preOrden.estatus} late={preOrden.semaforo === "rojo"} />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <span>
            Estatus:{" "}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {preOrden.estatus_display}
            </span>
          </span>
          {preOrden.fecha_estimada_material && (
            <span>
              Llega material:{" "}
              <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                {formatShortCalendarDate(preOrden.fecha_estimada_material)}
              </span>
            </span>
          )}
        </div>
      </div>
    </SheetSection>
  );
}
