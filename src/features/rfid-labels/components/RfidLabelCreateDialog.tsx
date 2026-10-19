"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { PrinterIcon } from "@/src/components/Icons";
import { useRfidPrintSession } from "../hooks/useRfidPrintSession";
import { RfidLabelCreateStepManager } from "./RfidLabelCreateStepManager";
import {
  DISCARD_PENDING_DESCRIPTION,
  DISCARD_PENDING_TITLE,
} from "../constants/rfidLabelDiscardCopy";

/**
 * Punto de entrada de "Nueva impresión" de etiquetas RFID: botón del toolbar que
 * abre el asistente de 2 pasos (buscar SKU/producto → configurar, imprimir y
 * registrar). El contenido —y con él las llamadas al onboarding y la detección
 * de Browser Print— solo se monta con el diálogo abierto, y se re-monta limpio
 * en cada apertura (sin estado residual del paso ni del preview).
 *
 * El cierre está guardado (X y Esc pasan por `onOpenChange`; el clic fuera ya lo
 * bloquea `MainDialog`): mientras se imprime o registra no se puede cerrar —un
 * cierre a media impresión dejaría tags físicos sin registrar—, y con un lote
 * impreso pendiente de registrar cerrar pide la misma confirmación de descarte
 * que "Descartar e imprimir de nuevo". Por eso la sesión de impresión vive aquí.
 */
export const RfidLabelCreateDialog = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const session = useRfidPrintSession();

  // Cerrar la pestaña o recargar a media impresión, o con un lote impreso sin
  // registrar, perdería sus EPCs (el lote vive solo en memoria): el navegador
  // pide confirmación mientras dure. Solo cubre la descarga del documento; la
  // navegación interna no aplica porque el diálogo es modal (el resto de la
  // página no recibe clics), y el botón "atrás" no dispara `beforeunload`.
  const hasUnsavedPrint = session.phase !== "idle" || session.pending !== null;
  useEffect(() => {
    if (!hasUnsavedPrint) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Navegadores que aún exigen `returnValue` para mostrar el aviso.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedPrint]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Apertura limpia. Al cerrar ya no puede quedar nada en curso ni
      // pendiente, pero se reinicia igual para no heredar estado.
      session.setPhase("idle");
      session.setPending(null);
      setIsDialogOpen(true);
      return;
    }
    if (session.phase !== "idle") {
      // `id` fijo: pulsar Esc/X varias veces reemplaza el aviso en vez de apilarlo.
      toast("Espera a que termine la impresión y el registro.", {
        id: "rfid-print-close-blocked",
        icon: "⏳",
      });
      return;
    }
    if (session.pending) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    setIsDialogOpen(false);
  };

  const handleConfirmDiscardAndClose = () => {
    session.setPending(null);
    setIsDialogOpen(false);
  };

  return (
    <>
      <MainDialog
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
        title={
          <DialogHeader
            title="Nueva impresión"
            subtitle="Imprime y registra etiquetas RFID de un producto"
            statusColor="sky"
          />
        }
        maxWidth="720px"
        showCloseButton={false}
        trigger={
          <Button variant="primary">
            <PrinterIcon className="w-4 h-4" />
            Nueva impresión
          </Button>
        }
      >
        {isDialogOpen && (
          <RfidLabelCreateStepManager
            session={session}
            onClose={() => setIsDialogOpen(false)}
          />
        )}
      </MainDialog>
      <ConfirmDialog
        open={isDiscardConfirmOpen}
        onOpenChange={setIsDiscardConfirmOpen}
        title={DISCARD_PENDING_TITLE}
        description={DISCARD_PENDING_DESCRIPTION}
        confirmText="Descartar y cerrar"
        onConfirm={handleConfirmDiscardAndClose}
      />
    </>
  );
};
