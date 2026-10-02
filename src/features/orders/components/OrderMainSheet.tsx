import type { PedidoDetail } from "../interfaces/order.interface";
import { reconciledLineAmounts } from "../utils/orderAccounting";
import { OrderChargesSection } from "./OrderChargesSection";
import { OrderCommercialInfoSection } from "./OrderCommercialInfoSection";
import { OrderCurrencyProvider } from "./OrderCurrencyContext";
import { OrderNotesSection } from "./OrderNotesSection";
import { OrderProductsSection } from "./OrderProductsSection";
import { OrderShippingSection } from "./OrderShippingSection";

interface OrderMainSheetProps {
  pedido: PedidoDetail;
  showAccounting: boolean;
  canEditHeader: boolean;
}

/**
 * Hoja 1, "Pedido": el pedido en solo lectura con las secciones, el orden y la
 * estructura del formulario de cotización (Información Comercial → Datos de
 * Envío → Detalle de Productos → Observaciones | Cargos, servicios y totales).
 * Sin ningún dato de surtido: eso vive en la hoja de Avances.
 *
 * El catálogo de monedas solo se pide con datos contables: el proveedor que lo
 * carga se monta únicamente en ese caso (sin él no hay importes que formatear).
 */
export function OrderMainSheet({ pedido, showAccounting, canEditHeader }: OrderMainSheetProps) {
  // Importe por línea: solo con datos contables y si concilia con el subtotal.
  const lineAmounts = showAccounting ? reconciledLineAmounts(pedido) : null;
  const content = (
    <div className="space-y-6">
      <OrderCommercialInfoSection
        pedido={pedido}
        showAccounting={showAccounting}
        canEditHeader={canEditHeader}
      />
      <OrderShippingSection pedido={pedido} />
      <OrderProductsSection
        detalles={pedido.detalles}
        showAccounting={showAccounting}
        lineAmounts={lineAmounts}
      />
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-1">
          <OrderNotesSection observaciones={pedido.observaciones} />
        </div>
        <div className="lg:col-span-3">
          <OrderChargesSection pedido={pedido} showAccounting={showAccounting} />
        </div>
      </section>
    </div>
  );

  return showAccounting ? (
    <OrderCurrencyProvider monedaId={pedido.moneda}>{content}</OrderCurrencyProvider>
  ) : (
    content
  );
}
