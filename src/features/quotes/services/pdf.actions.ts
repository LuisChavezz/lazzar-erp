/**
 * Cliente HTTP para descargar el PDF de una cotizacion y guardarlo en el dispositivo.
 *
 * Responsabilidades:
 * - Llamar al endpoint interno de Next.js.
 * - Convertir la respuesta a un Blob y disparar la descarga nativa del navegador.
 * - Normalizar errores para que hooks y UI reciban un `Error` consistente.
 */

/**
 * Solicita el PDF de la cotizacion indicada y activa la descarga en el navegador.
 * Libera la URL de objeto una vez que el navegador la ha procesado.
 */
export const downloadQuotePdf = async (quoteId: number): Promise<void> => {
  const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
    method: "GET",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "No se pudo generar el PDF de la cotizacion.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `cotizacion-${quoteId}.pdf`;
  link.click();

  URL.revokeObjectURL(objectUrl);
};
