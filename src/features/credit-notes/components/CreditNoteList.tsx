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
import {
  TOTAL_CERO_MESSAGE,
  totalEsAcreditable,
} from "../schemas/credit-note.schema";
import { getColumns } from "./CreditNoteColumns";
import { CreditNoteDetailDialog } from "./CreditNoteDetailDialog";
import CreditNoteForm from "./CreditNoteForm";
import { useNotasCredito } from "../hooks/useNotasCredito";
import { useEmitirNotaCredito } from "../hooks/useEmitirNotaCredito";
import { useCancelNotaCredito } from "../hooks/useCancelNotaCredito";
import { useDeleteNotaCredito } from "../hooks/useDeleteNotaCredito";

/**
 * Filtros de la tabla. `DataTable` filtra en MEMORIA comparando
 * `String(row[configId]) === value`, así que los valores son los del enum crudo
 * del backend. El endpoint SÍ acepta `?estatus=`, `?cliente=`, `?factura=` y
 * más, pero la tabla no tiene puente hacia parámetros de servidor (ver
 * `getNotasCredito`).
 */
const ESTATUS_FILTER = [
  { value: "Borrador", label: "Borrador" },
  { value: "Emitida", label: "Emitida" },
  { value: "Cancelada", label: "Cancelada" },
];

/**
 * Candado de reenvío POR FILA para una acción confirmada (emitir, cancelar,
 * eliminar). Misma implementación que en `PolizaList`.
 *
 * - Se toma al CONFIRMAR, nunca al abrir: cerrar el diálogo sin confirmar no deja
 *   nada tomado.
 * - Guarda los ids EN VUELO, no un booleano de la acción: mientras la nota A
 *   viaja, confirmar la B sigue funcionando; confirmar A otra vez no.
 * - Cerrar el diálogo a mano NO lo suelta: se suelta cuando la petición termina.
 *   Soltarlo antes dejaría reabrir y confirmar la misma nota con la primera
 *   petición todavía en curso — justo el doble movimiento de saldo que evita.
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

export default function CreditNoteList() {
  const { notasCredito, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useNotasCredito();
  // `mutateAsync` y no `mutate`: el candado se libera sobre la PROMESA de cada
  // llamada (ver `useRowActionLock`). Los callbacks que se pasan a `mutate` solo
  // corren para la ÚLTIMA llamada del observer, así que con dos notas en vuelo el
  // `onSettled` de la primera se perdería y su candado no se soltaría nunca.
  const { mutateAsync: emitirNotaAsync } = useEmitirNotaCredito();
  const { mutateAsync: cancelNotaAsync } = useCancelNotaCredito();
  const { mutateAsync: deleteNotaAsync } = useDeleteNotaCredito();

  const [isFormOpen, setIsFormOpen] = useState(false);
  // Estado de TODOS los diálogos en la vista, no en la celda de acciones: una
  // celda se desmonta al ordenar, filtrar o paginar, y las tres mutaciones
  // cambian el `estatus` —que es justo el filtro de la tabla—, así que con el
  // filtro "Borrador" activo la fila abandona la tabla en cuanto la mutación
  // optimista corre y un diálogo montado en la celda se cerraría solo a media
  // confirmación.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [emitTargetId, setEmitTargetId] = useState<number | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  /**
   * El borrado guarda un OBJETO, no solo el id, a diferencia de las otras dos
   * confirmaciones.
   *
   * Su mutación es optimista y el borrado es FÍSICO: `onMutate` quita la fila del
   * caché en cuanto se confirma. Un diálogo que dependiera del renglón —para su
   * etiqueta o para seguir montado— se quedaría sin datos y desaparecería a media
   * mutación, sin alcanzar a pintar "Eliminando..." y sin nada que mostrar si el
   * DELETE falla y el optimista revierte. Emitir y cancelar no tienen el problema
   * porque ahí el renglón sobrevive, solo cambia de estatus.
   *
   * Se captura al ABRIR lo único que el diálogo necesita, igual que
   * `PaymentList` arma su `cancelTargetLabel` sin volver a consultar la lista.
   */
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    etiqueta: string;
  } | null>(null);

  // Un candado POR ACCIÓN, cada uno con las notas que tiene en vuelo (ver
  // `useRowActionLock`). Emitir y cancelar son las dos confirmaciones que MUEVEN
  // el saldo de la cuenta por cobrar: dos peticiones simultáneas sobre la misma
  // nota lo aplicarían o lo devolverían dos veces, porque el backend decide
  // comparando contra el estatus anterior, que ambas leerían igual.
  //
  // El `isPending` de la mutación no sirve de guarda —solo se ve tras un
  // re-render, y los dos clics de un doble clic llegan antes; verificado en el
  // navegador, donde esa guarda dejó pasar un segundo POST—; la ref sí.
  const emitLock = useRowActionLock();
  const cancelLock = useRowActionLock();
  // El borrado necesita el suyo desde que su diálogo sobrevive a la desaparición
  // optimista de la fila: un DELETE repetido responde 404 y pintaría un error
  // justo después de un borrado que sí funcionó.
  const deleteLock = useRowActionLock();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  const handleViewDetail = useCallback((id: number) => setOpenDetailId(id), []);

  /**
   * Emitir un borrador ya guardado — el ÚNICO camino de emisión que no pasa por
   * el esquema del formulario (el alta con `estatus: "Emitida"` sí lo hace).
   *
   * Por eso la regla de "nada que acreditar" se repite aquí, con la MISMA
   * condición y el MISMO mensaje (`totalEsAcreditable` / `TOTAL_CERO_MESSAGE`):
   * `total` arranca en "0.00" y guardar un borrador sin tocarlo es legítimo, así
   * que un borrador en cero llega perfectamente a esta acción. El backend lo
   * aceptaría con un 200 y marcaría la nota `Emitida` sin mover un centavo de la
   * cuenta por cobrar, y como no hay UI para editar un borrador, el documento
   * solo podría cancelarse o borrarse después.
   *
   * Se corta ANTES de abrir la confirmación —no hay nada que confirmar— y el
   * PATCH nunca sale.
   */
  const handleEmitir = useCallback(
    (id: number) => {
      const nota = notasCredito.find((item) => item.id === id);
      if (nota && !totalEsAcreditable(nota.total)) {
        toast.error(TOTAL_CERO_MESSAGE);
        return;
      }
      setEmitTargetId(id);
    },
    [notasCredito],
  );
  const handleCancel = useCallback((id: number) => setCancelTargetId(id), []);
  const handleDelete = useCallback(
    (id: number) => {
      const nota = notasCredito.find((item) => item.id === id);
      setDeleteTarget({ id, etiqueta: nota?.folio || `#${id}` });
    },
    [notasCredito],
  );

  const columns = useMemo(
    () => getColumns(handleViewDetail, handleEmitir, handleCancel, handleDelete),
    [handleViewDetail, handleEmitir, handleCancel, handleDelete],
  );

  // La nota cuyo detalle está abierto se busca contra el arreglo que esta vista
  // ya tiene: el diálogo no vuelve a suscribirse al listado para localizar un
  // renglón (listado y retrieve comparten `NotaCreditoSerializer`, líneas
  // incluidas).
  const detailNota =
    openDetailId !== null
      ? notasCredito.find((nota) => nota.id === openDetailId) ?? null
      : null;

  // El id NO puede sobrevivir a la desaparición de su renglón: si la nota sale
  // del payload, el diálogo se desmontaría pero el id seguiría apuntando a ella y
  // cualquier refetch posterior que la devolviera volvería a abrirlo solo. Se
  // ajusta en RENDER (patrón de estado derivado de React: re-render inmediato
  // sin pintar) y no en un efecto, que dispararía `react-hooks/set-state-in-effect`.
  if (openDetailId !== null && detailNota === null) {
    setOpenDetailId(null);
  }

  // Los objetivos de emitir y cancelar SÍ sobreviven a que la fila salga de la
  // vista FILTRADA: los diálogos se alimentan solo del id, así que el flujo
  // termina aunque el filtro "Borrador" expulse la fila en cuanto el optimista la
  // marque.
  //
  // Lo que NO puede sobrevivir es que la nota desaparezca del payload completo
  // (`notasCredito` llega sin filtrar; el filtrado ocurre dentro de `DataTable`).
  // Si el registro ya no existe, confirmar dispararía la mutación contra un id
  // inexistente y el id quedaría fijado, dejando el diálogo sin forma de cerrarse
  // salvo a mano. Se ajusta en RENDER, igual que `openDetailId`.
  //
  // El BORRADO queda FUERA de esta comprobación a propósito: su propio optimista
  // hace desaparecer la fila, así que la guarda se cumpliría siempre y cerraría
  // el diálogo justo al confirmar. No lo necesita — no consulta la lista para
  // nada (ver `deleteTarget`) y al terminar la petición se cierra igual.
  const existe = (id: number) => notasCredito.some((nota) => nota.id === id);
  if (emitTargetId !== null && !existe(emitTargetId)) setEmitTargetId(null);
  if (cancelTargetId !== null && !existe(cancelTargetId)) setCancelTargetId(null);

  /** Etiqueta legible de una nota: su folio si lo tiene, si no el `#id`. */
  const etiqueta = (id: number | null) => {
    if (id === null) return "";
    const nota = notasCredito.find((n) => n.id === id);
    return nota?.folio || `#${id}`;
  };

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón "+ Nueva nota"— sigue disponible durante la carga y ante un error.
  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={notasCredito}
        baseDataCount={notasCredito.length}
        title="Notas de Crédito"
        searchPlaceholder="Buscar por folio, factura, cliente o motivo..."
        filterConfig={[{ id: "estatus", label: "Estatus", options: ESTATUS_FILTER }]}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay notas de crédito registradas."
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las notas de crédito"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando notas de crédito"
        getRowId={(row) => String(row.id)}
        // Un alta nueva aparece tras invalidar; sin esto, quien esté parado en la
        // página 2 no vería la nota que acaba de registrar.
        paginationResetKey={notasCredito.length}
        actionButton={
          <MainDialog
            title={
              <DialogHeader
                title="Nueva Nota de Crédito"
                subtitle="Crédito sobre una factura con saldo por cobrar"
                statusColor="violet"
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
                + Nueva nota
              </Button>
            }
          >
            {/* Se monta solo mientras el diálogo está abierto: así los catálogos
                de sus selectores se piden bajo demanda y cada alta arranca
                limpia. */}
            {isFormOpen && <CreditNoteForm onSuccess={() => setIsFormOpen(false)} />}
          </MainDialog>
        }
      />

      {detailNota && (
        <CreditNoteDetailDialog
          nota={detailNota}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenDetailId(null);
          }}
        />
      )}

      {emitTargetId !== null && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEmitTargetId(null);
          }}
          title="Emitir Nota de Crédito"
          description={`¿Deseas emitir la nota ${etiqueta(emitTargetId)}? Su total se descontará del saldo por cobrar de la factura ligada y podrá marcarla como pagada. Después de emitirla ya no podrá eliminarse: solo cancelarse.`}
          confirmText={
            emitLock.isPending(emitTargetId) ? "Emitiendo..." : "Emitir nota"
          }
          cancelText="Volver"
          // `closeOnConfirm={false}`: por defecto el diálogo se cierra al instante
          // y la etiqueta de "Emitiendo..." nunca alcanzaría a pintarse (está
          // documentado en el prop). El cierre llega cuando la petición y su
          // refetch terminaron.
          closeOnConfirm={false}
          // Guarda de reenvío: con `closeOnConfirm={false}` el diálogo sigue
          // montado durante todo el viaje y `ConfirmDialog` no expone forma de
          // deshabilitar su botón (solo cambia de etiqueta), así que un segundo
          // clic dispararía un segundo PATCH. Dos emisiones de la misma nota
          // descontarían su total DOS VECES del saldo de la cuenta por cobrar,
          // porque el backend decide si aplicar el crédito comparando contra el
          // estatus anterior, que ambas peticiones leerían como `Borrador`.
          onConfirm={() => {
            const id = emitTargetId;
            if (!emitLock.acquire(id)) return;
            emitirNotaAsync(id)
              // El hook ya avisó del error con su toast; aquí solo se evita el
              // rechazo no manejado de la promesa.
              .catch(() => {})
              .finally(() => {
                emitLock.release(id);
                // Solo se cierra SU diálogo: si mientras tanto el usuario abrió
                // el de otra nota, ese no se toca.
                setEmitTargetId((current) => (current === id ? null : current));
              });
          }}
          confirmColor="amber"
        />
      )}

      {cancelTargetId !== null && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setCancelTargetId(null);
          }}
          title="Cancelar Nota de Crédito"
          description={`¿Deseas cancelar la nota ${etiqueta(cancelTargetId)}? Si estaba emitida, su importe se devolverá al saldo por cobrar de la factura. La nota se conserva en el listado con estatus Cancelada.`}
          confirmText={
            cancelLock.isPending(cancelTargetId) ? "Cancelando..." : "Cancelar nota"
          }
          cancelText="Volver"
          closeOnConfirm={false}
          // Misma guarda de reenvío que en la emisión, por el motivo simétrico:
          // dos cancelaciones de una nota EMITIDA devolverían su importe DOS
          // VECES al saldo de la cuenta por cobrar. Que la operación sea
          // idempotente en el backend no cubre este caso: lo es cuando la nota
          // YA está cancelada, no cuando dos peticiones simultáneas la
          // encuentran todavía emitida.
          onConfirm={() => {
            const id = cancelTargetId;
            if (!cancelLock.acquire(id)) return;
            cancelNotaAsync(id)
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
          // El borrado del backend es FÍSICO, no baja lógica: se dice sin rodeos.
          // Solo se ofrece sobre borradores, que nunca tocaron ningún saldo.
          // La etiqueta viene del objetivo capturado al abrir, no de la lista: la
          // fila ya no está ahí mientras la mutación corre.
          description={`¿Deseas eliminar el borrador ${deleteTarget.etiqueta}? Se borrará de forma PERMANENTE y no podrá recuperarse. Si prefieres conservar el rastro del documento, cancélalo en vez de eliminarlo.`}
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
            deleteNotaAsync(id)
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
