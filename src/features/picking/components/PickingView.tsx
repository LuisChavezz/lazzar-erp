"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { hasPermission } from "@/src/utils/permissions";
import { getPickingColumns } from "./PickingColumns";
import { PickingDetailByIdDialog } from "./PickingDetailByIdDialog";
import { PickingForm } from "./PickingForm";
import { PickingStats } from "./PickingStats";
import {
  PICKING_DETAIL_QUERY_KEY,
  PICKINGS_QUERY_KEY,
  pickingDetailQueryKey,
} from "../constants/pickingQueryKeys";
import { usePickingsTable } from "../hooks/usePickingsTable";

/**
 * Vista de Picking: KPIs (`PickingStats`, `GET /wms/pickings/kpis/`) más el
 * listado en MODO SERVIDOR (`usePickingsTable`, `GET /wms/pickings/?resumen=1`
 * paginado), con la captura de un nuevo picking (`POST /wms/pickings/`, ver
 * `PickingForm`) en el toolbar y el detalle de cada fila.
 *
 * Filtros, búsqueda, orden y página los resuelve el backend y su estado vive en
 * la URL, así que la página que monta esta vista la envuelve en `<Suspense>`.
 * Los KPIs reciben los mismos `criteria` que la tabla: resumen el conjunto
 * filtrado completo, no la página visible.
 *
 * El detalle se pide POR ID (`PickingDetailByIdDialog`, `GET /wms/pickings/{id}/`):
 * las filas del listado ligero no traen `picking_detalle`. El diálogo vive AQUÍ
 * y no en la celda (que se desmonta al paginar, ordenar o filtrar, y la fila
 * puede salir de la página); se guarda el id del último surtido abierto y
 * `open` va aparte para que el contenido no se vacíe durante la animación de
 * cierre.
 */
export function PickingView() {
  const table = usePickingsTable();
  const queryClient = useQueryClient();

  // `hasPermission` ya cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-PICKING", session?.user);

  const [detailPickingId, setDetailPickingId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // El detalle se relee al abrirlo: su llave (`["picking-detail", id]`) no se
  // invalida cuando otra pantalla u otra persona cambia el surtido, y sin esto
  // se serviría de caché hasta el `staleTime` global (15 min), desfasado de la
  // fila. Mientras llega, se ve lo que hubiera en caché.
  const openDetail = (pickingId: number) => {
    void queryClient.invalidateQueries({ queryKey: pickingDetailQueryKey(pickingId) });
    setDetailPickingId(pickingId);
    setIsDetailOpen(true);
  };

  const columns = getPickingColumns({ onViewDetail: openDetail });

  return (
    <div className="h-full flex flex-col min-h-0 space-y-6">
      {/* `shrink-0`: solo la tabla de abajo debe crecer. */}
      <div className="shrink-0">
        <PickingStats criteria={table.criteria} />
      </div>

      {/* `min-h-120`: piso de la tabla cuando la fila de KPIs (con el
          desglose por prioridad a su lado) deja poco espacio remanente —
          sin esto, `flex-1` podía encoger la tabla a un puñado de filas
          visibles en viewports más cortos. */}
      <div className="flex-1 min-h-120 flex flex-col">
        <DataTable
          columns={columns}
          {...table.tableProps}
          // Invalida el PREFIJO y no solo la página: refresca también los
          // indicadores (`["pickings", "kpis", …]`) y los detalles
          // (`["picking-detail"]`), para que tarjetas, tabla y detalle muestren
          // el mismo momento.
          onRefetch={() =>
            Promise.all([
              queryClient.invalidateQueries({ queryKey: PICKINGS_QUERY_KEY }),
              queryClient.invalidateQueries({ queryKey: PICKING_DETAIL_QUERY_KEY }),
            ])
          }
          // Identidad de la fila por registro, no por posición en la página.
          getRowId={(row) => String(row.id)}
          // Lo que busca `?search=` en el backend: folio del picking, folio del
          // pedido y nombre del operador (no estatus ni prioridad).
          searchPlaceholder="Buscar folio, pedido u operador..."
          // El cuerpo llena el contenedor de altura acotada que da
          // `wms/picking/page.tsx`, en vez de reservar un alto fijo.
          fillHeight
          emptyMessage="No hay surtidos registrados."
          // Ver el listado exige `R-WMS-PICKING` (ver `routePermissions`); dar de
          // alta exige además `C-WMS-PICKING`.
          actionButton={canCreate ? <PickingForm /> : undefined}
          errorTitle="Error al cargar los surtidos"
          loadingAriaLabel="Cargando surtidos"
        />
      </div>

      <PickingDetailByIdDialog
        orderId={detailPickingId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
