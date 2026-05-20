"use client";

import { useQuoteEditForm } from "../hooks/useQuoteEditForm";
import { QuoteFormContent } from "./QuoteForm";

interface QuoteEditFormProps {
  quoteId: number;
}

// Componente de edición de cotización.
// Delega toda la lógica a useQuoteEditForm y reutiliza QuoteFormContent para el JSX.
export function QuoteEditForm({ quoteId }: QuoteEditFormProps) {
  const hookResult = useQuoteEditForm(quoteId);
  return <QuoteFormContent {...hookResult} submitLabel="Guardar Cambios" />;
}
