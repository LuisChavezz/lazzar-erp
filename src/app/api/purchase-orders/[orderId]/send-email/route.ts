/**
 * API Route de renderizado de correo de orden de compra — responsabilidad
 * única: generar el HTML/texto del correo.
 *
 * El cliente (useSendPurchaseOrderEmail) obtiene la orden via v1_api (con
 * cookies y refresh interceptor), la envía en el body de este endpoint, y aquí
 * solo se ejecuta el renderizado server-side de PurchaseOrderEmail con
 * react-email.
 *
 * No realiza ninguna llamada al backend externo, por lo que no depende de las
 * cookies auth-jwt / auth-refresh-jwt que solo el browser puede enviar a ese
 * dominio. La validación del correo del proveedor vive aquí (no en el hook) para
 * que su error tenga prioridad sobre un fallo de generación de PDF en paralelo.
 *
 * El `order` del body llega desde el cliente y este handler NO puede
 * re-consultarlo contra el backend (ver nota arriba sobre las cookies), así
 * que se valida en dos capas antes de renderizar: (1) su forma se valida con
 * `purchaseOrderEmailPayloadSchema` para no confiar en un payload arbitrario
 * y evitar que un campo faltante rompa el render, y (2) su `id` debe
 * coincidir con el `orderId` de la URL. Esto NO es una validación de
 * autenticidad end-to-end del contenido (requeriría que este handler pudiera
 * re-consultar el backend con la identidad del propio usuario, lo cual no es
 * posible hoy dado el esquema de cookies cross-origin) — solo cierra los
 * casos de payload incompleto/malformado y de un `orderId` que no coincide
 * con el payload enviado.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { hasPermission } from "@/src/utils/permissions";
import {
  buildPurchaseOrderEmailContent,
  buildPurchaseOrderEmailSubject,
} from "@/src/features/purchase-orders/services/email/purchaseOrderEmailContent.server";
import { purchaseOrderEmailPayloadSchema } from "@/src/features/purchase-orders/schemas/purchase-order-email-payload.schema";
import type { PurchaseOrderDetail } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  // Verificar sesión activa — usa cookies de NextAuth (localhost), no del backend Django.
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Módulo de Compras — mismo permiso que protege /procurement en el proxy.
  // Las rutas de `src/app/api/**` no pasan por `src/proxy.ts`, así que este
  // handler necesita su propio chequeo explícito.
  if (
    !hasPermission("R-COMPRAS", {
      role: session.user.role,
      permissions: session.user.permissions,
    })
  ) {
    return NextResponse.json(
      { error: "No tienes permiso para realizar esta acción." },
      { status: 403 },
    );
  }

  const { orderId } = await params;

  let rawOrder: unknown;

  try {
    const body = (await request.json()) as { order?: unknown };
    if (!body?.order) {
      return NextResponse.json({ error: "El campo order es requerido." }, { status: 400 });
    }
    rawOrder = body.order;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const parsedOrder = purchaseOrderEmailPayloadSchema.safeParse(rawOrder);

  if (!parsedOrder.success) {
    return NextResponse.json(
      { error: "El payload de la orden es inválido o está incompleto." },
      { status: 400 },
    );
  }

  if (String(parsedOrder.data.id) !== orderId) {
    return NextResponse.json(
      { error: "El id de la orden no coincide con la solicitud." },
      { status: 400 },
    );
  }

  // Cast seguro: PurchaseOrderEmail/buildPurchaseOrderEmailContent solo leen
  // el subconjunto de campos validado por `purchaseOrderEmailPayloadSchema`
  // (nunca `recepciones`, `tracking` ni los campos de auditoría del resto de
  // `PurchaseOrderDetail`).
  const order = parsedOrder.data as unknown as PurchaseOrderDetail;

  if (!order.proveedor_correo) {
    return NextResponse.json(
      { error: "El proveedor no tiene un correo configurado." },
      { status: 422 },
    );
  }

  try {
    // Única responsabilidad: renderizar el template con react-email en Node.js.
    const subject = buildPurchaseOrderEmailSubject(order);
    const { html, text } = await buildPurchaseOrderEmailContent(order);

    return NextResponse.json({
      to: order.proveedor_correo,
      subject,
      body: text,
      html,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo renderizar el correo.";

    console.error("Error al renderizar correo de orden de compra:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
