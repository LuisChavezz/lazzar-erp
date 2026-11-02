"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ContabilidadIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { DIALOG_WIDTH_SECTIONED_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getStaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useStaleNoticeToast } from "@/src/hooks/useStaleNoticeToast";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useChartOfAccounts } from "@/src/features/chart-of-accounts/hooks/useChartOfAccounts";
import { useCostCenters } from "@/src/features/cost-centers/hooks/useCostCenters";
import {
  POLIZA_DESCUADRADA_MESSAGE,
  POLIZA_SIN_IMPORTES_MESSAGE,
  polizaTieneImportes,
} from "../schemas/poliza.schema";
import { getColumns, POLIZA_HEADER_FILTERS } from "./PolizaColumns";
import { PolizaDetailDialog } from "./PolizaDetailDialog";
import PolizaForm from "./PolizaForm";
import { usePolizas } from "../hooks/usePolizas";
import { useContabilizarPoliza } from "../hooks/useContabilizarPoliza";
import { useCancelarPoliza } from "../hooks/useCancelarPoliza";
import { useDeletePoliza } from "../hooks/useDeletePoliza";
import {
  PolizaRowActionsProvider,
  usePendingPolizaIds,
} from "../hooks/usePolizaRowActions";
import { cancelarPolizaDescription } from "../utils/cancelarPolizaCopy";
import type { Poliza, PolizaEstatus } from "../interfaces/poliza.interface";

/** Etiqueta legible de una póliza: su folio si lo tiene, si no el `#id`. */
const etiquetaDe = (poliza: Pick<Poliza, "id" | "folio">): string =>
  poliza.folio || `#${poliza.id}`;

/**
 * Textos del aviso de una confirmación que se cerró porque su póliza cambió por
 * fuera (otra persona la contabilizó, la canceló o la eliminó). `accion` en
 * infinitivo: "contabilizar", "cancelar", "eliminar".
 */
const polizaStaleMessages = (accion: string) => ({
  gone: "La póliza ya no está disponible. Se actualizó el listado.",
  estadoChanged: (estatus: PolizaEstatus) =>
    `La póliza cambió a ${estatus.toLowerCase()}: revisa antes de ${accion}. Se actualizó el listado.`,
});

export default function PolizaList() {
  const { polizas, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    usePolizas();
  // `mutateAsync` y no `mutate`: cada confirmación se cierra sobre la PROMESA de
  // SU llamada. Los callbacks por llamada de `mutate` solo corren para la ÚLTIMA
  // del observer, así que con dos filas en vuelo el cierre de la primera se
  // perdería.
  const { mutateAsync: contabilizarPolizaAsync } = useContabilizarPoliza();
  const { mutateAsync: cancelarPolizaAsync } = useCancelarPoliza();
  const { mutateAsync: deletePolizaAsync } = useDeletePoliza();
  // Acciones en vuelo POR PÓLIZA (contabilizar, cancelar, eliminar), leídas de
  // la MutationCache: `isPending` de cada hook solo recuerda su última llamada y
  // no dice QUÉ póliza está en vuelo.
  const busyIds = usePendingPolizaIds();
  const isBusy = (id: number | null) => id !== null && busyIds.includes(id);

  // Catálogos para poner NOMBRE a los ids del detalle (`PolizaSerializer` no
  // resuelve ninguno). Se piden aquí —y no dentro del diálogo— para que abrir
  // varias pólizas seguidas no dispare una consulta por apertura; las tres
  // comparten caché con las que usa el formulario de alta.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const { branches } = useCompanyBranches(selectedCompany.id);
  // Mismos parámetros que el formulario de alta, para compartir su entrada de
  // caché en vez de abrir una segunda con otro filtro.
  const { cuentasContables } = useChartOfAccounts({
    acepta_movimientos: true,
    activo: true,
  });
  const { centrosCosto } = useCostCenters({ activo: true });

  const [isFormOpen, setIsFormOpen] = useState(false);
  // Estado de TODOS los diálogos en la vista, no en la celda de acciones: una
  // celda se desmonta al ordenar, filtrar o paginar, y las mutaciones cambian el
  // `estatus` —que es justo uno de los filtros—, así que con el filtro
  // "Borrador" activo la fila abandona la tabla en cuanto la mutación corre y un
  // diálogo montado en la celda se cerraría solo a media confirmación.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [postTargetId, setPostTargetId] = useState<number | null>(null);
  /**
   * La cancelación guarda el `estatus` con que se ABRIÓ: su efecto depende de
   * él (un `Borrador` solo se cancela; una `Contabilizada` genera además una
   * contrapóliza). El texto sale de ese estatus, y si la póliza cambia de
   * estatus con la confirmación abierta, el aviso de abajo la cierra en vez de
   * confirmar con un texto que ya no describe lo que va a pasar.
   */
  const [cancelTarget, setCancelTarget] = useState<{
    id: number;
    estatus: PolizaEstatus;
  } | null>(null);
  const cancelTargetId = cancelTarget?.id ?? null;
  /**
   * El borrado guarda la ETIQUETA al abrir, no solo el id: su mutación es
   * optimista y el borrado es FÍSICO, así que la fila sale del caché en cuanto se
   * confirma y la confirmación ya no tendría de dónde leerla mientras pinta
   * "Eliminando...".
   */
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    etiqueta: string;
  } | null>(null);
  /** Aviso del diálogo de fila que se cerró por un cambio externo (toast desde un efecto). */
  const setStaleNotice = useStaleNoticeToast();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  /**
   * Contabilizar desde el listado — el camino que NO pasa por el esquema del
   * formulario (el alta con intención "Contabilizada" sí lo hace).
   *
   * Por eso la regla del cuadre se repite aquí, leyendo `cuadre_correcto`, que el
   * backend calcula con la MISMA regla y la MISMA tolerancia de un centavo que
   * aplica `PolizaService.validar_suma_cero`. Se comprueban DOS cosas: con CERO
   * movimientos `cuadre_correcto` vale `true` (0 == 0), así que sin
   * `polizaTieneImportes` una póliza vacía se contabilizaría y ya no podría
   * eliminarse. El menú ya deshabilita la opción en ambos casos; esta guarda es la
   * que garantiza el invariante aunque la fila del caché estuviera desfasada.
   */
  const handleContabilizar = (poliza: Poliza) => {
    if (!polizaTieneImportes(poliza.total_cargos, poliza.total_abonos)) {
      toast.error(POLIZA_SIN_IMPORTES_MESSAGE);
      return;
    }
    if (!poliza.cuadre_correcto) {
      toast.error(POLIZA_DESCUADRADA_MESSAGE);
      return;
    }
    setPostTargetId(poliza.id);
  };

  // Columnas estáticas: callbacks y "en vuelo" van por `PolizaRowActionsProvider`
  // (sin `useMemo`/`useCallback`: el React Compiler memoiza el componente). Las
  // opciones de los filtros se arman con el listado completo.
  const columns = withHeaderFilters(getColumns(), polizas, POLIZA_HEADER_FILTERS);

  const findPoliza = (id: number | null) =>
    id !== null ? (polizas.find((poliza) => poliza.id === id) ?? null) : null;

  // La póliza cuyo detalle está abierto se busca contra el arreglo COMPLETO que
  // esta vista ya tiene (`polizas` llega sin filtrar; el filtrado ocurre dentro
  // de `DataTable`). List y retrieve comparten `PolizaSerializer`, movimientos y
  // totales incluidos.
  const detailPoliza = findPoliza(openDetailId);

  // El id NO puede sobrevivir a la desaparición de su renglón: un refetch
  // posterior que lo devolviera volvería a abrir el detalle solo. Se ajusta en
  // RENDER (patrón de estado derivado de React) y no en un efecto, que
  // dispararía `react-hooks/set-state-in-effect`.
  if (openDetailId !== null && detailPoliza === null) {
    setOpenDetailId(null);
  }

  // Cada confirmación espera un estatus concreto. Si un refetch muestra que su
  // póliza cambió (otra persona la contabilizó, canceló o eliminó) o ya no está,
  // se cierra con aviso: confirmar dispararía una acción que ya no aplica, o con
  // un texto que ya no describe su efecto. Mientras la acción PROPIA está en
  // vuelo no se decide: su optimista ya cambió la fila y la cierra el `finally`.
  const stalePost = getStaleRowDialogNotice({
    resource: "poliza-contabilizar",
    targetId: postTargetId,
    target: findPoliza(postTargetId),
    statusField: "estatus",
    expectedEstado: "Borrador",
    isBusy: isBusy(postTargetId),
    messages: polizaStaleMessages("contabilizar"),
  });
  if (stalePost) {
    setPostTargetId(null);
    setStaleNotice(stalePost);
  }

  const staleCancel =
    cancelTarget &&
    getStaleRowDialogNotice({
      resource: "poliza-cancelar",
      targetId: cancelTarget.id,
      target: findPoliza(cancelTarget.id),
      statusField: "estatus",
      expectedEstado: cancelTarget.estatus,
      isBusy: isBusy(cancelTarget.id),
      messages: polizaStaleMessages("cancelar"),
    });
  if (staleCancel) {
    setCancelTarget(null);
    setStaleNotice(staleCancel);
  }

  const staleDelete =
    deleteTarget &&
    getStaleRowDialogNotice({
      resource: "poliza-eliminar",
      targetId: deleteTarget.id,
      target: findPoliza(deleteTarget.id),
      statusField: "estatus",
      expectedEstado: "Borrador",
      isBusy: isBusy(deleteTarget.id),
      messages: polizaStaleMessages("eliminar"),
    });
  if (staleDelete) {
    setDeleteTarget(null);
    setStaleNotice(staleDelete);
  }

  const postTarget = findPoliza(postTargetId);
  const cancelPoliza = findPoliza(cancelTargetId);

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón "+ Nueva póliza"— sigue disponible durante la carga y ante un error.
  return (
    <PolizaRowActionsProvider
      value={{
        onViewDetail: (poliza) => setOpenDetailId(poliza.id),
        onContabilizar: handleContabilizar,
        onCancel: (poliza) => setCancelTarget({ id: poliza.id, estatus: poliza.estatus }),
        onDelete: (poliza) => setDeleteTarget({ id: poliza.id, etiqueta: etiquetaDe(poliza) }),
        busyIds,
      }}
    >
      <div className="h-full flex flex-col min-h-0 space-y-6">
        <div className="flex-1 min-h-0 flex flex-col">
          <DataTable
            columns={columns}
            data={polizas}
            baseDataCount={polizas.length}
            searchPlaceholder="Buscar por folio o concepto..."
            fillHeight
            onRefetch={refetch}
            isRefetching={isFetching}
            emptyMessage="No hay pólizas registradas."
            isLoading={isLoading}
            isError={showError}
            errorTitle="Error al cargar las pólizas"
            errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
            onErrorRetry={refetch}
            loadingAriaLabel="Cargando pólizas"
            getRowId={(row) => String(row.id)}
            // Un alta nueva aparece tras invalidar; sin esto, quien esté parado en la
            // página 2 no vería la póliza que acaba de registrar.
            paginationResetKey={polizas.length}
            actionButton={
              <MainDialog
                title={
                  <DialogHeader
                    title="Nueva Póliza"
                    subtitle="Asiento contable de partida doble: los cargos deben igualar a los abonos"
                    statusColor="indigo"
                    icon={ContabilidadIcon}
                  />
                }
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                maxWidth={DIALOG_WIDTH_SECTIONED_FORM}
                trigger={
                  <Button
                    variant="primary"
                    rounded="full"
                    className="hover:scale-105 active:scale-95"
                  >
                    + Nueva póliza
                  </Button>
                }
              >
                {/* Se monta solo mientras el diálogo está abierto: así los catálogos
                    de sus selectores se piden bajo demanda y cada alta arranca
                    limpia. */}
                {isFormOpen && <PolizaForm onSuccess={() => setIsFormOpen(false)} />}
              </MainDialog>
            }
          />
        </div>

        {detailPoliza && (
          <PolizaDetailDialog
            poliza={detailPoliza}
            cuentasContables={cuentasContables}
            centrosCosto={centrosCosto}
            branches={branches}
            open={true}
            onOpenChange={(open) => {
              if (!open) setOpenDetailId(null);
            }}
          />
        )}

        {postTargetId !== null && (
          <ConfirmDialog
            open={true}
            onOpenChange={(open) => {
              if (!open) setPostTargetId(null);
            }}
            title="Contabilizar Póliza"
            description={`¿Deseas contabilizar la póliza ${postTarget ? etiquetaDe(postTarget) : `#${postTargetId}`}? El asiento pasará a formar parte de la contabilidad y ya no podrá eliminarse: solo cancelarse. El servidor volverá a verificar que los cargos igualen a los abonos.`}
            confirmText={isBusy(postTargetId) ? "Contabilizando..." : "Contabilizar"}
            cancelText="Volver"
            // `closeOnConfirm={false}`: por defecto el diálogo se cierra al instante
            // y la etiqueta de "Contabilizando..." nunca alcanzaría a pintarse. El
            // cierre lo hace el `finally`, cuando la petición y su refetch terminaron.
            closeOnConfirm={false}
            onConfirm={() => {
              const id = postTargetId;
              // Una póliza ya en vuelo no se vuelve a mandar (doble clic, o reabrir
              // tras "Volver" mientras su acción sigue pendiente).
              if (isBusy(id)) return;
              contabilizarPolizaAsync(id)
                // El hook ya avisó del error con su toast; aquí solo se evita el
                // rechazo no manejado de la promesa.
                .catch(() => {})
                // Solo cierra SU confirmación: si mientras tanto se abrió la de
                // otra póliza, esa no se toca.
                .finally(() => setPostTargetId((current) => (current === id ? null : current)));
            }}
            confirmColor="green"
          />
        )}

        {cancelTarget !== null && (
          <ConfirmDialog
            open={true}
            onOpenChange={(open) => {
              if (!open) setCancelTarget(null);
            }}
            title="Cancelar Póliza"
            description={cancelarPolizaDescription(
              cancelPoliza ? etiquetaDe(cancelPoliza) : `#${cancelTarget.id}`,
              cancelTarget.estatus,
            )}
            confirmText={isBusy(cancelTarget.id) ? "Cancelando..." : "Cancelar póliza"}
            cancelText="Volver"
            closeOnConfirm={false}
            onConfirm={() => {
              const id = cancelTarget.id;
              if (isBusy(id)) return;
              cancelarPolizaAsync(id)
                .catch(() => {})
                .finally(() =>
                  setCancelTarget((current) => (current?.id === id ? null : current)),
                );
            }}
            confirmColor="amber"
          />
        )}

        {deleteTarget !== null && (
          <ConfirmDialog
            open={true}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
            title="Eliminar Borrador"
            // El borrado del backend es FÍSICO, no baja lógica, y arrastra todos los
            // movimientos: se dice sin rodeos. La etiqueta viene del objetivo
            // capturado al abrir, no de la lista: la fila ya no está ahí mientras
            // la mutación corre.
            description={`¿Deseas eliminar el borrador ${deleteTarget.etiqueta}? La póliza y todos sus movimientos se borrarán de forma PERMANENTE y no podrán recuperarse. Si prefieres conservar el rastro del documento, cancélala en vez de eliminarla.`}
            confirmText={isBusy(deleteTarget.id) ? "Eliminando..." : "Eliminar permanentemente"}
            cancelText="Volver"
            closeOnConfirm={false}
            onConfirm={() => {
              const id = deleteTarget.id;
              if (isBusy(id)) return;
              deletePolizaAsync(id)
                .catch(() => {})
                .finally(() =>
                  setDeleteTarget((current) => (current?.id === id ? null : current)),
                );
            }}
            confirmColor="red"
          />
        )}
      </div>
    </PolizaRowActionsProvider>
  );
}
