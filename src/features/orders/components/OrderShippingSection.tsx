import { EmbarquesIcon } from "@/src/components/Icons";
import { InfoField, textOrDash } from "@/src/components/DetailDialogPrimitives";
import type { PedidoDetail } from "../interfaces/order.interface";
import { SheetSection } from "./OrderSheetPrimitives";

/**
 * "Datos de Envío", con los campos del formulario de cotización en su orden.
 * Las casillas "Enviar al domicilio fiscal" y "Embarcar con otras cotizaciones"
 * del formulario no tienen campo en el pedido, así que no se pintan; en cambio
 * "Empaque ecológico" sí existe en el pedido y se conserva.
 */
export function OrderShippingSection({ pedido }: { pedido: PedidoDetail }) {
  return (
    <SheetSection
      icon={<EmbarquesIcon className="w-6 h-6" />}
      title="Datos de Envío"
      subtitle="Información para entrega y condiciones de envío."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <InfoField label="Destinatario">{textOrDash(pedido.destinatario)}</InfoField>
        <InfoField label="Empresa">{textOrDash(pedido.empresa_envio)}</InfoField>
        <InfoField label="Teléfono">{textOrDash(pedido.telefono_envio)}</InfoField>
        <InfoField label="Celular">{textOrDash(pedido.celular_envio)}</InfoField>
        <InfoField label="Dirección" className="md:col-span-2">
          {textOrDash(pedido.direccion_envio)}
        </InfoField>
        <InfoField label="Colonia">{textOrDash(pedido.colonia_envio)}</InfoField>
        <InfoField label="Código postal">{textOrDash(pedido.codigo_postal)}</InfoField>
        <InfoField label="Ciudad">{textOrDash(pedido.ciudad_envio)}</InfoField>
        <InfoField label="Estado">{textOrDash(pedido.estado_envio)}</InfoField>
        <InfoField label="Referencias adicionales" className="md:col-span-2">
          {textOrDash(pedido.referencias)}
        </InfoField>
        <InfoField label="Empaque ecológico">{pedido.empaque_ecologico ? "Sí" : "No"}</InfoField>
      </div>

      <div className="mt-5 space-y-4">
        {/* Mismo aviso ámbar que el formulario, en solo lectura: el estado va
            escrito ("Sí"/"No") en vez de una casilla deshabilitada. */}
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/10 p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">
              Embarque parcial
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-300/80">
              Es posible embarcar parcialidad facturada de lo disponible en inventario.
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300">
            {pedido.embarque_parcial ? "Sí" : "No"}
          </span>
        </div>
        <div className="text-xs">
          <InfoField label="Comentarios parcialidad">
            {textOrDash(pedido.comentarios_parcialidad)}
          </InfoField>
        </div>
      </div>
    </SheetSection>
  );
}
