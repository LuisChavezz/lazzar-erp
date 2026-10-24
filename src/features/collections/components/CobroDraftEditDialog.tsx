"use client";

import { useState } from "react";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useCuentasPorCobrar } from "@/src/features/accounts-receivable/hooks/useCuentasPorCobrar";
import { buildCxcIndex, cobroLabel, type CobroRow } from "../utils/collection.utils";
import { cobroToFormValues } from "../utils/cobroDraft";
import { CreateCobroForm } from "./CreateCobroForm";

interface CobroDraftEditDialogProps {
  /** El borrador a editar (la fila del listado), o `null` cerrado. */
  cobro: CobroRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edición de un cobro en `Borrador`: el mismo formulario del alta, sembrado con
 * el borrador ("Guardar borrador" o "Aplicar cobro", ambos por PATCH con el
 * cobro completo).
 *
 * El borrador es la copia tomada al ABRIR (`useDialogSession`): un refetch del
 * listado mientras se edita no pisa lo capturado, y el contenido sobrevive a la
 * animación de cierre aunque la fila pase a `Aplicado`. Cada apertura monta un
 * formulario nuevo (`key`).
 *
 * Folio de factura, moneda y saldo de cada línea salen del listado completo de
 * CxC (la misma entrada de caché que el detalle): el formulario espera a que
 * cargue, porque sin él las líneas no tendrían contra qué validarse. Ese listado
 * se pide solo con el diálogo ABIERTO (`DraftLoader`): `CollectionList` monta
 * este componente siempre.
 */
export function CobroDraftEditDialog({ cobro, open, onOpenChange }: CobroDraftEditDialogProps) {
  const session = useDialogSession(open, cobro);
  const draft = session.snapshot;

  const close = () => onOpenChange(false);

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Editar borrador de cobro"
          subtitle={draft ? `Cobro ${cobroLabel(draft)} · Aplicación contra cuentas por cobrar` : ""}
          statusColor="amber"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="1100px"
    >
      {open && draft && <DraftLoader key={session.id} cobro={draft} onDone={close} />}
    </MainDialog>
  );
}

/** Espera el listado de CxC (pedido solo aquí, con el diálogo abierto) y monta el formulario. */
function DraftLoader({ cobro, onDone }: { cobro: CobroRow; onDone: () => void }) {
  const { cuentas, hasLoaded, isError } = useCuentasPorCobrar();

  if (!hasLoaded) {
    return isError ? (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          No se pudieron cargar las cuentas por cobrar
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          Sin ellas no se pueden mostrar las líneas del borrador. Intenta abrirlo de nuevo.
        </p>
      </div>
    ) : (
      <Loader className="py-12" title="Cargando borrador" message="Cargando cuentas por cobrar..." />
    );
  }

  return <DraftForm cobro={cobro} cuentas={cuentas} onDone={onDone} />;
}

/**
 * Siembra el formulario UNA vez por apertura: los valores iniciales no deben
 * cambiar si el listado de CxC se refresca mientras se edita.
 */
function DraftForm({ cobro, cuentas, onDone }: { cobro: CobroRow; cuentas: CuentaPorCobrar[]; onDone: () => void }) {
  const [seed] = useState(() => ({ id: cobro.id, values: cobroToFormValues(cobro, buildCxcIndex(cuentas)) }));
  return <CreateCobroForm draft={seed} onSuccess={onDone} onCancel={onDone} />;
}
