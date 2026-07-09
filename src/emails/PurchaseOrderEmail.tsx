import { Fragment } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { PurchaseOrderDetail } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import { formatMoneyValue as money, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";

type PurchaseOrderEmailProps = {
  order: PurchaseOrderDetail;
};

/**
 * Correo dirigido al PROVEEDOR con la orden de compra adjunta en PDF.
 *
 * El cuerpo se mantiene conciso: saluda al proveedor, referencia el folio y
 * resume los renglones y totales. El desglose completo vive en el PDF adjunto
 * (ver `PurchaseOrderPdfDocument`), así que aquí solo se ofrece un vistazo
 * rápido de lo solicitado. Las recepciones se omiten deliberadamente (mismo
 * criterio que el PDF: la OC es lo que se pidió, no un reporte de estado).
 */
export const PurchaseOrderEmail = ({ order }: PurchaseOrderEmailProps) => {
  const supplierName = order.proveedor_nombre || "proveedor";
  const detalles = order.detalles ?? [];
  // Igual que en PurchaseOrderPdfDocument: Flete/Seguros solo se muestran
  // como renglón cuando aportan al total, para que ambos documentos
  // reconcilien contra el mismo `gran_total`.
  const flete = safeParseAmount(order.flete);
  const seguros = safeParseAmount(order.seguros);

  return (
    <Html lang="es">
      <Tailwind>
        <Head />
        <Preview>{`Orden de compra ${order.folio} para ${supplierName}`}</Preview>
        <Body className="m-0 bg-slate-100 py-8 font-sans text-slate-900">
          <Container className="mx-auto max-w-170 rounded-3xl bg-white px-8 py-10">
            <Section className="rounded-[20px] bg-slate-950 px-6 py-5 text-white">
              <Text className="m-0 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                ERP Lazzar
              </Text>
              <Heading className="m-0 mt-3 text-[28px] font-semibold leading-[1.2] text-white">
                Orden de compra {order.folio}
              </Heading>
              <Text className="m-0 mt-2 text-sm leading-6 text-slate-300">
                Estimado {supplierName}, adjuntamos en PDF la orden de compra con el detalle
                de los productos solicitados. Agradecemos confirmar su recepción.
              </Text>
            </Section>

            <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
              <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
                Resumen
              </Heading>
              <table className="mt-4 w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Folio</td>
                    <td className="py-2 font-medium text-slate-900">{order.folio}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Proveedor</td>
                    <td className="py-2 font-medium text-slate-900">{order.proveedor_nombre || "-"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Fecha OC</td>
                    <td className="py-2 font-medium text-slate-900">{formatLocalDate(order.fecha_oc)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Referencia</td>
                    <td className="py-2 font-medium text-slate-900">{order.referencia || "-"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Entrega estimada</td>
                    <td className="py-2 font-medium text-slate-900">
                      {formatLocalDate(order.fecha_entrega_estimada)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
              <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
                Productos solicitados
              </Heading>
              <table className="mt-4 w-full border-collapse overflow-hidden text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <th className="py-3 pr-3 font-semibold">Descripción</th>
                    <th className="py-3 pr-3 font-semibold text-right">Cantidad</th>
                    <th className="py-3 pr-3 font-semibold text-right">Precio</th>
                    <th className="py-3 font-semibold text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        Esta orden no tiene productos registrados.
                      </td>
                    </tr>
                  ) : (
                    detalles.map((item, index) => {
                      const isNotLast = index < detalles.length - 1;
                      const dividerClass = isNotLast ? "border-b border-slate-100" : "";
                      return (
                        <Fragment key={index}>
                          <tr className={dividerClass}>
                            <td className="py-4 pr-3 align-top text-slate-900">
                              <Text className="m-0 text-sm font-semibold text-slate-900">
                                {item.descripcion}
                              </Text>
                            </td>
                            <td className="py-4 pr-3 text-right align-top text-slate-900">
                              {item.cantidad.toLocaleString("es-MX")}
                            </td>
                            <td className="py-4 pr-3 text-right align-top text-slate-900">
                              {money(item.precio)}
                            </td>
                            <td className="py-4 text-right align-top font-semibold text-slate-900">
                              {money(item.importe)}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Section>

            <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
              <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
                Totales
              </Heading>
              <table className="mt-4 w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Piezas totales</td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {order.total_piezas?.toLocaleString("es-MX") ?? "0"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Subtotal</td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {money(order.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Descuento</td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {money(order.descuento)}
                    </td>
                  </tr>
                  {flete > 0 ? (
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Flete</td>
                      <td className="py-2 text-right font-medium text-slate-900">
                        {money(order.flete)}
                      </td>
                    </tr>
                  ) : null}
                  {seguros > 0 ? (
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Seguros</td>
                      <td className="py-2 text-right font-medium text-slate-900">
                        {money(order.seguros)}
                      </td>
                    </tr>
                  ) : null}
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">IVA ({safeParseAmount(order.porcentaje_iva)}%)</td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {money(order.total_iva)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Total</td>
                    <td className="py-2 text-right text-lg font-semibold text-slate-950">
                      {money(order.gran_total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {order.observaciones?.trim() ? (
              <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
                <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
                  Observaciones
                </Heading>
                <Text className="m-0 mt-4 text-sm leading-6 text-slate-700">
                  {order.observaciones}
                </Text>
              </Section>
            ) : null}

            <Hr className="my-8 border-slate-200" />

            <Text className="m-0 text-xs leading-5 text-slate-500">
              Este correo fue generado automáticamente desde el módulo de compras. El detalle
              completo de la orden se encuentra en el PDF adjunto.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PurchaseOrderEmail;
