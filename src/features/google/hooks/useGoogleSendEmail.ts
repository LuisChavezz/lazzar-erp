"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { googleSendEmail } from "../services/actions";
import { getQuoteById } from "@/src/features/quotes/services/actions";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import { generateQuotePdfBlob } from "@/src/features/quotes/services/pdf/quotePdfBlob";
import { buildGoogleEmailAttachment } from "../utils/googleEmailAttachment.utils";
import { renderEmailContent, type SendEmailResult } from "../utils/emailSend.utils";
import type { GoogleEmailPayload } from "../interfaces/google.interface";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";

/**
 * Correo de una cotización LISTO para confirmarse (EC-563, ME-07): lo que se
 * va a enviar, tal como se enviará. Se arma ANTES de pedir confirmación para
 * que el diálogo muestre destinatario, asunto y adjunto reales, y el envío
 * usa exactamente este contenido.
 */
export interface PreparedQuoteEmail {
  /** Id de la cotización: también lo lee `selectMutationRecordId` (en curso por fila). */
  id: number;
  /** Foto de la cotización con la que se renderizó el correo y se genera el PDF. */
  quote: QuoteById;
  /** `null` si la cotización no tiene correo de facturación: no hay a quién enviar. */
  content: GoogleEmailPayload | null;
  attachmentName: string;
}

// --- Hooks ---

/** Exportadas para que `useQuoteRowActions` observe por cotización lo que está en curso. */
export const prepareQuoteEmailMutationKey = ["google", "prepare-quote-email"] as const;
export const sendQuoteEmailMutationKey = ["google", "send-quote-email"] as const;

/**
 * Paso 1: obtiene la cotización y renderiza el correo, SIN enviarlo.
 *
 * 1. getQuoteById()      — v1_api GET, cookies + interceptor de refresh ✓
 * 2. renderEmailContent() — API Route Next.js, valida sesión y renderiza el
 *    HTML en Node.js ✓
 *
 * Sin `correo_facturas` no se llama al Route Handler (respondería 422): el
 * diálogo de confirmación dice que no hay destinatario y no deja enviar.
 */
export const usePrepareQuoteEmail = () =>
  useMutation<PreparedQuoteEmail, unknown, number>({
    mutationKey: prepareQuoteEmailMutationKey,
    mutationFn: async (quoteId: number): Promise<PreparedQuoteEmail> => {
      const quote = await getQuoteById(quoteId);
      const attachmentName = `cotizacion-${quote.id}.pdf`;
      if (!quote.correo_facturas?.trim()) {
        return { id: quote.id, quote, content: null, attachmentName };
      }
      const content = await renderEmailContent(`/api/quotes/${quote.id}/send-email`, { quote });
      return { id: quote.id, quote, content, attachmentName };
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo preparar el correo de la cotizacion."));
    },
  });

/**
 * Paso 2, solo tras confirmar: genera el PDF y envía el correo preparado.
 *
 * El PDF se genera con el MISMO generador que usa "Descargar PDF"
 * (generateQuotePdfBlob) a partir de la MISMA foto con la que se renderizó el
 * correo, por lo que el adjunto es idéntico al documento descargable.
 */
export const useGoogleSendEmail = () =>
  useMutation<SendEmailResult, unknown, PreparedQuoteEmail>({
    mutationKey: sendQuoteEmailMutationKey,
    mutationFn: async ({ quote, content, attachmentName }): Promise<SendEmailResult> => {
      if (!content) {
        throw new Error("El cliente no tiene correo de facturación registrado.");
      }

      const pdfBlob = await generateQuotePdfBlob(quote);
      const attachment = await buildGoogleEmailAttachment(
        pdfBlob,
        attachmentName,
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
