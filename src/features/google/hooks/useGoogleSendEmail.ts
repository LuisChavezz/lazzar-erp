"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { googleSendEmail } from "../services/actions";
import { getQuoteById } from "@/src/features/quotes/services/actions";
import { generateQuotePdfBlob } from "@/src/features/quotes/services/pdf/quotePdfBlob";
import { buildGoogleEmailAttachment } from "../utils/googleEmailAttachment.utils";
import { renderEmailContent, type SendEmailResult } from "../utils/emailSend.utils";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";

// --- Hook ---

export const useGoogleSendEmail = () =>
  useMutation<SendEmailResult, unknown, number>({
    mutationKey: ["google", "send-quote-email"],
    /**
     * Flujo de tres pasos — todo el acceso al backend externo ocurre client-side
     * via v1_api, garantizando que las cookies auth-jwt/auth-refresh-jwt del browser
     * viajen correctamente y el interceptor de refresh actue ante un 401.
     *
     * 1. getQuoteById()     — v1_api GET, cookies + interceptor de refresh ✓
     * 2. renderEmailContent() — API Route Next.js, valida correo_facturas/sesión y
     *    renderiza HTML en Node.js. Su error tiene prioridad sobre un fallo de
     *    generación de PDF no relacionado (ver comentario junto a
     *    pdfBlobPromise más abajo). ✓
     * 3. googleSendEmail()  — v1_api POST, cookies + interceptor de refresh ✓
     *
     * El PDF se genera con el MISMO generador que usa "Descargar PDF"
     * (generateQuotePdfBlob) a partir del MISMO snapshot de la cotización, por lo
     * que el adjunto es idéntico al documento descargable.
     */
    mutationFn: async (quoteId: number): Promise<SendEmailResult> => {
      const quote = await getQuoteById(quoteId);

      // Se dispara en paralelo con la validación de abajo (ambos solo dependen
      // de `quote`), pero SIN esperarlo todavía: si `renderEmailContent` falla
      // (correo_facturas/sesión), ese error debe ganar y mostrarse primero, no
      // un error de generación de PDF no relacionado. El catch no-op evita un
      // "unhandled rejection" si el PDF falla antes de llegar al await de
      // `pdfBlobPromise` más abajo — no altera el valor con el que resuelve.
      const pdfBlobPromise = generateQuotePdfBlob(quote);
      pdfBlobPromise.catch(() => {});

      // Valida (correo_facturas + sesión) y renderiza el HTML — su error tiene
      // prioridad sobre un fallo de generación de PDF.
      const content = await renderEmailContent(`/api/quotes/${quote.id}/send-email`, { quote });

      // Para este punto el PDF ya se generó (o está a punto de hacerlo) en
      // paralelo con la llamada anterior, así que este await normalmente no
      // agrega espera adicional.
      const pdfBlob = await pdfBlobPromise;

      const attachment = await buildGoogleEmailAttachment(
        pdfBlob,
        `cotizacion-${quote.id}.pdf`,
        "application/pdf",
        "El PDF de la cotización excede el límite de 25 MB permitido para adjuntos."
      );

      await googleSendEmail({
        ...content,
        attachments: [attachment],
      });

      return { recipient: content.to, subject: content.subject };
    },
    onSuccess: ({ recipient }) => {
      toast.success(`Correo enviado a ${recipient.toLocaleLowerCase()}`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo enviar el correo de la cotizacion."));
    },
  });
