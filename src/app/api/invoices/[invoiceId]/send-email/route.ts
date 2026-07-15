/**
 * API Route de renderizado de correo de factura — responsabilidad única:
 * generar el HTML/texto del correo.
 *
 * El cliente (useSendInvoiceEmail) obtiene la factura (fila del listado), cuyo
 * `correo_facturas` ya trae el destinatario resuelto server-side, y envía la
 * factura + el correo en el body de este endpoint (v1_api, con cookies y
 * refresh interceptor); aquí solo se ejecuta el renderizado server-side de
 * InvoiceEmail con react-email.
 *
 * No realiza ninguna llamada al backend externo, por lo que no depende de las
 * cookies auth-jwt / auth-refresh-jwt que solo el browser puede enviar a ese
 * dominio. La validación autoritativa del envío vive AQUÍ (no solo en el botón
 * deshabilitado del cliente), en varias capas antes de renderizar:
 *   1. Sesión activa + permiso R-CONTABILIDAD (las rutas de `src/app/api/**` no
 *      pasan por `src/proxy.ts`, así que este handler necesita su propio chequeo).
 *   2. La forma de `invoice` se valida con `invoiceEmailPayloadSchema` para no
 *      confiar en un payload arbitrario y evitar que un campo faltante rompa el
 *      render.
 *   3. El `id` de la factura debe coincidir con el `invoiceId` de la URL.
 *   4. El `correo` del destinatario debe estar presente y ser un email válido.
 *   5. La factura debe estar en un estatus enviable (no `Cancelada`) — no se
 *      emite un comprobante fiscal cancelado como si estuviera vigente.
 *
 * Esto NO es una validación de autenticidad end-to-end del contenido (requeriría
 * que este handler pudiera re-consultar el backend con la identidad del propio
 * usuario, lo cual no es posible hoy dado el esquema de cookies cross-origin) —
 * pero sí impide enviar sin sesión/permiso, con un destinatario inválido, o una
 * factura en un estado no enviable, sin depender del deshabilitado del cliente.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession, parseRequiredJsonField } from "@/src/lib/routeHandlers";
import {
  buildInvoiceEmailContent,
  buildInvoiceEmailSubject,
} from "@/src/features/invoicing/services/email/invoiceEmailContent.server";
import { invoiceEmailPayloadSchema } from "@/src/features/invoicing/schemas/invoice-email-payload.schema";
import { isInvoiceSendable } from "@/src/features/invoicing/constants/invoiceStatus";
import type { Invoice } from "@/src/features/invoicing/interfaces/invoice.interface";

export const runtime = "nodejs";

const recipientEmailSchema = z.string().trim().email();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  // Módulo de Facturación (Finanzas) — mismo permiso que protege /finance en el proxy.
  const authResult = await requireAuthenticatedSession("R-CONTABILIDAD");

  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { invoiceId } = await params;

  const parsedBody = await parseRequiredJsonField(request, "invoice");

  if ("errorResponse" in parsedBody) {
    return parsedBody.errorResponse;
  }

  const rawInvoice = parsedBody.value;
  const rawCorreo = parsedBody.body.correo;

  const parsedInvoice = invoiceEmailPayloadSchema.safeParse(rawInvoice);

  if (!parsedInvoice.success) {
    return NextResponse.json(
      { error: "El payload de la factura es inválido o está incompleto." },
      { status: 400 },
    );
  }

  if (String(parsedInvoice.data.id) !== invoiceId) {
    return NextResponse.json(
      { error: "El id de la factura no coincide con la solicitud." },
      { status: 400 },
    );
  }

  // Cast seguro: InvoiceEmail/buildInvoiceEmailContent solo leen el subconjunto
  // de campos validado por `invoiceEmailPayloadSchema`.
  const invoice = parsedInvoice.data as unknown as Invoice;

  // Compuerta de estatus autoritativa: una factura cancelada (o en un estatus
  // no reconocido) no debe emitirse por correo.
  if (!isInvoiceSendable(invoice.estatus)) {
    return NextResponse.json(
      { error: "La factura no está en un estatus que permita enviarla por correo." },
      { status: 422 },
    );
  }

  const parsedCorreo = recipientEmailSchema.safeParse(rawCorreo);

  if (!parsedCorreo.success) {
    return NextResponse.json(
      { error: "El cliente no tiene un correo válido configurado." },
      { status: 422 },
    );
  }

  const correo = parsedCorreo.data;

  try {
    // Única responsabilidad: renderizar el template con react-email en Node.js.
    const subject = buildInvoiceEmailSubject(invoice);
    const { html, text } = await buildInvoiceEmailContent(invoice, correo);

    return NextResponse.json({
      to: correo,
      subject,
      body: text,
      html,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo renderizar el correo.";

    console.error("Error al renderizar correo de factura:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
