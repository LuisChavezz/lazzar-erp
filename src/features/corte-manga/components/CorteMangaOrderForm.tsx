"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { SliceIcon } from "@/src/components/Icons";
import { CorteMangaOrderCreateForm } from "./CorteMangaOrderCreateForm";

interface CorteMangaOrderFormProps {
  /** Ver `CorteMangaOrderCreateFormProps.onViewExistingOrder` — solo se
   *  reenvía, este componente no lo usa directamente. */
  onViewExistingOrder: (id: number) => void;
  /**
   * Cierra el diálogo de detalle que este formulario pudo haber abierto desde
   * el aviso de duplicado. Se invoca al cerrar el alta: sin esto el detalle
   * —que vive en `CorteMangaOrdersView`, no aquí dentro— quedaría abierto sobre
   * la tabla ya sin el formulario que le dio contexto.
   */
  onCloseExistingOrder: () => void;
}

/**
 * Punto de entrada del alta de orden de corte de manga: botón del toolbar que
 * abre el formulario de un solo paso.
 *
 * El contenido —y con él la llamada al onboarding— solo se monta cuando el
 * diálogo está abierto, y se re-monta limpio en cada apertura (sin pedido ni
 * observaciones residuales). Mismo patrón que
 * `ReflectiveOrderForm`/`EmbroideryOrderForm`.
 */
export const CorteMangaOrderForm = ({
  onViewExistingOrder,
  onCloseExistingOrder,
}: CorteMangaOrderFormProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open);
        // Al cerrar el alta se cierra también el detalle que se haya abierto
        // desde el aviso de duplicado; abrirla de nuevo tampoco debe arrastrar
        // el diálogo de una sesión anterior del formulario.
        if (!open) onCloseExistingOrder();
      }}
      title={
        <DialogHeader
          title="Nueva Orden de Corte de Manga"
          subtitle="Genera la orden a partir de un pedido con prendas por cortar"
          statusColor="sky"
        />
      }
      maxWidth="640px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <SliceIcon className="w-4 h-4" />
          Nueva orden
        </Button>
      }
    >
      {isDialogOpen && (
        <CorteMangaOrderCreateForm
          onSuccess={() => setIsDialogOpen(false)}
          onViewExistingOrder={onViewExistingOrder}
        />
      )}
    </MainDialog>
  );
};
