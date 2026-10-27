"use client";

import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormErrorBanner } from "@/src/components/FormErrorBanner";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import type { Warehouse } from "@/src/features/warehouses/interfaces/warehouse.interface";
import {
  parseTransferPickingError,
  useTransferPicking,
  type TransferPickingField,
} from "../hooks/useTransferPicking";
import type { Picking, TransferPickingPayload } from "../interfaces/picking.interface";

/**
 * Almacenes que se ofrecen como nuevo almacén del surtido: de la MISMA empresa
 * y sucursal que el picking (un almacén sin sucursal no se ofrece), activos,
 * que permitan entradas y distintos de donde están HOY las prendas.
 *
 * "Hoy" es `almacen_actual` (lo resuelve el backend), no `almacen`: con TR y
 * destino las prendas ya están en el destino, así que el origen sí es un
 * almacén válido (devolverlas) y el destino daría 400 "ya está en ese almacén".
 * Las mismas reglas las valida el backend; si el catálogo está desfasado, su
 * 400 `almacen` aparece bajo el selector.
 */
const getTargetWarehouses = (warehouses: Warehouse[], picking: Picking): Warehouse[] =>
  warehouses
    .filter(
      (warehouse) =>
        warehouse.empresa === picking.empresa &&
        warehouse.sucursal === picking.sucursal &&
        warehouse.estatus === "ACTIVO" &&
        warehouse.permite_entrada === true &&
        warehouse.id_almacen !== picking.almacen_actual,
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

interface PickingTransferFormProps {
  /** El picking tal como estaba al ABRIR el diálogo (ver `useDialogSession`). */
  picking: Picking;
  onClose: () => void;
}

const PickingTransferForm = ({ picking, onClose }: PickingTransferFormProps) => {
  const { data: warehouses, isLoading, isFetching, isInitialError, refetch } = useWarehouses();
  const transfer = useTransferPicking(picking.id);
  const isPending = transfer.isPending;

  const [almacenId, setAlmacenId] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearFieldErrors,
    clearServerErrors,
  } = useFormFieldErrors<TransferPickingField>();

  const targets = getTargetWarehouses(warehouses ?? [], picking);
  // El almacén elegido se queda en la lista aunque un refetch del catálogo lo
  // deje fuera del filtro (p. ej. lo desactivaron): si no, el selector mostraría
  // otro valor que el que se enviaría.
  const selected = warehouses?.find((warehouse) => warehouse.id_almacen === almacenId);
  const options =
    selected && !targets.includes(selected) ? [selected, ...targets] : targets;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    if (almacenId <= 0) {
      setClientFieldError("almacen", "Selecciona el almacén al que se traslada el surtido.");
      return;
    }
    const payload: TransferPickingPayload = { almacen: almacenId };
    const notas = observaciones.trim();
    // El backend rechaza `observaciones: null`: vacío = no se manda.
    if (notas.length > 0) payload.observaciones = notas;

    clearServerErrors();
    setMessage(null);
    transfer.mutate(payload, {
      onSuccess: onClose,
      onError: (error) => {
        // 404: el surtido ya no existe; el hook lo avisa con un toast y el
        // detalle que abrió este diálogo desaparece al refrescarse. El 403 sí
        // se queda aquí: lo pinta el banner (`parseTransferPickingError`).
        if (isNotFoundError(error)) {
          onClose();
          return;
        }
        setMessage(parseTransferPickingError(error, setServerFieldError));
      },
    });
  };

  const renderAlmacenField = () => {
    if (isInitialError) {
      return (
        <SectionErrorNotice
          variant="inline"
          className="px-1 py-2"
          message="No se pudieron cargar los almacenes."
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      );
    }
    if (!isLoading && options.length === 0) {
      return (
        <p className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          No hay otros almacenes activos que permitan entradas en la sucursal de este
          surtido.
        </p>
      );
    }
    return (
      <FormSelect
        label="Nuevo almacén"
        name="almacen"
        value={almacenId}
        disabled={isLoading}
        error={getError("almacen")}
        onChange={(event) => {
          setAlmacenId(Number(event.target.value));
          clearFieldErrors("almacen");
        }}
      >
        <option value={0} disabled>
          {isLoading ? "Cargando almacenes…" : "Selecciona un almacén"}
        </option>
        {options.map((warehouse) => (
          <option key={warehouse.id_almacen} value={warehouse.id_almacen}>
            {warehouse.nombre}
          </option>
        ))}
      </FormSelect>
    );
  };

  const canSubmit = !isLoading && !isInitialError && options.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      <div
        role="note"
        className="rounded-xl border border-sky-200 dark:border-sky-500/20 bg-sky-50/60 dark:bg-sky-500/5 px-4 py-3 text-xs leading-relaxed text-sky-800 dark:text-sky-300"
      >
        El traslado <span className="font-semibold">mueve las existencias</span> de las
        prendas del surtido del almacén actual al nuevo y genera un traspaso (folio TR).
        Si en el almacén actual no hay existencia suficiente, no se mueve nada.
      </div>

      <FormErrorBanner message={message} />

      <div className="text-xs">
        <span className="text-slate-400 dark:text-slate-500">Almacén actual</span>
        <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
          {picking.almacen_actual_nombre}
        </p>
      </div>

      <fieldset disabled={isPending} className="space-y-4">
        {renderAlmacenField()}

        <FormTextarea
          label="Observaciones (opcional)"
          name="observaciones"
          placeholder="Motivo del traslado"
          rows={2}
          value={observaciones}
          onChange={(event) => setObservaciones(event.target.value)}
        />
      </fieldset>

      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Cancelar" onClick={onClose} disabled={isPending} />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Trasladando…"
          disabled={isPending || !canSubmit}
        >
          Trasladar
        </FormSubmitButton>
      </div>
    </form>
  );
};

interface PickingTransferDialogProps {
  picking: Picking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Traslada un picking a otro almacén (`POST /wms/pickings/{id}/trasladar/`).
 * Se abre desde el detalle del surtido (`PickingDetailContent`), que decide si
 * se ofrece (permiso `C-WMS-PICKING`, estatus trasladable y ninguna línea con
 * `cantidad_surtida > 0`; ver `isPickingTrasladable`).
 *
 * Mientras el POST está en vuelo el diálogo no se cierra: así no se pierde el
 * error si el backend lo rechaza.
 */
export function PickingTransferDialog({ picking, open, onOpenChange }: PickingTransferDialogProps) {
  const session = useDialogSession(open, picking);
  // La mutación vive en el formulario; aquí se lee por su llave por registro.
  const transferring = useIsMutating({ mutationKey: ["picking-transfer", picking.id] }) > 0;

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && transferring) return;
        onOpenChange(next);
      }}
      maxWidth="520px"
      showCloseButton={false}
      title="Trasladar a otro almacén"
      description={`Surtido ${session.snapshot.folio}`}
    >
      <PickingTransferForm
        key={session.id}
        picking={session.snapshot}
        onClose={() => onOpenChange(false)}
      />
    </MainDialog>
  );
}
