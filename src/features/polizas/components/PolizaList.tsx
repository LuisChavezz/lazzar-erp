"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { POLIZA_TIPOS } from "../interfaces/poliza.interface";
import {
  POLIZA_DESCUADRADA_MESSAGE,
  POLIZA_SIN_IMPORTES_MESSAGE,
  polizaTieneImportes,
} from "../schemas/poliza.schema";
import { getColumns } from "./PolizaColumns";
import { PolizaDetailDialog } from "./PolizaDetailDialog";
import PolizaForm from "./PolizaForm";
import { usePolizas } from "../hooks/usePolizas";
import { useCuentasContables } from "../hooks/useCuentasContables";
import { useCentrosCosto } from "../hooks/useCentrosCosto";
import { useContabilizarPoliza } from "../hooks/useContabilizarPoliza";
import { useCancelarPoliza } from "../hooks/useCancelarPoliza";
import { useDeletePoliza } from "../hooks/useDeletePoliza";

/**
 * Filtros de la tabla. `DataTable` filtra en MEMORIA comparando
 * `String(row[configId]) === value`, así que los valores son los del enum crudo
 * del backend. El endpoint SÍ acepta `?estatus=`, `?tipo=`, `?sucursal=` y más,
 * pero la tabla no tiene puente hacia parámetros de servidor (ver `getPolizas`).
 */
const ESTATUS_FILTER = [
  { value: "Borrador", label: "Borrador" },
  { value: "Contabilizada", label: "Contabilizada" },
  { value: "Cancelada", label: "Cancelada" },
];

const TIPO_FILTER = POLIZA_TIPOS.map((tipo) => ({ value: tipo, label: tipo }));

/**
 * Candado de reenvío POR FILA para una acción confirmada (contabilizar,
 * cancelar, eliminar). Misma implementación que en `CreditNoteList`.
 *
 * - Se toma al CONFIRMAR, nunca al abrir: cerrar el diálogo sin confirmar no deja
 *   nada tomado.
 * - Guarda los ids EN VUELO, no un booleano de la acción: mientras la póliza A
 *   viaja, confirmar la B sigue funcionando; confirmar A otra vez no.
 * - Cerrar el diálogo a mano NO lo suelta: se suelta cuando la petición termina.
 *   Soltarlo antes dejaría reabrir y confirmar la misma fila con la primera
 *   petición todavía en curso.
 *
 * La ref es la guarda: se marca de forma SÍNCRONA, así que el segundo clic de un
 * doble clic —que llega antes de que React vuelva a pintar— ya la encuentra
 * puesta. El estado solo refleja lo mismo para pintar la etiqueta de pendiente
 * de la fila correcta; el `isPending` de la mutación no sirve para eso, porque
 * con dos filas en vuelo describe solo la última llamada.
 */
function useRowActionLock() {
  const inFlightRef = useRef<Set<number>>(new Set());
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(() => new Set());

  const acquire = (id: number): boolean => {
    if (inFlightRef.current.has(id)) return false;
    inFlightRef.current.add(id);
    setPendingIds(new Set(inFlightRef.current));
    return true;
  };

  const release = (id: number) => {
    inFlightRef.current.delete(id);
    setPendingIds(new Set(inFlightRef.current));
  };

  const isPending = (id: number | null): boolean =>
    id !== null && pendingIds.has(id);

  return { acquire, release, isPending };
}

export default function PolizaList() {
  const { polizas, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    usePolizas();
  // `mutateAsync` y no `mutate`: el candado se libera sobre la PROMESA de cada
  // llamada (ver `useRowActionLock`). Los callbacks que se pasan a `mutate` solo
  // corren para la ÚLTIMA llamada del observer, así que con dos filas en vuelo
  // el `onSettled` de la primera se perdería y su candado no se soltaría nunca.
  const { mutateAsync: contabilizarPolizaAsync } = useContabilizarPoliza();
  const { mutateAsync: cancelarPolizaAsync } = useCancelarPoliza();
  const { mutateAsync: deletePolizaAsync } = useDeletePoliza();

  // Catálogos para poner NOMBRE a los ids del detalle (`PolizaSerializer` no
  // resuelve ninguno). Se piden aquí —y no dentro del diálogo— para que abrir
  // varias pólizas seguidas no dispare una consulta por apertura; las tres
  // comparten caché con las que usa el formulario de alta.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const { branches } = useCompanyBranches(selectedCompany.id);
  const { cuentasContables } = useCuentasContables();
  const { centrosCosto } = useCentrosCosto();

  const [isFormOpen, setIsFormOpen] = useState(false);
  // Estado de TODOS los diálogos en la vista, no en la celda de acciones: una
  // celda se desmonta al ordenar, filtrar o paginar, y las dos mutaciones cambian
  // el `estatus` —que es justo uno de los filtros—, así que con el filtro
  // "Borrador" activo la fila abandona la tabla en cuanto la mutación corre y un
  // diálogo montado en la celda se cerraría solo a media confirmación.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [postTargetId, setPostTargetId] = useState<number | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  /**
   * El borrado guarda un OBJETO, no solo el id, igual que en `CreditNoteList`.
   *
   * Su mutación es optimista y el borrado es FÍSICO: `onMutate` quita la fila del
   * caché en cuanto se confirma. Un diálogo que dependiera del renglón —para su
   * etiqueta o para seguir montado— se quedaría sin datos y desaparecería a media
   * mutación, sin alcanzar a pintar "Eliminando..." y sin nada que mostrar si el
   * DELETE falla y el optimista revierte. Se captura al ABRIR lo único que el
   * diálogo necesita.
   */
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    etiqueta: string;
  } | null>(null);

  // Un candado POR ACCIÓN, cada uno con las filas que tiene en vuelo (ver
  // `useRowActionLock`). La cancelación lleva el suyo aunque aquí el riesgo es
  // menor que en notas de crédito —cancelar una póliza NO revierte importes y
  // `PolizaService.cancelar` es idempotente—: se evita igual el POST duplicado
  // para que las dos listas se comporten igual. El borrado necesita el suyo
  // porque su diálogo sobrevive a la desaparición optimista de la fila: un DELETE
  // repetido respondería 404 y pintaría un error justo después de un borrado que
  // sí funcionó.
  const postLock = useRowActionLock();
  const cancelLock = useRowActionLock();
  const deleteLock = useRowActionLock();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  const handleViewDetail = useCallback((id: number) => setOpenDetailId(id), []);

  /**
   * Contabilizar desde el listado — el camino que NO pasa por el esquema del
   * formulario (el alta con intención "Contabilizada" sí lo hace).
   *
   * Por eso la regla del cuadre se repite aquí, leyendo `cuadre_correcto`, que el
   * backend calcula con la MISMA regla y la MISMA tolerancia de un centavo que
   * aplica `PolizaService.validar_suma_cero`. Un borrador descuadrado es un
   * documento perfectamente guardable (el POST no valida el cuadre), así que
   * llega sin problema hasta esta acción; el backend respondería 400 y aquí se
   * corta ANTES de abrir la confirmación, con el motivo explícito.
   *
   * Se comprueban DOS cosas, no una. `cuadre_correcto` vale `true` con CERO
   * movimientos (el backend suma sobre un conjunto vacío: 0 == 0), y
   * `PolizaService.validar_suma_cero` tampoco lo atrapa, así que sin
   * `polizaTieneImportes` una póliza sin un solo asiento se contabilizaría y
   * quedaría cerrada e imposible de eliminar. Es la misma regla que el
   * formulario aplica con `hayImportes`, evaluada aquí sobre los totales que
   * calcula el servidor (`total_cargos`/`total_abonos`), que es el único dato de
   * importes que trae el renglón del listado.
   *
   * El menú ya deshabilita la opción en ambos casos; esta guarda es la que
   * garantiza el invariante aunque la fila del caché estuviera desfasada.
   */
  const handleContabilizar = useCallback(
    (id: number) => {
      const poliza = polizas.find((item) => item.id === id);
      if (poliza) {
        if (!polizaTieneImportes(poliza.total_cargos, poliza.total_abonos)) {
          toast.error(POLIZA_SIN_IMPORTES_MESSAGE);
          return;
        }
        if (!poliza.cuadre_correcto) {
          toast.error(POLIZA_DESCUADRADA_MESSAGE);
          return;
        }
      }
      setPostTargetId(id);
    },
    [polizas],
  );

  const handleCancel = useCallback((id: number) => setCancelTargetId(id), []);
  const handleDelete = useCallback(
    (id: number) => {
      const poliza = polizas.find((item) => item.id === id);
      setDeleteTarget({ id, etiqueta: poliza?.folio || `#${id}` });
    },
    [polizas],
  );

  const columns = useMemo(
    () => getColumns(handleViewDetail, handleContabilizar, handleCancel, handleDelete),
    [handleViewDetail, handleContabilizar, handleCancel, handleDelete],
  );

  // La póliza cuyo detalle está abierto se busca contra el arreglo que esta vista
  // ya tiene: el diálogo no vuelve a consultar el listado para localizar un
  // renglón (list y retrieve comparten `PolizaSerializer`, movimientos y totales
  // incluidos).
  const detailPoliza =
    openDetailId !== null
      ? polizas.find((poliza) => poliza.id === openDetailId) ?? null
      : null;

  // El id NO puede sobrevivir a la desaparición de su renglón: si la póliza sale
  // del payload, el diálogo se desmontaría pero el id seguiría apuntando a ella y
  // cualquier refetch posterior que la devolviera volvería a abrirlo solo. Se
  // ajusta en RENDER (patrón de estado derivado de React: re-render inmediato sin
  // pintar) y no en un efecto, que dispararía `react-hooks/set-state-in-effect`.
  if (openDetailId !== null && detailPoliza === null) {
    setOpenDetailId(null);
  }

  // Los objetivos de contabilizar y cancelar SÍ sobreviven a que la fila salga de
  // la vista FILTRADA: los diálogos se alimentan solo del id, así que el flujo
  // termina aunque el filtro "Borrador" expulse la fila en cuanto el optimista de
  // la cancelación la marque. Lo que NO puede sobrevivir es que la póliza
  // desaparezca del payload completo (`polizas` llega sin filtrar; el filtrado
  // ocurre dentro de `DataTable`): confirmar dispararía la mutación contra un id
  // inexistente y el diálogo quedaría sin forma de cerrarse salvo a mano.
  //
  // El BORRADO queda FUERA de esta comprobación a propósito, como en
  // `CreditNoteList`: su propio optimista hace desaparecer la fila, así que la
  // guarda se cumpliría siempre y cerraría el diálogo justo al confirmar. No lo
  // necesita — no consulta la lista (ver `deleteTarget`) y se cierra al terminar
  // la petición.
  const existe = (id: number) => polizas.some((poliza) => poliza.id === id);
  if (postTargetId !== null && !existe(postTargetId)) setPostTargetId(null);
  if (cancelTargetId !== null && !existe(cancelTargetId)) setCancelTargetId(null);

  /** Etiqueta legible de una póliza: su folio si lo tiene, si no el `#id`. */
  const etiqueta = (id: number | null) => {
    if (id === null) return "";
    const poliza = polizas.find((p) => p.id === id);
    return poliza?.folio || `#${id}`;
  };

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón "+ Nueva póliza"— sigue disponible durante la carga y ante un error.
  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={polizas}
        baseDataCount={polizas.length}
        title="Pólizas Contables"
        searchPlaceholder="Buscar por folio o concepto..."
        filterConfig={[
          { id: "estatus", label: "Estatus", options: ESTATUS_FILTER },
          { id: "tipo", label: "Tipo", options: TIPO_FILTER },
        ]}
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
              />
            }
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            maxWidth="1100px"
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
          description={`¿Deseas contabilizar la póliza ${etiqueta(postTargetId)}? El asiento pasará a formar parte de la contabilidad y ya no podrá eliminarse: solo cancelarse. El servidor volverá a verificar que los cargos igualen a los abonos.`}
          confirmText={
            postLock.isPending(postTargetId) ? "Contabilizando..." : "Contabilizar"
          }
          cancelText="Volver"
          // `closeOnConfirm={false}`: por defecto el diálogo se cierra al instante
          // y la etiqueta de "Contabilizando..." nunca alcanzaría a pintarse (está
          // documentado en el prop). El cierre lo hace `onSettled`, cuando el
          // refetch ya terminó.
          closeOnConfirm={false}
          // Guarda de reenvío: con `closeOnConfirm={false}` el diálogo sigue
          // montado durante todo el viaje y `ConfirmDialog` no expone forma de
          // deshabilitar su botón (solo cambia de etiqueta), así que un segundo
          // clic dispararía un segundo POST. Aquí la acción es idempotente (una
          // póliza ya contabilizada devuelve 200 sin hacer nada), pero el segundo
          // viaje seguiría siendo ruido innecesario en una operación contable.
          onConfirm={() => {
            const id = postTargetId;
            if (!postLock.acquire(id)) return;
            contabilizarPolizaAsync(id)
              // El hook ya avisó del error con su toast; aquí solo se evita el
              // rechazo no manejado de la promesa.
              .catch(() => {})
              .finally(() => {
                postLock.release(id);
                // Solo se cierra SU diálogo: si mientras tanto el usuario abrió
                // el de otra póliza, ese no se toca.
                setPostTargetId((current) => (current === id ? null : current));
              });
          }}
          confirmColor="green"
        />
      )}

      {cancelTargetId !== null && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setCancelTargetId(null);
          }}
          title="Cancelar Póliza"
          // Se dice explícitamente que cancelar NO revierte importes: a diferencia
          // de un pago o una nota de crédito, la póliza ES el asiento — no hay
          // saldo que devolver, solo un estatus que cambia.
          description={`¿Deseas cancelar la póliza ${etiqueta(cancelTargetId)}? Es un cambio de estatus: no revierte ningún importe ni genera un asiento inverso. La póliza se conserva en el listado con estatus Cancelada y ya no podrá contabilizarse.`}
          confirmText={
            cancelLock.isPending(cancelTargetId) ? "Cancelando..." : "Cancelar póliza"
          }
          cancelText="Volver"
          closeOnConfirm={false}
          onConfirm={() => {
            const id = cancelTargetId;
            if (!cancelLock.acquire(id)) return;
            cancelarPolizaAsync(id)
              .catch(() => {})
              .finally(() => {
                cancelLock.release(id);
                setCancelTargetId((current) => (current === id ? null : current));
              });
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
          confirmText={
            deleteLock.isPending(deleteTarget.id)
              ? "Eliminando..."
              : "Eliminar permanentemente"
          }
          cancelText="Volver"
          closeOnConfirm={false}
          onConfirm={() => {
            const id = deleteTarget.id;
            if (!deleteLock.acquire(id)) return;
            deletePolizaAsync(id)
              .catch(() => {})
              .finally(() => {
                deleteLock.release(id);
                setDeleteTarget((current) => (current?.id === id ? null : current));
              });
          }}
          confirmColor="red"
        />
      )}
    </div>
  );
}
