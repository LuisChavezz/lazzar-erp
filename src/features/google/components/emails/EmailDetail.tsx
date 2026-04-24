"use client";

import { useRef, useCallback } from "react";
import { ArrowLeftIcon, ExternalLinkIcon } from "@/src/components/Icons";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { formatDetailDate } from "./email.utils";
import { buildEmailDocument } from "./buildEmailDocument";
import { MetaRow, MetaRowRecipients } from "./MetaRow";
import { useGoogleMessage } from "../../hooks/useGoogleMessage";
import type { GoogleEmailMessage } from "../../interfaces/google.interface";

// --- Props ---

interface EmailDetailProps {
  message: GoogleEmailMessage;
  onBack: () => void;
}

// --- Componente ---

/**
 * Vista de detalle de un correo seleccionado.
 *
 * Obtiene el cuerpo completo del mensaje vía `useGoogleMessage` (useQuery).
 * Los metadatos del encabezado se muestran inmediatamente desde el objeto `message`
 * de la lista, sin esperar la respuesta del detalle.
 *
 * El cuerpo HTML se renderiza en un <iframe srcdoc sandbox="allow-same-origin">:
 *   - `sandbox` bloquea scripts, formularios, popups y navegación.
 *   - `allow-same-origin` permite acceder a `contentDocument` para ajustar la altura
 *     sin necesidad de postMessage ni scripts inyectados en el correo.
 *   - `srcdoc` no realiza ninguna petición de red al origen del frame.
 */
export const EmailDetail = ({ message, onBack }: EmailDetailProps) => {
  const { detail, isPending, isError } = useGoogleMessage(message.id);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /**
   * Ajusta la altura del iframe al contenido del documento interno.
   * Se invoca en el evento `onLoad` del iframe, momento en que
   * `contentDocument.body` ya está completamente renderizado.
   */
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;
    iframe.style.height = `${iframe.contentDocument.body.scrollHeight + 32}px`;
  }, []);

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900">
      {/* Barra superior: botón de volver + enlace a Gmail */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver a la bandeja de entrada"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
          Volver
        </button>

        {/*
         * Enlace directo al mensaje en la interfaz web de Gmail.
         * El ID del mensaje de la API de Gmail coincide con el hash de la URL.
         * target="_blank" + rel="noopener noreferrer" protege contra tab-napping.
         */}
        <a
          href={`https://mail.google.com/mail/u/0/#all/${message.id}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir este correo en Gmail"
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <ExternalLinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Abrir en Gmail
        </a>
      </div>

      {/* Contenido del mensaje */}
      <article className="max-w-3xl mx-auto w-full px-6 py-6">
        {/* Asunto */}
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-5 leading-snug">
          {message.subject || "(Sin asunto)"}
        </h1>

        {/* Metadatos del mensaje — disponibles inmediatamente desde el listado */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 mb-6 space-y-1.5">
          <MetaRow label="De" value={message.from_full || message.from} />
          <MetaRowRecipients label="Para" value={message.to} />
          <MetaRow label="Fecha" value={formatDetailDate(message.date)} />
        </div>

        {/* Separador visual */}
        <div className="border-t border-slate-200 dark:border-slate-800" />

        {/* Cuerpo del correo */}
        <section aria-label="Cuerpo del correo">
          {isPending && (
            <div className="space-y-3 pt-6" aria-busy="true" aria-label="Cargando cuerpo del correo">
              <LoadingSkeleton className="h-4 w-full rounded" />
              <LoadingSkeleton className="h-4 w-5/6 rounded" />
              <LoadingSkeleton className="h-4 w-4/6 rounded" />
              <LoadingSkeleton className="h-40 w-full rounded-xl mt-4" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-rose-500 dark:text-rose-400 pt-6">
              No se pudo cargar el contenido del correo. Intenta de nuevo más tarde.
            </p>
          )}

          {!isPending && !isError && detail && (
            detail.body_html ? (
              /*
               * Iframe sandboxed — contexto de navegación aislado.
               * sandbox="allow-same-origin" sin allow-scripts: bloquea scripts
               * del correo pero permite acceder a contentDocument para medir
               * el scrollHeight y ajustar la altura del iframe sin postMessage.
               */
              <iframe
                ref={iframeRef}
                title="Contenido del correo"
                srcDoc={buildEmailDocument(detail.body_html)}
                sandbox="allow-same-origin"
                onLoad={handleIframeLoad}
                className="w-full border-0 block pt-6"
                style={{ minHeight: 100 }}
                aria-label="Cuerpo del correo en HTML"
              />
            ) : (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pt-6">
                {detail.body_text || message.snippet || "(Sin contenido)"}
              </p>
            )
          )}
        </section>
      </article>
    </div>
  );
};
