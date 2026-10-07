"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, FacturacionIcon, RefreshIcon, TrendingUpIcon, WarningFilledIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { useInvoiceRetrieveFresh } from "../hooks/useInvoiceRetrieveFresh";
import { useInvoiceDesglose } from "../hooks/useInvoiceDesglose";
import {
  buildInvoiceDetailHref,
  resolveInvoiceBack,
  type InvoiceDetailQuery,
} from "../constants/invoiceDetailOrigins";
import { resolveInvoiceDetailSheet } from "../constants/invoiceDetailSheets";
import { InvoiceMainSheet } from "./InvoiceMainSheet";
import { InvoiceTrackingSheet } from "./InvoiceTrackingSheet";

interface InvoiceDetailPageContentProps {
  /** Segmento crudo de la URL. */
  invoiceId: string;
  /** Parámetros crudos de la URL que usa la página (origen y hoja). */
  query: InvoiceDetailQuery;
}

/**
 * Detalle de factura en DOS hojas, con el mismo mecanismo que el detalle de
 * pedido (`PedidoDetailContent`):
 *
 * - "Factura" (`InvoiceMainSheet`, por defecto): cabecera con las acciones de
 *   PDF y correo, emisor y receptor, pedido, conceptos e importes.
 * - "Seguimiento" (`InvoiceTrackingSheet`): avance del pedido, parcialidades,
 *   cobranza y notas de crédito.
 *
 * La hoja activa vive en la URL (`?sheet=`). Lee DOS endpoints: el desglose
 * (todo lo que se pinta) y el retrieve, que aporta `activo` —el desglose no lo
 * expone— y el `Invoice` del que salen el PDF y el correo, igual que en el
 * listado. Cada enlace de la página se ofrece solo si el usuario puede abrir
 * su destino (`canAccessRoute`, la regla del proxy).
 */
export function InvoiceDetailPageContent({ invoiceId, query }: InvoiceDetailPageContentProps) {
  const numericId = /^\d+$/.test(invoiceId) ? Number(invoiceId) : NaN;
  const isValidId = Number.isSafeInteger(numericId) && numericId > 0;

  const desglose = useInvoiceDesglose(isValidId ? numericId : 0);
  const retrieve = useInvoiceRetrieveFresh(isValidId ? numericId : null);
  const { data: session } = useSession();
  const canOpen = (pathname: string) => canAccessRoute(pathname, session?.user);

  const sheet = resolveInvoiceDetailSheet(query.sheet);
  const back = resolveInvoiceBack(query, canOpen);

  const BackLink = (
    <Link
      href={back.href}
      className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span className="text-sm font-medium">{back.label}</span>
    </Link>
  );

  const notFound = !isValidId || isNotFoundError(desglose.error) || isNotFoundError(retrieve.error);
  if (notFound) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Factura no encontrada"
          message="La factura no existe o pertenece a otra empresa."
        />
      </div>
    );
  }

  if (desglose.isLoading || retrieve.isLoading) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader title="Cargando factura" message="Obteniendo el detalle de la factura..." />
      </div>
    );
  }

  // Solo un fallo del DESGLOSE tumba la página: es la fuente de todo lo que se
  // pinta. Un fallo del retrieve degrada únicamente lo que depende de él (ver
  // abajo).
  if (desglose.isError || !desglose.data) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Error al cargar la factura"
          message={extractErrorMessage(desglose.error, "No se pudo cargar la información.")}
        />
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            rounded="full"
            onClick={() => {
              void desglose.refetch();
              if (retrieve.isError) void retrieve.refetch();
            }}
          >
            <RefreshIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const data = desglose.data;
  // `null` = no se pudo confirmar el estado (`activo`) de la factura: se pinta
  // el desglose, sin acciones de PDF ni correo, y con un aviso. La página nunca
  // presenta como activa una factura cuyo `activo` se desconoce.
  const invoice = retrieve.data ?? null;
  // Cambio de hoja: enlace real que conserva el origen.
  const sheetSwitch =
    sheet === "invoice"
      ? {
          href: buildInvoiceDetailHref(data.id, query, "tracking"),
          label: "Ver Seguimiento",
          icon: <TrendingUpIcon className="w-4 h-4" aria-hidden="true" />,
        }
      : {
          href: buildInvoiceDetailHref(data.id, query, "invoice"),
          label: "Ver Factura",
          icon: <FacturacionIcon className="w-4 h-4" aria-hidden="true" />,
        };

  return (
    <div className="w-full space-y-6">
      {/* Barra superior: mismos tokens y comportamiento que la del detalle de
          pedido (tarjeta fija semitransparente sobre el contenido). */}
      <div className="sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 dark:border-white/5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-sm dark:shadow-none px-6 md:px-8 py-3">
        {BackLink}
        <Button asChild variant="secondary">
          <Link href={sheetSwitch.href} className="inline-flex items-center gap-2">
            {sheetSwitch.icon}
            {sheetSwitch.label}
          </Link>
        </Button>
      </div>

      {/* El desglose responde también para facturas eliminadas, pero no lo
          dice: `activo` viene del retrieve. En ambas hojas, porque cambia
          cómo se leen el avance y las parcialidades. */}
      {invoice === null && (
        <div
          role="status"
          className="flex flex-wrap items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-5 py-4"
        >
          <WarningFilledIcon className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
          <div className="text-sm flex-1 min-w-0">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              No se pudo confirmar el estado de la factura
            </p>
            <p className="text-amber-700 dark:text-amber-400/90">
              Pudo haber sido eliminada. Mientras no se confirme, no se ofrecen la descarga del
              PDF ni el envío por correo.{" "}
              {extractErrorMessage(retrieve.error, "")}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            rounded="full"
            onClick={() => void retrieve.refetch()}
            disabled={retrieve.isFetching}
          >
            <RefreshIcon className="w-3.5 h-3.5" aria-hidden="true" />
            {retrieve.isFetching ? "Reintentando..." : "Reintentar"}
          </Button>
        </div>
      )}

      {invoice !== null && !invoice.activo && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-5 py-4"
        >
          <WarningFilledIcon className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Factura eliminada</p>
            <p className="text-amber-700 dark:text-amber-400/90">
              Esta factura fue eliminada: no cuenta en el avance de facturación del pedido ni
              aparece en sus parcialidades.
            </p>
          </div>
        </div>
      )}

      {sheet === "invoice" ? (
        <InvoiceMainSheet data={data} invoice={invoice} canOpen={canOpen} />
      ) : (
        <InvoiceTrackingSheet data={data} query={query} canOpen={canOpen} />
      )}
    </div>
  );
}
