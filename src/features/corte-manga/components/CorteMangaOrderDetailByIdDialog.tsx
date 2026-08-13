"use client";

import { SliceIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useCorteMangaOrderDetail } from "../hooks/useCorteMangaOrderDetail";
import { CorteMangaOrderDetailContent } from "./CorteMangaOrderDetailDialog";

interface CorteMangaOrderDetailByIdDialogProps {
  /** Id de la orden a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Envoltorio self-fetching de `CorteMangaOrderDetailDialog`. El diálogo original
 * recibe el OBJETO ya resuelto (lo arma su vista de listado desde la fila en
 * caché), pero consumidores que solo tienen el id —la sección "Documentos
 * relacionados" del detalle de pedido— necesitan la firma uniforme por id
 * (`{ orderId, open, onOpenChange }`) del registro `CLICKABLE_DOC_TIPOS`.
 *
 * Este wrapper trae el detalle por id (`useCorteMangaOrderDetail`) y renderiza un
 * ÚNICO `MainDialog` que solo intercambia su contenido (loader → error →
 * `CorteMangaOrderDetailContent`): al mantener el mismo shell montado, la
 * transición carga→dato NO remonta el modal (sin parpadeo de cierre/apertura ni
 * reset de foco). Mismo chrome que `CorteMangaOrderDetailDialog` (SliceIcon,
 * `maxWidth="880px"`). Distingue el error de red del 404 con `extractErrorMessage`,
 * en vez de caer al "no encontrada" del diálogo interno.
 */
export function CorteMangaOrderDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
}: CorteMangaOrderDetailByIdDialogProps) {
  const { data: order, isLoading, isError, error } =
    useCorteMangaOrderDetail(orderId);

  const subtitle = isLoading
    ? "Cargando…"
    : isError || !order
      ? "Error al cargar"
      : order.folio_ocm;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="880px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <SliceIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Orden de Corte de Manga
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <Loader title="Cargando detalle de la orden..." className="py-16" />
      ) : isError || !order ? (
        // Error de red o consulta resuelta sin registro (404 fuera de tenant / id
        // inexistente): el backend fusiona ambos en un 404, un solo estado basta.
        <ErrorState
          title="No se pudo cargar la orden de corte de manga"
          message={extractErrorMessage(
            error,
            "No existe, no tienes acceso a ella o falló la conexión.",
          )}
        />
      ) : (
        <CorteMangaOrderDetailContent order={order} />
      )}
    </MainDialog>
  );
}
