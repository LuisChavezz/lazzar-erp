"use client";

import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";
import { googleSendEmail } from "../services/actions";
import { getQuoteById } from "@/src/features/quotes/services/actions";
import { generateQuotePdfBlob } from "@/src/features/quotes/services/pdf/quotePdfBlob";
import { buildGoogleEmailAttachment } from "../utils/googleEmailAttachment.utils";
import type { GoogleEmailPayload } from "../interfaces/google.interface";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";

// --- Tipos internos ---

type RenderedEmailPayload = GoogleEmailPayload & { error?: string };

type SendResult = { recipient: string; subject: string };

/**
 * Extrae el mensaje de error de un error de Axios o generico.
 * El backend Django devuelve { error: string } en la respuesta JSON.
 */
const extractErrorMessage = (error: unknown, fallback: string): string => {
  const axiosData = (error as AxiosError<{ error?: string }>)?.response?.data;
  if (axiosData?.error) return axiosData.error;
  if (error instanceof Error) return error.message;
  return fallback;
};

/**
 * Paso 2: envia el objeto quote al API Route para renderizarlo con react-email en Node.js.
 * El API Route no hace llamadas al backend externo — solo renderiza HTML.
 */
const renderEmailContent = async (quote: QuoteById): Promise<GoogleEmailPayload> => {
  const res = await fetch(`/api/quotes/${quote.id}/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quote }),
  });

  const data = (await res.json().catch(() => null)) as RenderedEmailPayload | null;

  if (!res.ok || !data) {
    throw new Error(data?.error || "No se pudo renderizar el correo.");
  }

  return data;
};

// --- Hook ---

export const useGoogleSendEmail = () =>
  useMutation<SendResult, unknown, number>({
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
    mutationFn: async (quoteId: number): Promise<SendResult> => {
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
      const content = await renderEmailContent(quote);

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
