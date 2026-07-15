"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Invoice } from "../interfaces/invoice.interface";
import { DownloadIcon, EmailIcon, ViewIcon } from "../../../components/Icons";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { InvoiceDetails } from "./InvoiceDetails";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { INVOICE_STATUS_CONFIG, isInvoiceSendable } from "../constants/invoiceStatus";
import { useDownloadInvoicePdf } from "../hooks/useDownloadInvoicePdf";
import { useSendInvoiceEmail } from "../hooks/useSendInvoiceEmail";

// ── Celda de acciones ─────────────────────────────────────────────────────────

const ActionsCell = ({ invoice }: { invoice: Invoice }) => {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const { mutate: sendEmail, isPending: isSendingEmail } = useSendInvoiceEmail();
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadInvoicePdf();

  // El destinatario del correo viaja directamente en la factura como
  // `correo_facturas` (resuelto server-side: pedido.correo_facturas →
  // cliente.correo → null). Es `null` explícito cuando no hay ninguna fuente de
  // correo disponible, así que "sin correo" se detecta con `=== null`. El Route
  // Handler valida el destinatario de forma autoritativa antes de enviar nada.
  const hasNoRecipientEmail = invoice.correo_facturas === null;

  // Solo se ENVÍA la factura al cliente en un estatus enviable (no Cancelada):
  // no debe salir un comprobante fiscal cancelado como si estuviera vigente.
  // `estatus` siempre viene en el listado (alimenta la columna de estatus), así
  // que el predicado explícito es la señal fiable. Cuando no se cumple, la
  // acción se OCULTA por completo (no se muestra deshabilitada).
  //
  // La compuerta aplica SOLO al envío, no a la descarga: ver el comentario de
  // "Descargar PDF" más abajo.
  const canSendEmail = isInvoiceSendable(invoice.estatus);

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => setIsViewOpen(true),
    },
  ];

  if (canSendEmail) {
    menuItems.push({
      label: isSendingEmail
        ? "Enviando..."
        : hasNoRecipientEmail
          ? "Enviar correo (sin correo)"
          : "Enviar correo",
      icon: EmailIcon,
      onSelect: () => sendEmail(invoice),
      // Deshabilitada cuando la factura no tiene correo, o mientras hay un envío
      // o una descarga en curso (evita doble envío o solaparse con la descarga).
      // `keepOpenOnSelect` deja el menú abierto para ver el estado "Enviando...".
      disabled: isSendingEmail || isDownloadingPdf || hasNoRecipientEmail,
      keepOpenOnSelect: true,
    });
  }

  // "Descargar PDF" NO se condiciona al estatus, a diferencia de "Enviar
  // correo". Lo que la compuerta protege es que NO salga hacia el cliente un
  // comprobante cancelado presentado como vigente; consultarlo o archivarlo
  // internamente no corre ese riesgo: el PDF se rotula a sí mismo con su
  // `estatus` (ver `InvoicePdfDocument`), así que una factura cancelada se lee
  // como cancelada. Si también se ocultara aquí, no quedaría ninguna forma en
  // toda la app de obtener el documento de una factura cancelada.
  //
  // Tampoco necesita correo del cliente: es una acción local (el documento
  // puede imprimirse o compartirse a mano).
  menuItems.push({
    label: isDownloadingPdf ? "Generando PDF..." : "Descargar PDF",
    icon: DownloadIcon,
    onSelect: () => downloadPdf(invoice),
    // In-flight guard: evita doble descarga o solaparse con el envío.
    disabled: isDownloadingPdf || isSendingEmail,
    keepOpenOnSelect: true,
  });

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de la factura ${invoice.folio}`} />
      <MainDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        maxWidth="900px"
        title={
          <DialogHeader
            title="Detalles de Facturación"
            subtitle="Información completa del registro"
            statusColor="sky"
          />
        }
      >
        <InvoiceDetails invoice={invoice} />
      </MainDialog>
    </div>
  );
};

// ── Columnas ──────────────────────────────────────────────────────────────────

export const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "folio",
    header: "Folio",
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
        {row.getValue("folio")}
      </span>
    ),
  },
  {
    accessorKey: "cliente_nombre",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("cliente_nombre")}
      </span>
    ),
  },
  {
    accessorKey: "fecha_emision",
    header: "Fecha emisión",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatLocalDate(row.original.fecha_emision)}
      </span>
    ),
  },
  {
    accessorKey: "fecha_vencimiento",
    header: "Fecha vencimiento",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatLocalDate(row.original.fecha_vencimiento)}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    // `total` es un string numérico; ordenamos numéricamente en vez de por
    // el orden alfanumérico que TanStack infiere para strings.
    sortingFn: (rowA, rowB) =>
      safeParseAmount(rowA.original.total) - safeParseAmount(rowB.original.total),
    cell: ({ row }) => (
      <div className="text-right font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
        {formatCurrency(safeParseAmount(row.original.total), {
          currency: row.original.moneda_nombre,
        })}
      </div>
    ),
  },
  {
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => (
      <StatusBadge status={row.original.estatus} config={INVOICE_STATUS_CONFIG} />
    ),
  },
  {
    accessorKey: "moneda_nombre",
    header: "Moneda",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("moneda_nombre")}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell invoice={row.original} />,
  },
];
