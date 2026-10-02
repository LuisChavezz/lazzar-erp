"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useRecomprarPedido } from "../hooks/useRecomprarPedido";

interface OrderRecompraActionProps {
  pedidoId: number;
  pedidoFolio: string | null;
}

/**
 * Botón "Recompra" con su confirmación. Quien lo monta decide si se muestra
 * (permiso + estatus); aquí solo vive el flujo: POST no idempotente con candado
 * síncrono y navegación a la cotización nueva en una transición.
 *
 * Vive en la barra superior, FUERA de las hojas: su diálogo no se monta ni se
 * desmonta al cambiar de hoja.
 */
export function OrderRecompraAction({ pedidoId, pedidoFolio }: OrderRecompraActionProps) {
  const router = useRouter();
  const { mutateAsync: recomprar, isPending: isRecomprando } = useRecomprarPedido();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // El endpoint NO es idempotente. `isPending` llega un render tarde, así que
  // un doble clic rápido lo rebasaría: el candado síncrono es el ref, y solo
  // cubre el POST (lo único no idempotente).
  const lockRef = useRef(false);
  // La navegación a la cotización va en una transición: `isPending` sigue en
  // `true` hasta que la ruta nueva se monta (y este componente desaparece) y
  // vuelve a `false` sola si la navegación se abandona. Así el botón se
  // reactiva sin estado que haya que limpiar a mano.
  const [isNavigatingToQuote, startNavigationToQuote] = useTransition();

  const handleConfirm = async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      const { cotizacion } = await recomprar(pedidoId);
      setIsConfirmOpen(false);
      startNavigationToQuote(() => {
        router.push(`/sales/quotes/${cotizacion.id}/edit`);
      });
    } catch {
      // El hook ya avisó con su toast; el diálogo queda abierto y cerrable
      // para reintentar o cancelar.
    } finally {
      lockRef.current = false;
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isRecomprando || isNavigatingToQuote}
        className="inline-flex items-center gap-2"
      >
        <CopyIcon className="w-4 h-4" aria-hidden="true" />
        Recompra
      </Button>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Crear cotización de recompra"
        description={`Se creará una cotización NUEVA en borrador a partir del pedido ${
          pedidoFolio || `#${pedidoId}`
        }, con sus mismos productos, tallas y servicios. Los precios se copian tal como están en este pedido (no se recalculan); podrás ajustarlos antes de enviarla a revisión. Este pedido no se modifica.`}
        confirmText={isRecomprando ? "Creando..." : "Crear cotización"}
        confirmColor="blue"
        closeOnConfirm={false}
        busy={isRecomprando}
        onConfirm={handleConfirm}
      />
    </>
  );
}
