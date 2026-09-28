"use client";

import { useState } from "react";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import ProductOnboardingForm from "./ProductOnboardingForm";

/**
 * Botón "+ Nuevo Producto" con el diálogo del alta rápida. Es la ÚNICA vía de
 * alta de productos (Producción y Configuración): el formulario completo de
 * `products` solo edita. El permiso que lo muestra lo decide cada vista.
 *
 * Radix desmonta el contenido al cerrar, así que cada apertura empieza con el
 * formulario vacío.
 */
export default function ProductOnboardingDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Alta Rápida de Producto"
          subtitle="Código generado automáticamente"
          statusColor="emerald"
        />
      }
      open={isOpen}
      onOpenChange={setIsOpen}
      maxWidth="720px"
      trigger={
        <Button
          variant="primary"
          rounded="full"
          className="hover:scale-105 active:scale-95"
        >
          + Nuevo Producto
        </Button>
      }
    >
      <ProductOnboardingForm />
    </MainDialog>
  );
}
