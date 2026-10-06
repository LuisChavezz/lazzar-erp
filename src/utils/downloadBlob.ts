/**
 * Dispara la descarga nativa del navegador de un `Blob` con el nombre dado.
 *
 * Única implementación del patrón `createObjectURL` → `<a download>` → `click`
 * que antes estaba copiado en cada exportación (CSV/PDF de listados, PDF de
 * cotización, orden de compra, factura, reportes de inventario y el documento
 * fusionado de facturas de proveedor).
 *
 * - El enlace se monta en el `body` durante el clic: algunos navegadores ignoran
 *   el `click()` de un `<a>` que no está en el documento.
 * - La URL se revoca DIFERIDA, no en el mismo tick del clic: revocarla de
 *   inmediato puede abortar la descarga en Safari y en algunas versiones de
 *   Firefox, que leen el blob de forma asíncrona.
 */
const REVOKE_DELAY_MS = 30_000;

export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_DELAY_MS);
}
