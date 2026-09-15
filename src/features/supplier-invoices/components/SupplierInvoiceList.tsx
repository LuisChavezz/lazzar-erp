"use client";

import { useEffect, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DataTable } from "@/src/components/DataTable";
import { FormSelect } from "@/src/components/FormSelect";
import { useSuppliers } from "@/src/features/suppliers/hooks/useSuppliers";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { FACTURA_PROVEEDOR_ESTATUS_FILTER } from "../constants/supplierInvoiceStatus";
import {
  motivoBloqueoRegistro,
  toastIdBloqueoRegistro,
} from "../schemas/supplier-invoice.schema";
import type {
  FacturaProveedor,
  FacturaProveedorEstatus,
} from "../interfaces/supplier-invoice.interface";
import { useSupplierInvoices } from "../hooks/useSupplierInvoices";
import { useUpdateSupplierInvoice } from "../hooks/useUpdateSupplierInvoice";
import { getColumns } from "./SupplierInvoiceColumns";
import { SupplierInvoiceDetailDialog } from "./SupplierInvoiceDetailDialog";
import SupplierInvoiceForm from "./SupplierInvoiceForm";
import SupplierInvoiceEditForm from "./SupplierInvoiceEditForm";

export default function SupplierInvoiceList() {
  /**
   * Proveedor cuyas facturas se listan (`0` = ninguno). Es la ENTRADA de la
   * pantalla: sin él no se consulta nada, porque el listado sin acotar bajaría
   * todos los renglones de todas las facturas de la empresa (ver
   * `useSupplierInvoices`).
   */
  const [proveedorId, setProveedorId] = useState(0);
  const { suppliers, isLoading: isLoadingSuppliers, isError: isErrorSuppliers } = useSuppliers();
  const supplierOptions = suppliers
    .map((supplier) => ({
      value: supplier.id,
      label: supplier.nombre?.trim() || supplier.razon_social || `#${supplier.id}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const { facturas, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useSupplierInvoices(proveedorId);
  // `refetch` ignora `enabled`: sin proveedor no se pide nada.
  const refetchIfSelected = () => (proveedorId > 0 ? refetch() : undefined);
  // `mutateAsync`, no `mutate`: el candado se libera sobre la PROMESA de cada
  // llamada. Los callbacks de `mutate` solo corren para la última llamada del
  // observer, y con dos filas en vuelo el `finally` de la primera se perdería.
  // Sin `onServerError`: una acción de fila no tiene formulario donde repartir el
  // error y se queda con el toast del hook (que ya usa el parser de ambas formas).
  const { mutateAsync: updateAsync } = useUpdateSupplierInvoice();

  const [isFormOpen, setIsFormOpen] = useState(false);
  // Estado de TODOS los diálogos en la vista, nunca en la celda: una celda se
  // desmonta al ordenar, filtrar o paginar, y registrar/cancelar cambian el
  // `estatus`, que es justo el filtro de la tabla.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [registrarTargetId, setRegistrarTargetId] = useState<number | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  /**
   * La edición guarda una FOTO de la factura al abrir, no solo el id: el
   * formulario inicializa sus valores con ella, y si leyera la fila viva un
   * refetch mientras el usuario escribe cambiaría sus `defaultValues` a media
   * captura.
   */
  const [editTarget, setEditTarget] = useState<FacturaProveedor | null>(null);
  /**
   * Última edición cerrada porque su fila cambió de estatus (ver el ajuste en
   * render más abajo). El aviso sale en un EFECTO: disparar el toast durante el
   * render actualizaría otro componente a media renderización.
   */
  const [edicionCerrada, setEdicionCerrada] = useState<{
    etiqueta: string;
    estatus: FacturaProveedorEstatus | null;
  } | null>(null);
  useEffect(() => {
    if (!edicionCerrada) return;
    const { etiqueta, estatus } = edicionCerrada;
    toast.error(
      estatus
        ? `La factura ${etiqueta} cambió a ${estatus.toLowerCase()} y ya no se puede editar. Ábrela con "Ver detalle" para consultarla.`
        : `La factura ${etiqueta} ya no está disponible y no se puede editar.`,
      { id: "edicion-cerrada-por-estatus", duration: 7000 },
    );
  }, [edicionCerrada]);

  // UN candado por fila, COMPARTIDO por registrar y cancelar: una factura tiene
  // como máximo una acción que muta en vuelo. Con un candado por acción, cerrar
  // con "Volver" la confirmación de registrar aún pendiente y confirmar cancelar
  // disparaba los dos PATCH a la vez, y el resultado dependía de cuál llegaba
  // primero. Registrar genera una CxP: un doble clic tampoco debe disparar dos.
  const rowLock = useRowActionLock();

  /**
   * `true` —con aviso— si la fila ya tiene una acción en vuelo. Se consulta al
   * ABRIR una confirmación, para que la otra acción ni siquiera se ofrezca y la
   * etiqueta de pendiente del diálogo abierto sea siempre la de su propia acción.
   * Al confirmar decide el candado.
   */
  const accionEnCurso = (id: number): boolean => {
    if (!rowLock.isPending(id)) return false;
    toast.error("Ya hay una acción en curso para esta factura. Espera a que termine.", {
      id: `accion-en-curso-${id}`,
    });
    return true;
  };

  const showError = isInitialLoadError(isError, hasLoaded);

  // Handlers y columnas sin `useCallback`/`useMemo`: el React Compiler memoiza el
  // componente, y `DataTable` no depende de la identidad de `columns`.
  const handleViewDetail = (id: number) => setOpenDetailId(id);

  const handleEdit = (id: number) => {
    const factura = facturas.find((item) => item.id === id);
    // Solo borradores: una factura registrada o cancelada se consulta, no se edita.
    if (factura?.estatus === "Borrador") setEditTarget(factura);
  };

  /**
   * Registrar desde el listado — el camino que no pasa por un formulario.
   *
   * La regla de "requerido para registrar" se evalúa con `motivoBloqueoRegistro`,
   * que ejecuta el MISMO esquema que la edición y el alta. Si falta algo se corta
   * ANTES de abrir la confirmación y el PATCH nunca sale: la acción de fila no
   * tiene dónde capturar la fecha, así que se dice dónde hacerlo.
   */
  const handleRegistrar = (id: number) => {
    const factura = facturas.find((item) => item.id === id);
    if (!factura || factura.estatus !== "Borrador") return;
    if (accionEnCurso(id)) return;
    const bloqueo = motivoBloqueoRegistro(factura);
    if (bloqueo) {
      // Un solo aviso con el motivo más grave (ver `motivoBloqueoRegistro`). El
      // `id` fijo por factura evita que clics repetidos apilen toasts iguales.
      toast.error(bloqueo.mensaje, { id: toastIdBloqueoRegistro(id), duration: 9000 });
      return;
    }
    // Registrable: retira cualquier aviso de bloqueo previo de esta factura.
    toast.dismiss(toastIdBloqueoRegistro(id));
    setRegistrarTargetId(id);
  };

  const handleCancel = (id: number) => {
    const factura = facturas.find((item) => item.id === id);
    // Solo borradores (ver `SupplierInvoiceColumns`).
    if (factura?.estatus !== "Borrador" || accionEnCurso(id)) return;
    setCancelTargetId(id);
  };

  const columns = getColumns(handleViewDetail, handleEdit, handleRegistrar, handleCancel);

  // El detalle se busca contra el arreglo COMPLETO (`facturas` llega sin filtrar;
  // el filtrado ocurre dentro de `DataTable`), así que sobrevive a que la fila
  // salga de la vista filtrada —p. ej. registrar con el filtro "Borrador"
  // activo— y además muestra el estatus nuevo tras el refetch. Sin fetch propio:
  // list y retrieve comparten serializer.
  const detailFactura =
    openDetailId !== null ? facturas.find((f) => f.id === openDetailId) ?? null : null;

  // Si la factura desaparece del payload completo, el id no puede quedar colgado
  // (un refetch posterior reabriría el diálogo solo). Ajuste en RENDER, no en un
  // efecto (`react-hooks/set-state-in-effect`). Mismo patrón que `PolizaList`.
  if (openDetailId !== null && detailFactura === null) setOpenDetailId(null);

  const existe = (id: number) => facturas.some((f) => f.id === id);
  if (registrarTargetId !== null && !existe(registrarTargetId)) setRegistrarTargetId(null);
  if (cancelTargetId !== null && !existe(cancelTargetId)) setCancelTargetId(null);

  // La EDICIÓN se cierra si, tras un refetch, su fila dejó de ser `Borrador` (otra
  // persona la registró o canceló) o ya no está. Su foto seguiría ofreciendo
  // "Guardar cambios", que ya no manda `estatus` y el backend aceptaría como
  // edición de cabecera de una factura registrada —con la CxP conservando el
  // vencimiento viejo—. Mismo ajuste en RENDER que los diálogos de arriba, contra
  // la fila VIVA; no se pide nada al servidor.
  //
  // Mientras haya una mutación de ESTA factura en vuelo no se decide: el propio
  // "Registrar" de la edición refresca el listado antes de resolver (ver
  // `useUpdateSupplierInvoice`) y cierra el diálogo al terminar; cerrarlo aquí
  // antes avisaría de un cambio que hizo el mismo usuario.
  const editVivo =
    editTarget !== null ? facturas.find((f) => f.id === editTarget.id) ?? null : null;
  const editEnVuelo =
    useIsMutating({
      predicate: (mutation) =>
        editTarget !== null &&
        (mutation.state.variables as { id?: number } | undefined)?.id === editTarget.id,
    }) > 0;
  if (editTarget !== null && !editEnVuelo && editVivo?.estatus !== "Borrador") {
    setEditTarget(null);
    setEdicionCerrada({
      etiqueta: editTarget.folio || `#${editTarget.id}`,
      estatus: editVivo?.estatus ?? null,
    });
  }

  const etiqueta = (id: number | null) => {
    if (id === null) return "";
    const factura = facturas.find((f) => f.id === id);
    return factura?.folio || `#${id}`;
  };

  /** Ejecuta una acción de fila bajo el candado de la fila y cierra SU diálogo al terminar. */
  const runRowAction = (
    id: number,
    estatus: "Registrada" | "Cancelada",
    close: (updater: (current: number | null) => number | null) => void,
  ) => {
    if (!rowLock.acquire(id)) return;
    updateAsync({ id, payload: { estatus } })
      // El hook ya avisó del error con su toast; aquí solo se evita el rechazo
      // no manejado de la promesa.
      .catch(() => {})
      .finally(() => {
        rowLock.release(id);
        // Solo se cierra el diálogo de ESTA factura, por si mientras tanto se
        // abrió el de otra.
        close((current) => (current === id ? null : current));
      });
  };

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar sigue disponible durante la carga y ante un error.
  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={facturas}
        baseDataCount={facturas.length}
        title="Facturas de Proveedor"
        searchPlaceholder="Buscar por folio..."
        filterConfig={[
          { id: "estatus", label: "Estatus", options: FACTURA_PROVEEDOR_ESTATUS_FILTER },
        ]}
        onRefetch={refetchIfSelected}
        isRefetching={isFetching}
        emptyMessage={
          proveedorId > 0
            ? "Este proveedor no tiene facturas registradas."
            : "Selecciona un proveedor para ver sus facturas."
        }
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las facturas de proveedor"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetchIfSelected}
        loadingAriaLabel="Cargando facturas de proveedor"
        getRowId={(row) => String(row.id)}
        // Cambiar de proveedor o un alta nueva vuelven a la página 1.
        paginationResetKey={`${proveedorId}-${facturas.length}`}
        actionButton={
          <div className="flex items-center gap-2">
            <div className="w-64">
              <FormSelect
                name="proveedor"
                aria-label="Proveedor"
                value={String(proveedorId)}
                onChange={(event) => setProveedorId(Number(event.target.value))}
                disabled={isLoadingSuppliers || isErrorSuppliers}
                className="py-2! text-xs! rounded-full!"
              >
                <option value="0" disabled>
                  {isLoadingSuppliers
                    ? "Cargando proveedores..."
                    : isErrorSuppliers
                      ? "No se pudo cargar el catálogo de proveedores"
                      : "Selecciona un proveedor..."}
                </option>
                {supplierOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  >
                    {option.label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <MainDialog
              title={
                <DialogHeader
                  title="Nueva Factura de Proveedor"
                  subtitle="Factura de mercancía recibida contra una orden de compra"
                  statusColor="indigo"
                />
              }
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              maxWidth="1100px"
              trigger={
                <Button variant="primary" rounded="full" className="hover:scale-105 active:scale-95">
                  + Nueva factura
                </Button>
              }
            >
              {isFormOpen && <SupplierInvoiceForm onSuccess={() => setIsFormOpen(false)} />}
            </MainDialog>
          </div>
        }
      />

      {detailFactura && (
        <SupplierInvoiceDetailDialog
          factura={detailFactura}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenDetailId(null);
          }}
        />
      )}

      {editTarget && (
        <MainDialog
          title={
            <DialogHeader
              title="Editar Factura de Proveedor"
              subtitle={`Borrador ${editTarget.folio || `#${editTarget.id}`}: las partidas y los importes ya no se pueden cambiar`}
              statusColor="indigo"
            />
          }
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          maxWidth="760px"
        >
          <SupplierInvoiceEditForm factura={editTarget} onSuccess={() => setEditTarget(null)} />
        </MainDialog>
      )}

      {registrarTargetId !== null && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setRegistrarTargetId(null);
          }}
          title="Registrar Factura de Proveedor"
          description={`¿Deseas registrar la factura ${etiqueta(registrarTargetId)}? Se generará su cuenta por pagar (CxP) con el total de la factura y sus importes quedarán congelados: después ya no podrá cambiar el total, el proveedor ni la moneda, ni volver a borrador o cancelarse.`}
          confirmText={
            rowLock.isPending(registrarTargetId) ? "Registrando..." : "Registrar y generar CxP"
          }
          cancelText="Volver"
          // `closeOnConfirm={false}`: si no, el diálogo se cierra al instante y la
          // etiqueta de pendiente nunca se pinta. Lo cierra `runRowAction` al terminar.
          closeOnConfirm={false}
          onConfirm={() => runRowAction(registrarTargetId, "Registrada", setRegistrarTargetId)}
          confirmColor="amber"
        />
      )}

      {cancelTargetId !== null && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setCancelTargetId(null);
          }}
          title="Cancelar Factura de Proveedor"
          description={`¿Deseas cancelar el borrador ${etiqueta(cancelTargetId)}? No genera cuenta por pagar. La factura se conserva en el listado con estatus Cancelada y ya no admite cambios.`}
          confirmText={rowLock.isPending(cancelTargetId) ? "Cancelando..." : "Cancelar factura"}
          cancelText="Volver"
          closeOnConfirm={false}
          onConfirm={() => runRowAction(cancelTargetId, "Cancelada", setCancelTargetId)}
          confirmColor="red"
        />
      )}
    </div>
  );
}
